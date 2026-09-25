"use client";

import React, { useState, useEffect } from "react";
import { 
  Warehouse, 
  X, 
  ArrowRightLeft, 
  SlidersHorizontal, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Plus,
  Minus
} from "lucide-react";
import { 
  getProductWarehouseBreakdown, 
  adjustWarehouseStock, 
  transferStockBetweenWarehouses 
} from "@/app/actions/warehouseStockActions";

interface WarehouseStockModalProps {
  productId: string;
  onClose: () => void;
  onStockUpdated?: () => void;
}

export default function WarehouseStockModal({
  productId,
  onClose,
  onStockUpdated
}: WarehouseStockModalProps) {
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Action Tabs: 'VIEW' | 'ADJUST' | 'TRANSFER'
  const [activeTab, setActiveTab] = useState<'VIEW' | 'ADJUST' | 'TRANSFER'>('VIEW');

  // Adjust Form
  const [adjustWarehouseId, setAdjustWarehouseId] = useState("");
  const [adjustQtyChange, setAdjustQtyChange] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("Physical Audit Count");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Transfer Form
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchBreakdown = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getProductWarehouseBreakdown(productId);
      if (res.success && res.breakdown) {
        setProductData(res.product);
        setBreakdown(res.breakdown);
        if (res.breakdown.length > 0) {
          setAdjustWarehouseId(res.breakdown[0].warehouseId);
          setTransferFromId(res.breakdown[0].warehouseId);
          if (res.breakdown.length > 1) {
            setTransferToId(res.breakdown[1].warehouseId);
          }
        }
      } else {
        setError(res.error || "Failed to load warehouse breakdown");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load warehouse breakdown");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdown();
  }, [productId]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustWarehouseId) return;
    if (adjustQtyChange === 0) {
      setError("Please specify a non-zero quantity change.");
      return;
    }

    setIsAdjusting(true);
    setError("");
    setSuccess("");

    try {
      const res = await adjustWarehouseStock({
        warehouseId: adjustWarehouseId,
        productId,
        quantityChange: adjustQtyChange,
        reason: adjustReason,
        notes: adjustNotes
      });

      if (res.success) {
        setSuccess(`Stock adjusted successfully!`);
        setAdjustQtyChange(0);
        await fetchBreakdown();
        if (onStockUpdated) onStockUpdated();
      } else {
        setError(res.error || "Adjustment failed");
      }
    } catch (err: any) {
      setError(err?.message || "Adjustment failed");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromId || !transferToId) return;
    if (transferFromId === transferToId) {
      setError("Source and destination warehouses cannot be the same.");
      return;
    }
    if (transferQty <= 0) {
      setError("Transfer quantity must be greater than 0.");
      return;
    }

    setIsTransferring(true);
    setError("");
    setSuccess("");

    try {
      const res = await transferStockBetweenWarehouses({
        fromWarehouseId: transferFromId,
        toWarehouseId: transferToId,
        productId,
        quantity: transferQty,
        notes: transferNotes
      });

      if (res.success) {
        setSuccess(`Stock transferred successfully!`);
        setTransferQty(1);
        await fetchBreakdown();
        if (onStockUpdated) onStockUpdated();
      } else {
        setError(res.error || "Transfer failed");
      }
    } catch (err: any) {
      setError(err?.message || "Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "16px"
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "680px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              backgroundColor: "#ede9fe",
              color: "#6d28d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Warehouse size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                Warehouse-Wise Inventory Breakdown
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                {productData ? `${productData.name} (${productData.sku || "No SKU"})` : "Loading product..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 24px", backgroundColor: "#f8fafc" }}>
          <button
            type="button"
            onClick={() => { setActiveTab('VIEW'); setError(""); setSuccess(""); }}
            style={{
              padding: "12px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: activeTab === 'VIEW' ? "#6d28d9" : "#64748b",
              borderBottom: `2px solid ${activeTab === 'VIEW' ? "#6d28d9" : "transparent"}`,
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer"
            }}
          >
            Location Stocks
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('ADJUST'); setError(""); setSuccess(""); }}
            style={{
              padding: "12px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: activeTab === 'ADJUST' ? "#6d28d9" : "#64748b",
              borderBottom: `2px solid ${activeTab === 'ADJUST' ? "#6d28d9" : "transparent"}`,
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Stock Adjustment</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('TRANSFER'); setError(""); setSuccess(""); }}
            style={{
              padding: "12px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: activeTab === 'TRANSFER' ? "#6d28d9" : "#64748b",
              borderBottom: `2px solid ${activeTab === 'TRANSFER' ? "#6d28d9" : "transparent"}`,
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <ArrowRightLeft size={13} />
            <span>Inter-Warehouse Transfer</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#dcfce7", color: "#15803d", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <CheckCircle2 size={15} />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "#64748b" }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px auto" }} />
              <p style={{ margin: 0, fontSize: "0.84rem" }}>Loading warehouse stocks...</p>
            </div>
          ) : activeTab === 'VIEW' ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Total Global Stock: <strong style={{ color: "#0f172a" }}>{productData?.stockQuantity || 0} pcs</strong>
                </span>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: "10px 14px", textAlign: "left" }}>Warehouse / Location</th>
                      <th style={{ padding: "10px 14px", textAlign: "center" }}>Bin Location</th>
                      <th style={{ padding: "10px 14px", textAlign: "right" }}>Quantity on Hand</th>
                      <th style={{ padding: "10px 14px", textAlign: "right" }}>Reserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "24px 14px", color: "#94a3b8" }}>
                          No warehouses registered in the system.
                        </td>
                      </tr>
                    ) : (
                      breakdown.map(wh => (
                        <tr key={wh.warehouseId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 600, color: "#1e293b" }}>{wh.warehouseName}</div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{wh.warehouseCode}</div>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center", color: "#64748b" }}>
                            {wh.binLocation}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: wh.quantityOnHand > 0 ? "#0f172a" : "#dc2626" }}>
                            {wh.quantityOnHand} pcs
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b" }}>
                            {wh.reservedQuantity} pcs
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'ADJUST' ? (
            <form onSubmit={handleAdjustSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Select Warehouse *
                </label>
                <select
                  required
                  style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  value={adjustWarehouseId}
                  onChange={e => setAdjustWarehouseId(e.target.value)}
                >
                  {breakdown.map(wh => (
                    <option key={wh.warehouseId} value={wh.warehouseId}>
                      {wh.warehouseName} (Current: {wh.quantityOnHand} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Quantity Change (+ or -) *
                  </label>
                  <input
                    type="number"
                    required
                    style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    placeholder="e.g. +10 or -5"
                    value={adjustQtyChange || ""}
                    onChange={e => setAdjustQtyChange(Number(e.target.value))}
                  />
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    Positive number to add, negative to subtract
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Reason *
                  </label>
                  <select
                    style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                  >
                    <option value="Physical Audit Count">Physical Audit Count</option>
                    <option value="Damaged Goods Write-off">Damaged Goods Write-off</option>
                    <option value="Found Stock / Surplus">Found Stock / Surplus</option>
                    <option value="Sample / Marketing Giveaway">Sample / Marketing Giveaway</option>
                    <option value="Other Adjustment">Other Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="Optional audit reference or remarks..."
                  style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  style={{
                    backgroundColor: "#6d28d9",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isAdjusting && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Stock Adjustment</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTransferSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    From Warehouse (Source) *
                  </label>
                  <select
                    required
                    style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    value={transferFromId}
                    onChange={e => setTransferFromId(e.target.value)}
                  >
                    {breakdown.map(wh => (
                      <option key={wh.warehouseId} value={wh.warehouseId}>
                        {wh.warehouseName} ({wh.quantityOnHand} pcs)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    To Warehouse (Destination) *
                  </label>
                  <select
                    required
                    style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    value={transferToId}
                    onChange={e => setTransferToId(e.target.value)}
                  >
                    {breakdown.map(wh => (
                      <option key={wh.warehouseId} value={wh.warehouseId}>
                        {wh.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Transfer Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  value={transferQty}
                  onChange={e => setTransferQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  Transfer Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional transfer note..."
                  style={{ width: "100%", height: "38px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={isTransferring}
                  style={{
                    backgroundColor: "#6d28d9",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isTransferring && <Loader2 size={14} className="animate-spin" />}
                  <span>Execute Stock Transfer</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
