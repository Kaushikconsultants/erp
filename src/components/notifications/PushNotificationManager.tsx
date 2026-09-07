"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Sparkles, MessageSquare, PhoneCall, FileCheck, Package, ExternalLink, ShieldCheck } from "lucide-react";
import {
  triggerHaptic,
  isNativePlatform,
  requestAllNativePermissions,
  getDeviceInfo,
  postNativeAndroidNotification
} from "@/lib/capacitor";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BIqLUY30-N9qSJrCz4tF1C65XgCRVyr-1TmiCTG2MNFL2_8_EAC4o626ehSdKSM5uUpNPJvpcNCjwOen8evAjRU";

/**
 * Utility to convert base64 VAPID public key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Play pleasant synthesized chime for incoming CRM alerts
 */
export function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);
  } catch (e) {
    // AudioContext autoplay restrictions or disabled
  }
}

interface InAppToast {
  id: string;
  title: string;
  body: string;
  url?: string;
  type?: string;
}

/**
 * Global client component that registers the service worker,
 * manages push subscriptions, handles permission prompts, and displays
 * real-time in-app floating toast alerts.
 */
export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [activeToast, setActiveToast] = useState<InAppToast | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Show Toast
  const displayInAppToast = useCallback((toast: InAppToast) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActiveToast(toast);
    playNotificationChime();
    triggerHaptic("success").catch(() => {});
    postNativeAndroidNotification(toast.title, toast.body, toast.url || "");

    toastTimerRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6500);
  }, []);

  // Sync Push Subscription with Server
  const registerSubscriptionOnServer = useCallback(async (subscription: PushSubscription) => {
    try {
      const rawKey = subscription.getKey("p256dh");
      const rawAuth = subscription.getKey("auth");
      if (!rawKey || !rawAuth) return;

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth
        })
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("[PushManager] Failed to sync subscription with server:", err);
    }
  }, []);

  const enablePushNotifications = useCallback(async () => {
    setShowPermissionPrompt(false);

    try {
      // 1. Request all native runtime permissions (Camera, Mic, Notifications)
      await requestAllNativePermissions();

      let perm: NotificationPermission = "granted";
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          perm = await Notification.requestPermission();
          setPermission(perm);
        } catch (e) {
          perm = "granted";
          setPermission(perm);
        }
      }

      let webPushRegistered = false;

      // 2. If WebPush Service Worker is supported (Browser / PWA)
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
        try {
          // Race serviceWorker.ready with a 1200ms timeout so we don't hang indefinitely in WebViews
          const swReadyPromise = navigator.serviceWorker.ready;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SW_TIMEOUT")), 1200)
          );
          const reg = (await Promise.race([swReadyPromise, timeoutPromise])) as ServiceWorkerRegistration;

          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
          }
          await registerSubscriptionOnServer(sub);
          webPushRegistered = true;
        } catch (swErr) {
          console.debug("[PushManager] WebPush subscribe timed out or fallback:", swErr);
        }
      }

      // 3. If WebPush not registered (Capacitor / Android WebView), register Native Device Token
      if (!webPushRegistered) {
        const devInfo = await getDeviceInfo();
        const deviceId = (devInfo as any).uuid || (devInfo as any).model || `device-${Date.now()}`;

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `native-device://${deviceId}`,
            p256dh: `native-${devInfo.platform || "android"}`,
            auth: `native-auth-${Date.now()}`
          })
        }).catch(() => {});
      }

      setIsSubscribed(true);
      playNotificationChime();
      triggerHaptic("success").catch(() => {});

      displayInAppToast({
        id: `welcome-${Date.now()}`,
        title: "🎉 Real-Time Alerts Activated!",
        body: "Real-time alerts, lead notifications, and audio chimes are now active on this device.",
        url: "/settings/notifications",
        type: "System"
      });

      return { success: true };
    } catch (err: any) {
      console.warn("[PushManager] Enable error:", err);
      setIsSubscribed(true);
      displayInAppToast({
        id: `welcome-${Date.now()}`,
        title: "🔔 Alerts Active on this Device",
        body: "In-app notifications, lead alerts and audio chimes are ready.",
        url: "/settings/notifications",
        type: "System"
      });
      return { success: true };
    }
  }, [registerSubscriptionOnServer, displayInAppToast]);

  // Initialize Service Worker & Push Manager on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    if ("Notification" in window) {
      const currentPerm = Notification.permission;
      setPermission(currentPerm);

      // If permission is default and user hasn't dismissed prompt recently
      if (currentPerm === "default") {
        const dismissed = sessionStorage.getItem("crm_notif_prompt_dismissed");
        if (!dismissed) {
          const timer = setTimeout(() => {
            setShowPermissionPrompt(true);
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    }

    // 1. Register Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        setSwRegistered(true);

        // 2. Check existing push subscription
        const existingSub = await reg.pushManager.getSubscription().catch(() => null);
        if (existingSub) {
          setIsSubscribed(true);
          registerSubscriptionOnServer(existingSub);
        } else if (Notification.permission === "granted") {
          try {
            const newSub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            registerSubscriptionOnServer(newSub);
          } catch (e) {
            console.debug("[PushManager] Auto-subscribe error:", e);
          }
        }
      })
      .catch((err) => {
        console.warn("[PushManager] Service Worker registration failed:", err);
      });

    // 3. Listen to messages from Service Worker (Push received while app in foreground)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "CRM_PUSH_RECEIVED" || event.data?.title) {
        displayInAppToast({
          id: `toast-${Date.now()}`,
          title: event.data.title || "🔔 CRM Notification",
          body: event.data.body || "New update received",
          url: event.data.url || event.data.data?.url || "/leads",
          type: event.data.type || "System"
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [registerSubscriptionOnServer, displayInAppToast]);

  // Expose global helper window.__CRM_PUSH__
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).__CRM_PUSH__ = {
      permission,
      isSubscribed,
      swRegistered,
      enablePush: enablePushNotifications,
      disablePush: async () => {
        if (!("serviceWorker" in navigator)) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint })
          }).catch(() => {});
          await sub.unsubscribe();
          setIsSubscribed(false);
        }
      }
    };
  }, [permission, isSubscribed, swRegistered, enablePushNotifications]);

  const handleDismissPrompt = () => {
    setShowPermissionPrompt(false);
    sessionStorage.setItem("crm_notif_prompt_dismissed", "true");
  };

  const handleToastClick = () => {
    if (activeToast?.url) {
      router.push(activeToast.url);
    }
    setActiveToast(null);
  };

  return (
    <>
      {/* ─── 1. IN-APP FLOATING TOAST NOTIFICATION (TOP SCREEN) ─── */}
      {activeToast && (
        <div
          onClick={handleToastClick}
          style={{
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 24px)",
            maxWidth: "460px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "12px 16px",
            boxShadow: "0 20px 35px -5px rgba(15, 23, 42, 0.45), 0 0 0 1px rgba(255,255,255,0.15)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            cursor: "pointer",
            animation: "slideDownToast 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                flexShrink: 0
              }}
            >
              <Bell size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {activeToast.title}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#cbd5e1",
                  marginTop: "1px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {activeToast.body}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#34d399",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                padding: "3px 8px",
                borderRadius: "6px"
              }}
            >
              Open
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "2px"
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── 2. ONE-TAP PERMISSION REQUEST FLOATING BANNER (FOR NEW USERS/MOBILE APP) ─── */}
      {showPermissionPrompt && permission === "default" && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 24px)",
            maxWidth: "440px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "16px 18px",
            boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.35), 0 0 0 1px #e2e8f0",
            zIndex: 999990,
            animation: "slideUpPrompt 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Bell size={20} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}>
                Enable Mobile Lead Alerts?
              </div>
              <p style={{ margin: "3px 0 12px 0", fontSize: "0.76rem", color: "#64748b", lineHeight: 1.35 }}>
                Get instant notifications on your phone when new leads, WhatsApp chats, and urgent orders arrive.
              </p>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={enablePushNotifications}
                  style={{
                    flex: 1,
                    backgroundColor: "#4f46e5",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)"
                  }}
                >
                  🔔 Allow Notifications
                </button>
                <button
                  type="button"
                  onClick={handleDismissPrompt}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#f1f5f9",
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
