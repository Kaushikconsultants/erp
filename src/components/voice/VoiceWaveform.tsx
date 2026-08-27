"use client";

import React, { useEffect, useState } from "react";

interface Props {
  isActive: boolean;
  isSpeaking: boolean;
}

export default function VoiceWaveform({ isActive, isSpeaking }: Props) {
  const [bars, setBars] = useState<number[]>([15, 25, 40, 60, 80, 60, 40, 25, 15]);

  useEffect(() => {
    if (!isActive && !isSpeaking) {
      setBars([15, 20, 25, 30, 25, 20, 15]);
      return;
    }

    const interval = setInterval(() => {
      setBars(prev =>
        prev.map(() => {
          const min = isSpeaking ? 30 : 20;
          const max = isSpeaking ? 95 : 85;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, isSpeaking]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        height: "64px",
        padding: "0 16px"
      }}
    >
      {bars.map((height, i) => (
        <div
          key={i}
          style={{
            width: "4px",
            height: `${height}%`,
            borderRadius: "9999px",
            background: isSpeaking
              ? "linear-gradient(180deg, #10b981 0%, #059669 100%)"
              : isActive
              ? "linear-gradient(180deg, #4f46e5 0%, #818cf8 100%)"
              : "#cbd5e1",
            transition: "height 0.1s ease, background 0.2s ease"
          }}
        />
      ))}
    </div>
  );
}
