/**
 * Normalizes phone numbers to standard E.164 format.
 * Examples:
 *   "01711-000001" (with defaultCountryCode 880) -> "+8801711000001"
 *   "+1 (555) 123-4567" -> "+15551234567"
 *   "8801811000002" -> "+8801811000002"
 */
export function normalizePhoneNumber(
  rawPhone: string,
  defaultCountryCode: string = '880'
): string {
  if (!rawPhone) return '';

  // Remove whitespace, dashes, parens, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 00 (international prefix), replace with +
  if (cleaned.startsWith('00')) {
    return `+${cleaned.substring(2)}`;
  }

  // If starts with single 0 (local national number), replace 0 with default country code
  if (cleaned.startsWith('0')) {
    return `+${defaultCountryCode}${cleaned.substring(1)}`;
  }

  // If starts with country code without plus
  if (cleaned.startsWith(defaultCountryCode)) {
    return `+${cleaned}`;
  }

  // Fallback prepend +
  return `+${cleaned}`;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
