"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Lock,
  Fingerprint,
  Delete,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  LogOut,
  Smartphone,
  Sparkles
} from "lucide-react";
import { signOut } from "next-auth/react";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { triggerHaptic } from "@/lib/capacitor";

interface AppLockGuardProps {
  children: React.ReactNode;
}

export default function AppLockGuard({ children }: AppLockGuardProps) {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isPinEnabled, setIsPinEnabled] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);

  // Guard refs to prevent re-entrant biometric calls and infinite popup loops
  const isAuthenticatingRef = useRef<boolean>(false);
  const hasUserCanceledBiometricRef = useRef<boolean>(false);
  const exemptUntilRef = useRef<number>(0);
  const lastBackgroundTime = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Grant temporary lock exemption for user-initiated actions (calls, voice search, camera, whatsapp)
  const grantExemption = useCallback((durationSeconds = 180) => {
    const until = Date.now() + durationSeconds * 1000;
    exemptUntilRef.current = until;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("app_lock_exempt_until", until.toString());
      } catch {}
    }
  }, []);

  // Centralized unlock success handler that marks the active browser/app session as unlocked
  const unlockAppSuccess = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("app_session_unlocked", "true");
        sessionStorage.setItem("app_session_unlocked_at", Date.now().toString());
        sessionStorage.removeItem("app_mpin_bg_time");
      } catch {}
    }
    triggerHaptic("success");
    setIsLocked(false);
    setPin("");
    setErrorMsg("");
    hasUserCanceledBiometricRef.current = false;
    lastBackgroundTime.current = 0;
  }, []);

  // Native OS Hardware Biometric (Fingerprint / Face ID) Scan Trigger
  const handleBiometricUnlock = useCallback(async (isAutoTrigger = false) => {
    // If already authenticating, abort to prevent overlapping native prompts
    if (isAuthenticatingRef.current) return;
    if (typeof window === "undefined") return;

    // If auto-triggered but user has already dismissed/canceled biometric during this lock, do not re-prompt
    if (isAutoTrigger && hasUserCanceledBiometricRef.current) {
      return;
    }

    if (!isAutoTrigger) {
      // User explicitly pressed the biometric button
      hasUserCanceledBiometricRef.current = false;
      setErrorMsg("");
      triggerHaptic("light");
    }

    isAuthenticatingRef.current = true;

    try {
      // ─── 1. NATIVE MOBILE APP (Android / iOS) VIA CAPACITOR ───
      try {
        const avail = await NativeBiometric.isAvailable().catch(() => ({ isAvailable: false }));
        if (avail && avail.isAvailable) {
          setIsBiometricSupported(true);
          await NativeBiometric.verifyIdentity({
            reason: "Authenticate to unlock ERP",
            title: "Biometric Login",
            subtitle: "Scan your fingerprint or Face ID",
            description: "Touch the sensor to access your account",
            negativeButtonText: "Use 4-digit MPIN",
            maxAttempts: 3
          });

          // Biometric verified successfully
          unlockAppSuccess();
          return;
        }
      } catch (nativeErr: any) {
        console.warn("Native biometric auth error:", nativeErr);
        hasUserCanceledBiometricRef.current = true; // Prevent automatic re-prompting loops
        const errStr = (nativeErr?.message || nativeErr?.errorMessage || JSON.stringify(nativeErr)).toLowerCase();
        if (errStr.includes("cancel") || errStr.includes("negative") || errStr.includes("user_cancel")) {
          setErrorMsg("Biometric scan canceled. Enter 4-digit MPIN.");
        } else if (errStr.includes("not_enrolled") || errStr.includes("none_enrolled") || errStr.includes("no biometric")) {
          setErrorMsg("No fingerprint/Face ID enrolled on device. Use 4-digit MPIN.");
        } else if (errStr.includes("failed") || errStr.includes("auth_failed")) {
          triggerHaptic("error");
          setErrorMsg("Fingerprint not recognized. Please try again or use MPIN.");
        } else {
          setErrorMsg("Biometric scan canceled. Enter 4-digit MPIN.");
        }
        return;
      }

      // If running inside native app container but sensor wasn't available
      const isNative = Capacitor.isNativePlatform() || (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.());
      if (isNative) {
        if (!isAutoTrigger) {
          setErrorMsg("Biometrics not enrolled on device. Please use 4-digit MPIN.");
        }
        return;
      }

      // ─── 2. WEB BROWSER FALLBACK (WebAuthn API) ───
      if (!window.PublicKeyCredential) {
        if (!isAutoTrigger) {
          setErrorMsg("Biometrics not supported on this browser. Please use 4-digit MPIN.");
        }
        return;
      }

      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
      if (!isAvailable) {
        if (!isAutoTrigger) {
          setErrorMsg("No fingerprint/Face ID sensor registered on this device. Use 4-digit MPIN.");
        }
        return;
      }

      setIsBiometricSupported(true);

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
        unlockAppSuccess();
      } else if (!isAutoTrigger) {
        hasUserCanceledBiometricRef.current = true;
        triggerHaptic("error");
        setErrorMsg("Biometric verification failed. Please try again or enter MPIN.");
      }
    } catch (err: any) {
      console.warn("Biometric verification error:", err);
      hasUserCanceledBiometricRef.current = true;
      if (!isAutoTrigger) {
        triggerHaptic("error");
        if (err.name === "NotAllowedError" || err.message?.includes("canceled")) {
          setErrorMsg("Biometric scan canceled. Enter 4-digit MPIN.");
        } else if (err.name === "InvalidStateError" || err.name === "NotSupportedError") {
          setErrorMsg("No registered biometrics found. Use 4-digit MPIN.");
        } else {
          setErrorMsg("Fingerprint not recognized. Use 4-digit MPIN.");
        }
      }
    } finally {
      // Cooldown to avoid handling overlapping lifecycle events
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 600);
    }
  }, [unlockAppSuccess]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const triggerLockCheckOnResume = useCallback(() => {
    // If the app is currently showing the biometric OS prompt, ignore this resume event
    if (isAuthenticatingRef.current) return;
    if (typeof window === "undefined") return;

    const enabled = localStorage.getItem("app_mpin_enabled") === "true";
    const savedPin = localStorage.getItem("app_mpin_code");
    if (!enabled || !savedPin) return;

    // Check if within active exemption period (e.g. return from dialer, voice command, camera, whatsapp)
    const storedExempt = parseInt(sessionStorage.getItem("app_lock_exempt_until") || "0", 10);
    const isExempt = Date.now() < Math.max(exemptUntilRef.current, storedExempt);
    if (isExempt) {
      lastBackgroundTime.current = 0;
      sessionStorage.removeItem("app_mpin_bg_time");
      return;
    }

    const timerSec = parseInt(localStorage.getItem("app_mpin_autolock_timer") || "120", 10);
    const bgTime = lastBackgroundTime.current || parseInt(sessionStorage.getItem("app_mpin_bg_time") || "0", 10);
    
    lastBackgroundTime.current = 0;
    sessionStorage.removeItem("app_mpin_bg_time");

    if (bgTime <= 0) return;

    const elapsedSec = (Date.now() - bgTime) / 1000;

    // Filter out momentary focus changes (< 1.5s) from OS permissions, keyboard popups, or dialogs
    if (elapsedSec < 1.5) return;

    // Lock if instant (timerSec === 0) or if background duration exceeded the configured timer
    if (timerSec === 0 || elapsedSec >= timerSec) {
      try {
        sessionStorage.removeItem("app_session_unlocked");
      } catch {}
      setIsLocked(true);
      setPin("");
      hasUserCanceledBiometricRef.current = false;
      setTimeout(() => {
        handleBiometricUnlock(true);
      }, 400);
    }
  }, [handleBiometricUnlock]);

  const markBackgrounded = useCallback(() => {
    // Ignore background events caused by the biometric sheet itself
    if (isAuthenticatingRef.current) return;
    if (typeof window === "undefined") return;

    const enabled = localStorage.getItem("app_mpin_enabled") === "true";
    if (!enabled) return;

    // If an in-app action exemption is active, do not mark background time
    const storedExempt = parseInt(sessionStorage.getItem("app_lock_exempt_until") || "0", 10);
    if (Date.now() < Math.max(exemptUntilRef.current, storedExempt)) {
      return;
    }

    const now = Date.now();
    lastBackgroundTime.current = now;
    sessionStorage.setItem("app_mpin_bg_time", now.toString());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Expose global exemption helper for voice commands, dialer, camera, etc.
    (window as any).grantAppLockExemption = grantExemption;

    // Automatically intercept SpeechRecognition everywhere in the app
    try {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec && SpeechRec.prototype && !(SpeechRec.prototype as any).__lockGuarded) {
        const origStart = SpeechRec.prototype.start;
        SpeechRec.prototype.start = function (...args: any[]) {
          grantExemption(180); // 3 minutes exemption for voice search & speech recognition
          return origStart.apply(this, args);
        };
        (SpeechRec.prototype as any).__lockGuarded = true;
      }
    } catch (e) {
      console.warn("Could not patch SpeechRecognition for lock exemption:", e);
    }

    // Global click listener to grant exemption for in-app dialer, whatsapp, file picker clicks
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a, button, input');
      if (!target) return;

      if (target instanceof HTMLInputElement && target.type === 'file') {
        grantExemption(180); // 3 min grace for camera / file upload
        return;
      }

      const href = (target.getAttribute('href') || '').toLowerCase();
      if (
        href.startsWith('tel:') ||
        href.startsWith('sms:') ||
        href.startsWith('mailto:') ||
        href.includes('wa.me') ||
        href.includes('whatsapp')
      ) {
        grantExemption(300); // 5 min grace for phone calls & WhatsApp messaging
      }
    };
    document.addEventListener('click', handleGlobalClick, true);

    const checkLockStatus = () => {
      const enabled = localStorage.getItem("app_mpin_enabled") === "true";
      const savedPin = localStorage.getItem("app_mpin_code");

      setIsPinEnabled(enabled);
      setStoredPin(savedPin);

      if (!enabled || !savedPin) {
        setIsLocked(false);
        return;
      }

      // Check if active session is already unlocked (e.g. navigating between routes/operations)
      const isSessionUnlocked = sessionStorage.getItem("app_session_unlocked") === "true";
      if (isSessionUnlocked) {
        setIsLocked(false);
        return;
      }

      // Initial Cold Start / Fresh Launch: lock and auto-trigger native fingerprint dialog once
      setIsLocked(true);
      if (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNativePlatform?.()) {
        const timer = setTimeout(() => {
          handleBiometricUnlock(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    };

    checkLockStatus();

    // 1. Web visibilitychange listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        markBackgrounded();
      } else {
        triggerLockCheckOnResume();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 2. Custom window event to test lock screen live from settings
    const handleTestLockEvent = () => {
      const savedPin = localStorage.getItem("app_mpin_code");
      setStoredPin(savedPin);
      try {
        sessionStorage.removeItem("app_session_unlocked");
      } catch {}
      hasUserCanceledBiometricRef.current = false;
      setIsLocked(true);
      setPin("");
      setErrorMsg("");
      setTimeout(() => {
        handleBiometricUnlock(true);
      }, 300);
    };
    window.addEventListener("test-app-lock", handleTestLockEvent);

    // 3. Custom config updated event from Profile settings
    const handleConfigUpdated = () => {
      const enabled = localStorage.getItem("app_mpin_enabled") === "true";
      const savedPin = localStorage.getItem("app_mpin_code");
      setIsPinEnabled(enabled);
      setStoredPin(savedPin);
      if (!enabled) {
        try {
          sessionStorage.removeItem("app_session_unlocked");
        } catch {}
        setIsLocked(false);
      }
    };
    window.addEventListener("app-lock-config-updated", handleConfigUpdated);

    // 4. Custom lock exemption event
    const handleCustomExemptEvent = (e: any) => {
      const secs = e.detail?.seconds || 180;
      grantExemption(secs);
    };
    window.addEventListener("app-lock-exempt", handleCustomExemptEvent);

    // 5. Native Capacitor App Lifecycle listener (Pause / Resume)
    let appStateListener: any = null;
    let backButtonListener: any = null;

    if (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNativePlatform?.()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        const enabled = localStorage.getItem("app_mpin_enabled") === "true";
        if (!enabled) return;

        if (!isActive) {
          markBackgrounded();
        } else {
          triggerLockCheckOnResume();
        }
      }).then(l => {
        appStateListener = l;
      }).catch(() => {});

      // Android back button guard when locked
      CapApp.addListener("backButton", () => {
        if (localStorage.getItem("app_mpin_enabled") === "true") {
          CapApp.exitApp();
        }
      }).then(l => {
        backButtonListener = l;
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("test-app-lock", handleTestLockEvent);
      window.removeEventListener("app-lock-config-updated", handleConfigUpdated);
      window.removeEventListener("app-lock-exempt", handleCustomExemptEvent);
      if (appStateListener?.remove) appStateListener.remove();
      if (backButtonListener?.remove) backButtonListener.remove();
    };
  }, [grantExemption, handleBiometricUnlock, markBackgrounded, triggerLockCheckOnResume]);

  const handleDigitTap = (digit: string) => {
    setErrorMsg("");
    triggerHaptic("light");

    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-validate PIN when 4 digits entered
      if (newPin.length === 4) {
        const currentSavedPin = localStorage.getItem("app_mpin_code") || storedPin;
        if (newPin === currentSavedPin) {
          unlockAppSuccess();
        } else {
          triggerHaptic("error");
          setErrorMsg("Incorrect 4-Digit MPIN. Please try again.");
          setIsShaking(true);
          setTimeout(() => {
            setPin("");
            setIsShaking(false);
          }, 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    triggerHaptic("medium");
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
        backgroundColor: "#090d16",
        backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(79, 70, 229, 0.25), rgba(9, 13, 22, 0.98))",
        color: "#ffffff",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "calc(env(safe-area-inset-top, 24px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 20px)",
        paddingLeft: "24px",
        paddingRight: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        userSelect: "none"
      }}
    >
      {/* Header Brand & Security Badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: "10px" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "8px 20px",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(79, 70, 229, 0.2)",
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
              height: "38px",
              width: "auto",
              objectFit: "contain",
              display: "block"
            }}
          />
        </div>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "0.2px", color: "#f8fafc" }}>
          App Security Lock
        </h2>

        <span
          style={{
            fontSize: "0.78rem",
            color: "#38bdf8",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "20px",
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} color="#38bdf8" /> 4-Digit MPIN & Biometrics Protected
        </span>
      </div>

      {/* PIN Indicator Dots & Error Banner */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "320px", margin: "20px 0" }}>
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "18px",
            animation: isShaking ? "shake 0.4s ease-in-out" : "none"
          }}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: isFilled ? "#6366f1" : "rgba(255, 255, 255, 0.08)",
                  border: isFilled ? "2px solid #818cf8" : "2px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: isFilled ? "0 0 16px rgba(99, 102, 241, 0.8), inset 0 0 6px #ffffff" : "none",
                  transform: isFilled ? "scale(1.15)" : "scale(1)",
                  transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <div
            style={{
              fontSize: "0.82rem",
              color: "#f87171",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textAlign: "center",
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)"
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>
            Enter 4-digit security MPIN to continue
          </div>
        )}
      </div>

      {/* Modern Touch Keypad */}
      <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitTap(digit)}
              style={{
                height: "64px",
                borderRadius: "20px",
                backgroundColor: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(10px)",
                color: "#ffffff",
                fontSize: "1.5rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)"
              }}
              onPointerDown={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.4)";
                e.currentTarget.style.transform = "scale(0.94)";
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
                e.currentTarget.style.transform = "scale(1)";
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {digit}
            </button>
          ))}

          {/* Biometric Icon Button */}
          <button
            type="button"
            onClick={() => handleBiometricUnlock(false)}
            title="Scan Fingerprint / Face ID"
            style={{
              height: "64px",
              borderRadius: "20px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 0 14px rgba(16, 185, 129, 0.2)"
            }}
            onPointerDown={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.35)";
              e.currentTarget.style.transform = "scale(0.94)";
            }}
            onPointerUp={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Fingerprint size={28} />
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleDigitTap("0")}
            style={{
              height: "64px",
              borderRadius: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(10px)",
              color: "#ffffff",
              fontSize: "1.5rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)"
            }}
            onPointerDown={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.4)";
              e.currentTarget.style.transform = "scale(0.94)";
            }}
            onPointerUp={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
              e.currentTarget.style.transform = "scale(1)";
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
              height: "64px",
              borderRadius: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(10px)",
              color: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)"
            }}
            onPointerDown={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.25)";
              e.currentTarget.style.transform = "scale(0.94)";
            }}
            onPointerUp={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.07)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Delete size={24} />
          </button>
        </div>

        {/* Bottom Fallback: Sign Out / Switch User */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "8px",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "color 0.15s ease"
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#64748b")}
        >
          <LogOut size={15} /> <span>Forgot MPIN? Sign Out</span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}
