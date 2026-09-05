"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Home, LogIn, ChevronDown, ChevronUp } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  const handleReload = () => {
    try {
      reset();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleLogin = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <div
      style={{
        minHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "36px 32px",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#fee2e2",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>
            Temporary Connection Issue
          </h2>
          <p style={{ margin: 0, fontSize: "0.92rem", color: "#64748b", lineHeight: 1.5 }}>
            The application experienced a momentary network or session interruption. Click below to refresh your session.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "6px" }}>
          <button
            onClick={handleReload}
            style={{
              width: "100%",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              border: "none",
              padding: "12px 20px",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw size={17} /> Reload & Try Again
          </button>

          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <button
              onClick={handleHome}
              style={{
                flex: 1,
                backgroundColor: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "10px 16px",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Home size={15} /> Dashboard
            </button>
            <button
              onClick={handleLogin}
              style={{
                flex: 1,
                backgroundColor: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "10px 16px",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <LogIn size={15} /> Log In
            </button>
          </div>
        </div>

        {/* Optional Collapsible Technical Details */}
        {error?.message && (
          <div style={{ width: "100%", marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{showDetails ? "Hide technical details" : "Show technical details"}</span>
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showDetails && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  color: "#e11d48",
                  fontFamily: "monospace",
                  textAlign: "left",
                  maxHeight: "100px",
                  overflowY: "auto",
                  wordBreak: "break-all",
                }}
              >
                {error.message}
                {error.digest && <div style={{ color: "#64748b", marginTop: "4px" }}>Digest: {error.digest}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
