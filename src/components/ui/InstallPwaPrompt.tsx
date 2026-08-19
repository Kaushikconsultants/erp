"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Download, X } from "lucide-react";

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install on Android:\n1. Tap your browser menu (3 dots top right)\n2. Tap 'Add to Home screen' or 'Install app'");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleInstallClick}
        style={{
          backgroundColor: '#ef4444',
          color: '#ffffff',
          padding: '6px 14px',
          borderRadius: '20px',
          border: 'none',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
          transition: 'all 0.2s ease'
        }}
        title="Install as Android App on your Phone"
      >
        <Smartphone size={15} />
        <span>Install App</span>
      </button>
    </div>
  );
}
