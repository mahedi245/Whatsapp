import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BaileysSessionManager } from '@/services/qr-gateway/session-manager';

export async function POST() {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    }).catch(() => null);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const manager = BaileysSessionManager.getInstance();
    await manager.disconnect(tenant.id);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Web session disconnected and logged out successfully.',
    });
  } catch (error: any) {
    console.error('Error disconnecting gateway:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
