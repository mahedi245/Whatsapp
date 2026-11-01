import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantWhatsAppClient } from '@/services/meta/config-helper';

// GET /api/templates - List stored templates
export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ templates: [] });

    const templates = await prisma.template.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
