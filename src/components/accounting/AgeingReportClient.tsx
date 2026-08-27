"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Download,
  Search,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  User,
  Building2,
  ExternalLink,
  X
} from "lucide-react";

interface Props {
  debtorsReport: any;
  creditorsReport: any;
}

export default function AgeingReportClient({ debtorsReport, creditorsReport }: Props) {
  const [activeTab, setActiveTab] = useState<"debtors" | "creditors">("debtors");
  const [expandedParties, setExpandedParties] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const toggleParty = (id: string) => {
    setExpandedParties(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const report = activeTab === "debtors" ? debtorsReport : creditorsReport;
  const rows = report.rows || [];
  const summary = report.summary || {
    grandTotalOutstanding: 0,
    grandTotalCurrent: 0,
    grandTotal0to30: 0,
    grandTotal31to60: 0,
    grandTotal61to90: 0,
    grandTotal90Plus: 0
  };

  const filteredRows = rows.filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.partyName.toLowerCase().includes(q) ||
      (r.mobile && r.mobile.includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q))
    );
  });

  const exportAgeingCSV = () => {
    const headers = [
      activeTab === "debtors" ? "Customer Name" : "Vendor Name",
      "Mobile",
      "City",
      "Total Due (₹)",
      "Not Overdue / Current (₹)",
      "1-30 Days Overdue (₹)",
      "31-60 Days Overdue (₹)",
      "61-90 Days Overdue (₹)",
      ">90 Days Overdue (₹)"
    ];

    const csvRows = [
      headers,
      ...filteredRows.map((r: any) => [
        `"${r.partyName}"`,
        r.mobile || "",
        r.city || "",
        r.buckets.totalOutstanding,
        r.buckets.current,
        r.buckets.days0to30,
        r.buckets.days31to60,
        r.buckets.days61to90,
        r.buckets.days90Plus
      ])
    ];

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab === "debtors" ? "Receivables_Ageing" : "Payables_Ageing"}_${report.asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Top Tabs & Search/Export Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ display: "flex", gap: "6px", background: "#ffffff", padding: "6px", borderRadius: "12px", border: "1px solid var(--border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("debtors")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === "debtors" ? 700 : 600,
              fontSize: "0.85rem",
              background: activeTab === "debtors" ? "var(--accent-primary, #4f46e5)" : "transparent",
              color: activeTab === "debtors" ? "#fff" : "var(--text-secondary, #64748b)",
              boxShadow: activeTab === "debtors" ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <User size={16} />
            Receivables (Debtors Ageing)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("creditors")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === "creditors" ? 700 : 600,
              fontSize: "0.85rem",
              background: activeTab === "creditors" ? "var(--accent-primary, #4f46e5)" : "transparent",
              color: activeTab === "creditors" ? "#fff" : "var(--text-secondary, #64748b)",
              boxShadow: activeTab === "creditors" ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <Building2 size={16} />
            Payables (Creditors Ageing)
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* System Theme Search Box */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              backgroundColor: "#ffffff", 
              border: "1px solid var(--border, #cbd5e1)", 
              borderRadius: "9999px", 
              padding: "8px 16px", 
              width: "280px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease"
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.15)";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--border, #cbd5e1)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
            }}
          >
            <Search size={16} style={{ color: "var(--text-muted, #94a3b8)", marginRight: "8px", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by party, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "0.85rem",
                color: "var(--text-primary, #0f172a)",
                fontFamily: "inherit"
              }}
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch("")} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={exportAgeingCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: "#ffffff",
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: "10px",
              color: "var(--text-primary, #334155)",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease"
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary, #4f46e5)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent-primary, #4f46e5)";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border, #cbd5e1)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary, #334155)";
            }}
          >
            <Download size={15} style={{ color: "var(--accent-primary, #4f46e5)" }} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Aging KPI Buckets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <div style={{ padding: "18px", borderLeft: "4px solid var(--accent-primary, #4f46e5)", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeftWidth: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>TOTAL OUTSTANDING</div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            ₹{summary.grandTotalOutstanding.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "18px", borderLeft: "4px solid #10b981", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeftWidth: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>CURRENT (NOT OVERDUE)</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
            ₹{summary.grandTotalCurrent.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "18px", borderLeft: "4px solid #f59e0b", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeftWidth: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>1 - 30 DAYS OVERDUE</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#d97706", marginTop: "4px" }}>
            ₹{summary.grandTotal0to30.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "18px", borderLeft: "4px solid #ea580c", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeftWidth: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>31 - 60 DAYS OVERDUE</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ea580c", marginTop: "4px" }}>
            ₹{summary.grandTotal31to60.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "18px", borderLeft: "4px solid #dc2626", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeftWidth: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>61 - 90 DAYS OVERDUE</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
            ₹{summary.grandTotal61to90.toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "18px", borderLeft: "4px solid #991b1b", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeftWidth: "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>&gt; 90 DAYS (CRITICAL)</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#991b1b", marginTop: "4px" }}>
            ₹{summary.grandTotal90Plus.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Aging Table with Expandable Bill Rows */}
      <div 
        style={{ 
          backgroundColor: "#ffffff",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: "14px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.03)",
          overflow: "hidden"
        }}
      >
        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left", fontSize: "0.85rem", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Party Name</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Current (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>1 - 30 D (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>31 - 60 D (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>61 - 90 D (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>&gt; 90 D (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569" }}>Total Due (₹)</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#475569" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "6px" }}>🎉</div>
                    <div style={{ fontWeight: 600 }}>No outstanding {activeTab === "debtors" ? "receivables" : "payables"} as of {report.asOfDate}.</div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: any) => {
                  const isExpanded = expandedParties[row.partyId];
                  return (
                    <React.Fragment key={row.partyId}>
                      <tr
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: isExpanded ? "#f8fafc" : "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s ease"
                        }}
                        onClick={() => toggleParty(row.partyId)}
                      >
                        <td style={{ padding: "12px 16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {activeTab === "debtors" ? (
                                <Link
                                  href={`/customers/${row.partyId}/ledger`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: "var(--accent-primary, #4f46e5)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  <span>{row.partyName}</span>
                                  <ExternalLink size={11} style={{ opacity: 0.7 }} />
                                </Link>
                              ) : (
                                <Link
                                  href="/vendors"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ color: "var(--accent-primary, #4f46e5)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  <span>{row.partyName}</span>
                                  <ExternalLink size={11} style={{ opacity: 0.7 }} />
                                </Link>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                              {row.city || "Rohtak"} {row.mobile ? `• ${row.mobile}` : ""} • {row.totalInvoicesOrBills} {activeTab === "debtors" ? "invoices" : "bills"}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: row.buckets.current > 0 ? "#059669" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.current > 0 ? `₹${row.buckets.current.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: row.buckets.days0to30 > 0 ? "#d97706" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.days0to30 > 0 ? `₹${row.buckets.days0to30.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: row.buckets.days31to60 > 0 ? "#ea580c" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.days31to60 > 0 ? `₹${row.buckets.days31to60.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: row.buckets.days61to90 > 0 ? "#dc2626" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.days61to90 > 0 ? `₹${row.buckets.days61to90.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: row.buckets.days90Plus > 0 ? "#991b1b" : "#94a3b8", fontWeight: 700, fontSize: "0.9rem" }}>
                          {row.buckets.days90Plus > 0 ? `₹${row.buckets.days90Plus.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                          ₹{row.buckets.totalOutstanding.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          {row.mobile && activeTab === "debtors" && (
                            <a
                              href={`https://wa.me/91${row.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${row.partyName}, this is a gentle reminder that your account has an outstanding balance of ₹${row.buckets.totalOutstanding.toLocaleString()}. Kindly arrange for the settlement at your earliest convenience.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: "6px 12px",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                backgroundColor: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #bbf7d0",
                                borderRadius: "8px",
                                textDecoration: "none",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <MessageSquare size={13} /> Remind
                            </a>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Bill-by-Bill Breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: "0 16px 16px 36px", background: "#f8fafc" }}>
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff", overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                <thead>
                                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                                    <th style={{ padding: "8px 12px", fontWeight: 700 }}>Doc #</th>
                                    <th style={{ padding: "8px 12px", fontWeight: 700 }}>Date</th>
                                    <th style={{ padding: "8px 12px", fontWeight: 700 }}>Due Date</th>
                                    <th style={{ padding: "8px 12px", fontWeight: 700 }}>Overdue Days</th>
                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>Total Amount</th>
                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>Amount Paid</th>
                                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>Amount Due</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.invoicesOrBills.map((doc: any) => (
                                    <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                                        {activeTab === "debtors" ? (
                                          <Link
                                            href={`/invoices`}
                                            style={{ color: "var(--accent-primary, #4f46e5)", textDecoration: "none" }}
                                          >
                                            {doc.docNumber}
                                          </Link>
                                        ) : (
                                          <Link
                                            href={`/bills`}
                                            style={{ color: "var(--accent-primary, #4f46e5)", textDecoration: "none" }}
                                          >
                                            {doc.docNumber}
                                          </Link>
                                        )}
                                      </td>
                                      <td style={{ padding: "8px 12px" }}>{doc.date}</td>
                                      <td style={{ padding: "8px 12px" }}>{doc.dueDate || "-"}</td>
                                      <td style={{ padding: "8px 12px" }}>
                                        <span style={{
                                          padding: "2px 7px",
                                          borderRadius: "4px",
                                          fontWeight: 700,
                                          fontSize: "0.75rem",
                                          background: doc.overdueDays === 0 ? "#ecfdf5" : doc.overdueDays <= 30 ? "#fef3c7" : doc.overdueDays <= 60 ? "#ffedd5" : "#fee2e2",
                                          color: doc.overdueDays === 0 ? "#059669" : doc.overdueDays <= 30 ? "#d97706" : doc.overdueDays <= 60 ? "#ea580c" : "#dc2626"
                                        }}>
                                          {doc.overdueDays === 0 ? "Current" : `${doc.overdueDays} Days`}
                                        </span>
                                      </td>
                                      <td style={{ padding: "8px 12px", textAlign: "right" }}>₹{doc.totalAmount.toLocaleString()}</td>
                                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669" }}>₹{doc.amountPaid.toLocaleString()}</td>
                                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800 }}>₹{doc.amountDue.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
