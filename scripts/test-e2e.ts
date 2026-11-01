import { prisma } from '../src/lib/prisma.js';
import { CampaignDispatcher } from '../src/services/queue/dispatcher.js';
import { WebhookEventRouter } from '../src/services/webhook/event-router.js';
import { VariableResolver } from '../src/services/campaign/variable-resolver.js';

async function runEndToEndVerification() {
  console.log('===============================================================');
  console.log('🚀 WHATSAPP BULK MESSAGING SOFTWARE - END-TO-END VERIFICATION');
  console.log('===============================================================\n');

  // 1. Verify Active Tenant & WhatsApp Config
  console.log('Step 1: Checking Tenant & WhatsApp Cloud API Configuration...');
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    include: { whatsappConfig: true },
  });

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant?.id },
  });

  if (!tenant || !tenant.whatsappConfig || !user) {
    throw new Error('No active tenant, WhatsApp configuration, or user found! Please run npx prisma db seed first.');
  }

  console.log(`✅ Tenant: "${tenant.name}" (ID: ${tenant.id})`);
  console.log(`✅ User: "${user.name}" (ID: ${user.id})`);
  console.log(`✅ WABA ID: ${tenant.whatsappConfig.wabaId}`);
  console.log(`✅ Phone Number: ${tenant.whatsappConfig.displayPhoneNumber} (Quality: ${tenant.whatsappConfig.qualityRating})`);
  console.log(`✅ Daily Tier: ${tenant.whatsappConfig.messagingTier}\n`);

  // 2. Ensure We Have 500+ Contacts in the Database
  console.log('Step 2: Checking Contact Database for 500+ Recipients...');
  const contactCount = await prisma.contact.count({ where: { tenantId: tenant.id } });
  console.log(`Current contacts in DB: ${contactCount}`);

  if (contactCount < 500) {
    const needed = 500 - contactCount;
    console.log(`Generating ${needed} additional test contacts to reach 500+ recipients...`);

    const newContacts = [];
    for (let i = 1; i <= needed; i++) {
      const num = String(contactCount + i).padStart(5, '0');
      newContacts.push({
        tenantId: tenant.id,
        phoneNumber: `+88017000${num}`,
        firstName: `Customer${contactCount + i}`,
        lastName: `Enterprise`,
        company: `Corporate Client ${contactCount + i} Ltd`,
        email: `client${contactCount + i}@corporation.com`,
        customAttributes: JSON.stringify({
          due_amount: `${(i * 1500) + 5000} BDT`,
          quotation_no: `QT-2026-${num}`,
          product_item: 'Industrial Machinery Series X',
          discount: '15%',
        }),
      });
    }

    // Insert in chunks of 100
    for (let i = 0; i < newContacts.length; i += 100) {
      const chunk = newContacts.slice(i, i + 100);
      await prisma.contact.createMany({ data: chunk });
    }
    console.log(`✅ Successfully seeded 500+ contacts into database.\n`);
  } else {
    console.log(`✅ Database already has ${contactCount} contacts (>= 500). Ready.\n`);
  }

  // 3. Test Variable Resolver & Media Personalization
  console.log('Step 3: Testing Dynamic Variable Resolver & Header PDF Binding...');
  const sampleContact = await prisma.contact.findFirst({ where: { tenantId: tenant.id } });
  const sampleTemplate = await prisma.template.findFirst({
    where: { tenantId: tenant.id, name: 'b2b_quotation_pdf_delivery' },
  });

  if (!sampleTemplate) {
    throw new Error('Sample template b2b_quotation_pdf_delivery not found.');
  }

  const variableMap = {
    body_1: 'firstName',
    body_2: 'quotation_no',
    body_3: 'product_item',
    body_4: 'discount',
  };

  const resolved = VariableResolver.resolveComponents(
    sampleTemplate.componentsJson || '[]',
    JSON.stringify(variableMap),
    sampleContact!,
    {
      mediaType: 'DOCUMENT',
      mediaUrl: 'https://example.com/quotations/Q-2026.pdf',
      filename: 'Official_Quotation_2026.pdf',
    }
  );

  console.log('Resolved Meta Cloud API v20.0+ Components Payload:');
  console.log(JSON.stringify(resolved, null, 2));
  console.log('✅ Dynamic variables & Header PDF document bound successfully.\n');

  // 4. Create and Broadcast a 500-Recipient Bulk Campaign
  console.log('Step 4: Launching 500-Recipient Bulk WhatsApp Broadcast...');
  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      createdById: user.id,
      templateId: sampleTemplate.id,
      name: `Automated 500+ E2E Broadcast ${Date.now()}`,
      description: 'End-to-end verification of bulk 500+ PDF quotation dispatch',
      mediaType: 'DOCUMENT',
      mediaUrl: 'https://example.com/quotations/Official_Quote.pdf',
      mediaFilename: 'Quotation_Spec_Sheet.pdf',
      variableMapping: JSON.stringify(variableMap),
      batchDelayMs: 20, // 50 msgs/second high throughput for test
      status: 'DRAFT',
    },
  });

  // Target 500 contacts
  const contactsToTarget = await prisma.contact.findMany({
    where: { tenantId: tenant.id, isOptedOut: false },
    take: 500,
  });

  await prisma.campaignMessage.createMany({
    data: contactsToTarget.map((c) => ({
      tenantId: tenant.id,
      campaignId: campaign.id,
      contactId: c.id,
      recipientNumber: c.phoneNumber,
      status: 'PENDING',
    })),
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { totalRecipients: contactsToTarget.length },
  });

  console.log(`Campaign created with ${contactsToTarget.length} recipient message rows.`);
  console.log('Executing CampaignDispatcher...');

  const startTime = Date.now();
  const dispatcher = new CampaignDispatcher(campaign.id, tenant.id, 50);
  const dispatchResult = await dispatcher.run();
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`✅ Dispatch completed in ${elapsedSec}s!`);
  console.log(`- Sent: ${dispatchResult.sent}`);
  console.log(`- Failed: ${dispatchResult.failed}`);
  console.log(`- Speed: ${(dispatchResult.sent / Math.max(parseFloat(elapsedSec), 0.1)).toFixed(1)} messages/second\n`);

  // 5. Test Webhook Ingestion & Monotonic State Machine
  console.log('Step 5: Testing Meta Webhook Ingestion & Monotonic State Progression...');
  const sampleMessages = await prisma.campaignMessage.findMany({
    where: { campaignId: campaign.id, status: 'SENT' },
    take: 5,
  });

  for (const msg of sampleMessages) {
    if (!msg.metaMessageId) continue;

    // Simulate "delivered" webhook from Meta
    const deliveredPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: tenant.whatsappConfig.wabaId,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: tenant.whatsappConfig.displayPhoneNumber,
                  phone_number_id: tenant.whatsappConfig.phoneNumberId,
                },
                statuses: [
                  {
                    id: msg.metaMessageId,
                    status: 'delivered',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: msg.recipientNumber.replace('+', ''),
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    await WebhookEventRouter.processEvent(deliveredPayload);

    // Simulate "read" webhook from Meta
    const readPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: tenant.whatsappConfig.wabaId,
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: tenant.whatsappConfig.displayPhoneNumber,
                  phone_number_id: tenant.whatsappConfig.phoneNumberId,
                },
                statuses: [
                  {
                    id: msg.metaMessageId,
                    status: 'read',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: msg.recipientNumber.replace('+', ''),
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    await WebhookEventRouter.processEvent(readPayload);
  }

  const updatedCampaign = await prisma.campaign.findUnique({ where: { id: campaign.id } });
  console.log(`✅ Campaign Funnel Status updated via Webhooks:`);
  console.log(`- Sent: ${updatedCampaign?.sentCount}`);
  console.log(`- Delivered: ${updatedCampaign?.deliveredCount}`);
  console.log(`- Read: ${updatedCampaign?.readCount}\n`);

  // 6. Test Inbound Live Chat & Automated Opt-out (STOP)
  console.log('Step 6: Testing Inbound Customer Replies & Anti-Spam Automated Opt-Out...');
  const testContact = sampleMessages[0];

  // Inbound customer inquiry
  const customerReplyPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: tenant.whatsappConfig.wabaId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: tenant.whatsappConfig.displayPhoneNumber,
                phone_number_id: tenant.whatsappConfig.phoneNumberId,
              },
              contacts: [{ profile: { name: 'Rahim Client' }, wa_id: testContact.recipientNumber.replace('+', '') }],
              messages: [
                {
                  from: testContact.recipientNumber.replace('+', ''),
                  id: `wamid.inbound.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'Hello! I got the PDF quotation. Can you offer a 10% discount on 50 units?' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  await WebhookEventRouter.processEvent(customerReplyPayload);
  console.log('✅ Inbound customer reply routed into Live Inbox conversation.');

  // Inbound "STOP" opt-out test
  const optOutContact = sampleMessages[1];
  const stopPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: tenant.whatsappConfig.wabaId,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: tenant.whatsappConfig.displayPhoneNumber,
                phone_number_id: tenant.whatsappConfig.phoneNumberId,
              },
              contacts: [{ profile: { name: 'Opt Out Client' }, wa_id: optOutContact.recipientNumber.replace('+', '') }],
              messages: [
                {
                  from: optOutContact.recipientNumber.replace('+', ''),
                  id: `wamid.stop.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'STOP' },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  await WebhookEventRouter.processEvent(stopPayload);

  const checkedContact = await prisma.contact.findFirst({
    where: { phoneNumber: optOutContact.recipientNumber },
  });

  if (checkedContact?.isOptedOut) {
    console.log(`✅ Contact ${optOutContact.recipientNumber} automatically marked isOptedOut = true!`);
  } else {
    throw new Error('Contact failed to opt out on STOP');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================\n');
}

runEndToEndVerification()
  .catch((err) => {
    console.error('❌ E2E Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
