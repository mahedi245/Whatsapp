import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BaileysSessionManager } from '@/services/qr-gateway/session-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      include: { whatsappConfig: true },
    }).catch(() => null);

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Bulk Messaging Pro',
          slug: 'acme-corp-' + Date.now(),
          planType: 'PRO',
        },
        include: { whatsappConfig: true },
      });
    }

    const manager = BaileysSessionManager.getInstance();
    let status = await manager.getStatus(tenant.id);

    // If disconnected and no active QR, trigger initialization to generate a fresh QR code
    if (status.pairingStatus === 'DISCONNECTED' || (!status.isConnected && !status.qrCodeDataUrl)) {
      status = await manager.initializeSocket(tenant.id);
    }

    return NextResponse.json({
      success: true,
      provider: tenant.whatsappConfig?.gatewayProvider || 'BAILEYS',
      pairingStatus: status.pairingStatus,
      qrCode: status.qrCodeDataUrl,
      pairedPhoneNumber: status.pairedPhoneNumber,
      pairedPushName: status.pairedPushName,
      isConnected: status.isConnected,
      lastUpdated: status.lastUpdated,
    });
  } catch (error: any) {
    console.error('Error in /api/gateway/qr:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve QR code',
        pairingStatus: 'DISCONNECTED',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Re-initialize / refresh QR Code
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const manager = BaileysSessionManager.getInstance();
    const status = await manager.initializeSocket(tenant.id, true);

    return NextResponse.json({
      success: true,
      message: 'QR code refresh initiated',
      status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
