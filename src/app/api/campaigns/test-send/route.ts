import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantWhatsAppClient } from '@/services/meta/config-helper';
import { VariableResolver } from '@/services/campaign/variable-resolver';

export async function POST(req: NextRequest) {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const body = await req.json();
    const {
      testPhoneNumber,
      templateId,
      mediaType,
      mediaUrl,
      mediaFilename,
      sampleVariables = {},
    } = body;

    if (!testPhoneNumber || !templateId) {
      return NextResponse.json(
        { error: 'Test phone number and Template ID are required' },
        { status: 400 }
      );
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { client } = await getTenantWhatsAppClient(tenant.id);

    // Resolve test components using sample variables
    const mockContact = {
      phoneNumber: testPhoneNumber,
      firstName: sampleVariables['1'] || sampleVariables['firstName'] || 'Test User',
      lastName: sampleVariables['lastName'] || 'Admin',
      company: sampleVariables['company'] || tenant.name,
      customAttributes: JSON.stringify(sampleVariables),
    };

    const variableMapping = {
      body_1: '1',
      body_2: '2',
      body_3: '3',
      body_4: '4',
      ...sampleVariables,
    };

    const components = VariableResolver.resolveComponents(
      template.componentsJson,
      JSON.stringify(variableMapping),
      mockContact,
      mediaUrl
        ? {
            mediaType: mediaType || 'DOCUMENT',
            mediaUrl,
            filename: mediaFilename || 'Test_Quotation.pdf',
          }
        : undefined
    );

    const result = await client.sendTemplateMessage({
      to: testPhoneNumber,
      templateName: template.name,
      languageCode: template.language,
      components,
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Test message sent to ${testPhoneNumber}`,
    });
  } catch (error: any) {
    console.error('Test send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
