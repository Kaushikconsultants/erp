"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import CameraScanner from "@/components/scanner/CameraScanner";
import BrandLogo from "@/components/ui/BrandLogo";
import { pushMobileScan, lookupBarcode, pingMobileConnect } from "@/app/actions/scannerActions";
import { playSuccessSound, playErrorSound } from "@/lib/soundUtils";
import {
  Smartphone,
  ScanBarcode,
  CheckCircle2,
  AlertCircle,
  Radio,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
  Wifi
} from "lucide-react";

export default function MobileScanPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading scanner...</div>}>
      <MobileScanClient />
    </Suspense>
  );
}

function MobileScanClient() {
  const searchParams = useSearchParams();
  const initialSession = searchParams.get("session") || "";

  const [sessionCode, setSessionCode] = useState(initialSession);
  const [isPaired, setIsPaired] = useState(false);
  const [pingFails, setPingFails] = useState(0);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [sentItems, setSentItems] = useState<Array<{ code: string; time: string }>>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [lookupData, setLookupData] = useState<any>(null);

  useEffect(() => {
    if (initialSession) {
      setSessionCode(initialSession);
    }
  }, [initialSession]);

  // Immediate connect & heartbeat ping to desktop
  // If the session row was deleted/expired, pingMobileConnect now auto-recreates it,
  // so the phone will always remain paired as long as the URL has the correct session code.
  useEffect(() => {
    if (!sessionCode || !sessionCode.trim()) {
      setIsPaired(false);
      return;
    }

    let isMounted = true;

    async function sendPing() {
      const res = await pingMobileConnect(sessionCode);
      if (isMounted) {
        if (res.success) {
          setIsPaired(true);
          setPingFails(0);
        } else {
          // Allow up to 3 consecutive failures before showing unpaired
          setPingFails(prev => {
            const next = prev + 1;
            if (next >= 3) setIsPaired(false);
            return next;
          });
        }
      }
    }

    sendPing();
    const interval = setInterval(sendPing, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionCode]);

  const handleScanDetected = async (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();
    setLastScanned(cleanCode);

    // Vibrate device if supported on mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch (e) {}
    }

    if (sessionCode.trim()) {
      // Transmit to desktop session
      setSending(true);
      let res = await pushMobileScan(sessionCode.trim(), cleanCode);

      // If push failed (e.g. session was briefly missing), retry once after 800ms
      if (!res.success) {
        await new Promise(r => setTimeout(r, 800));
        res = await pushMobileScan(sessionCode.trim(), cleanCode);
      }

      if (res.success) {
        playSuccessSound();
        setIsPaired(true); // confirm we're still paired after a successful push
        const newEntry = {
          code: cleanCode,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        };
        setSentItems((prev) => [newEntry, ...prev.slice(0, 7)]);
        setStatusMessage({
          type: "success",
          text: `Transmitted "${cleanCode}" to computer!`
        });
      } else {
        playErrorSound();
        setStatusMessage({
          type: "error",
          text: "Could not reach desktop. Please ensure the quotation form is still open."
        });
      }
      setSending(false);
    } else {
      // Standalone lookup mode
      playSuccessSound();
      const res = await lookupBarcode(cleanCode);
      if (res.type === "PRODUCT" && res.product) {
        setLookupData(res.product);
        setStatusMessage({
          type: "success",
          text: `Found Product: ${res.product.name} (Stock: ${res.product.stockQuantity})`
        });
      } else {
        setLookupData(null);
        setStatusMessage({
          type: "success",
          text: `Scanned: ${cleanCode}`
        });
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanDetected(manualCode.trim());
      setManualCode("");
    }
  };


  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
        color: "#ffffff",
        padding: "16px 12px",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      {/* Top App Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          padding: "4px 8px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BrandLogo size="sm" showSubtitle={false} />
        </div>

        {sessionCode ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(34, 197, 94, 0.2)",
              border: "1px solid #22c55e",
              color: "#4ade80",
              padding: "4px 10px",
              borderRadius: "16px",
              fontSize: "0.75rem",
              fontWeight: 700
            }}
          >
            <Radio size={12} className="animate-pulse" />
            <span>Paired: {sessionCode}</span>
          </div>
        ) : (
          <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Standalone Mode</div>
        )}
      </div>

      {/* Main Scanner Container */}
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Status Toast */}
        {statusMessage && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "12px",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: statusMessage.type === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              border: statusMessage.type === "success" ? "1px solid #22c55e" : "1px solid #ef4444",
              color: statusMessage.type === "success" ? "#4ade80" : "#f87171"
            }}
          >
            {statusMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        <div style={{ background: "rgba(30, 41, 59, 0.7)", borderRadius: "16px", padding: "12px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "16px" }}>
          <CameraScanner onScan={handleScanDetected} fps={12} qrbox={260} />
        </div>

        {/* Standalone product lookup preview if available */}
        {lookupData && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "16px"
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>{lookupData.name}</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>
              SKU: {lookupData.sku} • Stock: <strong style={{ color: "#4ade80" }}>{lookupData.stockQuantity} Units</strong>
            </div>
          </div>
        )}

        {/* Manual Barcode input fallback */}
        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type barcode / SKU manually..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #475569",
              background: "rgba(15, 23, 42, 0.8)",
              color: "#ffffff",
              fontSize: "0.9rem",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "#4f46e5",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            Send
          </button>
        </form>

        {/* Pairing Code Settings Box */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "0.85rem"
          }}
        >
          <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: "8px" }}>
            Pair with Desktop Computer
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="e.g. SC-1234"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #334155",
                background: "#020617",
                color: "#4ade80",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "0.9rem",
                outline: "none"
              }}
            />
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
            Enter the 6-character code displayed on your desktop to link this phone.
          </p>
        </div>

        {/* Live Transmitted Items History */}
        {sentItems.length > 0 && (
          <div
            style={{
              marginTop: "16px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px"
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
              <span>Transmitted to Computer</span>
              <span style={{ color: "#4ade80" }}>{sentItems.length} Scanned</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sentItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                    fontSize: "0.8rem"
                  }}
                >
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>{item.code}</span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
