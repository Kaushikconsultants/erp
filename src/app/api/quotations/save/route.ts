import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createQuotation, updateQuotationFull } from '@/app/actions/quotationActions';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, isEdit, ...payload } = body;

    let res;
    if (isEdit && id) {
      res = await updateQuotationFull(id, payload);
    } else {
      res = await createQuotation(payload);
    }

    if (res?.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("API /api/quotations/save error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
