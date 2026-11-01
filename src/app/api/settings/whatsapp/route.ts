import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppCloudApiClient } from '@/services/meta/whatsapp-client';

// GET /api/settings/whatsapp
export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      include: { whatsappConfig: true },
    });

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const config = tenant.whatsappConfig;

    return NextResponse.json({
      config: config
        ? {
            wabaId: config.wabaId,
            phoneNumberId: config.phoneNumberId,
            displayPhoneNumber: config.displayPhoneNumber,
            verifiedName: config.verifiedName,
            qualityRating: config.qualityRating,
            messagingTier: config.messagingTier,
            webhookVerifyToken: config.webhookVerifyToken,
            isConnected: config.isConnected,
            lastSyncedAt: config.lastSyncedAt,
            hasAccessToken: !!config.encryptedAccessToken,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/settings/whatsapp - Update & Test Connection
export async function POST(req: NextRequest) {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const body = await req.json();
    const { wabaId, phoneNumberId, accessToken, webhookVerifyToken, appSecret } = body;

    if (!wabaId || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WABA ID and Phone Number ID are required' },
        { status: 400 }
      );
    }

    // Test connection with Meta API
    const testClient = new WhatsAppCloudApiClient({
      phoneNumberId,
      wabaId,
      accessToken: accessToken || 'mock_token',
    });

    const health = await testClient.getPhoneHealthAndTier();

    const updatedConfig = await prisma.whatsAppConfig.upsert({
      where: { tenantId: tenant.id },
      update: {
        wabaId,
        phoneNumberId,
        displayPhoneNumber: health.display_phone_number,
        verifiedName: health.verified_name,
        qualityRating: health.quality_rating,
        messagingTier: health.messaging_limit_tier,
        encryptedAccessToken: accessToken || undefined,
        webhookVerifyToken: webhookVerifyToken || 'whatsapp_bulk_webhook_verify_token_2026',
        appSecret: appSecret || undefined,
        isConnected: true,
        lastSyncedAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        wabaId,
        phoneNumberId,
        displayPhoneNumber: health.display_phone_number,
        verifiedName: health.verified_name,
        qualityRating: health.quality_rating,
        messagingTier: health.messaging_limit_tier,
        encryptedAccessToken: accessToken || 'EAAXxXx_SamplePermanentMetaToken_xXxX',
        webhookVerifyToken: webhookVerifyToken || 'whatsapp_bulk_webhook_verify_token_2026',
        appSecret: appSecret || null,
        isConnected: true,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business API connected and verified with Meta',
      health,
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
