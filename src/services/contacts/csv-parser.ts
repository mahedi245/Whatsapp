import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { normalizePhoneNumber } from './normalizer';

export interface ColumnMapping {
  phoneColumn: string;
  firstNameColumn?: string;
  lastNameColumn?: string;
  companyColumn?: string;
  emailColumn?: string;
  customAttributeColumns?: Record<string, string>; // { "due_amount": "Total Due", "quotation_no": "Quote ID" }
}

export interface ParsedContactRow {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  customAttributes: Record<string, string>;
  isValid: boolean;
  validationError?: string;
}

export class ContactFileParser {
  /**
   * Parse CSV content from string or buffer
   */
  static parseCsv(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
    const result = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    return {
      headers: result.meta.fields || [],
      rows: result.data,
    };
  }

  /**
   * Parse Excel (.xlsx or .xls) from buffer
   */
  static parseExcel(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      raw: false,
      defval: '',
    });

    if (jsonData.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map((row) => {
      const stringifiedRow: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        stringifiedRow[k] = String(v ?? '').trim();
      }
      return stringifiedRow;
    });

    return { headers, rows };
  }

  /**
   * Apply column mapping to transform raw rows into sanitized contact models
   */
  static mapRowsToContacts(
    rawRows: Record<string, string>[],
    mapping: ColumnMapping,
    defaultCountryCode: string = '880'
  ): ParsedContactRow[] {
    return rawRows.map((row) => {
      const rawPhone = row[mapping.phoneColumn] || '';
      const normalizedPhone = normalizePhoneNumber(rawPhone, defaultCountryCode);

      const isValid = normalizedPhone.length >= 10 && normalizedPhone.startsWith('+');

      const customAttrs: Record<string, string> = {};
      if (mapping.customAttributeColumns) {
        for (const [attrKey, fileCol] of Object.entries(mapping.customAttributeColumns)) {
          if (row[fileCol] !== undefined) {
            customAttrs[attrKey] = String(row[fileCol]).trim();
          }
        }
      }

      // Also copy all remaining columns as custom attributes if unmapped
      for (const [k, v] of Object.entries(row)) {
        if (
          k !== mapping.phoneColumn &&
          k !== mapping.firstNameColumn &&
          k !== mapping.lastNameColumn &&
          k !== mapping.companyColumn &&
          k !== mapping.emailColumn &&
          !Object.values(mapping.customAttributeColumns || {}).includes(k)
        ) {
          const sanitizedKey = k.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (sanitizedKey && !customAttrs[sanitizedKey]) {
            customAttrs[sanitizedKey] = v;
          }
        }
      }

      return {
        phoneNumber: normalizedPhone,
        firstName: mapping.firstNameColumn ? row[mapping.firstNameColumn] : undefined,
        lastName: mapping.lastNameColumn ? row[mapping.lastNameColumn] : undefined,
        company: mapping.companyColumn ? row[mapping.companyColumn] : undefined,
        email: mapping.emailColumn ? row[mapping.emailColumn] : undefined,
        customAttributes: customAttrs,
        isValid,
        validationError: isValid ? undefined : `Invalid phone number: "${rawPhone}"`,
      };
    });
  }
}
