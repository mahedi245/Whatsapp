import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BaileysSessionManager } from '@/services/qr-gateway/session-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, text, mediaUrl, mediaType, filename } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const defaultMessage =
      text ||
      `🚀 *WhatsApp Web Gateway Test*\n\n` +
      `Hello! Your WhatsApp Web QR Code Scanner Gateway is active and connected!\n\n` +
      `✨ *Features Unlocked:*\n` +
      `• No Meta Business Verification required\n` +
      `• No per-message conversation fees\n` +
      `• Anti-Ban smart human delays (3.5 - 7.5s)\n` +
      `• Send rich PDF quotations, catalogs, and images\n\n` +
      `_Sent securely via your connected WhatsApp number._`;

    const manager = BaileysSessionManager.getInstance();
    const result = await manager.sendDirectMessage(tenant.id, {
      to,
      text: defaultMessage,
      mediaUrl: mediaUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      mediaType: mediaType || 'DOCUMENT',
      filename: filename || 'Official-Quotation-QT-2026.pdf',
      mimeType: 'application/pdf',
    });

    return NextResponse.json({
      success: true,
      message: `Test message dispatched successfully to ${to}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Error sending test message via QR gateway:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to dispatch test message',
      },
      { status: 500 }
    );
  }
}
