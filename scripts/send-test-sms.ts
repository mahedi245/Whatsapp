import { WhatsAppCloudApiClient } from '../src/services/meta/whatsapp-client';

async function sendTest() {
  console.log('🚀 Dispatching test WhatsApp message to +8801608700420...');

  const client = new WhatsAppCloudApiClient({
    phoneNumberId: '1316638444876007',
    wabaId: '2423715105131368',
    accessToken: 'EAAXxXx_SamplePermanentMetaToken_xXxX',
  });

  const res = await client.sendTemplateMessage({
    to: '+8801608700420',
    templateName: 'b2b_quotation_pdf_delivery',
    languageCode: 'en_US',
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
              filename: 'Official-Quotation-QT-2026.pdf',
            },
          },
        ],
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Valued Client' },
          { type: 'text', text: 'QT-2026-001' },
          { type: 'text', text: 'WhatsApp Bulk Messaging Software' },
          { type: 'text', text: '20% Special Discount' },
        ],
      },
    ],
  });

  console.log('✅ Test message dispatched successfully! Meta Response ID:', JSON.stringify(res, null, 2));
}

sendTest().catch(console.error);
