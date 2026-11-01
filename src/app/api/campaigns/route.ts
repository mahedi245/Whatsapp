import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ campaigns: [] });

    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: tenant.id },
      include: {
        template: {
          select: { name: true, category: true, language: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const {
      name,
      description,
      templateId,
      mediaType, // NONE, DOCUMENT, IMAGE, VIDEO
      mediaUrl,
      mediaFilename,
      variableMapping, // { "body_1": "firstName", "body_2": "due_amount" }
      audienceType, // ALL, TAG, GROUP
      targetId, // tagId or groupId
      batchDelayMs = 100,
    } = body;

    if (!name || !templateId) {
      return NextResponse.json({ error: 'Name and Template are required' }, { status: 400 });
    }

    // 1. Fetch eligible contacts according to audience selection
    const contactWhere: any = {
      tenantId: tenant.id,
      isOptedOut: false, // strictly exclude opted-out contacts
      status: 'ACTIVE',
    };

    if (audienceType === 'TAG' && targetId) {
      contactWhere.tags = { some: { tagId: targetId } };
    } else if (audienceType === 'GROUP' && targetId) {
      contactWhere.groupMemberships = { some: { groupId: targetId } };
    }

    const eligibleContacts = await prisma.contact.findMany({
      where: contactWhere,
      select: { id: true, phoneNumber: true },
    });

    if (eligibleContacts.length === 0) {
      return NextResponse.json(
        { error: 'No active contacts found matching the selected audience criteria' },
        { status: 400 }
      );
    }

    // 2. Create Campaign Record
    const campaign = await prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        createdById: user.id,
        templateId,
        name,
        description,
        mediaType: mediaType || 'NONE',
        mediaUrl: mediaUrl || null,
        mediaFilename: mediaFilename || null,
        variableMapping: JSON.stringify(variableMapping || {}),
        audienceFilter: JSON.stringify({ audienceType, targetId }),
        totalRecipients: eligibleContacts.length,
        batchDelayMs: Number(batchDelayMs) || 100,
        status: 'DRAFT',
      },
    });

    // 3. Batch Create Campaign Message entries for each recipient
    const messageData = eligibleContacts.map((c) => ({
      tenantId: tenant.id,
      campaignId: campaign.id,
      contactId: c.id,
      recipientNumber: c.phoneNumber,
      status: 'PENDING',
    }));

    // In SQLite, createMany in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < messageData.length; i += CHUNK_SIZE) {
      const chunk = messageData.slice(i, i + CHUNK_SIZE);
      await prisma.campaignMessage.createMany({
        data: chunk,
      });
    }

    return NextResponse.json({
      success: true,
      campaign,
      recipientCount: eligibleContacts.length,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
