import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantOrgId } from '@/lib/tenant';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = await getTenantOrgId();
  return NextResponse.json({ 
    status: "ok", 
    organizationId,
    timestamp: new Date().toISOString() 
  });
}
