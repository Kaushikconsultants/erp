"use client";

import React, { useEffect, useState, useCallback } from "react";
import { triggerHaptic } from "@/lib/capacitor";

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
    
    // Play two-tone bell chime (880Hz -> 1174Hz)
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);
  } catch (e) {
    // AudioContext autoplay restrictions or disabled
  }
}

/**
 * Global client component that registers the service worker,
 * manages push subscriptions, and handles real-time alerts.
 */
export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);

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

  // Initialize Service Worker & Push Manager on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    if ("Notification" in window) {
      setPermission(Notification.permission);
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
          // Refresh / keep updated on server
          registerSubscriptionOnServer(existingSub);
        } else if (Notification.permission === "granted") {
          // Auto-subscribe if user already granted permission earlier
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

    // 3. Listen to foreground messages posted from Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "CRM_PUSH_RECEIVED") {
        playNotificationChime();
        triggerHaptic("success").catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [registerSubscriptionOnServer]);

  // Expose global helper window.__CRM_PUSH__ for Settings page & quick actions
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).__CRM_PUSH__ = {
      permission,
      isSubscribed,
      swRegistered,
      enablePush: async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          throw new Error("Push notifications are not supported on this browser or platform.");
        }

        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== "granted") {
          throw new Error(`Notification permission ${perm}. Please allow notifications in device settings.`);
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        await registerSubscriptionOnServer(sub);
        playNotificationChime();
        triggerHaptic("success").catch(() => {});
        return { success: true, endpoint: sub.endpoint };
      },
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
  }, [permission, isSubscribed, swRegistered, registerSubscriptionOnServer]);

  return null; // Silent background manager
}
