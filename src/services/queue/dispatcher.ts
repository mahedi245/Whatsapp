import { prisma } from '@/lib/prisma';
import { WhatsAppCloudApiClient, MetaApiError } from '../meta/whatsapp-client';
import { TokenBucketRateLimiter } from './rate-limiter';
import { VariableResolver } from '../campaign/variable-resolver';
import { BaileysSessionManager } from '../qr-gateway/session-manager';
import { BaileysMessageFormatter } from '../qr-gateway/message-formatter';

export class CampaignDispatcher {
  private campaignId: string;
  private tenantId: string;
  private limiter: TokenBucketRateLimiter;
  private isCancelled: boolean = false;

  constructor(campaignId: string, tenantId: string, messagesPerSecond: number = 25) {
    this.campaignId = campaignId;
    this.tenantId = tenantId;
    this.limiter = new TokenBucketRateLimiter(messagesPerSecond);
  }

  async run(): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    status: string;
  }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: this.campaignId },
      include: {
        template: true,
        tenant: {
          include: { whatsappConfig: true },
        },
      },
    });

    if (!campaign) {
      throw new Error(`Campaign ${this.campaignId} not found`);
    }

    if (!campaign.tenant.whatsappConfig) {
      throw new Error('Tenant does not have WhatsApp API configured');
    }

    const whatsAppConfig = campaign.tenant.whatsappConfig;
    const isBaileys = (whatsAppConfig.gatewayProvider || 'BAILEYS') === 'BAILEYS';

    const metaClient = !isBaileys
      ? new WhatsAppCloudApiClient({
          phoneNumberId: whatsAppConfig.phoneNumberId,
          wabaId: whatsAppConfig.wabaId,
          accessToken: whatsAppConfig.encryptedAccessToken,
        })
      : null;

    const baileysManager = isBaileys ? BaileysSessionManager.getInstance() : null;

    // Mark campaign as PROCESSING
    await prisma.campaign.update({
      where: { id: this.campaignId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    const BATCH_SIZE = 50;
    let hasMore = true;
    let consecutiveErrors = 0;
    let totalSentInRun = 0;
    let totalFailedInRun = 0;

    while (hasMore && !this.isCancelled) {
      const messages = await prisma.campaignMessage.findMany({
        where: {
          campaignId: this.campaignId,
          status: 'PENDING',
        },
        include: { contact: true },
        take: BATCH_SIZE,
      });

      if (messages.length === 0) {
        hasMore = false;
        break;
      }

      for (const msg of messages) {
        if (this.isCancelled) break;

        // Anti-Spam Check: Skip opted-out contacts
        if (msg.contact.isOptedOut) {
          await prisma.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: 'FAILED',
              errorCode: 'OPT_OUT',
              errorMessage: 'Contact previously opted out (STOP received)',
              failedAt: new Date(),
            },
          });
          totalFailedInRun++;
          await prisma.campaign.update({
            where: { id: this.campaignId },
            data: { failedCount: { increment: 1 } },
          });
          continue;
        }

        // Anti-Ban Rate Limiting:
        if (isBaileys) {
          // 1. Enforce randomized human delay: 3.5s to 7.5s between messages
          const jitterDelay = Math.floor(Math.random() * (7500 - 3500 + 1)) + 3500;
          await new Promise((resolve) => setTimeout(resolve, jitterDelay));

          // 2. Anti-Ban Batch Rest Interval: Every 25 messages, rest for 45-60 seconds
          if (totalSentInRun > 0 && totalSentInRun % 25 === 0) {
            console.log(
              `⏸️ Anti-ban safeguard: Pausing campaign ${this.campaignId} for 45s rest after ${totalSentInRun} messages.`
            );
            await new Promise((resolve) => setTimeout(resolve, 45000));
          }
        } else {
          // Meta API Token Bucket rate limiter
          await this.limiter.acquire();
        }

        try {
          let messageId: string;
          let auditPayload: string;

          if (isBaileys && baileysManager) {
            // Resolve template to WhatsApp markdown with media for Baileys
            const formatted = BaileysMessageFormatter.formatMessage(
              campaign.template.componentsJson,
              campaign.variableMapping,
              msg.contact,
              campaign.mediaUrl
                ? {
                    mediaType: campaign.mediaType || 'DOCUMENT',
                    mediaUrl: campaign.mediaUrl,
                    filename: campaign.mediaFilename || 'Attachment.pdf',
                  }
                : undefined
            );

            const sendResult = await baileysManager.sendDirectMessage(this.tenantId, {
              to: msg.recipientNumber,
              text: formatted.text,
              mediaUrl: formatted.mediaUrl,
              mediaType: formatted.mediaType,
              filename: formatted.mediaFilename,
              mimeType: formatted.mediaMimeType,
            });

            messageId = sendResult.messageId;
            auditPayload = JSON.stringify(formatted);
          } else {
            // Resolve dynamic variables for Meta Cloud API
            const components = VariableResolver.resolveComponents(
              campaign.template.componentsJson,
              campaign.variableMapping,
              msg.contact,
              campaign.mediaUrl
                ? {
                    mediaType: campaign.mediaType || 'DOCUMENT',
                    mediaUrl: campaign.mediaUrl,
                    filename: campaign.mediaFilename || 'Attachment.pdf',
                  }
                : undefined
            );

            const response = await metaClient!.sendTemplateMessage({
              to: msg.recipientNumber,
              templateName: campaign.template.name,
              languageCode: campaign.template.language,
              components,
            });

            messageId = response.messages?.[0]?.id || `wamid.${Date.now()}`;
            auditPayload = JSON.stringify(components);
          }

          // Update message record as SENT
          await prisma.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: 'SENT',
              metaMessageId: messageId,
              sentAt: new Date(),
              dynamicValuesJson: auditPayload,
            },
          });

          // Increment campaign counter & tenant monthly count
          await prisma.campaign.update({
            where: { id: this.campaignId },
            data: { sentCount: { increment: 1 } },
          });

          await prisma.tenant.update({
            where: { id: this.tenantId },
            data: { messagesSentThisMonth: { increment: 1 } },
          });

          totalSentInRun++;
          consecutiveErrors = 0;
        } catch (error: any) {
          const isMeta = error instanceof MetaApiError;
          consecutiveErrors++;
          totalFailedInRun++;

          await prisma.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: 'FAILED',
              errorCode: isMeta ? `${error.code}` : 'DISPATCH_ERROR',
              errorMessage: error.message,
              failedAt: new Date(),
            },
          });

          await prisma.campaign.update({
            where: { id: this.campaignId },
            data: { failedCount: { increment: 1 } },
          });

          // Anti-Ban Circuit Breaker:
          // For Baileys, pause after 5 errors. For Meta, pause after 15 errors.
          const maxAllowedErrors = isBaileys ? 5 : 15;
          if (consecutiveErrors >= maxAllowedErrors) {
            console.warn(
              `⚠️ Campaign ${this.campaignId} automatically PAUSED due to ${consecutiveErrors} consecutive errors.`
            );
            await prisma.campaign.update({
              where: { id: this.campaignId },
              data: { status: 'PAUSED' },
            });
            this.isCancelled = true;
            break;
          }
        }
      }
    }

    const finalStatus = this.isCancelled ? 'PAUSED' : 'COMPLETED';

    if (!this.isCancelled) {
      await prisma.campaign.update({
        where: { id: this.campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    return {
      success: !this.isCancelled,
      sent: totalSentInRun,
      failed: totalFailedInRun,
      status: finalStatus,
    };
  }

  cancel(): void {
    this.isCancelled = true;
  }
}
