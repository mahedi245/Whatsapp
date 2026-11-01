import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
  if (!tenant) return NextResponse.json({ tags: [] });

  const tags = await prisma.tag.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: {
        select: { contacts: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { name, color } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const tag = await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name } },
    update: { color: color || '#25D366' },
    create: { tenantId: tenant.id, name, color: color || '#25D366' },
  });

  return NextResponse.json({ tag });
}
