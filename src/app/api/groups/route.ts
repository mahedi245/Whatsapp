import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
  if (!tenant) return NextResponse.json({ groups: [] });

  const groups = await prisma.contactGroup.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const group = await prisma.contactGroup.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name } },
    update: { description },
    create: { tenantId: tenant.id, name, description },
  });

  return NextResponse.json({ group });
}
