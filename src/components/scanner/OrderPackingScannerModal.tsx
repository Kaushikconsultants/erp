"use client";

import React, { useState, useEffect, useRef } from "react";
import { getOrderPackingDetails, completeOrderPacking } from "@/app/actions/scannerActions";
import CameraScanner from "./CameraScanner";
import { playSuccessSound, playErrorSound, playCompleteSound } from "@/lib/soundUtils";
import {
  PackageCheck,
  X,
  CheckCircle,
  AlertTriangle,
  ScanBarcode,
  Camera,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface OrderPackingScannerModalProps {
  orderId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PackingItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  articleNumber?: string | null;
  quantity: number;
  packedCount: number;
}

export default function OrderPackingScannerModal({
  orderId,
  onClose,
  onSuccess
}: OrderPackingScannerModalProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<PackingItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [alertState, setAlertState] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchDetails = async () => {
    setLoading(true);
    const res = await getOrderPackingDetails(orderId);
    if (res.success && res.order) {
      setOrder(res.order);
      setItems(
        res.order.items.map((i: any) => ({
          ...i,
          packedCount: 0
        }))
      );
    } else {
      setAlertState({ type: "error", text: res.error || "Failed to load order details" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [orderId]);

  useEffect(() => {
    if (!showCamera && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCamera, loading]);

  const totalRequired = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPacked = items.reduce((sum, item) => sum + item.packedCount, 0);
  const isComplete = totalRequired > 0 && totalPacked >= totalRequired;

  const processScanCode = (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim().toLowerCase();

    // Check if code matches any item in the order
    const matchIndex = items.findIndex(
      (item) =>
        (item.sku && item.sku.toLowerCase() === cleanCode) ||
        (item.articleNumber && item.articleNumber.toLowerCase() === cleanCode) ||
        item.productId.toLowerCase() === cleanCode
    );

    if (matchIndex === -1) {
      // Wrong item scanned!
      playErrorSound();
      setAlertState({
        type: "error",
        text: `⚠️ WRONG ITEM: Scanned code "${code}" is not in this order!`
      });
      return;
    }

    const matchedItem = items[matchIndex];

    if (matchedItem.packedCount >= matchedItem.quantity) {
      playErrorSound();
      setAlertState({
        type: "warning",
        text: `⚠️ Overpack Alert: ${matchedItem.name} is already fully packed (${matchedItem.quantity}/${matchedItem.quantity})!`
      });
      return;
    }

    // Increment packed count
    const updatedItems = [...items];
    updatedItems[matchIndex].packedCount += 1;
    setItems(updatedItems);

    const newTotalPacked = totalPacked + 1;
    if (newTotalPacked >= totalRequired) {
      playCompleteSound();
      setAlertState({
        type: "success",
        text: `🎉 Order 100% Packed! All ${totalRequired} items verified successfully.`
      });
    } else {
      playSuccessSound();
      setAlertState({
        type: "success",
        text: `✅ Verified: 1x ${matchedItem.name} (${updatedItems[matchIndex].packedCount}/${matchedItem.quantity})`
      });
    }

    setBarcodeInput("");
    if (inputRef.current) inputRef.current.focus();
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScanCode(barcodeInput);
  };

  const handleFinishPacking = async () => {
    setSubmitting(true);
    const res = await completeOrderPacking(orderId);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setAlertState({ type: "error", text: res.error || "Failed to mark order as packed." });
      setSubmitting(false);
    }
  };

  const percentComplete = totalRequired > 0 ? Math.round((totalPacked / totalRequired) * 100) : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: "720px", width: "95%" }}>
        {/* Header */}
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <PackageCheck className="text-indigo-600" size={24} />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Zero-Mistake Packing Scanner
              </h2>
              {order && (
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Order #{order.orderNumber} • {order.customerName} ({order.customerLocation})
                </span>
              )}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" style={{ margin: "0 auto" }}></div>
            <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>Loading packing details...</p>
          </div>
        ) : (
          <div className="modal-body" style={{ padding: "20px" }}>
            {/* Progress Bar & Status */}
            <div
              style={{
                background: isComplete ? "rgba(220, 252, 231, 0.6)" : "rgba(241, 245, 249, 0.8)",
                border: isComplete ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: isComplete ? "#15803d" : "#334155" }}>
                  {isComplete ? "✨ All Items Verified & Packed" : "Packing Progress"}
                </span>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", color: isComplete ? "#15803d" : "#4f46e5" }}>
                  {totalPacked} / {totalRequired} Units ({percentComplete}%)
                </span>
              </div>
              <div style={{ width: "100%", height: "10px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${percentComplete}%`,
                    height: "100%",
                    background: isComplete ? "#16a34a" : "linear-gradient(90deg, #6366f1, #4f46e5)",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>

            {/* Alert Banner */}
            {alertState && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background:
                    alertState.type === "success"
                      ? "#dcfce7"
                      : alertState.type === "warning"
                      ? "#fef9c3"
                      : "#fee2e2",
                  color:
                    alertState.type === "success"
                      ? "#15803d"
                      : alertState.type === "warning"
                      ? "#a16207"
                      : "#b91c1c",
                  border:
                    alertState.type === "success"
                      ? "1px solid #86efac"
                      : alertState.type === "warning"
                      ? "1px solid #fde047"
                      : "1px solid #fca5a5"
                }}
              >
                {alertState.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
                <span>{alertState.text}</span>
              </div>
            )}

            {/* Scanning Controls */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
              <form onSubmit={handleManualScanSubmit} style={{ flex: 1, display: "flex", gap: "8px" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan product barcode / SKU..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "2px solid #818cf8",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    outline: "none"
                  }}
                />
                <button type="submit" className="primary-btn hover-lift" style={{ padding: "0 16px" }}>
                  <ScanBarcode size={18} /> Verify
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowCamera(!showCamera)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: showCamera ? "#4f46e5" : "#fff",
                  color: showCamera ? "#fff" : "#334155",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                <Camera size={16} /> {showCamera ? "Close Camera" : "Use Camera"}
              </button>
            </div>

            {/* Camera Viewfinder */}
            {showCamera && (
              <div style={{ marginBottom: "20px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
                <CameraScanner onScan={(scannedCode) => processScanCode(scannedCode)} />
              </div>
            )}

            {/* Items Checklist Table */}
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>
                Order Items Verification List ({items.length} SKUs)
              </h4>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px" }}>Status</th>
                      <th style={{ padding: "10px 12px" }}>Product & SKU</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Required</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Packed</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const itemComplete = item.packedCount >= item.quantity;
                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: itemComplete ? "rgba(240, 253, 244, 0.7)" : "#ffffff"
                          }}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            {itemComplete ? (
                              <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                                <CheckCircle size={16} /> Done
                              </span>
                            ) : (
                              <span style={{ color: "#ca8a04", fontWeight: 600 }}>
                                Pending ({item.quantity - item.packedCount})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 600, color: "#1e293b" }}>{item.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontWeight: 800,
                                background: itemComplete ? "#dcfce7" : "#e0e7ff",
                                color: itemComplete ? "#15803d" : "#4338ca"
                              }}
                            >
                              {item.packedCount} / {item.quantity}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => processScanCode(item.sku)}
                              disabled={itemComplete}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: itemComplete ? "default" : "pointer",
                                opacity: itemComplete ? 0.4 : 1
                              }}
                            >
                              +1 Manual
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="primary-btn hover-lift"
            onClick={handleFinishPacking}
            disabled={submitting || !isComplete}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              background: isComplete ? "#16a34a" : "#94a3b8",
              cursor: isComplete ? "pointer" : "not-allowed"
            }}
          >
            <CheckCircle size={18} /> {submitting ? "Completing..." : "Complete & Mark Packed"}
          </button>
        </div>
      </div>
    </div>
  );
}
