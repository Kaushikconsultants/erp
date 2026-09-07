"use client";

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';

/**
 * Check if running inside native Android or iOS Capacitor wrapper
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get current platform ('android' | 'ios' | 'web')
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Trigger native tactile feedback
 */
export const triggerHaptic = async (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) => {
  if (!isNativePlatform()) return;

  try {
    if (type === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (type === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    }
  } catch (err) {
    console.debug('Haptics not available:', err);
  }
};

/**
 * Initialize native status bar, splash screen, and Android hardware back button listener
 */
export const initNativeMobileShell = (onNavigateBack?: () => void) => {
  if (!isNativePlatform()) return;

  // 1. Configure Native Status Bar
  try {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }
  } catch (e) {}

  // 2. Hide Native Splash Screen after web shell is rendered
  try {
    SplashScreen.hide().catch(() => {});
  } catch (e) {}

  // 3. Android Hardware Back Button Handler
  try {
    CapApp.removeAllListeners().then(() => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (onNavigateBack) {
          onNavigateBack();
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Get real-time device information
 */
export const getDeviceInfo = async () => {
  if (!isNativePlatform()) {
    return {
      platform: 'web',
      model: 'Browser',
      osVersion: navigator.userAgent,
      manufacturer: 'Web Client',
      isVirtual: false
    };
  }

  try {
    const info = await Device.getInfo();
    const id = await Device.getId();
    return {
      ...info,
      uuid: id.identifier
    };
  } catch (e) {
    return { platform: getPlatform() };
  }
};

/**
 * Check network connection status
 */
export const getNetworkStatus = async () => {
  try {
    return await Network.getStatus();
  } catch (e) {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
};

/**
 * Request all essential runtime permissions (Camera, Microphone, Notifications)
 * Works seamlessly in native Android / iOS Capacitor WebViews and desktop browsers
 */
export const requestAllNativePermissions = async () => {
  const results: { camera?: boolean; mic?: boolean; notifications?: string } = {};

  // 1. Request Camera & Mic via WebRTC / getUserMedia
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      results.camera = true;
      results.mic = true;
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.debug('Combined media permissions fallback:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        results.mic = true;
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        results.camera = true;
        videoStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }
  }

  // 2. Request Notification Permission
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      results.notifications = perm;
    } catch (e) {}
  }

  triggerHaptic('success').catch(() => {});
  return results;
};

