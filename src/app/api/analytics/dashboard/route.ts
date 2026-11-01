import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      include: {
        whatsappConfig: true,
      },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Bulk Messaging Pro',
          slug: 'acme-corp',
          planType: 'PRO',
          whatsappConfig: {
            create: {
              wabaId: '2423715105131368',
              phoneNumberId: '1316638444876007',
              displayPhoneNumber: '+1 (555) 184-6893',
              verifiedName: 'Bulk Messaging Pro Official',
              qualityRating: 'GREEN',
              messagingTier: 'TIER_1K',
              encryptedAccessToken: 'EAAXxXx_SamplePermanentMetaToken_xXxX',
              webhookVerifyToken: 'whatsapp_bulk_webhook_verify_token_2026',
              isConnected: true,
            },
          },
        },
        include: { whatsappConfig: true },
      });
    }

    // 1. Core aggregate stats
    const [totalContacts, activeContacts, totalCampaigns, recentCampaigns] = await Promise.all([
      prisma.contact.count({ where: { tenantId: tenant.id } }),
      prisma.contact.count({ where: { tenantId: tenant.id, isOptedOut: false, status: 'ACTIVE' } }),
      prisma.campaign.count({ where: { tenantId: tenant.id } }),
      prisma.campaign.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          template: { select: { name: true, category: true } },
        },
      }),
    ]);

    // Aggregate message counts across all campaigns
    const campaignAggregates = await prisma.campaign.aggregate({
      where: { tenantId: tenant.id },
      _sum: {
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        readCount: true,
        failedCount: true,
      },
    });

    const totalRecipients = campaignAggregates._sum.totalRecipients || 0;
    const sent = campaignAggregates._sum.sentCount || 0;
    const delivered = campaignAggregates._sum.deliveredCount || 0;
    const read = campaignAggregates._sum.readCount || 0;
    const failed = campaignAggregates._sum.failedCount || 0;

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
    const failureRate = sent > 0 ? Math.round((failed / sent) * 100) : 0;

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        planType: tenant.planType,
        messagesSentThisMonth: tenant.messagesSentThisMonth,
        maxMessagesPerMonth: tenant.maxMessagesPerMonth,
        maxContactsLimit: tenant.maxContactsLimit,
        qualityRating: tenant.whatsappConfig?.qualityRating || 'GREEN',
        messagingTier: tenant.whatsappConfig?.messagingTier || 'TIER_1K',
        displayPhoneNumber: tenant.whatsappConfig?.displayPhoneNumber || '+1 555-0199',
        isConnected: tenant.whatsappConfig?.isConnected ?? true,
      },
      counts: {
        totalContacts,
        activeContacts,
        totalCampaigns,
        totalRecipients,
        sent,
        delivered,
        read,
        failed,
      },
      rates: {
        deliveryRate,
        readRate,
        failureRate,
      },
      recentCampaigns,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
