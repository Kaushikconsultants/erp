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
  FileText,
  ChevronRight
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
    newCustomerIncentive?: number;
    quantityIncentive?: number;
    marginIncentive?: number;
    eligibleSales: number;
    flatSales: number;
    zeroDiscountSales: number;
    slabRate: number;
    currentSlab: string;
    nextSlabAt: number | null;
    nextSlabPercent: number | null;
    targetAchievementPercentage: number;
    appliedModelSummary?: string[];
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

  // Drilldown modal states
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
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "var(--accent-light, #eef2ff)",
              color: "var(--accent-primary, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <h1
              className="page-title"
              style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary, #0f172a)" }}
            >
              Payroll & Compensation — {monthDisplay}
            </h1>
            <p
              className="page-subtitle"
              style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary, #64748b)" }}
            >
              Process staff salaries, monitor sales incentive tiers, and review payout breakdowns.
            </p>
          </div>
        </div>

        {/* Month Selector */}
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
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border, #e2e8f0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4f46e5"
            }}
          >
            <Wallet size={18} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Total Payroll Payout
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", marginTop: "1px" }}>
              ₹{totals.grossPayout.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              {totals.employeeCount} {totals.employeeCount === 1 ? "Employee" : "Employees"}
            </div>
          </div>
        </div>

        {/* Metric 2: Total Incentive Pool */}
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border, #e2e8f0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#059669"
            }}
          >
            <Award size={18} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Total Sales Incentive Pool
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#059669", marginTop: "1px" }}>
              + ₹{totals.totalIncentives.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              Across active orders
            </div>
          </div>
        </div>

        {/* Metric 3: Total MTD Sales */}
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border, #e2e8f0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb"
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Total MTD Team Sales
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#2563eb", marginTop: "1px" }}>
              ₹{totals.totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              {monthDisplay} Turnover
            </div>
          </div>
        </div>

        {/* Metric 4: Settlement Status */}
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid var(--border, #e2e8f0)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: totals.pendingCount > 0 ? "#d97706" : "#059669"
            }}
          >
            {totals.pendingCount > 0 ? <Clock size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Payroll Processing
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 600, color: totals.pendingCount > 0 ? "#d97706" : "#059669", marginTop: "1px" }}>
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
        style={{
          padding: "20px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid var(--border, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#0f172a" }}>
              Staff Salaries & Performance Compensations
            </h3>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Click on any MTD Sales, Incentive, or Net Salary metric to inspect full order breakdown and calculations.
            </p>
          </div>
        </div>

        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  Employee
                </th>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  Department
                </th>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  Basic Salary
                </th>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  MTD Sales
                </th>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#059669", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  Incentive
                </th>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  Net Salary
                </th>
                <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left" }}>
                  Status
                </th>
                {isAdmin && (
                  <th style={{ padding: "10px 14px", fontSize: "0.74rem", fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "right" }}>
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
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* Employee Column */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              backgroundColor: "#eef2ff",
                              color: "#4f46e5",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {emp.user?.name ? emp.user.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: "#0f172a", fontSize: "0.875rem" }}>
                              {emp.user.name}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                              {emp.designation || "Staff"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 400,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569"
                          }}
                        >
                          {emp.department || "General"}
                        </span>
                      </td>

                      {/* Basic Salary */}
                      <td style={{ padding: "12px 14px", fontWeight: 500, color: "#334155" }}>
                        ₹{basicSalary.toLocaleString("en-IN")}
                      </td>

                      {/* 1. MTD SALES (CLICKABLE) */}
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSalesEmp(emp)}
                          title="Click to view MTD sales details"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "5px 9px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#eff6ff";
                            e.currentTarget.style.borderColor = "#bfdbfe";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#1d4ed8", fontSize: "0.85rem" }}>
                            ₹{totalSales.toLocaleString("en-IN")}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "2px" }}>
                            {emp.orders.length} {emp.orders.length === 1 ? "Order" : "Orders"} <ArrowUpRight size={10} />
                          </span>
                        </button>
                      </td>

                      {/* 2. INCENTIVE (CLICKABLE) */}
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedIncentiveEmp(emp)}
                          title="Click to view incentive metrics"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "5px 9px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#ecfdf5";
                            e.currentTarget.style.borderColor = "#a7f3d0";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#047857", fontSize: "0.85rem" }}>
                            + ₹{incentiveEarned.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "2px" }}>
                            {activeSlab} Slab <ArrowUpRight size={10} />
                          </span>
                        </button>
                      </td>

                      {/* 3. NET SALARY (CLICKABLE) */}
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSalaryEmp(emp)}
                          title="Click to view salary structure"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "5px 9px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f1f5f9";
                            e.currentTarget.style.borderColor = "#cbd5e1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.875rem" }}>
                            ₹{grandNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "2px" }}>
                            Base + Inc <ArrowUpRight size={10} />
                          </span>
                        </button>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
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
                              width: 5,
                              height: 5,
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
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => setProcessingId(emp.id)}
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                color: "#2563eb",
                                cursor: "pointer"
                              }}
                            >
                              {salaryRecord ? "Edit" : "Process"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBaseSalaryModal(emp);
                                setNewBaseSalary(emp.salary || 0);
                              }}
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                color: "#4f46e5",
                                cursor: "pointer"
                              }}
                            >
                              Set Base
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSlipModal({
                                  emp,
                                  salaryRecord,
                                  incentiveRecord,
                                  totalSales,
                                  incentiveEarned
                                })
                              }
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                color: "#475569",
                                cursor: "pointer"
                              }}
                            >
                              Slip
                            </button>
                            {salaryRecord?.status === "Processed" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await markSalaryPaid(salaryRecord.id);
                                  window.location.reload();
                                }}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  borderRadius: "6px",
                                  border: "1px solid #bbf7d0",
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  cursor: "pointer"
                                }}
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
                              padding: "16px 18px",
                              background: "#f8fafc",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              margin: "6px 0"
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a", marginBottom: "10px" }}>
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
                                  <label style={{ fontSize: "0.74rem", fontWeight: 500, color: "#475569" }}>
                                    {field.label}
                                  </label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ height: "32px", fontSize: "0.82rem", borderRadius: "6px" }}
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
                                style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 500, borderRadius: "6px" }}
                              >
                                {loading ? "Processing..." : "Save & Process Salary"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setProcessingId(null)}
                                style={{ padding: "6px 12px", fontSize: "0.8rem", fontWeight: 500, borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", cursor: "pointer" }}
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
                    style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}
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
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
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
              maxWidth: "800px",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
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
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                    MTD Sales Breakdown — {selectedSalesEmp.user.name}
                  </h2>
                  <p style={{ fontSize: "0.78rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    {monthDisplay} • {selectedSalesEmp.designation || "Staff"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSalesEmp(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {(() => {
                const orders = selectedSalesEmp.enrichedOrders || selectedSalesEmp.orders || [];
                const grossSales = orders.reduce((s: number, o: any) => s + (o.subtotal || o.totalValue || 0), 0);
                const zeroDiscSales = orders.filter((o: any) => (o.discount || 0) === 0).reduce((s: number, o: any) => s + (o.subtotal || o.totalValue || 0), 0);
                const aov = orders.length > 0 ? Math.round(grossSales / orders.length) : 0;

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Gross MTD Sales</span>
                      <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#2563eb", marginTop: "2px" }}>
                        ₹{grossSales.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Deals Closed</span>
                      <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
                        {orders.length} {orders.length === 1 ? "Order" : "Orders"}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>0% Disc (Full Margin)</span>
                      <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#059669", marginTop: "2px" }}>
                        ₹{zeroDiscSales.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>Avg Deal Size</span>
                      <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
                        ₹{aov.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Detailed Orders Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", fontWeight: 500, fontSize: "0.78rem", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                  Orders Summary for {monthDisplay}
                </div>
                <div style={{ overflowX: "auto", maxHeight: "320px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Order #</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Date</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Customer</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 500 }}>Status</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 500 }}>Discount</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 500 }}>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSalesEmp.enrichedOrders || selectedSalesEmp.orders || []).map((o: any, idx: number) => (
                        <tr key={o.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <Link href={`/orders/${o.id}`} style={{ fontWeight: 500, color: "#2563eb", textDecoration: "none" }}>
                              #{o.orderNumber || o.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>
                            {o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ fontWeight: 500, color: "#0f172a" }}>{o.customer?.businessName || "Walk-in Customer"}</div>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: "0.72rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: o.orderStatus === "Delivered" ? "#ecfdf5" : "#eff6ff", color: o.orderStatus === "Delivered" ? "#059669" : "#2563eb" }}>
                              {o.orderStatus || "Confirmed"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center", color: "#475569" }}>
                            {o.discount || 0}%
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 500, color: "#0f172a" }}>
                            ₹{(o.totalValue || o.subtotal || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedSalesEmp(null)}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 500, cursor: "pointer", fontSize: "0.82rem" }}
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
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
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
              maxWidth: "800px",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
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
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Award size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                    Incentive Details — {selectedIncentiveEmp.user.name}
                  </h2>
                  <p style={{ fontSize: "0.78rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    Mathematical slab computation for {monthDisplay}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncentiveEmp(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
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
                        padding: "14px 18px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 500 }}>
                          Total Incentive Earned
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#15803d", marginTop: "1px" }}>
                          ₹{inc.totalIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.72rem", color: "#166534" }}>Active Slab</div>
                        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#166534" }}>
                          {inc.currentSlab} Tier
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Mathematical Calculation */}
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", backgroundColor: "#ffffff" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", marginBottom: "10px" }}>
                        Calculation Breakdown
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: 500, color: "#0f172a", fontSize: "0.82rem" }}>Progressive Slab ({inc.currentSlab})</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Eligible Sales ₹{inc.eligibleSales.toLocaleString("en-IN")} × {inc.slabRate}%</div>
                          </div>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>
                            ₹{inc.slabIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        {inc.bonusIncentive > 0 && (
                          <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontWeight: 500, color: "#059669", fontSize: "0.82rem" }}>Zero-Discount Bonus (+2%)</div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Sales ₹{inc.zeroDiscountSales.toLocaleString("en-IN")} × 2.0%</div>
                            </div>
                            <div style={{ fontWeight: 600, color: "#059669", fontSize: "0.85rem" }}>
                              + ₹{inc.bonusIncentive.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedIncentiveEmp(null)}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 500, cursor: "pointer", fontSize: "0.82rem" }}
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
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
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
              maxWidth: "720px",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
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
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    background: "#eef2ff",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Wallet size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                    Salary Breakdown — {selectedSalaryEmp.user.name}
                  </h2>
                  <p style={{ fontSize: "0.78rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    {monthDisplay}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSalaryEmp(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
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

                return (
                  <>
                    <div
                      style={{
                        padding: "14px 18px",
                        background: "#eef2ff",
                        border: "1px solid #c7d2fe",
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#4338ca", fontWeight: 500 }}>
                          Total Net Salary Payable ({monthDisplay})
                        </div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#312e81", marginTop: "1px" }}>
                          ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "4px 10px",
                            borderRadius: "12px",
                            backgroundColor: salaryRecord?.status === "Paid" ? "#ecfdf5" : "#fef2f2",
                            color: salaryRecord?.status === "Paid" ? "#059669" : "#dc2626"
                          }}
                        >
                          {salaryRecord?.status || "Pending"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {/* Left: Earnings */}
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                        <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 500, fontSize: "0.8rem", color: "#166534" }}>
                          Earnings (+)
                        </div>
                        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.8rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Basic Salary</span>
                            <span style={{ fontWeight: 500, color: "#0f172a" }}>₹{basic.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>HRA</span>
                            <span style={{ fontWeight: 500, color: "#0f172a" }}>₹{hra.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                            <span>Sales Incentive</span>
                            <span style={{ fontWeight: 500 }}>+ ₹{incentive.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", marginTop: "2px", fontWeight: 600, color: "#0f172a" }}>
                            <span>Total Gross</span>
                            <span>₹{gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Deductions */}
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", backgroundColor: "#ffffff" }}>
                        <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 500, fontSize: "0.8rem", color: "#991b1b" }}>
                          Deductions (-)
                        </div>
                        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.8rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Absenteeism</span>
                            <span style={{ color: "#dc2626" }}>- ₹{deductions.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#64748b" }}>Advance</span>
                            <span style={{ color: "#dc2626" }}>- ₹{advance.toLocaleString("en-IN")}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", marginTop: "18px", fontWeight: 600, color: "#991b1b" }}>
                            <span>Total Deductions</span>
                            <span>- ₹{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontWeight: 500, cursor: "pointer" }}
              >
                <Printer size={14} /> Open Salary Slip
              </button>
              <button
                type="button"
                onClick={() => setSelectedSalaryEmp(null)}
                style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 500, cursor: "pointer", fontSize: "0.82rem" }}
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
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="#4f46e5" />
                <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>Salary Slip — {monthDisplay}</h2>
              </div>
              <button className="modal-close" onClick={() => setSlipModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "18px" }}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#0f172a" }}>{slipModal.emp.user.name}</div>
                <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "2px" }}>
                  {slipModal.emp.designation || "Staff"} • {slipModal.emp.department || "General"}
                </div>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "#4f46e5", color: "#fff", padding: "8px 14px", fontWeight: 500, fontSize: "0.82rem" }}>
                  Earnings Summary
                </div>
                {[
                  ["Basic Salary", slipModal.salaryRecord?.basicSalary ?? slipModal.emp.salary ?? 0],
                  ["HRA", slipModal.salaryRecord?.hra ?? Math.round((slipModal.emp.salary || 0) * 0.4)],
                  ["Special Allowances", slipModal.salaryRecord?.allowances ?? 0],
                  ["Sales Incentive", slipModal.incentiveEarned ?? 0]
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "0.8rem"
                    }}
                  >
                    <span style={{ color: label === "Sales Incentive" ? "#059669" : "#475569" }}>
                      {label}
                    </span>
                    <span style={{ fontWeight: 500, color: label === "Sales Incentive" ? "#059669" : "#0f172a" }}>
                      ₹{(value as number).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    background: "#f0fdf4",
                    borderTop: "1px dashed #86efac",
                    color: "#166534"
                  }}
                >
                  <span>Net Salary Payable</span>
                  <span>
                    ₹{((slipModal.salaryRecord?.netSalary ?? slipModal.emp.salary ?? 0) + (slipModal.incentiveEarned ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button className="action-btn" onClick={() => setSlipModal(null)} style={{ padding: "6px 14px" }}>
                  Close
                </button>
                <button className="primary-btn" onClick={() => window.print()} style={{ padding: "6px 16px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                  <Printer size={14} /> Print Slip
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
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Set Base Salary — {baseSalaryModal.user.name}</h2>
              <button className="modal-close" onClick={() => setBaseSalaryModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "18px" }}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Monthly Base Salary (₹) *
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4f46e5", fontWeight: 600 }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="form-input"
                    style={{ paddingLeft: "24px", height: "36px", fontSize: "0.85rem", fontWeight: 500 }}
                    value={newBaseSalary}
                    onChange={(e) => setNewBaseSalary(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 35000"
                  />
                </div>
                <small style={{ color: "var(--text-muted)", marginTop: 6, display: "block", fontSize: "0.72rem" }}>
                  Updates {baseSalaryModal.user.name}'s default monthly base salary for future payroll cycles.
                </small>
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button className="action-btn" onClick={() => setBaseSalaryModal(null)}>
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  disabled={loading}
                  onClick={handleSaveBaseSalary}
                  style={{ fontWeight: 500, backgroundColor: "#4f46e5" }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
