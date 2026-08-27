import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderTree } from "lucide-react";
import { getChartOfAccounts } from "@/app/actions/accountingActions";
import ChartOfAccountsClient from "@/components/accounting/ChartOfAccountsClient";

export const dynamic = "force-dynamic";

export default async function ChartOfAccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const res = await getChartOfAccounts();
  const groups = res.success ? res.groups : [];

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FolderTree className="text-indigo-600" /> Chart of Accounts & General Ledgers
          </h1>
          <p className="page-subtitle">
            Hierarchical master of Assets, Liabilities, Incomes, and Expenses with real-time double-entry balances.
          </p>
        </div>
      </div>

      <ChartOfAccountsClient initialGroups={JSON.parse(JSON.stringify(groups))} />
    </div>
  );
}
