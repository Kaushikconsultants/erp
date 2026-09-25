"use client";

import React, { useState } from "react";
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Receipt, 
  Wallet, 
  FileMinus, 
  FilePlus, 
  RotateCcw,
  Loader2,
  HelpCircle
} from "lucide-react";
import { setPeriodLockDate } from "@/app/actions/periodLockActions";

interface PeriodLockClientProps {
  initialLockDate: string | null;
  isLocked: boolean;
  isAdmin: boolean;
}

export default function PeriodLockClient({
  initialLockDate,
  isLocked: initialIsLocked,
  isAdmin
}: PeriodLockClientProps) {
  const [lockDate, setLockDate] = useState<string>(
    initialLockDate ? new Date(initialLockDate).toISOString().slice(0, 10) : ""
  );
  const [currentLock, setCurrentLock] = useState<string | null>(initialLockDate);
  const [isLocked, setIsLocked] = useState<boolean>(initialIsLocked);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick preset dates
  const handleSetPreset = (preset: "prevMonth" | "prevFY" | "prevQuarter") => {
    const now = new Date();
    let targetDate: Date;

    if (preset === "prevMonth") {
      // Last day of previous month
      targetDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === "prevFY") {
      // 31st March of current or previous year
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      targetDate = new Date(year, 2, 31); // March 31
    } else {
      // End of previous quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      targetDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
    }

    setLockDate(targetDate.toISOString().slice(0, 10));
  };

  const handleSaveLock = async () => {
    if (!lockDate) {
      setMessage({ type: "error", text: "Please select a valid lock date" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await setPeriodLockDate(lockDate);
      if (res.success) {
        setCurrentLock(res.lockDate ? new Date(res.lockDate).toISOString() : null);
        setIsLocked(true);
        setMessage({
          type: "success",
          text: `Financial period locked up to ${new Date(lockDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })}. Backdated entries are now blocked.`
        });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to set period lock" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Error: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!confirm("Are you sure you want to remove the period lock? This will allow users to create and edit backdated entries.")) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await setPeriodLockDate(null);
      if (res.success) {
        setCurrentLock(null);
        setIsLocked(false);
        setLockDate("");
        setMessage({
          type: "success",
          text: "Period lock has been cleared. Books are now open for historical edits."
        });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to remove lock" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Error: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ─── Feedback Message ─── */}
      {message && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`
          }}
        >
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Status Hero Card ─── */}
      <div
        style={{
          background: isLocked
            ? "linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
            : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: isLocked ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${isLocked ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.2)"}`
            }}
          >
            {isLocked ? (
              <Lock size={28} style={{ color: "#34d399" }} />
            ) : (
              <Unlock size={28} style={{ color: "#94a3b8" }} />
            )}
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isLocked ? "#a7f3d0" : "#cbd5e1" }}>
              {isLocked ? "Hard Close Active" : "No Period Lock"}
            </div>
            <h2 style={{ margin: "4px 0", fontSize: "1.4rem", fontWeight: 700 }}>
              {isLocked && currentLock
                ? `Books Locked Up To ${new Date(currentLock).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}`
                : "All Financial Periods Are Open"}
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: isLocked ? "#d1fae5" : "#94a3b8", maxWidth: "600px" }}>
              {isLocked
                ? "No backdated invoices, bills, debit notes, credit notes, or payments can be recorded or edited on or prior to the lock date."
                : "Users with accounting permissions can record transactions with any historical date. Setting a lock date prevents accidental tampering with audited books."}
            </p>
          </div>
        </div>

        {isLocked && isAdmin && (
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isLoading}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backdropFilter: "blur(4px)"
            }}
          >
            <Unlock size={15} />
            <span>Remove Lock</span>
          </button>
        )}
      </div>

      {/* ─── Control Center Card ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)"
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
          Set Financial Lock Date
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "0.82rem", color: "#64748b" }}>
          Select the cutoff date. All entries on or prior to this date will become read-only.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "550px" }}>
          {/* Quick Presets */}
          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
              Quick Presets
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleSetPreset("prevMonth")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer"
                }}
              >
                End of Last Month
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset("prevQuarter")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer"
                }}
              >
                End of Last Quarter
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset("prevFY")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer"
                }}
              >
                End of FY (31 March)
              </button>
            </div>
          </div>

          {/* Date Picker Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "#475569", marginBottom: "8px", textTransform: "uppercase" }}>
              Lock Cutoff Date (Inclusive)
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="date"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
                disabled={!isAdmin || isLoading}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  padding: "0 14px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  color: "#1e293b",
                  backgroundColor: isAdmin ? "#f8fafc" : "#f1f5f9",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Save Button */}
          {isAdmin ? (
            <button
              type="button"
              onClick={handleSaveLock}
              disabled={isLoading || !lockDate}
              style={{
                height: "42px",
                padding: "0 22px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                width: "fit-content"
              }}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              <span>{isLoading ? "Saving Lock..." : "Apply Financial Lock"}</span>
            </button>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "#dc2626", fontStyle: "italic" }}>
              * You need Administrator or Super Admin privileges to modify the financial period lock.
            </div>
          )}
        </div>
      </div>

      {/* ─── Modules Protected Overview Grid ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)"
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
          Protected Workflows & Compliance Scope
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {/* Card 1 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px"
            }}
          >
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#e0f2fe", color: "#0284c7" }}>
              <Receipt size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                Sales & Invoicing
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                Prevents backdated Tax Invoices, edits to closed invoices, and Proforma-to-Invoice conversions in locked months.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px"
            }}
          >
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#fef3c7", color: "#d97706" }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                Vendor Bills & Expenses
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                Blocks backdated purchase bills, expense vouchers, and purchase order completions in closed periods.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px"
            }}
          >
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#fce7f3", color: "#db2777" }}>
              <FileMinus size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                Credit & Debit Notes
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                Ensures GST GSTR-1 and GSTR-3B filings cannot be altered through retroactive credit/debit adjustments.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px"
            }}
          >
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#d1fae5", color: "#059669" }}>
              <Wallet size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                Payments & Ledgers
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                Locks customer payment entries, vendor payouts, double-entry journal vouchers, and bank reconciliation statements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
