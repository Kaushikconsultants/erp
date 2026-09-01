"use client";

import React, { useState, useRef, useEffect } from "react";
import { adjustInventory } from "@/app/actions/inventoryActions";
import { lookupBarcode } from "@/app/actions/scannerActions";
import CameraScanner from "@/components/scanner/CameraScanner";
import BarcodeLabelModal from "@/components/products/BarcodeLabelModal";
import MobileConnectModal from "@/components/scanner/MobileConnectModal";
import { playSuccessSound, playErrorSound } from "@/lib/soundUtils";
import {
  ScanBarcode,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  Camera,
  Printer,
  History,
  Package,
  Layers,
  ArrowRight,
  Smartphone,
  Radio
} from "lucide-react";

interface ScanHistoryItem {
  id: string;
  time: string;
  name: string;
  sku: string | null;
  type: "IN" | "OUT";
  quantity: number;
  newStock: number;
}

export default function InventoryScanner() {
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const [printModalProduct, setPrintModalProduct] = useState<any>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [sessionCode, setSessionCode] = useState<string>("");
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or load sessionCode
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_scanner_session");
      if (saved && saved.startsWith("SC-")) {
        setSessionCode(saved);
      } else {
        const newCode = `SC-${Math.floor(1000 + Math.random() * 9000)}`;
        setSessionCode(newCode);
        localStorage.setItem("crm_scanner_session", newCode);
      }
    } catch (e) {
      const newCode = `SC-${Math.floor(1000 + Math.random() * 9000)}`;
      setSessionCode(newCode);
    }
  }, []);

  // Continuous background poller that listens to phone scans even when modal is closed
  useEffect(() => {
    if (!sessionCode) return;

    let isCancelled = false;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scanner?session=${encodeURIComponent(sessionCode)}`, {
          cache: "no-store"
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (data.status === "CONNECTED") {
          setIsPhoneConnected(true);
        }

        if (data.scannedCode) {
          const code = String(data.scannedCode).trim();
          setSku(code);
          handleLookup(code);
          handleScan("IN", code);
        }
      } catch (e) {}
    }, 700);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [sessionCode]);

  // Auto-focus scanner input
  useEffect(() => {
    if (!showCamera && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCamera]);

  const handleLookup = async (codeToLookup: string) => {
    if (!codeToLookup.trim()) return;
    const res = await lookupBarcode(codeToLookup);
    if (res.type === "PRODUCT" && res.product) {
      setPreviewProduct(res.product);
      setMessage(null);
    } else {
      setPreviewProduct(null);
    }
  };

  const handleScan = async (type: "IN" | "OUT", targetSku?: string) => {
    const activeSku = targetSku || sku;
    if (!activeSku.trim()) {
      playErrorSound();
      setMessage({ type: "error", text: "Please scan or enter a SKU." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await adjustInventory(activeSku.trim(), quantity, type, `Barcode scan: ${type}`);

    if (result.error) {
      playErrorSound();
      setMessage({ type: "error", text: result.error });
    } else if (result.success && result.product) {
      playSuccessSound();
      setMessage({
        type: "success",
        text: `Success: ${type === "IN" ? "Added" : "Removed"} ${quantity} of ${result.product.name}. New Stock: ${result.product.newStock}`
      });

      // Add to session history
      const newHistoryItem: ScanHistoryItem = {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        name: result.product.name,
        sku: result.product.sku,
        type: type,
        quantity: quantity,
        newStock: result.product.newStock
      };
      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 4)]);

      // Update preview stock
      if (previewProduct) {
        setPreviewProduct({
          ...previewProduct,
          stockQuantity: result.product.newStock
        });
      }

      setSku(""); // Clear for next scan
      setQuantity(1);
      if (inputRef.current) inputRef.current.focus();
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan("IN");
    }
  };

  const handleCameraScan = (code: string) => {
    setSku(code);
    handleLookup(code);
    // Optional auto stock in or prompt
    handleScan("IN", code);
  };

  return (
    <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
            <ScanBarcode className="text-indigo-600" /> Fast Barcode & QR Scanner
          </h3>

          {sessionCode && (
            <button
              type="button"
              onClick={() => setShowMobileModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: isPhoneConnected ? "#dcfce7" : "#f1f5f9",
                color: isPhoneConnected ? "#15803d" : "#475569",
                border: isPhoneConnected ? "1px solid #86efac" : "1px solid #cbd5e1",
                cursor: "pointer"
              }}
              title="Click to view QR code or change pairing"
            >
              {isPhoneConnected ? (
                <>
                  <Radio size={12} className="animate-pulse" style={{ color: "#22c55e" }} />
                  <span>Phone Paired ({sessionCode})</span>
                </>
              ) : (
                <>
                  <Smartphone size={12} />
                  <span>Pair Phone ({sessionCode})</span>
                </>
              )}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="action-btn"
            onClick={() => setShowMobileModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Smartphone size={16} /> Connect Mobile Scanner
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={() => setShowCamera(!showCamera)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: showCamera ? "#334155" : "#ffffff",
              color: showCamera ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Camera size={16} /> {showCamera ? "Close Camera" : "Open Camera Scanner"}
          </button>
        </div>
      </div>

      {/* Camera Viewfinder if toggled */}
      {showCamera && (
        <div style={{ marginBottom: "20px", padding: "16px", background: "#0f172a", borderRadius: "12px" }}>
          <CameraScanner onScan={handleCameraScan} />
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: message.type === "success" ? "#dcfce7" : "#fee2e2",
            color: message.type === "success" ? "#166534" : "#991b1b",
            fontWeight: 600,
            fontSize: "0.875rem"
          }}
        >
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Input controls */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "8px" }}>
            Scan Barcode / Enter SKU or Article Number
          </label>
          <input
            ref={inputRef}
            type="text"
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              handleLookup(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ready for scan or type SKU..."
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 500,
              outline: "none"
            }}
          />
        </div>

        <div style={{ width: "100px" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "8px" }}>
            Qty
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "1rem",
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="primary-btn hover-lift"
            onClick={() => handleScan("IN")}
            disabled={loading || !sku.trim()}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 20px" }}
          >
            <Plus size={18} /> Stock In
          </button>

          <button
            type="button"
            className="action-btn hover-lift"
            onClick={() => handleScan("OUT")}
            disabled={loading || !sku.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 20px",
              border: "1px solid #ef4444",
              color: "#ef4444",
              backgroundColor: "transparent",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            <Minus size={18} /> Stock Out
          </button>
        </div>
      </div>

      {/* Live Product Card if detected */}
      {previewProduct && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px 18px",
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1.5px solid #818cf8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
              <Package size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>{previewProduct.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                SKU: <strong style={{ fontFamily: "monospace" }}>{previewProduct.sku}</strong> • Category: {previewProduct.category}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>Current Stock</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: previewProduct.stockQuantity <= previewProduct.minimumStock ? "#dc2626" : "#16a34a" }}>
                {previewProduct.stockQuantity} Units
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPrintModalProduct(previewProduct)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer"
              }}
            >
              <Printer size={15} /> Print Barcode Label
            </button>
          </div>
        </div>
      )}

      {/* Session Scan History */}
      {history.length > 0 && (
        <div style={{ marginTop: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <History size={14} /> Recent Scans in this Session
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  background: item.type === "IN" ? "#f0fdf4" : "#fef2f2",
                  border: item.type === "IN" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span style={{ color: "#64748b" }}>{item.time}</span>
                <strong style={{ color: item.type === "IN" ? "#166534" : "#991b1b" }}>
                  {item.type === "IN" ? `+${item.quantity}` : `-${item.quantity}`}
                </strong>
                <span>{item.name}</span>
                <span style={{ color: "#64748b" }}>(Stock: {item.newStock})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barcode Label Modal */}
      {printModalProduct && (
        <BarcodeLabelModal product={printModalProduct} onClose={() => setPrintModalProduct(null)} />
      )}

      {/* Mobile Connect Scanner Modal */}
      {showMobileModal && (
        <MobileConnectModal
          mode="INVENTORY"
          sessionCode={sessionCode}
          onSessionCreated={(code) => {
            setSessionCode(code);
            try { localStorage.setItem("crm_scanner_session", code); } catch (e) {}
          }}
          onScan={(code) => {
            setSku(code);
            handleLookup(code);
            handleScan("IN", code);
          }}
          onClose={() => setShowMobileModal(false)}
        />
      )}
    </div>
  );
}
