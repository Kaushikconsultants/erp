import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getCreditorsAgeingReport, getDebtorsAgeingReport } from "@/app/actions/ageingActions";
import AgeingReportClient from "@/components/accounting/AgeingReportClient";

export const dynamic = "force-dynamic";

export default async function AgeingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [debtorsRes, creditorsRes] = await Promise.all([
    getDebtorsAgeingReport(),
    getCreditorsAgeingReport()
  ]);

  const debtorsReport = debtorsRes.success ? debtorsRes : { asOfDate: new Date().toISOString().split("T")[0], summary: {}, rows: [] };
  const creditorsReport = creditorsRes.success ? creditorsRes : { asOfDate: new Date().toISOString().split("T")[0], summary: {}, rows: [] };

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Clock className="text-indigo-600" /> Outstanding Ageing Analysis (0-30, 31-60, 61-90, &gt;90 Days)
          </h1>
          <p className="page-subtitle">
            Track receivables from sundry debtors and payables to sundry creditors with overdue timeframes and bill-by-bill drilldown.
          </p>
        </div>
      </div>

      <AgeingReportClient
        debtorsReport={JSON.parse(JSON.stringify(debtorsReport))}
        creditorsReport={JSON.parse(JSON.stringify(creditorsReport))}
      />
    </div>
  );
}
