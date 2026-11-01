import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } });
    if (!tenant) return NextResponse.json({ conversations: [] });

    const conversations = await prisma.conversation.findMany({
      where: { tenantId: tenant.id },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            phoneNumber: true,
            isOptedOut: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
