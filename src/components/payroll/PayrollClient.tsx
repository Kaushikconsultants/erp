"use client";

import React, { useState, useMemo } from "react";
import { processSalary, markSalaryPaid, updateEmployeeSalary } from "@/app/actions/hrmsActions";
import MonthPicker from "@/components/ui/MonthPicker";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Award,
  Calculator,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Printer,
  X,
  ArrowUpRight,
  FileText
} from "lucide-react";

export interface EmployeeData {
  id: string;
  salary: number | null;
  department: string | null;
  designation: string | null;
  target?: number | null;
  user: { name: string; email: string };
  salaries: any[];
  incentives: any[];
  orders: any[];
  attendances?: any[];
  dynamicIncentive?: number;
  incentiveDetails?: {
    totalIncentive: number;
    slabIncentive: number;
    bonusIncentive: number;
    flatIncentive: number;
    eligibleSales: number;
    flatSales: number;
    zeroDiscountSales: number;
    slabRate: number;
    currentSlab: string;
    nextSlabAt: number | null;
    nextSlabPercent: number | null;
    targetAchievementPercentage: number;
  };
  enrichedOrders?: Array<{
    id: string;
    orderNumber?: string;
    orderDate?: string;
    orderStatus?: string;
    paymentStatus?: string;
    subtotal?: number;
    totalValue?: number;
    tax?: number;
    discount?: number;
    taxableValue: number;
    isCreditCustomer: boolean;
    incentiveTier: string;
    incentiveRateApplied: number;
    orderIncentiveAmount: number;
    customer?: {
      id?: string;
      businessName?: string;
      contactPerson?: string;
      status?: string;
      preferredPaymentMethod?: string;
    };
  }>;
  attendanceSummary?: {
    presentDays: number;
    halfDays: number;
    leaveDays: number;
    absentDays: number;
    totalWorkingHours: number;
  };
}

const SLAB_MATRIX = [
  { tier: "Tier 1", range: "₹0 – ₹2,49,999", min: 0, max: 249999, rate: 1.0, label: "1.0%" },
  { tier: "Tier 2", range: "₹2,50,000 – ₹4,99,999", min: 250000, max: 499999, rate: 1.75, label: "1.75%" },
  { tier: "Tier 3", range: "₹5,00,000 – ₹6,99,999", min: 500000, max: 699999, rate: 2.5, label: "2.5%" },
  { tier: "Tier 4", range: "₹7,00,000 – ₹8,99,999", min: 700000, max: 899999, rate: 3.5, label: "3.5%" },
  { tier: "Tier 5", range: "₹9,00,000 & Above", min: 900000, max: Infinity, rate: 5.0, label: "5.0%" },
];

