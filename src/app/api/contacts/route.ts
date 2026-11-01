import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getTenantId(req: NextRequest): Promise<string> {
  const headerTenantId = req.headers.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  // Default to first active tenant for simplicity / dev
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  return tenant?.id || '';
}

// GET /api/contacts - List contacts with search, pagination, and tag filters
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const tagId = searchParams.get('tagId') || '';
    const groupId = searchParams.get('groupId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    if (groupId) {
      where.groupMemberships = {
        some: { groupId },
      };
    }

    if (status === 'OPTED_OUT') {
      where.isOptedOut = true;
    } else if (status === 'ACTIVE') {
      where.isOptedOut = false;
      where.status = 'ACTIVE';
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tags: {
            include: { tag: true },
          },
          groupMemberships: {
            include: { group: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/contacts - Create single contact
export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    const body = await req.json();

    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      company,
      customAttributes,
      tagIds,
      groupIds,
    } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const contact = await prisma.contact.upsert({
      where: {
        tenantId_phoneNumber: {
          tenantId,
          phoneNumber,
        },
      },
      update: {
        firstName,
        lastName,
        email,
        company,
        customAttributes: customAttributes ? JSON.stringify(customAttributes) : undefined,
      },
      create: {
        tenantId,
        phoneNumber,
        firstName,
        lastName,
        email,
        company,
        customAttributes: customAttributes ? JSON.stringify(customAttributes) : '{}',
      },
    });

    // Map tags
    if (tagIds && Array.isArray(tagIds)) {
      for (const tId of tagIds) {
        await prisma.contactTagMapping.upsert({
          where: { contactId_tagId: { contactId: contact.id, tagId: tId } },
          update: {},
          create: { contactId: contact.id, tagId: tId },
        });
      }
    }

    // Map groups
    if (groupIds && Array.isArray(groupIds)) {
      for (const gId of groupIds) {
        await prisma.contactGroupMember.upsert({
          where: { groupId_contactId: { groupId: gId, contactId: contact.id } },
          update: {},
          create: { groupId: gId, contactId: contact.id },
        });
      }
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/contacts - Delete contact
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    await prisma.contact.deleteMany({
      where: { id, tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
