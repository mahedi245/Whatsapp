import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BaileysSessionManager } from '@/services/qr-gateway/session-manager';

export async function POST() {
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
    const status = await manager.initializeSocket(tenant.id, true);

    return NextResponse.json({
      success: true,
      message: 'Gateway connection initialized. Please scan the QR code.',
      status,
    });
  } catch (error: any) {
    console.error('Error connecting gateway:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
