"use client";

import React, { useState } from "react";
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
  Building2
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Tabs & Export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", background: "var(--bg-secondary, #f1f5f9)", padding: "4px", borderRadius: "10px" }}>
          <button
            onClick={() => setActiveTab("debtors")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
              background: activeTab === "debtors" ? "var(--primary, #4f46e5)" : "transparent",
              color: activeTab === "debtors" ? "#fff" : "var(--text-secondary, #64748b)",
              transition: "all 0.2s"
            }}
          >
            <User size={16} />
            Receivables (Debtors Ageing)
          </button>
          <button
            onClick={() => setActiveTab("creditors")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
              background: activeTab === "creditors" ? "var(--primary, #4f46e5)" : "transparent",
              color: activeTab === "creditors" ? "#fff" : "var(--text-secondary, #64748b)",
              transition: "all 0.2s"
            }}
          >
            <Building2 size={16} />
            Payables (Creditors Ageing)
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search by party, mobile, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "32px", fontSize: "0.85rem" }}
            />
          </div>
          <button
            onClick={exportAgeingCSV}
            className="action-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", padding: "8px 14px" }}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Aging KPI Buckets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #4f46e5" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>TOTAL OUTSTANDING</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            ₹{summary.grandTotalOutstanding.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>CURRENT (NOT OVERDUE)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
            ₹{summary.grandTotalCurrent.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>1 - 30 DAYS OVERDUE</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#d97706", marginTop: "4px" }}>
            ₹{summary.grandTotal0to30.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #ea580c" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>31 - 60 DAYS OVERDUE</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ea580c", marginTop: "4px" }}>
            ₹{summary.grandTotal31to60.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #dc2626" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>61 - 90 DAYS OVERDUE</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
            ₹{summary.grandTotal61to90.toLocaleString()}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderLeft: "4px solid #7f1d1d" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>&gt; 90 DAYS (CRITICAL)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#991b1b", marginTop: "4px" }}>
            ₹{summary.grandTotal90Plus.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Aging Table with Expandable Bill Rows */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left", fontSize: "0.85rem" }}>
                <th style={{ padding: "10px 12px" }}>Party Name</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Current (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>1 - 30 D (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>31 - 60 D (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>61 - 90 D (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>&gt; 90 D (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Due (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                    No outstanding {activeTab === "debtors" ? "receivables" : "payables"} as of {report.asOfDate}.
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
                          cursor: "pointer"
                        }}
                        onClick={() => toggleParty(row.partyId)}
                      >
                        <td style={{ padding: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <div>
                            <div style={{ color: "var(--text-primary)" }}>{row.partyName}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                              {row.city || "Rohtak"} {row.mobile ? `• ${row.mobile}` : ""} • {row.totalInvoicesOrBills} {activeTab === "debtors" ? "invoices" : "bills"}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: row.buckets.current > 0 ? "#059669" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.current > 0 ? `₹${row.buckets.current.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: row.buckets.days0to30 > 0 ? "#d97706" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.days0to30 > 0 ? `₹${row.buckets.days0to30.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: row.buckets.days31to60 > 0 ? "#ea580c" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.days31to60 > 0 ? `₹${row.buckets.days31to60.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: row.buckets.days61to90 > 0 ? "#dc2626" : "#94a3b8", fontSize: "0.9rem" }}>
                          {row.buckets.days61to90 > 0 ? `₹${row.buckets.days61to90.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: row.buckets.days90Plus > 0 ? "#991b1b" : "#94a3b8", fontWeight: 700, fontSize: "0.9rem" }}>
                          {row.buckets.days90Plus > 0 ? `₹${row.buckets.days90Plus.toLocaleString()}` : "-"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                          ₹{row.buckets.totalOutstanding.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          {row.mobile && activeTab === "debtors" && (
                            <a
                              href={`https://wa.me/91${row.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${row.partyName}, this is a gentle reminder that your account has an outstanding balance of ₹${row.buckets.totalOutstanding.toLocaleString()}. Kindly arrange for the settlement at your earliest convenience.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="action-btn"
                              style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981", textDecoration: "none" }}
                            >
                              <MessageSquare size={13} /> Remind
                            </a>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Bill-by-Bill Breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: "0 12px 14px 34px", background: "#f8fafc" }}>
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff", overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                                <thead>
                                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                                    <th style={{ padding: "6px 10px" }}>Doc #</th>
                                    <th style={{ padding: "6px 10px" }}>Date</th>
                                    <th style={{ padding: "6px 10px" }}>Due Date</th>
                                    <th style={{ padding: "6px 10px" }}>Overdue Days</th>
                                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Total Amount</th>
                                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount Paid</th>
                                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Amount Due</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.invoicesOrBills.map((doc: any) => (
                                    <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "6px 10px", fontWeight: 600, color: "#4f46e5" }}>{doc.docNumber}</td>
                                      <td style={{ padding: "6px 10px" }}>{doc.date}</td>
                                      <td style={{ padding: "6px 10px" }}>{doc.dueDate || "-"}</td>
                                      <td style={{ padding: "6px 10px" }}>
                                        <span style={{
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          fontWeight: 700,
                                          fontSize: "0.75rem",
                                          background: doc.overdueDays === 0 ? "#ecfdf5" : doc.overdueDays <= 30 ? "#fef3c7" : doc.overdueDays <= 60 ? "#ffedd5" : "#fee2e2",
                                          color: doc.overdueDays === 0 ? "#059669" : doc.overdueDays <= 30 ? "#d97706" : doc.overdueDays <= 60 ? "#ea580c" : "#dc2626"
                                        }}>
                                          {doc.overdueDays === 0 ? "Current" : `${doc.overdueDays} Days`}
                                        </span>
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "right" }}>₹{doc.totalAmount.toLocaleString()}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", color: "#059669" }}>₹{doc.amountPaid.toLocaleString()}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>₹{doc.amountDue.toLocaleString()}</td>
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
