import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantWhatsAppClient } from '@/services/meta/config-helper';

export async function POST() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { client } = await getTenantWhatsAppClient(tenant.id);
    const remoteTemplates = await client.fetchTemplates();

    let syncedCount = 0;

    for (const t of remoteTemplates) {
      await prisma.template.upsert({
        where: {
          tenantId_name_language: {
            tenantId: tenant.id,
            name: t.name,
            language: t.language || 'en_US',
          },
        },
        update: {
          metaTemplateId: t.id,
          status: t.status,
          category: t.category,
          componentsJson: JSON.stringify(t.components),
          lastSyncedAt: new Date(),
        },
        create: {
          tenantId: tenant.id,
          metaTemplateId: t.id,
          name: t.name,
          language: t.language || 'en_US',
          status: t.status,
          category: t.category,
          componentsJson: JSON.stringify(t.components),
          parameterFormat: 'POSITIONAL',
          lastSyncedAt: new Date(),
        },
      });

      syncedCount++;
    }

    const allTemplates = await prisma.template.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      syncedCount,
      templates: allTemplates,
    });
  } catch (error: any) {
    console.error('Template sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
