"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Boxes,
  Percent,
  Sparkles,
  RotateCcw,
  Calculator,
  Laptop,
  ShoppingBag,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";
import {
  IncentivePolicyConfig,
  SlabTier,
  DEFAULT_INCENTIVE_POLICY,
  DEFAULT_STANDARD_SLABS,
  INDUSTRY_INCENTIVE_PRESETS,
  calculateIncentives,
  IncentiveResult
} from "@/lib/incentiveEngine";
import {
  getIncentivePolicyAction,
  saveIncentivePolicyAction
} from "@/app/actions/incentiveActions";

interface IncentivePolicyModalProps {
  onClose: () => void;
}

type TabType = "REVENUE_SLAB" | "NEW_CUSTOMER" | "QUANTITY_VOLUME" | "MARGIN_SPLIT" | "SIMULATOR";

export default function IncentivePolicyModal({ onClose }: IncentivePolicyModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("REVENUE_SLAB");
  const [policy, setPolicy] = useState<IncentivePolicyConfig>(DEFAULT_INCENTIVE_POLICY);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("apparel_textile_standard");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Simulator State
  const [simRevenue, setSimRevenue] = useState<number>(850000);
  const [simOrders, setSimOrders] = useState<number>(14);
  const [simZeroDiscOrders, setSimZeroDiscOrders] = useState<number>(5);
  const [simNewCustomers, setSimNewCustomers] = useState<number>(4);
  const [simUnits, setSimUnits] = useState<number>(1200);
  const [simMarginPct, setSimMarginPct] = useState<number>(25);

  // Load saved policy from server on mount
  useEffect(() => {
    getIncentivePolicyAction().then((res) => {
      if (res.success && res.policy) {
        setPolicy(res.policy);
        const matchPreset = INDUSTRY_INCENTIVE_PRESETS.find(
          (p) => p.policy.industry === res.policy.industry
        );
        if (matchPreset) setSelectedPresetId(matchPreset.id);
      }
      setLoading(false);
    });
  }, []);

  // Handle Preset Selection
  const applyPreset = (presetId: string) => {
    const preset = INDUSTRY_INCENTIVE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setPolicy({
      ...preset.policy,
      slabs: [...preset.policy.slabs.map((s) => ({ ...s }))],
      newCustomerRule: {
        ...preset.policy.newCustomerRule,
        tiers: [...(preset.policy.newCustomerRule.tiers || []).map((t) => ({ ...t }))]
      },
      quantityRule: {
        ...preset.policy.quantityRule,
        tiers: [...(preset.policy.quantityRule.tiers || []).map((t) => ({ ...t }))]
      },
      marginRule: {
        ...preset.policy.marginRule,
        tiers: [...(preset.policy.marginRule.tiers || []).map((t) => ({ ...t }))]
      }
    });
  };

  // Slab table helpers
  const handleAddSlab = () => {
    const currentSlabs = policy.slabs || [];
    const lastSlab = currentSlabs[currentSlabs.length - 1];
    const newFrom = lastSlab ? (lastSlab.to === Infinity ? lastSlab.from + 200000 : lastSlab.to) : 0;
    const newTo = Infinity;

    const newSlabs: SlabTier[] = [
      ...currentSlabs.map((s, idx) =>
        idx === currentSlabs.length - 1 && s.to === Infinity
          ? { ...s, to: newFrom, label: `₹${(s.from / 100000).toFixed(1)} - ${(newFrom / 100000).toFixed(1)} Lakh (${(s.rate * 100).toFixed(2)}%)` }
          : s
      ),
      {
        from: newFrom,
        to: newTo,
        rate: lastSlab ? parseFloat((lastSlab.rate + 0.01).toFixed(4)) : 0.02,
        label: `Above ₹${(newFrom / 100000).toFixed(1)} Lakh (${((lastSlab ? lastSlab.rate + 0.01 : 0.02) * 100).toFixed(2)}%)`
      }
    ];

    setPolicy({ ...policy, slabs: newSlabs });
  };

  const handleRemoveSlab = (index: number) => {
    if ((policy.slabs || []).length <= 1) return;
    const newSlabs = policy.slabs.filter((_, i) => i !== index);
    if (newSlabs.length > 0) {
      newSlabs[newSlabs.length - 1].to = Infinity;
      newSlabs[newSlabs.length - 1].label = `Above ₹${(newSlabs[newSlabs.length - 1].from / 100000).toFixed(1)} Lakh (${(newSlabs[newSlabs.length - 1].rate * 100).toFixed(2)}%)`;
    }
    setPolicy({ ...policy, slabs: newSlabs });
  };

  const handleSlabRateChange = (index: number, ratePercent: number) => {
    const newSlabs = [...(policy.slabs || [])];
    const rateDecimal = parseFloat((ratePercent / 100).toFixed(4));
    newSlabs[index].rate = Math.max(0, rateDecimal);
    newSlabs[index].label =
      newSlabs[index].to === Infinity
        ? `Above ₹${(newSlabs[index].from / 100000).toFixed(1)} Lakh (${ratePercent}%)`
        : `₹${(newSlabs[index].from / 100000).toFixed(1)} - ${(newSlabs[index].to / 100000).toFixed(1)} Lakh (${ratePercent}%)`;
    setPolicy({ ...policy, slabs: newSlabs });
  };

  // Quantity Tier Helpers
  const handleAddQtyTier = () => {
    const tiers = policy.quantityRule?.tiers || [];
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier ? (lastTier.to === Infinity ? lastTier.from + 1000 : lastTier.to + 1) : 0;
    const unitLabel = policy.quantityRule?.unitLabel || "Units";

    const newTiers = [
      ...tiers.map((t, idx) =>
        idx === tiers.length - 1 && t.to === Infinity
          ? { ...t, to: newFrom - 1, label: `${t.from} - ${newFrom - 1} ${unitLabel}: ₹${t.rewardPerUnit} / unit` }
          : t
      ),
      {
        from: newFrom,
        to: Infinity,
        rewardPerUnit: lastTier ? lastTier.rewardPerUnit + 10 : 25,
        label: `${newFrom}+ ${unitLabel}: ₹${(lastTier ? lastTier.rewardPerUnit + 10 : 25)} / unit`
      }
    ];

    setPolicy({
      ...policy,
      quantityRule: {
        ...policy.quantityRule,
        tiers: newTiers
      }
    });
  };

  const handleRemoveQtyTier = (index: number) => {
    const current = policy.quantityRule?.tiers || [];
    if (current.length <= 1) return;
    const newTiers = current.filter((_, i) => i !== index);
    if (newTiers.length > 0) {
      newTiers[newTiers.length - 1].to = Infinity;
      const unitLabel = policy.quantityRule?.unitLabel || "Units";
      newTiers[newTiers.length - 1].label = `${newTiers[newTiers.length - 1].from}+ ${unitLabel}: ₹${newTiers[newTiers.length - 1].rewardPerUnit} / unit`;
    }
    setPolicy({
      ...policy,
      quantityRule: {
        ...policy.quantityRule,
        tiers: newTiers
      }
    });
  };

  // Live Simulator Calculation
  const simulationResult: IncentiveResult = React.useMemo(() => {
    const ordersCount = Math.max(1, simOrders);
    const avgOrderVal = simRevenue / ordersCount;
    const zeroDiscCount = Math.min(ordersCount, simZeroDiscOrders);

    const dummyOrders = Array.from({ length: ordersCount }).map((_, i) => ({
      id: `sim_${i}`,
      taxableValue: avgOrderVal,
      discount: i < zeroDiscCount ? 0 : 8,
      isCreditCustomer: false,
      isNewCustomerOrder: i < simNewCustomers,
      quantity: Math.round(simUnits / ordersCount) || 1,
      costPrice: avgOrderVal * (1 - simMarginPct / 100)
    }));

    return calculateIncentives(
      dummyOrders,
      simRevenue,
      policy,
      {
        newCustomerCount: simNewCustomers,
        totalUnitsSold: simUnits,
        estimatedGrossProfit: (simRevenue * simMarginPct) / 100
      }
    );
  }, [policy, simRevenue, simOrders, simZeroDiscOrders, simNewCustomers, simUnits, simMarginPct]);

  // Save Policy to Server
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);

    const res = await saveIncentivePolicyAction(policy);
    setSaving(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999
        }}
      >
        <div style={{ backgroundColor: "#ffffff", padding: "30px", borderRadius: "16px", textAlign: "center" }}>
          <Award size={32} color="#4f46e5" style={{ animation: "spin 1.5s linear infinite" }} />
          <div style={{ marginTop: "12px", fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>
            Loading Multi-Industry Incentive Policy...
          </div>
        </div>
      </div>
    );
  }

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          backgroundColor: "#ffffff",
          borderRadius: "18px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
          maxHeight: "92vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── 1. MODAL HEADER ─── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 26px",
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
                width: 42,
                height: 42,
                borderRadius: "11px",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.28)",
                flexShrink: 0
              }}
            >
              <Award size={21} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                  Sales Incentive Policy & Multi-Industry Engine
                </h2>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe"
                  }}
                >
                  Universal Multi-Model
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", fontWeight: 400, margin: "2px 0 0 0", color: "#64748b" }}>
                Configure turnover ladders, client acquisition bounties, volume tiers, and margin sharing for any industry.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "9px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fee2e2";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ─── 2. QUICK INDUSTRY PRESETS SELECTOR ─── */}
        <div
          style={{
            padding: "16px 26px 12px 26px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={13} color="#4f46e5" />
            <span>Select Industry Preset (1-Click Application)</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
            {INDUSTRY_INCENTIVE_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: isSelected ? "1.5px solid var(--accent-primary, #4f46e5)" : "1px solid #cbd5e1",
                    backgroundColor: isSelected ? "#eef2ff" : "#ffffff",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: isSelected ? "#4f46e5" : "#0f172a" }}>
                      {preset.name.split(" ")[0]} {preset.name.split(" ")[1] || ""}
                    </span>
                    {isSelected && <CheckCircle2 size={13} color="#4f46e5" />}
                  </div>
                  <span style={{ fontSize: "0.68rem", color: isSelected ? "#4338ca" : "#64748b" }}>
                    {preset.categoryTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 3. MODULE NAVIGATION TABS ─── */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            padding: "0 26px"
          }}
        >
          {[
            { id: "REVENUE_SLAB" as TabType, label: "1. Revenue Slabs (Standard)", icon: TrendingUp, active: policy.revenueSlabsEnabled },
            { id: "NEW_CUSTOMER" as TabType, label: "2. New Customer Bounties", icon: Users, active: policy.newCustomerRule?.enabled },
            { id: "QUANTITY_VOLUME" as TabType, label: "3. Quantity & Volume Slabs", icon: Boxes, active: policy.quantityRule?.enabled },
            { id: "MARGIN_SPLIT" as TabType, label: "4. Margin / Profit Share", icon: Percent, active: policy.marginRule?.enabled },
            { id: "SIMULATOR" as TabType, label: "🧮 Live Simulator", icon: Calculator, isSpecial: true }
          ].map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "12px 14px",
                  borderBottom: isTabActive ? "2px solid var(--accent-primary, #4f46e5)" : "2px solid transparent",
                  backgroundColor: "transparent",
                  color: isTabActive ? "var(--accent-primary, #4f46e5)" : "#64748b",
                  fontSize: "0.82rem",
                  fontWeight: isTabActive ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <tab.icon size={15} />
                <span>{tab.label}</span>
                {tab.active && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10b981" }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ─── 4. TAB CONTENT BODY ─── */}
        <form onSubmit={handleSave} style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* ═════════ TAB 1: REVENUE TURNOVER SLABS (EXISTING & CUSTOM) ═════════ */}
          {activeTab === "REVENUE_SLAB" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#0f172a" }}>
                    Total Sales Turnover Slabs & Zero-Discount Bonus
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                    Applies a single rate percentage to the sales rep's monthly eligible turnover based on threshold reached.
                  </p>
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={policy.revenueSlabsEnabled}
                    onChange={(e) => setPolicy({ ...policy, revenueSlabsEnabled: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  />
                  <span>Enable Revenue Slabs</span>
                </label>
              </div>

              {/* Bonus & Margin Rule Safeguards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", display: "block", marginBottom: "4px" }}>
                    ⭐ 0% Discount Bonus Incentive
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={policy.zeroDiscountBonusPercent}
                      onChange={(e) => setPolicy({ ...policy, zeroDiscountBonusPercent: parseFloat(e.target.value) || 0 })}
                      style={{ width: "80px", height: "36px", textAlign: "center", fontWeight: 600, borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>% (Added on top of Slab for 0% discount orders)</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", display: "block", marginBottom: "4px" }}>
                    ⚠️ High Discount / Credit Customer Flat Rate
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>If Disc &gt;</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={policy.highDiscountThresholdPercent}
                      onChange={(e) => setPolicy({ ...policy, highDiscountThresholdPercent: parseFloat(e.target.value) || 15 })}
                      style={{ width: "60px", height: "36px", textAlign: "center", fontWeight: 600, borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>% → Give Flat</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={policy.highDiscountRatePercent}
                      onChange={(e) => setPolicy({ ...policy, highDiscountRatePercent: parseFloat(e.target.value) || 1 })}
                      style={{ width: "60px", height: "36px", textAlign: "center", fontWeight: 600, borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <span style={{ fontSize: "0.78rem", color: "#475569" }}>%</span>
                  </div>
                </div>
              </div>

              {/* Standard Slabs Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>
                    Turnover Tier Band
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>
                      Incentive Rate (%)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSlab}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px"
                      }}
                    >
                      <Plus size={11} /> Add Slab
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {policy.slabs.map((slab, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderBottom: idx === policy.slabs.length - 1 ? "none" : "1px solid #f1f5f9",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "0.78rem", color: "#64748b", width: "22px", fontWeight: 600 }}>#{idx + 1}</span>
                        <span style={{ fontSize: "0.84rem", fontWeight: 500, color: "#0f172a" }}>
                          {slab.to === Infinity
                            ? `Above ₹${(slab.from / 100000).toLocaleString("en-IN")} Lakh`
                            : `₹${(slab.from / 100000).toLocaleString("en-IN")} – ${(slab.to / 100000).toLocaleString("en-IN")} Lakh`}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="100"
                          value={parseFloat((slab.rate * 100).toFixed(2))}
                          onChange={(e) => handleSlabRateChange(idx, parseFloat(e.target.value) || 0)}
                          style={{
                            width: "75px",
                            height: "32px",
                            textAlign: "center",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            outline: "none"
                          }}
                        />
                        <span style={{ fontSize: "0.8rem", color: "#475569" }}>%</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveSlab(idx)}
                          disabled={policy.slabs.length <= 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "6px",
                            border: "1px solid #fee2e2",
                            backgroundColor: policy.slabs.length <= 1 ? "#f8fafc" : "#fef2f2",
                            color: policy.slabs.length <= 1 ? "#cbd5e1" : "#ef4444",
                            cursor: policy.slabs.length <= 1 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: NEW CUSTOMER ACQUISITION BOUNTIES ═════════ */}
          {activeTab === "NEW_CUSTOMER" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#0f172a" }}>
                    New Customer Acquisition Bounties
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                    Rewards sales reps for onboarding new first-time buying clients or distributors.
                  </p>
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={policy.newCustomerRule?.enabled || false}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        newCustomerRule: { ...policy.newCustomerRule, enabled: e.target.checked }
                      })
                    }
                    style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  />
                  <span>Enable New Customer Bounty</span>
                </label>
              </div>

              {/* Reward Type Picker */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", display: "block", marginBottom: "4px" }}>
                    Fixed Cash Bounty Per New Client
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={policy.newCustomerRule?.flatAmountPerCustomer || 500}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          newCustomerRule: {
                            ...policy.newCustomerRule,
                            flatAmountPerCustomer: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      style={{ width: "100px", height: "36px", textAlign: "center", fontWeight: 600, borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>per new verified client</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", display: "block", marginBottom: "4px" }}>
                    % Commission on First Order Value
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={policy.newCustomerRule?.firstOrderPercentBonus || 2}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          newCustomerRule: {
                            ...policy.newCustomerRule,
                            firstOrderPercentBonus: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      style={{ width: "80px", height: "36px", textAlign: "center", fontWeight: 600, borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>% of client's 1st order value</span>
                  </div>
                </div>
              </div>

              {/* Milestone Super Bonus */}
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px 16px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Zap size={18} color="#2563eb" />
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e40af" }}>
                      Monthly Client Acquisition Milestone Accelerator
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#3b82f6" }}>
                      Grant a lump-sum cash bonus when a sales rep hits target client count in one month.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#1e40af" }}>If &ge;</span>
                  <input
                    type="number"
                    min="1"
                    value={policy.newCustomerRule?.milestoneCount || 10}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        newCustomerRule: {
                          ...policy.newCustomerRule,
                          milestoneCount: parseInt(e.target.value, 10) || 10
                        }
                      })
                    }
                    style={{ width: "50px", height: "32px", textAlign: "center", fontWeight: 600, borderRadius: "6px", border: "1px solid #93c5fd" }}
                  />
                  <span style={{ fontSize: "0.78rem", color: "#1e40af" }}>Clients → +₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={policy.newCustomerRule?.milestoneBonus || 5000}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        newCustomerRule: {
                          ...policy.newCustomerRule,
                          milestoneBonus: parseFloat(e.target.value) || 0
                        }
                      })
                    }
                    style={{ width: "85px", height: "32px", textAlign: "center", fontWeight: 600, borderRadius: "6px", border: "1px solid #93c5fd" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 3: QUANTITY & VOLUME SLABS ═════════ */}
          {activeTab === "QUANTITY_VOLUME" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#0f172a" }}>
                    Quantity & Volume Based Incentive Tiers
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                    Rewards sales reps based on physical volume shipped (Pieces, Cartons, Boxes, KG, Cases).
                  </p>
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={policy.quantityRule?.enabled || false}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        quantityRule: { ...policy.quantityRule, enabled: e.target.checked }
                      })
                    }
                    style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  />
                  <span>Enable Volume Tiers</span>
                </label>
              </div>

              {/* Unit Label Customizer */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>
                  Product Unit Metric Name:
                </span>
                <input
                  type="text"
                  placeholder="e.g. Pieces, Boxes, Cartons, KG, Tonnes"
                  value={policy.quantityRule?.unitLabel || "Pieces"}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      quantityRule: { ...policy.quantityRule, unitLabel: e.target.value }
                    })
                  }
                  style={{ width: "180px", height: "34px", padding: "0 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontWeight: 500 }}
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  (e.g., used for manufacturing crates or apparel items)
                </span>
              </div>

              {/* Volume Tiers Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>
                    Volume Slab Band ({policy.quantityRule?.unitLabel || "Units"})
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>
                      Reward / Unit (₹)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddQtyTier}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px"
                      }}
                    >
                      <Plus size={11} /> Add Tier
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {(policy.quantityRule?.tiers || []).map((tier, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderBottom: idx === (policy.quantityRule?.tiers.length || 0) - 1 ? "none" : "1px solid #f1f5f9",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "0.78rem", color: "#64748b", width: "22px", fontWeight: 600 }}>#{idx + 1}</span>
                        <span style={{ fontSize: "0.84rem", fontWeight: 500, color: "#0f172a" }}>
                          {tier.to === Infinity
                            ? `${tier.from.toLocaleString("en-IN")}+ ${policy.quantityRule?.unitLabel || "Units"}`
                            : `${tier.from.toLocaleString("en-IN")} – ${tier.to.toLocaleString("en-IN")} ${policy.quantityRule?.unitLabel || "Units"}`}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>₹</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={tier.rewardPerUnit}
                          onChange={(e) => {
                            const newTiers = [...(policy.quantityRule?.tiers || [])];
                            newTiers[idx].rewardPerUnit = parseFloat(e.target.value) || 0;
                            setPolicy({
                              ...policy,
                              quantityRule: { ...policy.quantityRule, tiers: newTiers }
                            });
                          }}
                          style={{
                            width: "70px",
                            height: "32px",
                            textAlign: "center",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            outline: "none"
                          }}
                        />
                        <span style={{ fontSize: "0.8rem", color: "#475569" }}>/ unit</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveQtyTier(idx)}
                          disabled={(policy.quantityRule?.tiers || []).length <= 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "6px",
                            border: "1px solid #fee2e2",
                            backgroundColor: (policy.quantityRule?.tiers || []).length <= 1 ? "#f8fafc" : "#fef2f2",
                            color: (policy.quantityRule?.tiers || []).length <= 1 ? "#cbd5e1" : "#ef4444",
                            cursor: (policy.quantityRule?.tiers || []).length <= 1 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 4: PROFIT MARGIN SHARING ═════════ */}
          {activeTab === "MARGIN_SPLIT" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#0f172a" }}>
                    Gross Profit Margin Sharing
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                    Incentivizes sales reps to sell at higher markup prices rather than offering deep discounts.
                  </p>
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={policy.marginRule?.enabled || false}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        marginRule: { ...policy.marginRule, enabled: e.target.checked }
                      })
                    }
                    style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                  />
                  <span>Enable Margin Sharing</span>
                </label>
              </div>

              <div style={{ backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
                  Active Margin Share Tiers
                </div>
                {(policy.marginRule?.tiers || []).map((mt, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#475569", width: "130px" }}>
                      Margin &ge; {mt.minMarginPercent}%:
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={mt.profitSharePercent}
                      onChange={(e) => {
                        const newTiers = [...(policy.marginRule?.tiers || [])];
                        newTiers[idx].profitSharePercent = parseFloat(e.target.value) || 0;
                        setPolicy({
                          ...policy,
                          marginRule: { ...policy.marginRule, tiers: newTiers }
                        });
                      }}
                      style={{ width: "65px", height: "32px", textAlign: "center", fontWeight: 600, borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>% of gross profit earned</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═════════ TAB 5: INTERACTIVE LIVE PLAYGROUND SIMULATOR ═════════ */}
          {activeTab === "SIMULATOR" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 600, color: "#0f172a" }}>
                  Interactive Incentive Policy Playground & Payout Simulator
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                  Adjust the inputs below to immediately test and verify how your active rules calculate incentives.
                </p>
              </div>

              {/* Sliders Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Monthly Sales (₹)
                  </label>
                  <input
                    type="number"
                    step="50000"
                    value={simRevenue}
                    onChange={(e) => setSimRevenue(parseFloat(e.target.value) || 0)}
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Total Orders / 0% Disc Count
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="number"
                      value={simOrders}
                      onChange={(e) => setSimOrders(parseInt(e.target.value, 10) || 1)}
                      style={{ width: "50%", height: "36px", textAlign: "center", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: 600 }}
                      placeholder="Orders"
                    />
                    <input
                      type="number"
                      value={simZeroDiscOrders}
                      onChange={(e) => setSimZeroDiscOrders(parseInt(e.target.value, 10) || 0)}
                      style={{ width: "50%", height: "36px", textAlign: "center", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: 600 }}
                      placeholder="0% Disc"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                    New Clients Acquired
                  </label>
                  <input
                    type="number"
                    value={simNewCustomers}
                    onChange={(e) => setSimNewCustomers(parseInt(e.target.value, 10) || 0)}
                    style={{ width: "100%", height: "36px", textAlign: "center", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Total Volume / Units Sold
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={simUnits}
                    onChange={(e) => setSimUnits(parseInt(e.target.value, 10) || 0)}
                    style={{ width: "100%", height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Gross Profit Margin %
                  </label>
                  <input
                    type="number"
                    value={simMarginPct}
                    onChange={(e) => setSimMarginPct(parseFloat(e.target.value) || 0)}
                    style={{ width: "100%", height: "36px", textAlign: "center", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: 600, fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              {/* Simulation Result Output Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                  borderRadius: "14px",
                  padding: "20px 24px",
                  color: "#ffffff",
                  boxShadow: "0 8px 24px rgba(49, 46, 129, 0.25)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#a5b4fc", fontWeight: 600 }}>
                      Simulated Sales Rep Monthly Payout
                    </span>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                      ₹{Math.round(simulationResult.totalIncentive).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.72rem", color: "#c7d2fe" }}>Effective Incentive Rate</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>
                      {simRevenue > 0 ? ((simulationResult.totalIncentive / simRevenue) * 100).toFixed(2) : "0"}% of Sales
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: "14px", paddingTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "0.78rem" }}>
                  <div>
                    <span style={{ color: "#c7d2fe" }}>Turnover Slab:</span>{" "}
                    <strong style={{ color: "#ffffff" }}>₹{Math.round(simulationResult.slabIncentive).toLocaleString("en-IN")}</strong> ({simulationResult.currentSlab})
                  </div>
                  <div>
                    <span style={{ color: "#c7d2fe" }}>0% Disc Bonus:</span>{" "}
                    <strong style={{ color: "#ffffff" }}>+₹{Math.round(simulationResult.bonusIncentive).toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#c7d2fe" }}>New Client Bounty:</span>{" "}
                    <strong style={{ color: "#34d399" }}>+₹{Math.round(simulationResult.newCustomerIncentive).toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#c7d2fe" }}>Volume / Unit Reward:</span>{" "}
                    <strong style={{ color: "#38bdf8" }}>+₹{Math.round(simulationResult.quantityIncentive).toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#c7d2fe" }}>Margin Share:</span>{" "}
                    <strong style={{ color: "#fbbf24" }}>+₹{Math.round(simulationResult.marginIncentive).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div style={{ padding: "10px 14px", backgroundColor: "#ecfdf5", color: "#065f46", borderRadius: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={15} />
              <span>Incentive Policy Engine updated & active across all calculations!</span>
            </div>
          )}

          {/* ─── 5. MODAL FOOTER ACTIONS ─── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "16px",
              marginTop: "6px"
            }}
          >
            <button
              type="button"
              onClick={() => applyPreset("apparel_textile_standard")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              <RotateCcw size={13} /> Reset to Default (Apparel Standard)
            </button>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "9px 18px",
                  borderRadius: "9px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: 500,
                  fontSize: "0.86rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 24px",
                  borderRadius: "9px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.86rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                  transition: "all 0.15s ease"
                }}
              >
                <CheckCircle2 size={16} />
                <span>{saving ? "Saving Policy Engine..." : "Save Policy Engine"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
