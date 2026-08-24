import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const conv = await prisma.whatsAppConversation.count();
  const msgs = await prisma.whatsAppMessage.findMany({
    orderBy: { sentAt: 'desc' },
    take: 5
  });
  return NextResponse.json({ convCount: conv, msgs });
}
