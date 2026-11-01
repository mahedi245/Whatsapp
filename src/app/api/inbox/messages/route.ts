import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantWhatsAppClient } from '@/services/meta/config-helper';

// GET /api/inbox/messages?conversationId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Reset unread count
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/inbox/messages - Send outbound agent reply
export async function POST(req: NextRequest) {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const body = await req.json();
    const { conversationId, text, mediaUrl, mediaFilename, mediaType = 'text' } = body;

    if (!conversationId || (!text && !mediaUrl)) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if opted out
    if (conversation.contact.isOptedOut) {
      return NextResponse.json(
        { error: 'Cannot send message: Contact has opted out of WhatsApp messages' },
        { status: 400 }
      );
    }

    const { client } = await getTenantWhatsAppClient(tenant.id);

    // Send direct session message via WhatsApp Cloud API
    const response = await client.sendDirectMessage({
      to: conversation.contact.phoneNumber,
      type: mediaType as any,
      text,
      mediaUrl,
      mediaFilename,
    });

    const metaMessageId = response.messages?.[0]?.id || `wamid.${Date.now()}`;

    // Record outbound chat message
    const chatMsg = await prisma.chatMessage.create({
      data: {
        tenantId: tenant.id,
        conversationId,
        metaMessageId,
        direction: 'OUTBOUND',
        messageType: mediaType.toUpperCase(),
        body: text,
        mediaUrl,
        status: 'SENT',
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ success: true, message: chatMsg });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
