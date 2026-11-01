import {
  MetaAuthConfig,
  SendTemplateMessageRequest,
  SendDirectMessageRequest,
  MetaMessageResponse,
  MetaPhoneHealth,
  MetaErrorPayload,
} from './types';

export class WhatsAppCloudApiClient {
  private readonly baseUrl = 'https://graph.facebook.com/v20.0';
  private readonly auth: MetaAuthConfig;
  private readonly isMockMode: boolean;

  constructor(auth: MetaAuthConfig) {
    this.auth = auth;
    // Auto-detect mock/test mode for local development or demo tokens
    this.isMockMode =
      !auth.accessToken ||
      auth.accessToken.startsWith('EAAXxXx_Sample') ||
      auth.phoneNumberId.startsWith('101234567890');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const metaError = responseBody as MetaErrorPayload;
      const errorMsg =
        metaError.error?.message ||
        metaError.error?.error_data?.details ||
        response.statusText;
      const errorCode = metaError.error?.code || response.status;
      const subcode = metaError.error?.error_subcode;

      throw new MetaApiError(errorMsg, errorCode, subcode, metaError.error?.fbtrace_id);
    }

    return responseBody as T;
  }

  // 1. Send Marketing, Utility, or Authentication Template Message
  async sendTemplateMessage(payload: SendTemplateMessageRequest): Promise<MetaMessageResponse> {
    const cleanTo = payload.to.replace(/[^\d+]/g, '');

    if (this.isMockMode) {
      // Return realistic simulated Meta response
      const randomId = Math.random().toString(36).substring(2, 15);
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: cleanTo, wa_id: cleanTo.replace('+', '') }],
        messages: [{ id: `wamid.HBg${Date.now()}mock${randomId}` }],
      };
    }

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: payload.templateName,
        language: {
          code: payload.languageCode,
        },
        components: payload.components,
      },
    };

    return this.request<MetaMessageResponse>(`${this.auth.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // 2. Send 24-hour Session Direct Message (Text or Rich Media)
  async sendDirectMessage(payload: SendDirectMessageRequest): Promise<MetaMessageResponse> {
    const cleanTo = payload.to.replace(/[^\d+]/g, '');

    if (this.isMockMode) {
      const randomId = Math.random().toString(36).substring(2, 15);
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: cleanTo, wa_id: cleanTo.replace('+', '') }],
        messages: [{ id: `wamid.HBg${Date.now()}mock${randomId}` }],
      };
    }

    let body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
    };

    if (payload.type === 'text') {
      body = {
        ...body,
        type: 'text',
        text: { body: payload.text || '' },
      };
    } else if (payload.type === 'document') {
      body = {
        ...body,
        type: 'document',
        document: {
          link: payload.mediaUrl,
          filename: payload.mediaFilename || 'Document.pdf',
        },
      };
    } else if (payload.type === 'image') {
      body = {
        ...body,
        type: 'image',
        image: {
          link: payload.mediaUrl,
        },
      };
    }

    return this.request<MetaMessageResponse>(`${this.auth.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // 3. Fetch Approved Templates from Meta WABA
  async fetchTemplates(): Promise<any[]> {
    if (this.isMockMode) {
      return [
        {
          id: '987654321001',
          name: 'b2b_quotation_pdf_delivery',
          status: 'APPROVED',
          category: 'MARKETING',
          language: 'en_US',
          components: [
            {
              type: 'HEADER',
              format: 'DOCUMENT',
              example: {
                header_handle: ['https://example.com/quotations/sample_quote.pdf'],
              },
            },
            {
              type: 'BODY',
              text: 'Hello {{1}},\n\nThank you for choosing Acme Solutions! Please find attached your official Quotation (Ref: {{2}}) for {{3}}.\n\nYour exclusive discount of {{4}} has been applied. Let us know if you would like to proceed with the order.\n\nBest regards,\nAcme Sales Team',
            },
            {
              type: 'FOOTER',
              text: 'Reply STOP to unsubscribe at any time.',
            },
            {
              type: 'BUTTONS',
              buttons: [
                { type: 'QUICK_REPLY', text: 'Confirm Order ✅' },
                { type: 'QUICK_REPLY', text: 'Request Call 📞' },
              ],
            },
          ],
        },
        {
          id: '987654321002',
          name: 'product_catalogue_showcase',
          status: 'APPROVED',
          category: 'MARKETING',
          language: 'en_US',
          components: [
            {
              type: 'HEADER',
              format: 'IMAGE',
              example: {
                header_handle: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff'],
              },
            },
            {
              type: 'BODY',
              text: 'Dear {{1}},\n\nDiscover our brand new Product Catalogue for {{2}}! We have introduced over 50+ new wholesale items with special pricing for {{3}}.\n\nCheck out the catalogue now or reply to this message to speak with your dedicated account manager.',
            },
            {
              type: 'FOOTER',
              text: 'Acme Wholesale Catalogue 2026',
            },
            {
              type: 'BUTTONS',
              buttons: [
                { type: 'URL', text: 'View Online Catalog', url: 'https://example.com/catalog' },
                { type: 'QUICK_REPLY', text: 'Talk to Sales' },
              ],
            },
          ],
        },
      ];
    }

    const res = await this.request<{ data: any[] }>(
      `${this.auth.wabaId}/message_templates?fields=name,status,category,language,components&limit=100`
    );
    return res.data;
  }

  // 4. Query Health Score & Tier Status
  async getPhoneHealthAndTier(): Promise<MetaPhoneHealth> {
    if (this.isMockMode) {
      return {
        id: this.auth.phoneNumberId,
        verified_name: 'Acme Solutions Official',
        display_phone_number: '+1 555-0199',
        quality_rating: 'GREEN',
        messaging_limit_tier: 'TIER_1K',
        code_verification_status: 'VERIFIED',
      };
    }

    return this.request<MetaPhoneHealth>(
      `${this.auth.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,messaging_limit_tier,code_verification_status`
    );
  }

  // 5. Mark Inbound Message as Read
  async markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
    if (this.isMockMode) {
      return { success: true };
    }

    return this.request<{ success: boolean }>(`${this.auth.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  }
}

export class MetaApiError extends Error {
  public code: number;
  public subcode?: number;
  public fbtraceId?: string;

  constructor(message: string, code: number, subcode?: number, fbtraceId?: string) {
    super(`Meta API Error [${code}${subcode ? `:${subcode}` : ''}]: ${message}`);
    this.name = 'MetaApiError';
    this.code = code;
    this.subcode = subcode;
    this.fbtraceId = fbtraceId;
  }

  get isRateLimit(): boolean {
    return this.code === 130429 || this.code === 80007;
  }

  get isSpamOrPolicyBlock(): boolean {
    return this.code === 131031 || this.code === 368 || this.code === 133010;
  }

  get isInvalidNumber(): boolean {
    return this.code === 131026;
  }
}
