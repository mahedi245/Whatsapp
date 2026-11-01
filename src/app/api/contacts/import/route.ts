import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ContactFileParser, ColumnMapping } from '@/services/contacts/csv-parser';

export async function POST(req: NextRequest) {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data (File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const previewOnly = formData.get('previewOnly') === 'true';

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      let parsed: { headers: string[]; rows: Record<string, string>[] };

      if (fileName.endsWith('.csv')) {
        const text = buffer.toString('utf-8');
        parsed = ContactFileParser.parseCsv(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parsed = ContactFileParser.parseExcel(buffer);
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format. Please upload .csv or .xlsx' },
          { status: 400 }
        );
      }

      if (previewOnly) {
        return NextResponse.json({
          headers: parsed.headers,
          totalRows: parsed.rows.length,
          previewRows: parsed.rows.slice(0, 5),
        });
      }

      // If mapping is provided directly with the file
      const mappingStr = formData.get('mapping') as string | null;
      const mapping: ColumnMapping = mappingStr ? JSON.parse(mappingStr) : { phoneColumn: parsed.headers[0] };
      const tagId = formData.get('tagId') as string | null;
      const groupId = formData.get('groupId') as string | null;

      const mappedContacts = ContactFileParser.mapRowsToContacts(parsed.rows, mapping);

      let importedCount = 0;
      let skippedCount = 0;

      for (const item of mappedContacts) {
        if (!item.isValid) {
          skippedCount++;
          continue;
        }

        const contact = await prisma.contact.upsert({
          where: {
            tenantId_phoneNumber: {
              tenantId: tenant.id,
              phoneNumber: item.phoneNumber,
            },
          },
          update: {
            firstName: item.firstName,
            lastName: item.lastName,
            company: item.company,
            email: item.email,
            customAttributes: JSON.stringify(item.customAttributes),
          },
          create: {
            tenantId: tenant.id,
            phoneNumber: item.phoneNumber,
            firstName: item.firstName,
            lastName: item.lastName,
            company: item.company,
            email: item.email,
            customAttributes: JSON.stringify(item.customAttributes),
          },
        });

        if (tagId) {
          await prisma.contactTagMapping.upsert({
            where: { contactId_tagId: { contactId: contact.id, tagId } },
            update: {},
            create: { contactId: contact.id, tagId },
          });
        }

        if (groupId) {
          await prisma.contactGroupMember.upsert({
            where: { groupId_contactId: { groupId, contactId: contact.id } },
            update: {},
            create: { groupId, contactId: contact.id },
          });
        }

        importedCount++;
      }

      return NextResponse.json({
        success: true,
        total: mappedContacts.length,
        importedCount,
        skippedCount,
      });
    }

    // Handle Direct JSON Execution
    const body = await req.json();
    const { rows, mapping, tagId, groupId, defaultCountryCode } = body;

    if (!rows || !Array.isArray(rows) || !mapping) {
      return NextResponse.json({ error: 'Rows and column mapping are required' }, { status: 400 });
    }

    const mappedContacts = ContactFileParser.mapRowsToContacts(rows, mapping, defaultCountryCode);

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of mappedContacts) {
      if (!item.isValid) {
        skippedCount++;
        continue;
      }

      const contact = await prisma.contact.upsert({
        where: {
          tenantId_phoneNumber: {
            tenantId: tenant.id,
            phoneNumber: item.phoneNumber,
          },
        },
        update: {
          firstName: item.firstName,
          lastName: item.lastName,
          company: item.company,
          email: item.email,
          customAttributes: JSON.stringify(item.customAttributes),
        },
        create: {
          tenantId: tenant.id,
          phoneNumber: item.phoneNumber,
          firstName: item.firstName,
          lastName: item.lastName,
          company: item.company,
          email: item.email,
          customAttributes: JSON.stringify(item.customAttributes),
        },
      });

      if (tagId) {
        await prisma.contactTagMapping.upsert({
          where: { contactId_tagId: { contactId: contact.id, tagId } },
          update: {},
          create: { contactId: contact.id, tagId },
        });
      }

      if (groupId) {
        await prisma.contactGroupMember.upsert({
          where: { groupId_contactId: { groupId, contactId: contact.id } },
          update: {},
          create: { groupId, contactId: contact.id },
        });
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      total: mappedContacts.length,
      importedCount,
      skippedCount,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
