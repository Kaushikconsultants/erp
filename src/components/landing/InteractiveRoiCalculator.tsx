"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";

export default function InteractiveRoiCalculator() {
  const [teamSize, setTeamSize] = useState<number>(8);
  const [monthlyInvoices, setMonthlyInvoices] = useState<number>(650);

  // Calculations
  const hoursSavedPerMonth = Math.round(teamSize * 36);
  const badDebtSavedINR = Math.round(monthlyInvoices * 320 * 0.05);
  const operationalSavingsINR = Math.round(hoursSavedPerMonth * 300 + monthlyInvoices * 25);
  const totalMonthlySavingsINR = operationalSavingsINR + badDebtSavedINR;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "28px",
        border: "1px solid #e2e8f0",
        padding: "36px",
        maxWidth: "980px",
        margin: "0 auto",
        boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 16px",
            borderRadius: "9999px",
            background: "#eef2ff",
            color: "#4f46e5",
            fontSize: "0.825rem",
            fontWeight: 700,
            marginBottom: "12px",
            border: "1px solid rgba(79, 70, 229, 0.2)",
          }}
        >
          <Sparkles size={14} /> Interactive ROI & Time-Saved Calculator
        </div>
        <h3 style={{ fontSize: "1.9rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.025em" }}>
          See How Much Time & Money You Save with Heart of Business
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.95rem", marginTop: "8px" }}>
          Adjust team size and order volume to calculate your organization&apos;s monthly productivity and bad debt recovery.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "36px" }}>
        {/* Sliders Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", justifyContent: "center" }}>
          {/* Slider 1: Team Size */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: 700 }}>
              <span style={{ color: "#334155", fontSize: "0.95rem" }}>Sales Reps & Billing Staff</span>
              <span style={{ color: "#4f46e5", fontSize: "1.15rem", fontWeight: 800 }}>{teamSize} People</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#4f46e5",
                height: "6px",
                cursor: "pointer",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>
              <span>1 Rep</span>
              <span>50 Reps</span>
            </div>
          </div>

          {/* Slider 2: Monthly Invoices */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: 700 }}>
              <span style={{ color: "#334155", fontSize: "0.95rem" }}>Monthly Invoices & Orders</span>
              <span style={{ color: "#7c3aed", fontSize: "1.15rem", fontWeight: 800 }}>{monthlyInvoices} Invoices</span>
            </div>
            <input
              type="range"
              min={50}
              max={5000}
              step={50}
              value={monthlyInvoices}
              onChange={(e) => setMonthlyInvoices(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#7c3aed",
                height: "6px",
                cursor: "pointer",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>
              <span>50 Invoices</span>
              <span>5,000 Invoices</span>
            </div>
          </div>
        </div>

        {/* Dynamic Output Column */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: "16px" }}>
              Calculated Monthly Impact
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4f46e5",
                  flexShrink: 0,
                }}
              >
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a" }}>{hoursSavedPerMonth} Hours / Mo</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Saved on manual data entry & phone follow-ups</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#059669" }}>
                  ₹{totalMonthlySavingsINR.toLocaleString("en-IN")} / Mo
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Calculated operational & bad debt recovery</div>
              </div>
            </div>
          </div>

          <Link
            href="/register?plan=GROWTH"
            className="landing-btn-primary"
            style={{
              justifyContent: "center",
              borderRadius: "12px",
              padding: "13px 20px",
              width: "100%",
            }}
          >
            Claim These Savings With Free Trial <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
