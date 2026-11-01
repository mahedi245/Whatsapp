import { prisma } from '@/lib/prisma';

export class WebhookEventRouter {
  static async processEvent(payload: any): Promise<void> {
    const entries = payload.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === 'messages') {
          const value = change.value;

          // A. Process Outbound Message Delivery Status Updates
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              await this.handleStatusUpdate(statusObj);
            }
          }

          // B. Process Inbound Messages (Live Chat & Automated Opt-Outs)
          if (value.messages && Array.isArray(value.messages)) {
            for (const messageObj of value.messages) {
              await this.handleInboundMessage(value.metadata, messageObj);
            }
          }
        }
      }
    }
  }

  private static async handleStatusUpdate(statusObj: any): Promise<void> {
    const metaMessageId = statusObj.id;
    const status = (statusObj.status || '').toLowerCase(); // sent, delivered, read, failed
    const timestamp = statusObj.timestamp
      ? new Date(parseInt(statusObj.timestamp, 10) * 1000)
      : new Date();

    const message = await prisma.campaignMessage.findUnique({
      where: { metaMessageId },
      include: { campaign: true },
    });

    if (!message) return;

    // Monotonic state progression: Prevent status regression
    const stateHierarchy: Record<string, number> = {
      PENDING: 0,
      QUEUED: 1,
      SENT: 2,
      DELIVERED: 3,
      READ: 4,
      FAILED: 5,
    };

    const currentRank = stateHierarchy[message.status] || 0;

    if (status === 'delivered' && currentRank < 3) {
      await prisma.campaignMessage.update({
        where: { id: message.id },
        data: { status: 'DELIVERED', deliveredAt: timestamp },
      });
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { deliveredCount: { increment: 1 } },
      });
    } else if (status === 'read' && currentRank < 4) {
      await prisma.campaignMessage.update({
        where: { id: message.id },
        data: { status: 'READ', readAt: timestamp },
      });
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { readCount: { increment: 1 } },
      });
    } else if (status === 'failed') {
      const error = statusObj.errors?.[0];
      await prisma.campaignMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          failedAt: timestamp,
          errorCode: error ? `${error.code}` : 'META_DELIVERY_FAILURE',
          errorMessage: error?.message || error?.title || 'WhatsApp delivery failure',
        },
      });
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }
  }

  private static async handleInboundMessage(metadata: any, messageObj: any): Promise<void> {
    const phoneNumberId = metadata?.phone_number_id;
    const fromRaw = messageObj.from || '';
    const fromNumber = fromRaw.startsWith('+') ? fromRaw : `+${fromRaw}`;
    const textBody =
      messageObj.text?.body ||
      messageObj.button?.text ||
      messageObj.interactive?.button_reply?.title ||
      '';

    // Find tenant by phoneNumberId or default tenant
    let config = null;
    if (phoneNumberId) {
      config = await prisma.whatsAppConfig.findFirst({
        where: { phoneNumberId },
        include: { tenant: true },
      });
    }
    if (!config) {
      config = await prisma.whatsAppConfig.findFirst({
        include: { tenant: true },
      });
    }

    if (!config) return;

    // Check for Opt-Out Keywords (e.g. STOP, UNSUBSCRIBE, CANCEL)
    const upperText = textBody.trim().toUpperCase();
    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(upperText)) {
      await prisma.contact.updateMany({
        where: { tenantId: config.tenantId, phoneNumber: fromNumber },
        data: { isOptedOut: true, optedOutAt: new Date() },
      });
      console.log(`🛑 Contact ${fromNumber} opted out via keyword "${upperText}".`);
    }

    // Find or create Contact
    let contact = await prisma.contact.findFirst({
      where: { tenantId: config.tenantId, phoneNumber: fromNumber },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: config.tenantId,
          phoneNumber: fromNumber,
          firstName: messageObj.profile?.name || 'Customer',
        },
      });
    }

    // Upsert Conversation
    const conversation = await prisma.conversation.upsert({
      where: {
        tenantId_contactId: {
          tenantId: config.tenantId,
          contactId: contact.id,
        },
      },
      update: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
      create: {
        tenantId: config.tenantId,
        contactId: contact.id,
        unreadCount: 1,
      },
    });

    // Determine message type
    const rawType = (messageObj.type || 'text').toUpperCase();

    // Create Chat Message entry
    await prisma.chatMessage.create({
      data: {
        tenantId: config.tenantId,
        conversationId: conversation.id,
        metaMessageId: messageObj.id,
        direction: 'INBOUND',
        messageType: rawType,
        body: textBody,
        status: 'RECEIVED',
        rawPayload: JSON.stringify(messageObj),
      },
    });
  }
}
