import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getJournalEntries, getLedgers } from "@/app/actions/accountingActions";
import VouchersClient from "@/components/accounting/VouchersClient";

export const dynamic = "force-dynamic";

export default async function VouchersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [vouchersRes, ledgersRes] = await Promise.all([
    getJournalEntries(),
    getLedgers()
  ]);

  const vouchers = vouchersRes.success ? vouchersRes.vouchers : [];
  const ledgers = ledgersRes.success ? ledgersRes.ledgers : [];

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText className="text-indigo-600" /> Journal & Contra Vouchers
          </h1>
          <p className="page-subtitle">
            Post double-entry journal vouchers, inter-bank contras, and view chronological audit trails.
          </p>
        </div>
      </div>

      <VouchersClient
        initialVouchers={JSON.parse(JSON.stringify(vouchers))}
        ledgers={JSON.parse(JSON.stringify(ledgers))}
      />
    </div>
  );
}
