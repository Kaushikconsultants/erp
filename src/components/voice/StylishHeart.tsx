"use client";

import React from "react";

export interface StylishHeartProps {
  size?: number;
  isBeating?: boolean;
  isFast?: boolean;
  variant?: "white" | "ruby" | "gradient" | "original";
  className?: string;
  style?: React.CSSProperties;
  showGlow?: boolean;
}

/**
 * StylishHeart - The official 3D Ruby Glassmorphic Heart with animated ECG heartbeat waveform
 * Designed for the "Heart" ERP Voice AI Copilot.
 */
export default function StylishHeart({
  size = 32,
  isBeating = true,
  isFast = false,
  variant = "ruby",
  className = "",
  style = {},
  showGlow = true
}: StylishHeartProps) {
  const animDuration = isFast ? "0.7s" : "1.4s";
  const uniqueId = React.useId().replace(/:/g, "");

  return (
    <div
      className={`stylish-heart-container ${className}`}
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
        verticalAlign: "middle",
        animation: isBeating ? `stylishHeartPulse ${animDuration} ease-in-out infinite` : "none",
        ...style
      }}
    >
      {/* Soft Ambient Glow Backdrop */}
      {showGlow && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "80%",
            height: "80%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 23, 68, 0.45) 0%, rgba(225, 29, 72, 0.15) 60%, transparent 80%)",
            filter: "blur(6px)",
            pointerEvents: "none",
            zIndex: 0,
            animation: isBeating ? `stylishAuraBreath ${animDuration} ease-in-out infinite` : "none"
          }}
        />
      )}

      {/* 3D Glassmorphic Heart with Specular Reflections */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/voice-heart-agent.png"
        alt="Heart Voice AI Copilot"
        width={size}
        height={size}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          position: "relative",
          zIndex: 1,
          pointerEvents: "none",
          filter: "drop-shadow(0 2px 8px rgba(225, 29, 72, 0.35))"
        }}
      />

      {/* Superimposed Animated Glowing ECG Heartbeat Waveform */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "none",
          overflow: "visible"
        }}
      >
        <defs>
          {/* Intense Neon White-Pink Glow Filter */}
          <filter id={`ecgGlow-${uniqueId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="0.9" />
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ff1744" floodOpacity="0.8" />
          </filter>

          {/* Electric Pulse Gradient */}
          <linearGradient id={`ecgPulseGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffe4e6" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Base Ambient ECG Line */}
        <path
          d="M 15 52.5 L 35 52.5 L 38.5 45 L 41.5 56 L 49.6 25.5 L 55.5 66 L 61.5 52.5 L 66 46.5 L 70.5 52.5 L 85 52.5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#ecgGlow-${uniqueId})`}
        />

        {/* Active Traveling Electric Pulse Beam */}
        {isBeating && (
          <path
            d="M 15 52.5 L 35 52.5 L 38.5 45 L 41.5 56 L 49.6 25.5 L 55.5 66 L 61.5 52.5 L 66 46.5 L 70.5 52.5 L 85 52.5"
            fill="none"
            stroke={`url(#ecgPulseGrad-${uniqueId})`}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="35 120"
            style={{
              animation: `stylishEcgSweep ${animDuration} linear infinite`,
              filter: `url(#ecgGlow-${uniqueId})`
            }}
          />
        )}

        {/* R-Peak Dynamic Flash Accent */}
        {isBeating && (
          <circle
            cx="49.6"
            cy="25.5"
            r="2"
            fill="#ffffff"
            style={{
              transformOrigin: "49.6px 25.5px",
              animation: `stylishPeakFlash ${animDuration} ease-out infinite`,
              filter: `url(#ecgGlow-${uniqueId})`
            }}
          />
        )}
      </svg>

      {/* Dynamic Keyframes for Heartbeat & ECG Pulse */}
      <style jsx global>{`
        @keyframes stylishHeartPulse {
          0% {
            transform: scale(1);
          }
          14% {
            transform: scale(1.08);
          }
          28% {
            transform: scale(0.98);
          }
          42% {
            transform: scale(1.14);
          }
          70% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes stylishAuraBreath {
          0% {
            transform: scale(0.85);
            opacity: 0.5;
          }
          42% {
            transform: scale(1.25);
            opacity: 0.95;
          }
          70% {
            transform: scale(0.95);
            opacity: 0.6;
          }
          100% {
            transform: scale(0.85);
            opacity: 0.5;
          }
        }

        @keyframes stylishEcgSweep {
          0% {
            stroke-dashoffset: 140;
          }
          50% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -140;
          }
        }

        @keyframes stylishPeakFlash {
          0%, 25% {
            transform: scale(0.5);
            opacity: 0.2;
          }
          40% {
            transform: scale(2.2);
            opacity: 1;
          }
          55% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          100% {
            transform: scale(0.5);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
