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
  // Dimension scale based on size (Aspect ratio: 708 x 312 ≈ 2.27)
  const sizeConfig = {
    sm: { height: 38, maxW: 130 },
    md: { height: 54, maxW: 185 },
    lg: { height: 72, maxW: 240 },
    xl: { height: 92, maxW: 310 }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  if (collapsed) {
    return (
      <div
        className={`brand-identity-collapsed ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          ...style
        }}
        title="Heart of Business"
      >
        <img
          src="/brand-logo.jpg"
          alt="Heart of Business"
          style={{
            height: "40px",
            width: "auto",
            objectFit: "contain",
            transform: "scale(1.4) translateX(-5%)"
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`brand-identity ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        userSelect: "none",
        position: "relative",
        width: "100%",
        ...style
      }}
    >
      <style>
        {`
          .brand-identity {
            transition: all 0.25s ease;
          }
          .brand-identity:hover .brand-logo-img {
            transform: translateY(-1px) scale(1.02);
            filter: drop-shadow(0 4px 12px rgba(225, 29, 72, 0.15));
          }
          .brand-logo-img {
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease;
          }
        `}
      </style>

      {/* Main Brand Logo Graphic */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: "100%"
        }}
      >
        <img
          src="/brand-logo.jpg"
          alt="Heart of Business"
          className="brand-logo-img"
          style={{
            height: `${config.height}px`,
            width: "auto",
            maxWidth: `${config.maxW}px`,
            objectFit: "contain",
            display: "block",
            borderRadius: "4px"
          }}
        />
      </div>
    </div>
  );
}


