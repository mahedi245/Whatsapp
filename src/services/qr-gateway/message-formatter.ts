import { ContactData, MediaConfig } from '../campaign/variable-resolver';

export interface BaileysFormattedMessage {
  text: string;
  mediaType: 'NONE' | 'DOCUMENT' | 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
  mediaFilename?: string;
  mediaMimeType?: string;
}

export class BaileysMessageFormatter {
  /**
   * Transforms template components and variable mappings into WhatsApp-native
   * markdown text with media attachments ready for Baileys socket dispatch.
   */
  static formatMessage(
    rawComponentsJson: string,
    variableMappingJson: string,
    contact: ContactData,
    mediaConfig?: MediaConfig
  ): BaileysFormattedMessage {
    const components = JSON.parse(rawComponentsJson || '[]') as any[];
    const mappings = JSON.parse(variableMappingJson || '{}') as Record<string, string>;
    const customAttrs = JSON.parse(contact.customAttributes || '{}') as Record<string, string>;

    let headerText = '';
    let bodyText = '';
    let footerText = '';
    const buttonTexts: string[] = [];

    let mediaType: 'NONE' | 'DOCUMENT' | 'IMAGE' | 'VIDEO' = 'NONE';
    let mediaUrl = mediaConfig?.mediaUrl;
    let mediaFilename = mediaConfig?.filename;
    let mediaMimeType: string | undefined;

    for (const comp of components) {
      // 1. Process HEADER
      if (comp.type === 'HEADER') {
        if (comp.format === 'DOCUMENT' && mediaConfig?.mediaUrl) {
          mediaType = 'DOCUMENT';
          mediaFilename = mediaConfig.filename || 'Attachment.pdf';
          mediaMimeType = 'application/pdf';
        } else if (comp.format === 'IMAGE' && mediaConfig?.mediaUrl) {
          mediaType = 'IMAGE';
          mediaMimeType = 'image/jpeg';
        } else if (comp.format === 'VIDEO' && mediaConfig?.mediaUrl) {
          mediaType = 'VIDEO';
          mediaMimeType = 'video/mp4';
        } else if (comp.format === 'TEXT' && comp.text) {
          const val = this.extractValue('header_1', mappings, contact, customAttrs);
          headerText = `*${comp.text.replace(/\{\{1\}\}/g, val)}*\n\n`;
        }
      }

      // 2. Process BODY
      if (comp.type === 'BODY') {
        let text = comp.text || '';
        const matches = text.match(/\{\{(\d+)\}\}/g) || [];

        for (let i = 1; i <= matches.length; i++) {
          const mappedKey = mappings[`body_${i}`] || mappings[`${i}`] || `body_${i}`;
          const val = this.extractValue(mappedKey, mappings, contact, customAttrs);
          const regex = new RegExp(`\\{\\{${i}\\}\\}`, 'g');
          text = text.replace(regex, val);
        }
        bodyText = text;
      }

      // 3. Process FOOTER
      if (comp.type === 'FOOTER' && comp.text) {
        footerText = `\n\n_${comp.text}_`;
      }

      // 4. Process BUTTONS
      if (comp.type === 'BUTTONS' && Array.isArray(comp.buttons)) {
        comp.buttons.forEach((btn: any, index: number) => {
          if (btn.type === 'URL' && btn.url) {
            let url = btn.url;
            if (url.includes('{{1}}')) {
              const mappedKey = mappings[`button_${index}`] || 'order_link';
              const val = this.extractValue(mappedKey, mappings, contact, customAttrs);
              url = url.replace(/\{\{1\}\}/g, val);
            }
            buttonTexts.push(`🔗 ${btn.text}: ${url}`);
          } else if (btn.text) {
            buttonTexts.push(`🔘 ${btn.text}`);
          }
        });
      }
    }

    // Assemble final WhatsApp markdown text
    let fullText = `${headerText}${bodyText}${footerText}`;
    if (buttonTexts.length > 0) {
      fullText += `\n\n${buttonTexts.join('\n')}`;
    }

    return {
      text: fullText.trim(),
      mediaType,
      mediaUrl,
      mediaFilename,
      mediaMimeType,
    };
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

    if (customAttrs[attributeName] !== undefined && customAttrs[attributeName] !== '') {
      return String(customAttrs[attributeName]);
    }

    const lowerKey = attributeName.toLowerCase();
    for (const [k, v] of Object.entries(customAttrs)) {
      if (k.toLowerCase() === lowerKey && v) {
        return String(v);
      }
    }

    const fallback = mappings[`fallback_${key}`];
    if (fallback) return fallback;

    return '-';
  }
}
