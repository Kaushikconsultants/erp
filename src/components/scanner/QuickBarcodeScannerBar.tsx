"use client";

import React, { useState, useRef } from "react";
import { ScanBarcode, Camera, Smartphone, X, Sparkles } from "lucide-react";
import CameraScanner from "./CameraScanner";
import MobileConnectModal from "./MobileConnectModal";
import { playSuccessSound } from "@/lib/soundUtils";

interface QuickBarcodeScannerBarProps {
  onScan: (code: string) => void;
  placeholder?: string;
  label?: string;
  compact?: boolean;
}

export default function QuickBarcodeScannerBar({
  onScan,
  placeholder = "Scan barcode / SKU or type & press Enter...",
  label = "Quick Barcode Scanner",
  compact = false
}: QuickBarcodeScannerBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const code = inputValue.trim();
      setLastScanned(code);
      playSuccessSound();
      onScan(code);
      setInputValue("");
      // Keep focus on input for fast rapid barcode gun scanning
      inputRef.current?.focus();
    }
  };

  const handleCameraScan = (code: string) => {
    if (code && code.trim()) {
      setLastScanned(code.trim());
      playSuccessSound();
      onScan(code.trim());
    }
  };

  const handleMobileScan = (code: string) => {
    if (code && code.trim()) {
      setLastScanned(code.trim());
      playSuccessSound();
      onScan(code.trim());
    }
  };

  return (
    <div
      style={{
        padding: compact ? "10px 12px" : "14px 16px",
        borderRadius: "10px",
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        border: "1.5px dashed #a5b4fc",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#4f46e5",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <ScanBarcode size={16} />
          </div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e1b4b" }}>
            {label}
          </span>
          {lastScanned && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#15803d",
                background: "#dcfce7",
                padding: "2px 8px",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Sparkles size={12} /> Added: {lastScanned}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setShowMobileModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #4f46e5",
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)"
            }}
          >
            <Smartphone size={14} /> Scan with Mobile
          </button>

          <button
            type="button"
            onClick={() => setShowCameraModal(!showCameraModal)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: showCameraModal ? "#334155" : "#ffffff",
              color: showCameraModal ? "#ffffff" : "#334155",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <Camera size={14} /> {showCameraModal ? "Close Camera" : "Open Camera"}
          </button>
        </div>
      </div>

      {/* Barcode Gun / Keyboard Input Bar */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              fontWeight: 600,
              outline: "none",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)"
            }}
          />
          <ScanBarcode
            size={16}
            color="#6366f1"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            background: "#1e1b4b",
            color: "#ffffff",
            border: "none",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Add Item
        </button>
      </form>

      {/* Embedded Live Camera Scanner Viewfinder */}
      {showCameraModal && (
        <div
          style={{
            marginTop: "6px",
            padding: "14px",
            background: "#0f172a",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <CameraScanner onScan={handleCameraScan} fps={15} />
        </div>
      )}

      {/* Mobile Wireless Scanner Connection Modal */}
      {showMobileModal && (
        <MobileConnectModal
          mode="INVENTORY"
          onScan={handleMobileScan}
          onClose={() => setShowMobileModal(false)}
        />
      )}
    </div>
  );
}
