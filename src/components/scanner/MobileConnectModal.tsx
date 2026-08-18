"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  createMobileScanSession,
  getMobileScanUpdate,
  closeMobileScanSession
} from "@/app/actions/scannerActions";
import { playSuccessSound } from "@/lib/soundUtils";
import { Smartphone, X, CheckCircle, Copy, Check, Radio, Sparkles } from "lucide-react";

interface MobileConnectModalProps {
  mode?: "INVENTORY" | "PACKING";
  orderId?: string;
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function MobileConnectModal({
  mode = "INVENTORY",
  orderId,
  onScan,
  onClose
}: MobileConnectModalProps) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [scanUrl, setScanUrl] = useState<string>("");
  const [status, setStatus] = useState<"ACTIVE" | "CONNECTED" | "COMPLETED">("ACTIVE");
  const [lastReceivedCode, setLastReceivedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionRef = useRef<string | null>(null);

  // Initialize Session
  useEffect(() => {
    let unmounted = false;

    async function initSession() {
      const res = await createMobileScanSession(mode, orderId);
      if (res.success && res.sessionCode && !unmounted) {
        setSessionCode(res.sessionCode);
        activeSessionRef.current = res.sessionCode;

        const origin = window.location.origin;
        const targetUrl = `${origin}/scan?session=${res.sessionCode}`;
        setScanUrl(targetUrl);

        try {
          const url = await QRCode.toDataURL(targetUrl, {
            width: 200,
            margin: 1,
            color: { dark: "#1e1b4b", light: "#ffffff" }
          });
          if (!unmounted) setQrDataUrl(url);
        } catch (e) {
          console.error("QR Code error:", e);
        }
      }
    }

    initSession();

    return () => {
      unmounted = true;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (activeSessionRef.current) {
        closeMobileScanSession(activeSessionRef.current);
      }
    };
  }, [mode, orderId]);

  // Polling listener for live mobile scans
  useEffect(() => {
    if (!sessionCode) return;

    pollIntervalRef.current = setInterval(async () => {
      const res = await getMobileScanUpdate(sessionCode);
      if (res.success) {
        if (res.status === "CONNECTED") {
          setStatus("CONNECTED");
        }

        if (res.scannedCode) {
          setLastReceivedCode(res.scannedCode);
          playSuccessSound();
          onScan(res.scannedCode);
        }
      }
    }, 1200);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessionCode, onScan]);

  const handleCopy = () => {
    if (scanUrl) {
      navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: "520px", width: "95%" }}>
        {/* Header */}
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
              <Smartphone size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Connect Mobile Phone</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Turn any smartphone into a wireless barcode scanner
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: "24px 20px", textAlign: "center" }}>
          {/* Status Indicator */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 700,
              marginBottom: "16px",
              background: status === "CONNECTED" ? "#dcfce7" : "#e0e7ff",
              color: status === "CONNECTED" ? "#15803d" : "#4338ca"
            }}
          >
            <Radio size={14} className="animate-pulse" />
            {status === "CONNECTED" ? "Phone Connected & Active" : "Waiting for phone connection..."}
          </div>

          {/* QR Code Container */}
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: "12px",
              display: "inline-block",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              border: "1px solid #cbd5e1",
              marginBottom: "16px"
            }}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan to connect mobile" style={{ width: "190px", height: "190px", display: "block" }} />
            ) : (
              <div style={{ width: "190px", height: "190px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
          </div>

          {/* Instruction */}
          <div style={{ maxWidth: "380px", margin: "0 auto 16px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
              Scan this QR code with your phone's camera
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
              Open your mobile camera or browser, scan the code, and start scanning products. Every scan transmits instantly to this computer!
            </p>
          </div>

          {/* Session Code & Link fallback */}
          {sessionCode && (
            <div
              style={{
                background: "#f8fafc",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem"
              }}
            >
              <div style={{ textAlign: "left" }}>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Session Pairing Code</span>
                <strong style={{ fontFamily: "monospace", fontSize: "1.05rem", color: "#4f46e5", letterSpacing: "1px" }}>
                  {sessionCode}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#334155"
                }}
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copied ? "Copied Link" : "Copy Link"}
              </button>
            </div>
          )}

          {/* Real-time scan received toast */}
          {lastReceivedCode && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 14px",
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "8px",
                color: "#166534",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <Sparkles size={16} /> Received from phone: <span style={{ fontFamily: "monospace" }}>{lastReceivedCode}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
