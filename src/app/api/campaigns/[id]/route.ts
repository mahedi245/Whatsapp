import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        createdBy: { select: { name: true, email: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const messageWhere: any = { campaignId: id };
    if (statusFilter) {
      messageWhere.status = statusFilter;
    }

    const [totalMessages, messages] = await Promise.all([
      prisma.campaignMessage.count({ where: messageWhere }),
      prisma.campaignMessage.findMany({
        where: messageWhere,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              phoneNumber: true,
            },
          },
        },
      }),
    ]);

    // Calculate live funnel rates
    const total = campaign.totalRecipients || 1;
    const sent = campaign.sentCount;
    const delivered = campaign.deliveredCount;
    const read = campaign.readCount;
    const failed = campaign.failedCount;

    const metrics = {
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
      failureRate: sent > 0 ? Math.round((failed / (sent + failed)) * 100) : 0,
    };

    return NextResponse.json({
      campaign,
      metrics,
      messages,
      pagination: {
        total: totalMessages,
        page,
        limit,
        totalPages: Math.ceil(totalMessages / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
