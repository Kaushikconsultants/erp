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
import "@/components/products/products.css";

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
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }).toUpperCase(),
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
    <div className="inventory-scanner-card">
      <div className="scanner-header-row">
        <div className="scanner-title-group">
          <div className="scanner-icon-box">
            <ScanBarcode size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Fast Barcode & QR Scanner
              </h3>

              {sessionCode && (
                <button
                  type="button"
                  onClick={() => setShowMobileModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    background: isPhoneConnected ? "#ecfdf5" : "#f8fafc",
                    color: isPhoneConnected ? "#059669" : "#64748b",
                    border: isPhoneConnected ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  title="Click to view QR code or change pairing"
                >
                  {isPhoneConnected ? (
                    <>
                      <Radio size={10} className="animate-pulse" style={{ color: "#10b981" }} />
                      <span>Phone Paired ({sessionCode})</span>
                    </>
                  ) : (
                    <>
                      <Smartphone size={10} />
                      <span>Pair Phone ({sessionCode})</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.74rem", color: "#64748b" }}>
              Scan or enter SKU to update warehouse stock in real time
            </p>
          </div>
        </div>

        <div className="scanner-actions-group">
          <button
            type="button"
            onClick={() => setShowMobileModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.15)",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#4338ca"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#4f46e5"}
          >
            <Smartphone size={14} /> Connect Mobile Scanner
          </button>
          <button
            type="button"
            onClick={() => setShowCamera(!showCamera)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: showCamera ? "#0f172a" : "#ffffff",
              color: showCamera ? "#ffffff" : "#334155",
              border: showCamera ? "1px solid #0f172a" : "1px solid #cbd5e1",
              padding: "7px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => { if (!showCamera) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
            onMouseLeave={e => { if (!showCamera) e.currentTarget.style.backgroundColor = "#ffffff"; }}
          >
            <Camera size={14} /> {showCamera ? "Close Camera" : "Open Camera Scanner"}
          </button>
        </div>
      </div>

      {/* Camera Viewfinder if toggled */}
      {showCamera && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#0f172a", borderRadius: "10px" }}>
          <CameraScanner onScan={handleCameraScan} />
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            borderRadius: "7px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
            fontWeight: 600,
            fontSize: "0.78rem",
            border: message.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca"
          }}
        >
          {message.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {message.text}
        </div>
      )}

      {/* Input controls */}
      <div className="scanner-controls-row">
        <div style={{ flex: "2 1 240px", minWidth: "200px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "5px" }}>
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
              height: "38px",
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "0.84rem",
              fontWeight: 500,
              outline: "none",
              color: "#0f172a",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
              transition: "border-color 0.15s ease"
            }}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e => e.target.style.borderColor = "#cbd5e1"}
          />
        </div>

        <div className="scanner-qty-buttons-row" style={{ display: "flex", gap: "8px", alignItems: "flex-end", flex: "1 1 auto" }}>
          <div style={{ width: "70px", flexShrink: 0 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "5px" }}>
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
                height: "38px",
                padding: "7px 6px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "0.84rem",
                fontWeight: 600,
                textAlign: "center",
                outline: "none",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.borderColor = "#2563eb"}
              onBlur={e => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => handleScan("IN")}
              disabled={loading || !sku.trim()}
              style={{
                height: "38px",
                flex: 1,
                minWidth: "100px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "0 14px",
                backgroundColor: "#10b981",
                color: "#ffffff",
                border: "1px solid #10b981",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                cursor: loading || !sku.trim() ? "not-allowed" : "pointer",
                opacity: loading || !sku.trim() ? 0.6 : 1,
                boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => { if (!loading && sku.trim()) { e.currentTarget.style.backgroundColor = "#059669"; e.currentTarget.style.borderColor = "#059669"; } }}
              onMouseLeave={e => { if (!loading && sku.trim()) { e.currentTarget.style.backgroundColor = "#10b981"; e.currentTarget.style.borderColor = "#10b981"; } }}
            >
              <Plus size={15} /> Stock In
            </button>

            <button
              type="button"
              onClick={() => handleScan("OUT")}
              disabled={loading || !sku.trim()}
              style={{
                height: "38px",
                flex: 1,
                minWidth: "100px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "0 14px",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: "nowrap",
                boxSizing: "border-box",
                cursor: loading || !sku.trim() ? "not-allowed" : "pointer",
                opacity: loading || !sku.trim() ? 0.6 : 1,
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => { if (!loading && sku.trim()) { e.currentTarget.style.backgroundColor = "#fef2f2"; e.currentTarget.style.borderColor = "#f87171"; } }}
              onMouseLeave={e => { if (!loading && sku.trim()) { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.borderColor = "#fca5a5"; } }}
            >
              <Minus size={15} /> Stock Out
            </button>
          </div>
        </div>
      </div>

      {/* Live Product Card if detected */}
      {previewProduct && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #c7d2fe",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
              <Package size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#0f172a" }}>{previewProduct.name}</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                SKU: <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>{previewProduct.sku}</strong> • Category: {previewProduct.category}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block", textTransform: "uppercase", letterSpacing: "0.03em" }}>Current Stock</span>
              <span style={{ fontSize: "0.92rem", fontWeight: 700, color: previewProduct.stockQuantity <= previewProduct.minimumStock ? "#dc2626" : "#059669" }}>
                {previewProduct.stockQuantity} Units
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPrintModalProduct(previewProduct)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "0.76rem",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#ffffff"}
            >
              <Printer size={13} /> Print Label
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
