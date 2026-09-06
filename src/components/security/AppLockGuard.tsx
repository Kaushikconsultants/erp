"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Fingerprint,
  Delete,
  X,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  LogOut,
  Smartphone
} from "lucide-react";
import { signOut } from "next-auth/react";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Capacitor } from "@capacitor/core";

interface AppLockGuardProps {
  children: React.ReactNode;
}

export default function AppLockGuard({ children }: AppLockGuardProps) {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isPinEnabled, setIsPinEnabled] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSettingUpPin, setIsSettingUpPin] = useState<boolean>(false);

  // Native OS Hardware Biometric (Fingerprint / Face ID) Scan Trigger
  const handleBiometricUnlock = useCallback(async () => {
    setErrorMsg("");
    if (typeof window === "undefined") return;

    try {
      // ─── 1. NATIVE MOBILE APP (Android / iOS) VIA CAPACITOR ───
      if (Capacitor.isNativePlatform()) {
        try {
          const avail = await NativeBiometric.isAvailable().catch(() => ({ isAvailable: false }));
          if (!avail?.isAvailable) {
            setErrorMsg("No fingerprint/Face ID registered on device. Use 4-digit MPIN.");
            return;
          }

          // Trigger native Android BiometricPrompt / iOS LocalAuthentication
          await NativeBiometric.verifyIdentity({
            reason: "Authenticate to unlock Heart of Business ERP",
            title: "Biometric Login",
            subtitle: "Scan your fingerprint or Face ID",
            description: "Touch the fingerprint sensor to continue",
            negativeButtonText: "Use 4-digit MPIN",
            maxAttempts: 3
          });

          // Biometric verified successfully
          setIsLocked(false);
          setPin("");
          setErrorMsg("");
          return;
        } catch (nativeErr: any) {
          console.warn("Native biometric auth error:", nativeErr);
          const errStr = (nativeErr?.message || nativeErr?.errorMessage || JSON.stringify(nativeErr)).toLowerCase();
          if (errStr.includes("cancel") || errStr.includes("negative") || errStr.includes("user_cancel")) {
            setErrorMsg("Biometric scan canceled. Enter 4-digit MPIN.");
          } else if (errStr.includes("not_enrolled") || errStr.includes("none_enrolled") || errStr.includes("no biometric")) {
            setErrorMsg("No fingerprint/Face ID registered on device. Use 4-digit MPIN.");
          } else if (errStr.includes("failed") || errStr.includes("auth_failed")) {
            setErrorMsg("Fingerprint not recognized. Please try again or use MPIN.");
          } else {
            setErrorMsg("Biometric verification canceled. Enter 4-digit MPIN.");
          }
          return;
        }
      }

      // ─── 2. WEB BROWSER FALLBACK (WebAuthn API) ───
      if (!window.PublicKeyCredential) {
        setErrorMsg("Biometrics not supported on this browser. Please use 4-digit MPIN.");
        return;
      }

      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
      if (!isAvailable) {
        setErrorMsg("No fingerprint/Face ID sensor registered on this device. Use 4-digit MPIN.");
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          allowCredentials: []
        }
      };

      const credential = await navigator.credentials.get(options);
      if (credential) {
        setIsLocked(false);
        setPin("");
        setErrorMsg("");
      } else {
        setErrorMsg("Biometric verification failed. Please try again or enter MPIN.");
      }
    } catch (err: any) {
      console.warn("Biometric verification error:", err);
      if (err.name === "NotAllowedError" || err.message?.includes("canceled")) {
        setErrorMsg("Biometric scan canceled. Enter 4-digit MPIN.");
      } else if (err.name === "InvalidStateError" || err.name === "NotSupportedError") {
        setErrorMsg("No registered biometrics found. Use 4-digit MPIN.");
      } else {
        setErrorMsg("Fingerprint not recognized. Use 4-digit MPIN.");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const enabled = localStorage.getItem("app_mpin_enabled") === "true";
      const savedPin = localStorage.getItem("app_mpin_code");

      setIsPinEnabled(enabled);
      setStoredPin(savedPin);

      // Lock on launch if MPIN enabled
      if (enabled && savedPin) {
        setIsLocked(true);

        // Auto trigger native fingerprint dialog on mobile app launch
        if (Capacitor.isNativePlatform()) {
          const timer = setTimeout(() => {
            handleBiometricUnlock();
          }, 350);
          return () => clearTimeout(timer);
        }
      }

      // Auto-lock when app is hidden / backgrounded (visibilitychange)
      const handleVisibilityChange = () => {
        if (document.hidden && localStorage.getItem("app_mpin_enabled") === "true") {
          setIsLocked(true);
          setPin("");
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [handleBiometricUnlock]);

  const handleDigitTap = (digit: string) => {
    setErrorMsg("");
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-check PIN when 4 digits entered
      if (newPin.length === 4) {
        if (newPin === storedPin) {
          setIsLocked(false);
          setPin("");
        } else {
          setErrorMsg("Incorrect 4-Digit MPIN. Please try again.");
          setTimeout(() => setPin(""), 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg("");
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0f172a",
        color: "#ffffff",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "40px 24px calc(env(safe-area-inset-bottom, 24px) + 20px) 24px",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Header Logo & Title */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: "20px" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "8px 16px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <img
            src="/brand-logo.jpg"
            alt="Heart of Business"
            style={{
              height: "40px",
              width: "auto",
              objectFit: "contain",
              display: "block"
            }}
          />
        </div>
        <span style={{ fontSize: "0.82rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
          <ShieldCheck size={14} color="#10b981" /> 4-Digit MPIN & Biometric Security
        </span>
      </div>

      {/* PIN Bullet Dots & Error Message */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "320px" }}>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: pin.length > idx ? "#818cf8" : "transparent",
                border: pin.length > idx ? "2px solid #818cf8" : "2px solid #475569",
                boxShadow: pin.length > idx ? "0 0 12px rgba(129, 140, 248, 0.6)" : "none",
                transition: "all 0.15s ease"
              }}
            />
          ))}
        </div>

        {errorMsg ? (
          <div style={{ fontSize: "0.8rem", color: "#f87171", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", textAlign: "center", minHeight: "24px" }}>
            <AlertCircle size={15} /> <span>{errorMsg}</span>
          </div>
        ) : (
          <div style={{ fontSize: "0.78rem", color: "#64748b", minHeight: "24px" }}>Enter 4-digit security code to unlock</div>
        )}
      </div>

      {/* Touch Keypad */}
      <div style={{ width: "100%", maxWidth: "300px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitTap(digit)}
              style={{
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                fontSize: "1.4rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
                userSelect: "none"
              }}
              onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(129, 140, 248, 0.3)")}
              onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.08)")}
            >
              {digit}
            </button>
          ))}

          {/* Biometric Button */}
          <button
            type="button"
            onClick={handleBiometricUnlock}
            title="Unlock with Fingerprint / Face ID"
            style={{
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <Fingerprint size={26} />
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleDigitTap("0")}
            style={{
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontSize: "1.4rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              userSelect: "none"
            }}
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            title="Backspace"
            style={{
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <Delete size={22} />
          </button>
        </div>

        {/* Sign Out Fallback */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <LogOut size={14} /> <span>Sign Out / Switch User</span>
        </button>
      </div>
    </div>
  );
}
