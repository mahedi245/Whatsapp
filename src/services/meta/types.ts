export interface MetaAuthConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
}

export type TemplateComponentType = 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';

export interface TemplateDocumentParameter {
  type: 'document';
  document: {
    link?: string;
    id?: string;
    filename?: string;
  };
}

export interface TemplateImageParameter {
  type: 'image';
  image: {
    link?: string;
    id?: string;
  };
}

export interface TemplateVideoParameter {
  type: 'video';
  video: {
    link?: string;
    id?: string;
  };
}

export interface TemplateTextParameter {
  type: 'text';
  text: string;
}

export interface TemplateCurrencyParameter {
  type: 'currency';
  currency: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
}

export interface TemplateDateTimeParameter {
  type: 'date_time';
  date_time: {
    fallback_value: string;
  };
}

export interface TemplateButtonPayloadParameter {
  type: 'payload';
  payload: string;
}

export interface TemplateButtonTextParameter {
  type: 'text';
  text: string;
}

export type TemplateParameter =
  | TemplateTextParameter
  | TemplateDocumentParameter
  | TemplateImageParameter
  | TemplateVideoParameter
  | TemplateCurrencyParameter
  | TemplateDateTimeParameter
  | TemplateButtonPayloadParameter
  | TemplateButtonTextParameter;

export interface TemplateComponentPayload {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters: TemplateParameter[];
}

export interface SendTemplateMessageRequest {
  to: string; // E.164 normalized format (+88017..., +1...)
  templateName: string;
  languageCode: string;
  components: TemplateComponentPayload[];
}

export interface SendDirectMessageRequest {
  to: string;
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  mediaUrl?: string;
  mediaFilename?: string;
}

export interface MetaMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string; // wamid.HBg...
  }>;
}

export interface MetaPhoneHealth {
  id: string;
  verified_name: string;
  display_phone_number: string;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  messaging_limit_tier: 'TIER_50' | 'TIER_250' | 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED';
  code_verification_status: string;
}

export interface MetaErrorPayload {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_data?: {
      details?: string;
    };
    fbtrace_id: string;
  };
}
