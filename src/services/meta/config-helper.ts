import { prisma } from '@/lib/prisma';
import { WhatsAppCloudApiClient } from './whatsapp-client';

export async function getTenantWhatsAppClient(tenantId: string): Promise<{
  client: WhatsAppCloudApiClient;
  config: any;
}> {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    throw new Error('WhatsApp configuration not found for this tenant.');
  }

  const client = new WhatsAppCloudApiClient({
    phoneNumberId: config.phoneNumberId,
    wabaId: config.wabaId,
    accessToken: config.encryptedAccessToken,
  });

  return { client, config };
}
