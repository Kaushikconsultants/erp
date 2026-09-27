"use client";

import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  collapsed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function BrandLogo({
  size = "md",
  showSubtitle = true,
  collapsed = false,
  className = "",
  style = {}
}: BrandLogoProps) {
  // Dimension scales
  const sizeConfig = {
    sm: { height: 34, iconSize: 28, titleSize: "1.05rem", subSize: "0.62rem", gap: "8px" },
    md: { height: 44, iconSize: 36, titleSize: "1.25rem", subSize: "0.68rem", gap: "10px" },
    lg: { height: 56, iconSize: 46, titleSize: "1.55rem", subSize: "0.76rem", gap: "12px" },
    xl: { height: 72, iconSize: 58, titleSize: "1.95rem", subSize: "0.86rem", gap: "14px" }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  if (collapsed) {
    return (
      <div
        className={`r3-brand-collapsed ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "42px",
          height: "42px",
          borderRadius: "11px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          boxShadow: "0 3px 10px rgba(67, 56, 202, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          userSelect: "none",
          flexShrink: 0,
          ...style
        }}
        title="R3 EXPORTS"
      >
        <span
          style={{
            fontFamily: "var(--font-outfit), 'Plus Jakarta Sans', sans-serif",
            fontWeight: 900,
            fontSize: "1.1rem",
            color: "#ffffff",
            letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          R3
        </span>
      </div>
    );
  }

  return (
    <div
      className={`r3-brand-identity ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        userSelect: "none",
        gap: config.gap,
        ...style
      }}
    >
      {/* R3 Vector Hex Shield Emblem */}
      <div
        style={{
          width: `${config.iconSize}px`,
          height: `${config.iconSize}px`,
          borderRadius: size === "sm" ? "9px" : "12px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(79, 70, 229, 0.28)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Subtle interior highlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "inherit"
          }}
        />

        <span
          style={{
            fontFamily: "var(--font-outfit), 'Plus Jakarta Sans', sans-serif",
            fontWeight: 900,
            fontSize: size === "sm" ? "0.95rem" : size === "lg" ? "1.45rem" : size === "xl" ? "1.85rem" : "1.18rem",
            letterSpacing: "-0.5px",
            color: "#ffffff",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)"
          }}
        >
          R3
        </span>
      </div>

      {/* Typography */}
      <div style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "var(--font-outfit), 'Plus Jakarta Sans', sans-serif",
            fontSize: config.titleSize,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <span style={{ color: "#0f172a" }}>R3</span>
          <span
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 800
            }}
          >
            EXPORTS
          </span>
        </div>

        {showSubtitle && (
          <div
            style={{
              fontSize: config.subSize,
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: "2px"
            }}
          >
            Enterprise ERP
          </div>
        )}
      </div>
    </div>
  );
}
