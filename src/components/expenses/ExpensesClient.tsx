"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState } from "react";
import { 
  submitExpense, 
  updateExpense, 
  deleteExpense, 
  approveExpense, 
  rejectExpense, 
  markExpensePaid 
} from "@/app/actions/expenseActions";
import { 
  Receipt, 
  Search, 
  X, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  Lock, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Wallet, 
  ChevronDown 
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals & Entertainment",
  "Office Supplies",
  "Equipment",
  "Software",
  "Marketing",
  "Training",
  "Utilities",
  "Other"
];

const STATUS_BADGE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Pending: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
  Approved: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  Paid: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "Travel": { bg: "#eff6ff", color: "#1d4ed8" },
  "Meals & Entertainment": { bg: "#fdf4ff", color: "#a21caf" },
  "Office Supplies": { bg: "#f0fdf4", color: "#166534" },
  "Equipment": { bg: "#faf5ff", color: "#7e22ce" },
  "Software": { bg: "#ecfeff", color: "#0e7490" },
  "Marketing": { bg: "#fff7ed", color: "#c2410c" },
  "Training": { bg: "#fefce8", color: "#a16207" },
  "Utilities": { bg: "#f1f5f9", color: "#334155" },
  "Other": { bg: "#f8fafc", color: "#475569" }
};

interface ExpenseItem {
  id: string;
  expenseNumber: string;
  date: string | Date;
  category: string;
  amount: number;
  description: string | null;
  status: "Pending" | "Approved" | "Rejected" | "Paid";
  employeeId: string | null;
  employee?: {
    id: string;
    userId: string;
    user?: {
      name: string | null;
    };
  };
}

