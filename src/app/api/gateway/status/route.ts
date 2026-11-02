import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BaileysSessionManager } from '@/services/qr-gateway/session-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      include: { whatsappConfig: true },
    }).catch(() => null);

    if (!tenant) {
      return NextResponse.json({
        pairingStatus: 'DISCONNECTED',
        isConnected: false,
        provider: 'BAILEYS',
      });
    }

    const manager = BaileysSessionManager.getInstance();
    const sessionState = await manager.getStatus(tenant.id);

    return NextResponse.json({
      success: true,
      provider: tenant.whatsappConfig?.gatewayProvider || 'BAILEYS',
      pairingStatus: sessionState.pairingStatus,
      qrCode: sessionState.qrCodeDataUrl,
      pairedPhoneNumber: sessionState.pairedPhoneNumber,
      pairedPushName: sessionState.pairedPushName,
      isConnected: sessionState.isConnected,
      lastUpdated: sessionState.lastUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        pairingStatus: 'DISCONNECTED',
        isConnected: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
