import { TemplateComponentPayload, TemplateParameter } from '../meta/types';

export interface ContactData {
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  customAttributes?: string | null; // JSON String: { "due_amount": "500", ... }
}

export interface MediaConfig {
  mediaType: string; // NONE, DOCUMENT, IMAGE, VIDEO
  mediaUrl: string;
  filename?: string;
}

export class VariableResolver {
  /**
   * Resolves dynamic template components for a specific contact recipient
   */
  static resolveComponents(
    rawComponentsJson: string,
    variableMappingJson: string,
    contact: ContactData,
    mediaConfig?: MediaConfig
  ): TemplateComponentPayload[] {
    const components = JSON.parse(rawComponentsJson || '[]') as any[];
    const mappings = JSON.parse(variableMappingJson || '{}') as Record<string, string>;
    const customAttrs = JSON.parse(contact.customAttributes || '{}') as Record<string, string>;

    const result: TemplateComponentPayload[] = [];

    for (const comp of components) {
      // 1. Process HEADER Media or Text
      if (comp.type === 'HEADER') {
        if (comp.format === 'DOCUMENT' && mediaConfig?.mediaUrl) {
          result.push({
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: mediaConfig.mediaUrl,
                  filename: mediaConfig.filename || 'Quotation_Document.pdf',
                },
              },
            ],
          });
        } else if (comp.format === 'IMAGE' && mediaConfig?.mediaUrl) {
          result.push({
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: mediaConfig.mediaUrl },
              },
            ],
          });
        } else if (comp.format === 'VIDEO' && mediaConfig?.mediaUrl) {
          result.push({
            type: 'header',
            parameters: [
              {
                type: 'video',
                video: { link: mediaConfig.mediaUrl },
              },
            ],
          });
        } else if (comp.format === 'TEXT') {
          // Dynamic text in header
          const val = this.extractValue('header_1', mappings, contact, customAttrs);
          result.push({
            type: 'header',
            parameters: [{ type: 'text', text: val }],
          });
        }
      }

      // 2. Process BODY Text Parameters {{1}}, {{2}}, etc.
      if (comp.type === 'BODY') {
        const bodyParams: TemplateParameter[] = [];
        const matches = (comp.text || '').match(/\{\{(\d+)\}\}/g) || [];

        for (let i = 1; i <= matches.length; i++) {
          const mappedKey = mappings[`body_${i}`] || mappings[`${i}`] || `body_${i}`;
          const resolvedValue = this.extractValue(mappedKey, mappings, contact, customAttrs);
          bodyParams.push({
            type: 'text',
            text: resolvedValue,
          });
        }

        if (bodyParams.length > 0) {
          result.push({
            type: 'body',
            parameters: bodyParams,
          });
        }
      }

      // 3. Process URL Button Dynamic Parameters
      if (comp.type === 'BUTTONS' && comp.buttons) {
        comp.buttons.forEach((btn: any, index: number) => {
          if (btn.type === 'URL' && btn.url && btn.url.includes('{{1}}')) {
            const mappedKey = mappings[`button_${index}`] || 'order_link';
            const resolvedValue = this.extractValue(mappedKey, mappings, contact, customAttrs);
            result.push({
              type: 'button',
              sub_type: 'url',
              index: String(index),
              parameters: [{ type: 'text', text: resolvedValue }],
            });
          }
        });
      }
    }

    return result;
  }

  private static extractValue(
    key: string,
    mappings: Record<string, string>,
    contact: ContactData,
    customAttrs: Record<string, string>
  ): string {
    const attributeName = mappings[key] || key;

    if (attributeName === 'firstName') return contact.firstName || 'Valued Customer';
    if (attributeName === 'lastName') return contact.lastName || '';
    if (attributeName === 'fullName') {
      const full = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      return full || 'Valued Customer';
    }
    if (attributeName === 'company') return contact.company || 'Your Company';
    if (attributeName === 'phone' || attributeName === 'phoneNumber') return contact.phoneNumber;
    if (attributeName === 'email') return contact.email || '';

    // Check custom attribute key (case-insensitive fallback)
    if (customAttrs[attributeName] !== undefined && customAttrs[attributeName] !== '') {
      return String(customAttrs[attributeName]);
    }

    const lowerKey = attributeName.toLowerCase();
    for (const [k, v] of Object.entries(customAttrs)) {
      if (k.toLowerCase() === lowerKey && v) {
        return String(v);
      }
    }

    // Default fallback from mapping
    const fallback = mappings[`fallback_${key}`];
    if (fallback) return fallback;

    return '-';
  }
}