export default function ExpensesClient({ 
  initialExpenses, 
  isAdmin, 
  currentUserId 
}: { 
  initialExpenses: ExpenseItem[]; 
  isAdmin: boolean; 
  currentUserId?: string; 
}) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Modal States
  const [addOpen, setAddOpen] = useState(false);
  const [editExpenseData, setEditExpenseData] = useState<ExpenseItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // KPI calculations
  const totalPending = expenses.filter(e => e.status === "Pending").reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.filter(e => e.status === "Paid").reduce((s, e) => s + e.amount, 0);
  const totalClaims = expenses.length;

  const countPending = expenses.filter(e => e.status === "Pending").length;
  const countApproved = expenses.filter(e => e.status === "Approved").length;
  const countPaid = expenses.filter(e => e.status === "Paid").length;
  const countRejected = expenses.filter(e => e.status === "Rejected").length;

  // Filtered expenses
  const filtered = expenses.filter(exp => {
    if (filterStatus !== "All" && exp.status !== filterStatus) return false;
    if (filterCategory !== "All" && exp.category !== filterCategory) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const expNum = (exp.expenseNumber || "").toLowerCase();
    const empName = (exp.employee?.user?.name || "").toLowerCase();
    const cat = (exp.category || "").toLowerCase();
    const desc = (exp.description || "").toLowerCase();
    const amt = exp.amount.toString();

    return expNum.includes(q) || empName.includes(q) || cat.includes(q) || desc.includes(q) || amt.includes(q);
  });

  // Handle Create Submit
  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await submitExpense(fd);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setAddOpen(false);
    window.location.reload();
  }

  // Handle Edit Submit
  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editExpenseData) return;
    if (editExpenseData.status !== "Pending") {
      setError("Cannot edit an expense that is already approved or settled.");
      return;
    }

    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await updateExpense(editExpenseData.id, fd);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditExpenseData(null);
    window.location.reload();
  }

  // Handle Delete
  async function handleDelete(exp: ExpenseItem) {
    if (exp.status !== "Pending") {
      alert("Only pending expenses can be removed. Approved or settled expenses are locked.");
      return;
    }
    if (!confirm(`Are you sure you want to delete expense claim ${exp.expenseNumber}?`)) return;

    setActionLoadingId(exp.id);
    const res = await deleteExpense(exp.id);
    setActionLoadingId(null);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  }

  // Handle Status Action (Approve, Reject, Mark Paid)
  async function handleAction(fn: (id: string) => Promise<any>, id: string) {
    setActionLoadingId(id);
    const res = await fn(id);
    setActionLoadingId(null);
    if (res.error) alert(res.error);
    else window.location.reload();
  }

  const formatCurrency = (amount: number) => {
    return "₹" + (amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const formatDateForInput = (d: string | Date | undefined) => {
    if (!d) return new Date().toISOString().split("T")[0];
    try {
      return new Date(d).toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ─── 1. PAGE HEADER ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", letterSpacing: "-0.02em" }}>
            <Receipt style={{ color: "var(--accent-primary, #4f46e5)" }} size={26} />
            Expense Management
          </h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem", fontWeight: 400 }}>
            {isAdmin 
              ? "Review, approve, and settle employee expense claims with locked audit security." 
              : "Submit, track, and manage your operational expense reimbursements."}
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => { setError(""); setAddOpen(true); }}
          className="primary-btn hover-lift"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 18px",
            borderRadius: "10px",
            fontWeight: 500,
            fontSize: "0.875rem",
            backgroundColor: "var(--accent-primary, #4f46e5)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)"
          }}
        >
          <Plus size={17} />
          <span>Submit Expense Claim</span>
        </button>
      </div>

      {/* ─── 2. KPI METRIC CARDS ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {/* Pending Approval */}
        <div style={{ 
          backgroundColor: "#ffffff", 
          padding: "18px 20px", 
          borderRadius: "14px", 
          border: "1px solid #e2e8f0", 
          borderLeft: "3px solid #f59e0b",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 550, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Pending Approval
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#fef3c7", color: "#b45309" }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#d97706", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(totalPending)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 400 }}>
            <span style={{ fontWeight: 550, color: "#334155" }}>{countPending}</span> claims awaiting review
          </div>
        </div>

        {/* Approved (Unpaid) */}
        <div style={{ 
          backgroundColor: "#ffffff", 
          padding: "18px 20px", 
          borderRadius: "14px", 
          border: "1px solid #e2e8f0", 
          borderLeft: "3px solid #059669",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 550, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Approved (Unpaid)
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669" }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#059669", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(totalApproved)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 400 }}>
            <span style={{ fontWeight: 550, color: "#334155" }}>{countApproved}</span> claims ready for payout
          </div>
        </div>

        {/* Total Paid Out */}
        <div style={{ 
          backgroundColor: "#ffffff", 
          padding: "18px 20px", 
          borderRadius: "14px", 
          border: "1px solid #e2e8f0", 
          borderLeft: "3px solid #0284c7",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 550, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Paid Out
            </span>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "#f0f9ff", color: "#0284c7" }}>
              <Wallet size={16} />
            </div>
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0284c7", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(totalPaid)}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 400 }}>
            <span style={{ fontWeight: 550, color: "#334155" }}>{countPaid}</span> claims settled
          </div>
        </div>
      </div>

      {/* ─── 3. MODERN FILTER BAR & THEME SEARCH ─── */}
      <div style={{ 
        backgroundColor: "#ffffff", 
        padding: "16px 20px", 
        borderRadius: "14px", 
        border: "1px solid #e2e8f0", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        {/* Top Filter Row: Search + Category Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          
          {/* Pill-Shaped Theme Search Box */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              backgroundColor: "#f8fafc", 
              border: "1px solid #cbd5e1", 
              borderRadius: "9999px", 
              padding: "8px 16px", 
              width: "100%", 
              maxWidth: "380px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.2s ease"
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
              e.currentTarget.style.backgroundColor = "#ffffff";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
              e.currentTarget.style.backgroundColor = "#f8fafc";
            }}
          >
            <Search size={16} style={{ color: "#94a3b8", marginRight: "10px", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by #, employee, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "0.875rem",
                color: "#0f172a",
                fontFamily: "inherit"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: "0 2px" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Controls: Category Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  backgroundColor: filterCategory !== "All" ? "var(--accent-light, #eff6ff)" : "#ffffff",
                  border: `1px solid ${filterCategory !== "All" ? "var(--accent-primary, #4f46e5)" : "#cbd5e1"}`,
                  color: filterCategory !== "All" ? "var(--accent-primary, #4f46e5)" : "#334155",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease"
                }}
              >
                <Filter size={14} style={{ color: filterCategory !== "All" ? "var(--accent-primary, #4f46e5)" : "#64748b" }} />
                <span>{filterCategory === "All" ? "All Categories" : filterCategory}</span>
                <ChevronDown size={13} style={{ color: "#94a3b8", transform: categoryDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
              </button>

              {categoryDropdownOpen && (
                <>
                  <div 
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
                    onClick={() => setCategoryDropdownOpen(false)} 
                  />
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    width: "220px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
                    zIndex: 50,
                    padding: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}>
                    <button
                      type="button"
                      onClick={() => { setFilterCategory("All"); setCategoryDropdownOpen(false); }}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: filterCategory === "All" ? "var(--accent-light, #eff6ff)" : "transparent",
                        color: filterCategory === "All" ? "var(--accent-primary, #4f46e5)" : "#334155",
                        fontWeight: filterCategory === "All" ? 600 : 500,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>All Categories</span>
                      {filterCategory === "All" && <Check size={14} />}
                    </button>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setFilterCategory(cat); setCategoryDropdownOpen(false); }}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: filterCategory === cat ? "var(--accent-light, #eff6ff)" : "transparent",
                          color: filterCategory === cat ? "var(--accent-primary, #4f46e5)" : "#334155",
                          fontWeight: filterCategory === cat ? 600 : 500,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span>{cat}</span>
                        {filterCategory === cat && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Tabs Bar */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
          {[
            { id: "All", label: "All Claims", count: totalClaims },
            { id: "Pending", label: "Pending", count: countPending, badgeColor: "#f59e0b" },
            { id: "Approved", label: "Approved", count: countApproved, badgeColor: "#3b82f6" },
            { id: "Paid", label: "Paid", count: countPaid, badgeColor: "#10b981" },
            { id: "Rejected", label: "Rejected", count: countRejected, badgeColor: "#ef4444" },
          ].map((tab) => {
            const isSelected = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? 550 : 500,
                  cursor: "pointer",
                  border: isSelected ? "none" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "var(--accent-primary, #4f46e5)" : "#f8fafc",
                  color: isSelected ? "#ffffff" : "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  boxShadow: isSelected ? "0 2px 6px rgba(79, 70, 229, 0.2)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                  color: isSelected ? "#ffffff" : "#475569"
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 4. MODERN DATA TABLE ─── */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        overflow: "hidden"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                <th style={{ padding: "12px 16px", fontWeight: 550 }}>Expense #</th>
                {isAdmin && <th style={{ padding: "12px 16px", fontWeight: 550 }}>Employee</th>}
                <th style={{ padding: "12px 16px", fontWeight: 550 }}>Date</th>
                <th style={{ padding: "12px 16px", fontWeight: 550 }}>Category</th>
                <th style={{ padding: "12px 16px", fontWeight: 550 }}>Description</th>
                <th style={{ padding: "12px 16px", fontWeight: 550, textAlign: "right" }}>Amount</th>
                <th style={{ padding: "12px 16px", fontWeight: 550, textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 550, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp, idx) => {
                const badgeStyle = STATUS_BADGE_STYLE[exp.status] || { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };
                const catColor = CATEGORY_COLORS[exp.category] || { bg: "#f1f5f9", color: "#475569" };
                const isPending = exp.status === "Pending";
                const isCreator = exp.employee?.userId === currentUserId;
                const canEdit = isPending && (isAdmin || isCreator);

                return (
                  <tr 
                    key={exp.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                      transition: "background-color 0.15s ease"
                    }}
                  >
                    {/* Expense # */}
                    <td style={{ padding: "12px 16px", fontWeight: 550, color: "var(--accent-primary, #4f46e5)", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {exp.expenseNumber}
                    </td>

                    {/* Employee (if admin) */}
                    {isAdmin && (
                      <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 500, fontSize: "0.8125rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--accent-light, #eff6ff)", color: "var(--accent-primary, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 600 }}>
                            {(exp.employee?.user?.name || "E").charAt(0).toUpperCase()}
                          </div>
                          <span>{exp.employee?.user?.name || "Staff Member"}</span>
                        </div>
                      </td>
                    )}

                    {/* Date */}
                    <td style={{ padding: "12px 16px", color: "#475569", whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                      {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    {/* Category */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 9px",
                        borderRadius: "9999px",
                        backgroundColor: catColor.bg,
                        color: catColor.color,
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        display: "inline-block"
                      }}>
                        {exp.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ padding: "12px 16px", color: "#64748b", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                      {exp.description || <span style={{ color: "#cbd5e1" }}>-</span>}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#0f172a", fontSize: "0.9rem", letterSpacing: "-0.01em" }}>
                      {formatCurrency(exp.amount)}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.color,
                        border: `1px solid ${badgeStyle.border}`,
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        textTransform: "capitalize"
                      }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: badgeStyle.color }} />
                        {exp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        
                        {/* EDIT BUTTON (Strict Rule: Only allowed when status is 'Pending') */}
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => { setError(""); setEditExpenseData(exp); }}
                            title="Edit this pending claim"
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              color: "#334155",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                              e.currentTarget.style.color = "var(--accent-primary, #4f46e5)";
                              e.currentTarget.style.backgroundColor = "var(--accent-light, #eff6ff)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#cbd5e1";
                              e.currentTarget.style.color = "#334155";
                              e.currentTarget.style.backgroundColor = "#ffffff";
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        ) : (
                          /* Locked indicator when Approved / Paid / Rejected */
                          <div 
                            title="Locked: No changes can be made after approval or settlement."
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#f1f5f9",
                              color: "#94a3b8",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              cursor: "not-allowed"
                            }}
                          >
                            <Lock size={12} />
                            <span>Locked</span>
                          </div>
                        )}

                        {/* ADMIN APPROVE / REJECT */}
                        {isAdmin && exp.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === exp.id}
                              onClick={() => handleAction(approveExpense, exp.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #86efac",
                                backgroundColor: "#f0fdf4",
                                color: "#15803d",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === exp.id}
                              onClick={() => handleAction(rejectExpense, exp.id)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border: "1px solid #fecaca",
                                backgroundColor: "#fef2f2",
                                color: "#b91c1c",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* ADMIN MARK AS PAID */}
                        {isAdmin && exp.status === "Approved" && (
                          <button
                            type="button"
                            disabled={actionLoadingId === exp.id}
                            onClick={() => handleAction(markExpensePaid, exp.id)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid #bfdbfe",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            Mark Paid
                          </button>
                        )}

                        {/* DELETE PENDING CLAIM */}
                        {isPending && (isAdmin || isCreator) && (
                          <button
                            type="button"
                            disabled={actionLoadingId === exp.id}
                            onClick={() => handleDelete(exp)}
                            title="Delete pending claim"
                            style={{
                              padding: "6px 8px",
                              borderRadius: "8px",
                              border: "1px solid #fecaca",
                              backgroundColor: "#ffffff",
                              color: "#dc2626",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: "center", padding: "48px 24px", color: "#64748b" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                        <Receipt size={24} />
                      </div>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>No expense claims found</div>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                        {searchQuery || filterStatus !== "All" || filterCategory !== "All"
                          ? "Try clearing your filters or search keywords."
                          : "Submit your first expense reimbursement claim using the button above."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 5. SUBMIT EXPENSE CLAIM MODAL ─── */}
      {addOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setAddOpen(false)}
        >
          <div 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--accent-light, #eff6ff)", color: "var(--accent-primary, #4f46e5)" }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                    Submit Expense Claim
                  </h2>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Claims require manager/admin approval prior to reimbursement
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setAddOpen(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body - Explicit Vertical Layout to Prevent Any Label/Input Squishing */}
            <form onSubmit={handleAddSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              
              {/* Category & Date Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                
                {/* Category Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                    Category <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select 
                    name="category" 
                    required 
                    defaultValue=""
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  >
                    <option value="" disabled>Select category...</option>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Date Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                    Expense Date <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <DatePicker 
                    name="date" 
                     
                    required 
                    defaultValue={formatDateForInput(new Date())}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
              </div>

              {/* Amount Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                  Claim Amount <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{
                    position: "absolute",
                    left: "14px",
                    fontWeight: 700,
                    color: "var(--accent-primary, #4f46e5)",
                    fontSize: "1rem",
                    pointerEvents: "none"
                  }}>
                    ₹
                  </span>
                  <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    min="1" 
                    required 
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 14px 10px 32px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
              </div>

              {/* Description Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                  Description / Purpose
                </label>
                <textarea 
                  name="description" 
                  rows={3}
                  placeholder="Provide brief details, purpose of spend, bill/receipt reference..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: "0.875rem",
                    color: "#0f172a",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                paddingTop: "14px",
                borderTop: "1px solid #f1f5f9"
              }}>
                <button 
                  type="button" 
                  onClick={() => setAddOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--accent-primary, #4f46e5)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. EDIT EXPENSE CLAIM MODAL (STRICT PENDING-ONLY) ─── */}
      {editExpenseData && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setEditExpenseData(null)}
        >
          <div 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--accent-light, #eff6ff)", color: "var(--accent-primary, #4f46e5)" }}>
                  <Edit2 size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                    Edit Expense Claim: {editExpenseData.expenseNumber}
                  </h2>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Only pending claims can be modified before approval
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditExpenseData(null)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleEditSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              
              {/* Category & Date Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                
                {/* Category Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                    Category <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select 
                    name="category" 
                    required 
                    defaultValue={editExpenseData.category}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Date Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                    Expense Date <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <DatePicker 
                    name="date" 
                     
                    required 
                    defaultValue={formatDateForInput(editExpenseData.date)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
              </div>

              {/* Amount Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                  Claim Amount <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{
                    position: "absolute",
                    left: "14px",
                    fontWeight: 700,
                    color: "var(--accent-primary, #4f46e5)",
                    fontSize: "1rem",
                    pointerEvents: "none"
                  }}>
                    ₹
                  </span>
                  <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    min="1" 
                    required 
                    defaultValue={editExpenseData.amount}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 14px 10px 32px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>
              </div>

              {/* Description Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block" }}>
                  Description / Purpose
                </label>
                <textarea 
                  name="description" 
                  rows={3}
                  defaultValue={editExpenseData.description || ""}
                  placeholder="Provide brief details, purpose of spend..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: "0.875rem",
                    color: "#0f172a",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Audit Lock Warning Banner */}
              <div style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Lock size={15} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Security Policy:</strong> Once approved or settled by an administrator, this claim will become permanently locked and immutable.
                </span>
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                paddingTop: "14px",
                borderTop: "1px solid #f1f5f9"
              }}>
                <button 
                  type="button" 
                  onClick={() => setEditExpenseData(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--accent-primary, #4f46e5)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
