import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignDispatcher } from '@/services/queue/dispatcher';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Campaign is already being dispatched' },
        { status: 400 }
      );
    }

    // Determine messages per second from batchDelayMs
    // e.g. 50ms delay = 20 msg/sec, 100ms = 10 msg/sec
    const delay = Math.max(20, campaign.batchDelayMs || 100);
    const messagesPerSecond = Math.min(50, Math.floor(1000 / delay));

    const dispatcher = new CampaignDispatcher(campaign.id, campaign.tenantId, messagesPerSecond);

    // Run dispatch asynchronously so user gets immediate response
    // We execute run() and update DB status in background
    const dispatchPromise = dispatcher.run().catch((err) => {
      console.error(`Background campaign dispatch failed for ${id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign broadcast has started successfully',
      campaignId: id,
      speedRps: messagesPerSecond,
    });
  } catch (error: any) {
    console.error('Dispatch API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
