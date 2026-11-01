import { prisma } from '@/lib/prisma';
import { WhatsAppCloudApiClient, MetaApiError } from '../meta/whatsapp-client';
import { TokenBucketRateLimiter } from './rate-limiter';
import { VariableResolver } from '../campaign/variable-resolver';

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
    const client = new WhatsAppCloudApiClient({
      phoneNumberId: whatsAppConfig.phoneNumberId,
      wabaId: whatsAppConfig.wabaId,
      accessToken: whatsAppConfig.encryptedAccessToken,
    });

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

        // Wait for rate-limiter token to maintain safe dispatch speed
        await this.limiter.acquire();

        try {
          // Resolve personalized variables
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

          // Dispatch to Meta WhatsApp Cloud API
          const response = await client.sendTemplateMessage({
            to: msg.recipientNumber,
            templateName: campaign.template.name,
            languageCode: campaign.template.language,
            components,
          });

          const metaId = response.messages?.[0]?.id || `wamid.${Date.now()}`;

          // Update message record
          await prisma.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: 'SENT',
              metaMessageId: metaId,
              sentAt: new Date(),
              dynamicValuesJson: JSON.stringify(components),
            },
          });

          // Increment campaign counter & tenant billing usage
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

          // Anti-Ban Protection: Pause automatically on 15 consecutive failures
          if (consecutiveErrors >= 15) {
            console.warn(
              `⚠️ Campaign ${this.campaignId} automatically PAUSED due to 15 consecutive Meta API errors.`
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
