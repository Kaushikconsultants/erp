import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPeriodLockSettings } from "@/app/actions/periodLockActions";
import PeriodLockClient from "@/components/accounting/PeriodLockClient";
import AccountingSubNav from "@/components/accounting/AccountingSubNav";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Financial Period Locking (Hard Close) | ERP Suite",
  description: "Protect audited accounting periods against retroactive changes and backdated transactions."
};

export default async function PeriodLockPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = (session.user as any)?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const lockRes = await getPeriodLockSettings();

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div className="dashboard-header mb-4" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.02em" }}>
            <Lock style={{ color: "#059669" }} size={26} /> Financial Period Locking (Hard Close)
          </h1>
          <p className="page-subtitle" style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 400 }}>
            Protect audited books, locked quarters, and filed GST returns by preventing backdated transactions.
          </p>
        </div>
      </div>

      <AccountingSubNav />

      <div style={{ marginTop: "24px" }}>
        <PeriodLockClient
          initialLockDate={lockRes.lockDate ? lockRes.lockDate.toISOString() : null}
          isLocked={Boolean(lockRes.isLocked)}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
