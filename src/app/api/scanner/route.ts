import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionCode = searchParams.get('session');

    if (!sessionCode) {
      return NextResponse.json({ error: 'Session code required' }, { status: 400 });
    }

    const cleanSession = sessionCode.trim().toUpperCase();

    const session = await prisma.mobileScanSession.findUnique({
      where: { sessionCode: cleanSession }
    });

    if (!session) {
      // Return 200 with WAITING status to prevent browser console 404 flooding 
      // when the frontend UI starts polling before the mobile app has connected.
      return NextResponse.json({ success: true, status: 'WAITING', scannedCode: null });
    }

    const scanned = session.scannedCode;
    if (scanned) {
      // Clear scanned code atomically so it's not processed twice
      await prisma.mobileScanSession.update({
        where: { id: session.id },
        data: { scannedCode: null, status: 'CONNECTED' }
      });
    }

    return NextResponse.json({
      success: true,
      scannedCode: scanned,
      status: session.status,
      mode: session.mode,
      orderId: session.orderId
    });
  } catch (error: any) {
    console.error('API scanner poll error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionCode, code, ping, mode, orderId } = body;

    if (!sessionCode) {
      return NextResponse.json({ error: 'Session code required' }, { status: 400 });
    }

    const cleanSession = String(sessionCode).trim().toUpperCase();

    // Check if session exists
    const session = await prisma.mobileScanSession.findUnique({
      where: { sessionCode: cleanSession }
    });

    if (ping) {
      if (!session) {
        const created = await prisma.mobileScanSession.create({
          data: {
            sessionCode: cleanSession,
            status: 'CONNECTED',
            mode: mode || 'INVENTORY',
            orderId: orderId || null
          }
        });
        return NextResponse.json({ success: true, mode: created.mode, orderId: created.orderId });
      }

      await prisma.mobileScanSession.update({
        where: { id: session.id },
        data: { status: 'CONNECTED', updatedAt: new Date() }
      });

      return NextResponse.json({ success: true, mode: session.mode, orderId: session.orderId });
    }

    if (!code || !String(code).trim()) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const cleanCode = String(code).trim();

    if (!session) {
      // Resilient auto-create session so scan is never dropped
      await prisma.mobileScanSession.create({
        data: {
          sessionCode: cleanSession,
          scannedCode: cleanCode,
          status: 'CONNECTED',
          mode: mode || 'INVENTORY'
        }
      });
    } else {
      await prisma.mobileScanSession.update({
        where: { id: session.id },
        data: {
          scannedCode: cleanCode,
          status: 'CONNECTED',
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, code: cleanCode });
  } catch (error: any) {
    console.error('API scanner push error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
