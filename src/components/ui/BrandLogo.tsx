"use client";

import React, { useState } from "react";
import { Sparkles, Heart } from "lucide-react";

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
  const [imgSrc, setImgSrc] = useState<string>("/brand-logo.jpg");
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  // Dimension scale based on size (Aspect ratio: 708 x 312 ≈ 2.27)
  const sizeConfig = {
    sm: { height: 38, maxW: 130, iconSize: 20, fontSize: "0.95rem", subSize: "0.65rem" },
    md: { height: 52, maxW: 185, iconSize: 26, fontSize: "1.18rem", subSize: "0.72rem" },
    lg: { height: 68, maxW: 240, iconSize: 32, fontSize: "1.45rem", subSize: "0.78rem" },
    xl: { height: 86, maxW: 310, iconSize: 40, fontSize: "1.8rem", subSize: "0.85rem" }
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const handleImageError = () => {
    if (imgSrc === "/brand-logo.jpg") {
      setImgSrc("/logo.jpg");
    } else {
      setImgFailed(true);
    }
  };

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
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          border: "1px solid #f1f5f9",
          flexShrink: 0,
          ...style
        }}
        title="ERP Tinkal"
      >
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt="ERP Tinkal"
            onError={handleImageError}
            style={{
              height: "36px",
              width: "auto",
              objectFit: "contain",
              transform: "scale(1.2)"
            }}
          />
        ) : (
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff"
            }}
          >
            <Heart size={18} fill="#ffffff" />
          </div>
        )}
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

      {/* Main Brand Logo Display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: "100%"
        }}
      >
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt="ERP Tinkal"
            className="brand-logo-img"
            onError={handleImageError}
            style={{
              height: `${config.height}px`,
              width: "auto",
              maxWidth: `${config.maxW}px`,
              objectFit: "contain",
              display: "block",
              borderRadius: "4px"
            }}
          />
        ) : (
          /* High-Fidelity Vector Fallback if static image fails to load */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "4px 8px"
            }}
          >
            <div
              style={{
                width: `${config.iconSize + 14}px`,
                height: `${config.iconSize + 14}px`,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(225, 29, 72, 0.3)",
                flexShrink: 0
              }}
            >
              <Heart size={config.iconSize} fill="#ffffff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: config.fontSize,
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1
                }}
              >
                ERP <span style={{ color: "#2563eb" }}>Tinkal</span>
              </div>
              {showSubtitle && (
                <div
                  style={{
                    fontSize: config.subSize,
                    fontWeight: 700,
                    color: "#64748b",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    marginTop: "2px"
                  }}
                >
                  Made by tinkal.in
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