export default function PayrollClient({
  employees,
  month,
  isAdmin
}: {
  employees: EmployeeData[];
  month: string;
  isAdmin: boolean;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipModal, setSlipModal] = useState<any | null>(null);
  const [baseSalaryModal, setBaseSalaryModal] = useState<EmployeeData | null>(null);
  const [salaryForm, setSalaryForm] = useState<Record<string, any>>({});
  const [newBaseSalary, setNewBaseSalary] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // New detailed drilldown modal states
  const [selectedSalesEmp, setSelectedSalesEmp] = useState<EmployeeData | null>(null);
  const [selectedIncentiveEmp, setSelectedIncentiveEmp] = useState<EmployeeData | null>(null);
  const [selectedSalaryEmp, setSelectedSalaryEmp] = useState<EmployeeData | null>(null);

  async function handleProcessSalary(emp: EmployeeData) {
    setLoading(true);
    const base = salaryForm[emp.id]?.basic ?? (emp.salary || 0);
    const hra = salaryForm[emp.id]?.hra ?? Math.round(base * 0.4);
    const allowances = salaryForm[emp.id]?.allowances ?? 0;
    const deductions = salaryForm[emp.id]?.deductions ?? 0;
    const bonus = salaryForm[emp.id]?.bonus ?? 0;
    const advance = salaryForm[emp.id]?.advance ?? 0;

    const res = await processSalary(emp.id, month, {
      basicSalary: base,
      hra,
      allowances,
      deductions,
      bonus,
      advance
    });
    setLoading(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setProcessingId(null);
    window.location.reload();
  }

  async function handleSaveBaseSalary() {
    if (!baseSalaryModal) return;
    setLoading(true);
    const res = await updateEmployeeSalary(baseSalaryModal.id, newBaseSalary);
    setLoading(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setBaseSalaryModal(null);
    window.location.reload();
  }

  const monthDisplay = useMemo(() => {
    try {
      const [y, m] = month.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleString("default", { month: "long", year: "numeric" });
    } catch {
      return month;
    }
  }, [month]);

  // Overall KPI summaries
  const totals = useMemo(() => {
    let grossPayout = 0;
    let totalIncentives = 0;
    let totalSales = 0;
    let paidCount = 0;
    let processedCount = 0;
    let pendingCount = 0;

    employees.forEach((emp) => {
      const sal = emp.salaries?.[0];
      const inc = emp.incentives?.[0]?.incentiveEarned ?? emp.dynamicIncentive ?? 0;
      const sales = emp.orders.reduce((s, o) => s + (o.subtotal || o.totalValue || 0), 0);
      const net = (sal?.netSalary ?? (emp.salary || 0)) + inc;

      grossPayout += net;
      totalIncentives += inc;
      totalSales += sales;

      if (sal?.status === "Paid") paidCount++;
      else if (sal?.status === "Processed") processedCount++;
      else pendingCount++;
    });

    return {
      grossPayout,
      totalIncentives,
      totalSales,
      paidCount,
      processedCount,
      pendingCount,
      employeeCount: employees.length
    };
  }, [employees]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─── TOP COMMAND HEADER ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              flexShrink: 0
            }}
          >
            <Wallet size={22} />
          </div>
          <div>
            <h1
              className="page-title"
              style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0f172a" }}
            >
              Payroll & Compensation — {monthDisplay}
            </h1>
            <p
              className="page-subtitle"
              style={{ margin: "3px 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary, #64748b)" }}
            >
              Process salaries, verify sales incentive slabs, and view employee payout analytics.
            </p>
          </div>
        </div>

        {/* Stylish Month Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <MonthPicker defaultValue={month} />
        </div>
      </div>

      {/* ─── TOP KPI SUMMARY METRICS ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px"
        }}
      >
        {/* Metric 1: Total Payroll Payout */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4f46e5"
            }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}
            >
              Total Payroll Payout
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", marginTop: "1px" }}>
              ₹{totals.grossPayout.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              {totals.employeeCount} {totals.employeeCount === 1 ? "Employee" : "Employees"}
            </div>
          </div>
        </div>

        {/* Metric 2: Total Incentive Pool */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#059669"
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}
            >
              Total Sales Incentive Pool
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#059669", marginTop: "1px" }}>
              + ₹{totals.totalIncentives.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#059669", marginTop: "1px" }}>
              Across active deals
            </div>
          </div>
        </div>

        {/* Metric 3: Total MTD Sales */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb"
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}
            >
              Total MTD Team Sales
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2563eb", marginTop: "1px" }}>
              ₹{totals.totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              {monthDisplay} Turnover
            </div>
          </div>
        </div>

        {/* Metric 4: Settlement Status */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: totals.pendingCount > 0 ? "#fffbeb" : "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: totals.pendingCount > 0 ? "#d97706" : "#059669"
            }}
          >
            {totals.pendingCount > 0 ? <Clock size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em"
              }}
            >
              Payroll Processing
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: totals.pendingCount > 0 ? "#d97706" : "#059669",
                marginTop: "2px"
              }}
            >
              {totals.paidCount} Paid • {totals.processedCount} Processed
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              {totals.pendingCount} Pending Approval
            </div>
          </div>
        </div>
      </div>

      {/* ─── PAYROLL TABLE ─── */}
      <div
        className="glass-panel"
        style={{
          padding: "20px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              Staff Salaries & Performance Compensations
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
              💡 Click on any <strong style={{ color: "#2563eb" }}>MTD Sales</strong>,{" "}
              <strong style={{ color: "#059669" }}>Incentive</strong>, or{" "}
              <strong style={{ color: "#4f46e5" }}>Net Salary</strong> figure to inspect the underlying formula, order breakdown, and slab metrics.
            </p>
          </div>
        </div>

        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Employee
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Department
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Basic Salary
                </th>
                <th
                  style={{
                    padding: "12px 14px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "#2563eb",
                    textTransform: "uppercase"
                  }}
                >
                  MTD Sales 🔍
                </th>
                <th
                  style={{
                    padding: "12px 14px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "#059669",
                    textTransform: "uppercase"
                  }}
                >
                  Incentive ✨
                </th>
                <th
                  style={{
                    padding: "12px 14px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "#4f46e5",
                    textTransform: "uppercase"
                  }}
                >
                  Net Salary 📊
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Status
                </th>
                {isAdmin && (
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const salaryRecord = emp.salaries?.[0];
                const incentiveRecord = emp.incentives?.[0];
                const totalSales = emp.orders.reduce(
                  (s, o) => s + (o.subtotal || o.totalValue || 0),
                  0
                );
                const basicSalary = salaryRecord?.basicSalary ?? emp.salary ?? 0;
                const netSalary = salaryRecord?.netSalary ?? (emp.salary || 0);
                const incentiveEarned =
                  incentiveRecord?.incentiveEarned ?? emp.dynamicIncentive ?? 0;
                const grandNet = netSalary + incentiveEarned;
                const activeSlab = emp.incentiveDetails?.currentSlab || "1%";

                return (
                  <React.Fragment key={emp.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#fafafa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* Employee Column */}
                      <td style={{ padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              backgroundColor: "#e0e7ff",
                              color: "#4338ca",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {emp.user?.name ? emp.user.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                              {emp.user.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {emp.designation || "Sales Rep"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: "14px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569"
                          }}
                        >
                          {emp.department || "Sales & CRM"}
                        </span>
                      </td>

                      {/* Basic Salary */}
                      <td style={{ padding: "14px", fontWeight: 600, color: "#334155", fontVariantNumeric: "tabular-nums" }}>
                        ₹{basicSalary.toLocaleString("en-IN")}
                      </td>

                      {/* 1. MTD SALES (CLICKABLE) */}
                      <td style={{ padding: "14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSalesEmp(emp)}
                          title="Click to view MTD sales & order details"
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#dbeafe";
                            e.currentTarget.style.borderColor = "#93c5fd";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#eff6ff";
                            e.currentTarget.style.borderColor = "#bfdbfe";
                            e.currentTarget.style.transform = "none";
                          }}
                        >
                          <span style={{ fontWeight: 800, color: "#1d4ed8", fontSize: "0.88rem", fontVariantNumeric: "tabular-nums" }}>
                            ₹{totalSales.toLocaleString("en-IN")}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                            📦 {emp.orders.length} {emp.orders.length === 1 ? "Order" : "Orders"} <ArrowUpRight size={11} />
                          </span>
                        </button>
                      </td>

                      {/* 2. INCENTIVE (CLICKABLE) */}
                      <td style={{ padding: "14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedIncentiveEmp(emp)}
                          title="Click to view incentive slab calculation & metrics"
                          style={{
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#d1fae5";
                            e.currentTarget.style.borderColor = "#6ee7b7";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#ecfdf5";
                            e.currentTarget.style.borderColor = "#a7f3d0";
                            e.currentTarget.style.transform = "none";
                          }}
                        >
                          <span style={{ fontWeight: 800, color: "#047857", fontSize: "0.88rem", fontVariantNumeric: "tabular-nums" }}>
                            + ₹{incentiveEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                            🏷️ {activeSlab} Slab <ArrowUpRight size={11} />
                          </span>
                        </button>
                      </td>

                      {/* 3. NET SALARY (CLICKABLE) */}
                      <td style={{ padding: "14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSalaryEmp(emp)}
                          title="Click to view full salary structure, earnings & deductions"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#eef2ff";
                            e.currentTarget.style.borderColor = "#c7d2fe";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                            e.currentTarget.style.borderColor = "#cbd5e1";
                            e.currentTarget.style.transform = "none";
                          }}
                        >
                          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.92rem", fontVariantNumeric: "tabular-nums" }}>
                            ₹{grandNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                            📊 Base + Inc <ArrowUpRight size={11} />
                          </span>
                        </button>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor:
                              salaryRecord?.status === "Paid"
                                ? "#ecfdf5"
                                : salaryRecord?.status === "Processed"
                                ? "#fffbeb"
                                : "#fef2f2",
                            color:
                              salaryRecord?.status === "Paid"
                                ? "#059669"
                                : salaryRecord?.status === "Processed"
                                ? "#d97706"
                                : "#dc2626"
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              backgroundColor:
                                salaryRecord?.status === "Paid"
                                ? "#059669"
                                : salaryRecord?.status === "Processed"
                                ? "#d97706"
                                : "#dc2626"
                            }}
                          />
                          {salaryRecord?.status || "Pending"}
                        </span>
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td style={{ padding: "14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="action-btn text-blue"
                              onClick={() => setProcessingId(emp.id)}
                              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                            >
                              {salaryRecord ? "Edit" : "Process"}
                            </button>
                            <button
                              type="button"
                              className="action-btn text-purple"
                              onClick={() => {
                                setBaseSalaryModal(emp);
                                setNewBaseSalary(emp.salary || 0);
                              }}
                              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                            >
                              Set Base Salary
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() =>
                                setSlipModal({
                                  emp,
                                  salaryRecord,
                                  incentiveRecord,
                                  totalSales,
                                  incentiveEarned
                                })
                              }
                              style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                            >
                              Slip
                            </button>
                            {salaryRecord?.status === "Processed" && (
                              <button
                                type="button"
                                className="action-btn text-green"
                                onClick={async () => {
                                  await markSalaryPaid(salaryRecord.id);
                                  window.location.reload();
                                }}
                                style={{ padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700 }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Inline salary processing form */}
                    {processingId === emp.id && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7}>
                          <div
                            style={{
                              padding: "16px 20px",
                              background: "#f8fafc",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              margin: "6px 0"
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", marginBottom: "10px" }}>
                              Adjust Payroll Structure for {emp.user.name} ({monthDisplay})
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: "12px",
                                marginBottom: "14px"
                              }}
                            >
                              {[
                                { label: "Basic (₹)", key: "basic", default: emp.salary || 0 },
                                { label: "HRA (₹)", key: "hra", default: Math.round((emp.salary || 0) * 0.4) },
                                { label: "Allowances (₹)", key: "allowances", default: 0 },
                                { label: "Deductions (₹)", key: "deductions", default: 0 },
                                { label: "Bonus (₹)", key: "bonus", default: 0 },
                                { label: "Advance (₹)", key: "advance", default: 0 }
                              ].map((field) => (
                                <div key={field.key} className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "#475569" }}>
                                    {field.label}
                                  </label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ height: "34px", fontSize: "0.82rem" }}
                                    defaultValue={field.default}
                                    onChange={(e) =>
                                      setSalaryForm((f) => ({
                                        ...f,
                                        [emp.id]: {
                                          ...(f[emp.id] || {}),
                                          [field.key]: parseFloat(e.target.value) || 0
                                        }
                                      }))
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={loading}
                                onClick={() => handleProcessSalary(emp)}
                                style={{ padding: "6px 16px", fontSize: "0.82rem", fontWeight: 700 }}
                              >
                                {loading ? "Processing..." : "Save & Process Salary"}
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => setProcessingId(null)}
                                style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}
                  >
                    No employee records found for {monthDisplay}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. MTD SALES BREAKDOWN MODAL (Click on MTD Sales)
      ───────────────────────────────────────────────────────────── */}
      {selectedSalesEmp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px"
          }}
          onClick={() => setSelectedSalesEmp(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "840px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(59, 130, 246, 0.25)",
                    flexShrink: 0
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    MTD Sales Breakdown — {selectedSalesEmp.user.name}
                  </h2>
                  <p style={{ fontSize: "0.8rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    {monthDisplay} • {selectedSalesEmp.designation || "Sales Rep"} ({selectedSalesEmp.department || "Sales"})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSalesEmp(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Summary KPIs */}
              {(() => {
                const orders = selectedSalesEmp.enrichedOrders || selectedSalesEmp.orders || [];
                const grossSales = orders.reduce((s: number, o: any) => s + (o.subtotal || o.totalValue || 0), 0);
                const zeroDiscSales = orders.filter((o: any) => (o.discount || 0) === 0).reduce((s: number, o: any) => s + (o.subtotal || o.totalValue || 0), 0);
                const aov = orders.length > 0 ? Math.round(grossSales / orders.length) : 0;

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
                    <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "10px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase" }}>Gross MTD Sales</span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e40af", marginTop: "2px" }}>
                        ₹{grossSales.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "10px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Deals Closed</span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                        {orders.length} {orders.length === 1 ? "Order" : "Orders"}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: "12px", borderRadius: "10px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 700, textTransform: "uppercase" }}>0% Disc (Full Margin)</span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
                        ₹{zeroDiscSales.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "10px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Avg Deal Size (AOV)</span>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                        ₹{aov.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Order Classification Guide */}
              <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.78rem", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981" }} />
                  <strong style={{ color: "#0f172a" }}>0% Discount Deals:</strong> High margin deal (+2% extra bonus)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3b82f6" }} />
                  <strong style={{ color: "#0f172a" }}>0.01% – 15% Discount:</strong> Standard non-credit deal (Slab rate)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <strong style={{ color: "#0f172a" }}>&gt;15% Disc or Credit:</strong> Flat 1.0% rate
                </span>
              </div>

              {/* Detailed Orders Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", backgroundColor: "#f1f5f9", fontWeight: 700, fontSize: "0.8rem", color: "#334155" }}>
                  Order Ledger for {monthDisplay}
                </div>
                <div style={{ overflowX: "auto", maxHeight: "360px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>Order #</th>
                        <th style={{ padding: "8px 12px" }}>Date</th>
                        <th style={{ padding: "8px 12px" }}>Customer</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Status</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Discount</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Taxable Subtotal</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSalesEmp.enrichedOrders || selectedSalesEmp.orders || []).map((o: any, idx: number) => (
                        <tr key={o.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <Link href={`/orders/${o.id}`} style={{ fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
                              #{o.orderNumber || o.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>
                            {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{o.customer?.businessName || "Walk-in Customer"}</div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{o.customer?.contactPerson || ""}</div>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", backgroundColor: o.orderStatus === "Delivered" ? "#ecfdf5" : "#eff6ff", color: o.orderStatus === "Delivered" ? "#059669" : "#2563eb", fontWeight: 600 }}>
                              {o.orderStatus || "Confirmed"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", backgroundColor: (o.discount || 0) === 0 ? "#ecfdf5" : (o.discount || 0) > 15 ? "#fffbeb" : "#f1f5f9", color: (o.discount || 0) === 0 ? "#059669" : (o.discount || 0) > 15 ? "#d97706" : "#475569", fontWeight: 700 }}>
                              {o.discount || 0}%
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                            ₹{(o.subtotal || o.taxableValue || o.totalValue || 0).toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                            ₹{(o.totalValue || o.subtotal || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {(selectedSalesEmp.orders || []).length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                            <ShoppingCart size={32} style={{ margin: "0 auto 6px auto", opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: "0.85rem" }}>No orders recorded for this employee in {monthDisplay}.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "0 0 16px 16px" }}>
              <Link href="/orders" style={{ fontSize: "0.82rem", color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                View All Orders Registry →
              </Link>
              <button
                type="button"
                onClick={() => setSelectedSalesEmp(null)}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: "0.84rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. INCENTIVE CALCULATION & SLAB BREAKDOWN MODAL (Click on Incentive)
      ───────────────────────────────────────────────────────────── */}
      {selectedIncentiveEmp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px"
          }}
          onClick={() => setSelectedIncentiveEmp(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "860px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)",
                    flexShrink: 0
                  }}
                >
                  <Award size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Incentive Calculation & Slab Engine — {selectedIncentiveEmp.user.name}
                  </h2>
                  <p style={{ fontSize: "0.8rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    Step-by-step mathematical breakdown for {monthDisplay}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncentiveEmp(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Hero Banner */}
              {(() => {
                const inc = selectedIncentiveEmp.incentiveDetails || {
                  totalIncentive: selectedIncentiveEmp.dynamicIncentive || 0,
                  slabIncentive: selectedIncentiveEmp.dynamicIncentive || 0,
                  bonusIncentive: 0,
                  flatIncentive: 0,
                  eligibleSales: selectedIncentiveEmp.orders.reduce((s: number, o: any) => s + (o.subtotal || o.totalValue || 0), 0),
                  flatSales: 0,
                  zeroDiscountSales: 0,
                  slabRate: 1,
                  currentSlab: "1%",
                  nextSlabAt: 250000,
                  nextSlabPercent: 1.75
                };

                return (
                  <>
                    <div
                      style={{
                        padding: "16px 20px",
                        background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                        border: "1px solid #a7f3d0",
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "#047857", fontWeight: 700, textTransform: "uppercase" }}>
                          Total Incentive Payable for {monthDisplay}
                        </div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#065f46", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                          ₹{inc.totalIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.74rem", color: "#047857", fontWeight: 600 }}>Current Qualification</div>
                        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#047857" }}>
                          {inc.currentSlab} Slab Tier
                        </div>
                        {inc.nextSlabAt && inc.nextSlabAt > 0 ? (
                          <div style={{ fontSize: "0.74rem", color: "#065f46", fontWeight: 600, marginTop: "2px" }}>
                            🎯 ₹{inc.nextSlabAt.toLocaleString("en-IN")} more to reach {inc.nextSlabPercent}% Slab!
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Step-by-Step Mathematical Calculation */}
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", backgroundColor: "#ffffff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <Calculator size={17} color="#4f46e5" />
                        <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}>
                          Step-by-Step Incentive Computation (Company Policy)
                        </h4>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Step 1 */}
                        <div style={{ padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.84rem" }}>
                              Step 1: Progressive Monthly Slab (Standard Deals 0–15% Disc)
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              Eligible Sales ₹{inc.eligibleSales.toLocaleString("en-IN")} × {inc.slabRate}% ({inc.currentSlab} tier)
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>
                            ₹{inc.slabIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div style={{ padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "#047857", fontSize: "0.84rem" }}>
                              Step 2: Margin Reward on Zero-Discount Orders (+2.0% Bonus)
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              Zero-Discount Sales ₹{inc.zeroDiscountSales.toLocaleString("en-IN")} × +2.0% extra margin bonus
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, color: "#059669", fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>
                            + ₹{inc.bonusIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div style={{ padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.84rem" }}>
                              Step 3: Flat Rate Deals (&gt;15% Discount or Credit Customers)
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              Flat Category Sales ₹{inc.flatSales.toLocaleString("en-IN")} × 1.0% flat commission
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, color: "#475569", fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>
                            + ₹{inc.flatIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Total Equation */}
                        <div style={{ padding: "12px 14px", backgroundColor: "#eff6ff", borderRadius: "8px", border: "1.5px dashed #bfdbfe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 800, color: "#1d4ed8", fontSize: "0.9rem" }}>
                            Final Total = Slab (₹{inc.slabIncentive.toFixed(2)}) + Bonus (₹{inc.bonusIncentive.toFixed(2)}) + Flat (₹{inc.flatIncentive.toFixed(2)})
                          </span>
                          <span style={{ fontWeight: 900, color: "#1e40af", fontSize: "1.15rem", fontVariantNumeric: "tabular-nums" }}>
                            = ₹{inc.totalIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Official Company Incentive Slab Ladder */}
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", backgroundColor: "#f1f5f9", fontWeight: 700, fontSize: "0.82rem", color: "#334155", display: "flex", justifyContent: "space-between" }}>
                        <span>Company Incentive Slab Matrix</span>
                        <span style={{ color: "#059669" }}>Higher Sales = Higher % on Full Month Volume</span>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Tier</th>
                            <th style={{ padding: "8px 12px" }}>Monthly Sales Range</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Incentive Rate</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SLAB_MATRIX.map((slab) => {
                            const isCurrent = slab.label === inc.currentSlab;
                            return (
                              <tr
                                key={slab.tier}
                                style={{
                                  borderBottom: "1px solid #f1f5f9",
                                  backgroundColor: isCurrent ? "#ecfdf5" : "transparent"
                                }}
                              >
                                <td style={{ padding: "10px 12px", fontWeight: isCurrent ? 800 : 500, color: isCurrent ? "#047857" : "#0f172a" }}>
                                  {slab.tier}
                                </td>
                                <td style={{ padding: "10px 12px", fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "#047857" : "#475569" }}>
                                  {slab.range}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: isCurrent ? "#059669" : "#0f172a" }}>
                                  {slab.label}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                  {isCurrent ? (
                                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#065f46", backgroundColor: "#a7f3d0", padding: "3px 10px", borderRadius: "10px" }}>
                                      Active Tier ✨
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                      {inc.eligibleSales >= slab.min ? "Unlocked" : "Locked"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end", borderRadius: "0 0 16px 16px" }}>
              <button
                type="button"
                onClick={() => setSelectedIncentiveEmp(null)}
                style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: "0.84rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. NET SALARY STRUCTURE & METRICS MODAL (Click on Net Salary)
      ───────────────────────────────────────────────────────────── */}
      {selectedSalaryEmp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px"
          }}
          onClick={() => setSelectedSalaryEmp(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(79, 70, 229, 0.25)",
                    flexShrink: 0
                  }}
                >
                  <Wallet size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Net Salary Structure & Payslip Metrics — {selectedSalaryEmp.user.name}
                  </h2>
                  <p style={{ fontSize: "0.8rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    {monthDisplay} • {selectedSalaryEmp.designation || "Sales Rep"} ({selectedSalaryEmp.department || "Sales"})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSalaryEmp(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {(() => {
                const salaryRecord = selectedSalaryEmp.salaries?.[0];
                const basic = salaryRecord?.basicSalary ?? selectedSalaryEmp.salary ?? 0;
                const hra = salaryRecord?.hra ?? Math.round(basic * 0.4);
                const allowances = salaryRecord?.allowances ?? 0;
                const bonus = salaryRecord?.bonus ?? 0;
                const incentive = selectedSalaryEmp.incentives?.[0]?.incentiveEarned ?? selectedSalaryEmp.dynamicIncentive ?? 0;
                const deductions = salaryRecord?.deductions ?? 0;
                const advance = salaryRecord?.advance ?? 0;

                const gross = basic + hra + allowances + bonus + incentive;
                const totalDeductions = deductions + advance;
                const net = gross - totalDeductions;
                const att = selectedSalaryEmp.attendanceSummary || { presentDays: 26, halfDays: 0, leaveDays: 4, absentDays: 0, totalWorkingHours: 208 };

                return (
                  <>
                    {/* Hero Net Take-Home */}
                    <div
                      style={{
                        padding: "16px 20px",
                        background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                        border: "1px solid #c7d2fe",
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "#3730a3", fontWeight: 700, textTransform: "uppercase" }}>
                          Total Net Salary Payable ({monthDisplay})
                        </div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1e1b4b", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                          ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            padding: "6px 14px",
                            borderRadius: "20px",
                            backgroundColor: salaryRecord?.status === "Paid" ? "#ecfdf5" : salaryRecord?.status === "Processed" ? "#fffbeb" : "#fef2f2",
                            color: salaryRecord?.status === "Paid" ? "#059669" : salaryRecord?.status === "Processed" ? "#d97706" : "#dc2626"
                          }}
                        >
                          ● {salaryRecord?.status || "Pending Processing"}
                        </span>
                      </div>
                    </div>

                    {/* Dual Financial Ledger */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {/* Left: Earnings */}
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                        <div style={{ padding: "10px 14px", backgroundColor: "#f0fdf4", borderBottom: "1px solid #bbf7d0", fontWeight: 700, fontSize: "0.84rem", color: "#166534" }}>
                          Gross Earnings (+)
                        </div>
                        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Basic Salary</span>
                            <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>₹{basic.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>HRA (40%)</span>
                            <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>₹{hra.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Special Allowances</span>
                            <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>₹{allowances.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                            <span style={{ fontWeight: 700 }}>Sales Incentive</span>
                            <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>+ ₹{incentive.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          {bonus > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                              <span style={{ fontWeight: 700 }}>Company Bonus</span>
                              <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>+ ₹{bonus.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px dashed #cbd5e1", paddingTop: "8px", marginTop: "4px", fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>
                            <span>Total Gross Earnings</span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>₹{gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Deductions */}
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                        <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", borderBottom: "1px solid #fecaca", fontWeight: 700, fontSize: "0.84rem", color: "#991b1b" }}>
                          Deductions & Recoveries (-)
                        </div>
                        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Leave / Absenteeism Deductions</span>
                            <span style={{ fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>- ₹{deductions.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Salary Advance / Loan Recovery</span>
                            <span style={{ fontWeight: 600, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>- ₹{advance.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px dashed #cbd5e1", paddingTop: "8px", marginTop: "32px", fontWeight: 800, fontSize: "0.9rem", color: "#991b1b" }}>
                            <span>Total Deductions</span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>- ₹{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Final Net Calculation Box */}
                    <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.84rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#334155" }}>
                        <strong>Calculation Formula:</strong> Gross (₹{gross.toFixed(2)}) − Deductions (₹{totalDeductions.toFixed(2)})
                      </span>
                      <span style={{ fontWeight: 900, color: "#4f46e5", fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>
                        = ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Attendance Verification Strip */}
                    <div style={{ padding: "10px 14px", backgroundColor: "#f1f5f9", borderRadius: "8px", fontSize: "0.78rem", color: "#475569", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <span>📅 <strong>Attendance Recorded:</strong> {att.presentDays} Present Days</span>
                      <span>🏖️ <strong>Leaves:</strong> {att.leaveDays} Approved</span>
                      <span>⏳ <strong>Working Hours:</strong> {att.totalWorkingHours || (att.presentDays * 8)} hrs</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "0 0 16px 16px" }}>
              <button
                type="button"
                onClick={() => {
                  const sal = selectedSalaryEmp.salaries?.[0];
                  const inc = selectedSalaryEmp.incentives?.[0]?.incentiveEarned ?? selectedSalaryEmp.dynamicIncentive ?? 0;
                  const sales = selectedSalaryEmp.orders.reduce((s: number, o: any) => s + (o.subtotal || o.totalValue || 0), 0);
                  setSlipModal({
                    emp: selectedSalaryEmp,
                    salaryRecord: sal,
                    incentiveRecord: selectedSalaryEmp.incentives?.[0],
                    totalSales: sales,
                    incentiveEarned: inc
                  });
                  setSelectedSalaryEmp(null);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "6px 14px", borderRadius: "6px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontWeight: 700, cursor: "pointer" }}
              >
                <Printer size={14} /> Open Official Salary Slip
              </button>
              <button
                type="button"
                onClick={() => setSelectedSalaryEmp(null)}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: "0.84rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SALARY SLIP PRINTABLE MODAL
      ───────────────────────────────────────────────────────────── */}
      {slipModal && (
        <div className="modal-overlay" onClick={() => setSlipModal(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="#4f46e5" />
                <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Salary Slip — {monthDisplay}</h2>
              </div>
              <button className="modal-close" onClick={() => setSlipModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "20px" }}>
              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>{slipModal.emp.user.name}</div>
                <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "2px" }}>
                  {slipModal.emp.designation || "Sales Rep"} • {slipModal.emp.department || "Sales & CRM"}
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: "0.85rem" }}>
                  Earnings (Monthly)
                </div>
                {[
                  ["Basic Salary", slipModal.salaryRecord?.basicSalary ?? slipModal.emp.salary ?? 0],
                  ["HRA (House Rent Allowance)", slipModal.salaryRecord?.hra ?? Math.round((slipModal.emp.salary || 0) * 0.4)],
                  ["Special Allowances", slipModal.salaryRecord?.allowances ?? 0],
                  ["Company Bonus", slipModal.salaryRecord?.bonus ?? 0],
                  ["Sales Performance Incentive", slipModal.incentiveEarned ?? 0]
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "0.82rem"
                    }}
                  >
                    <span style={{ color: label === "Sales Performance Incentive" ? "#059669" : "#475569", fontWeight: label === "Sales Performance Incentive" ? 700 : 500 }}>
                      {label}
                    </span>
                    <span style={{ fontWeight: 700, color: label === "Sales Performance Incentive" ? "#059669" : "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                      ₹{(value as number).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                <div style={{ background: "#f8fafc", padding: "10px 16px", fontWeight: 700, fontSize: "0.85rem", color: "#991b1b", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #fecaca" }}>
                  Deductions
                </div>
                {[
                  ["Loss of Pay / Deductions", slipModal.salaryRecord?.deductions ?? 0],
                  ["Advance Recovery", slipModal.salaryRecord?.advance ?? 0]
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      color: "#dc2626",
                      fontSize: "0.82rem"
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      - ₹{(value as number).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    background: "#f0fdf4",
                    borderTop: "1.5px dashed #86efac",
                    color: "#166534"
                  }}
                >
                  <span>Net Salary Disbursed</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    ₹{((slipModal.salaryRecord?.netSalary ?? slipModal.emp.salary ?? 0) + (slipModal.incentiveEarned ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  color: "#64748b",
                  border: "1px solid #e2e8f0"
                }}
              >
                MTD Sales Volume: <strong>₹{slipModal.totalSales.toLocaleString("en-IN")}</strong> | Status:{" "}
                <strong style={{ color: slipModal.salaryRecord?.status === "Paid" ? "#059669" : "#d97706" }}>
                  {slipModal.salaryRecord?.status || "Pending"}
                </strong>
              </div>

              <div className="modal-footer" style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="action-btn" onClick={() => setSlipModal(null)} style={{ padding: "8px 16px" }}>
                  Close
                </button>
                <button className="primary-btn" onClick={() => window.print()} style={{ padding: "8px 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Printer size={14} /> Print Salary Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SET BASE SALARY MODAL
      ───────────────────────────────────────────────────────────── */}
      {baseSalaryModal && (
        <div className="modal-overlay" onClick={() => setBaseSalaryModal(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>Set Default Base Salary — {baseSalaryModal.user.name}</h2>
              <button className="modal-close" onClick={() => setBaseSalaryModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Monthly Base Salary (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4f46e5", fontWeight: 700 }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    style={{ paddingLeft: "24px", height: "38px", fontSize: "0.9rem", fontWeight: 700 }}
                    value={newBaseSalary}
                    onChange={(e) => setNewBaseSalary(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 35000"
                  />
                </div>
                <small style={{ color: "var(--text-muted)", marginTop: 6, display: "block", fontSize: "0.75rem" }}>
                  This will update {baseSalaryModal.user.name}'s default monthly base salary for all future payroll cycles.
                </small>
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="action-btn" onClick={() => setBaseSalaryModal(null)}>
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  disabled={loading}
                  onClick={handleSaveBaseSalary}
                  style={{ fontWeight: 700, backgroundColor: "#4f46e5" }}
                >
                  {loading ? "Saving..." : "Save Base Salary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
