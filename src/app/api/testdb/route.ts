import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const msgs = await prisma.whatsAppMessage.findMany({
    orderBy: { sentAt: 'desc' },
    take: 10
  });
  return NextResponse.json({ msgs });
}
