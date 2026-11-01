import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { WebhookEventRouter } from '@/services/webhook/event-router';

// 1. GET: Meta Webhook Challenge Handshake Verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe') {
    const defaultToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'whatsapp_bulk_verify_2026';

    // Check database config, environment variable, or default fallback token
    let isValid = token === defaultToken || token === 'whatsapp_bulk_verify_2026';

    if (!isValid && token) {
      try {
        const config = await prisma.whatsAppConfig.findFirst({
          where: { webhookVerifyToken: token },
        });
        if (config) {
          isValid = true;
        }
      } catch (err) {
        // Database might not be fully initialized yet during early test
      }
    }

    if (isValid && challenge) {
      console.log('✅ Meta Webhook challenge verified successfully');
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// 2. POST: Event Ingestion (Delivery Statuses & Inbound Messages)
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Optional HMAC validation if app secret is provided
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')}`;

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Save audit log asynchronously
    prisma.webhookLog
      .create({
        data: {
          eventType: 'messages',
          payloadJson: rawBody,
          isProcessed: true,
        },
      })
      .catch((e) => console.error('Error logging webhook:', e));

    // Process delivery statuses and customer replies
    await WebhookEventRouter.processEvent(payload);

    // Return immediate HTTP 200 to acknowledge Meta
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook ingestion error:', error);
    // Still return 200 so Meta doesn't disable the webhook endpoint
    return NextResponse.json({ status: 'error_handled', error: error.message }, { status: 200 });
  }
}
