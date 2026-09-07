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
 * Check if running inside Android Native wrapper with AndroidNative bridge
 */
export const isAndroidNativeApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).AndroidNative;
};

/**
 * Open Android system settings for this app
 */
export const openNativeAppSettings = () => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.openAppNotificationSettings();
    } catch (e) {}
  }
};

/**
 * Post a native Android OS notification to status bar and tray
 */
export const postNativeAndroidNotification = (title: string, body: string, url: string = '') => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.postNativeNotification(title, body, url);
    } catch (e) {}
  }
};

/**
 * Register user session with native Android background notification sync
 */
export const syncNativeUserSession = (userId: string, serverUrl?: string) => {
  if (isAndroidNativeApp() && userId) {
    try {
      const origin = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://erp.esponsports.com');
      (window as any).AndroidNative.setUserSession(userId, origin);
    } catch (e) {}
  }
};

/**
 * Prompt Android OS to ignore battery optimizations for reliable 24/7 background alerts
 */
export const requestIgnoreBatteryOptimizations = () => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestIgnoreBatteryOptimizations();
    } catch (e) {}
  }
};

/**
 * Request Camera Permission
 */
export const requestCameraPermission = async (): Promise<{ success: boolean; error?: string }> => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestCameraPermission();
    } catch (e) {}
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { success: false, error: 'Camera API not supported on this browser/device.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    triggerHaptic('success').catch(() => {});
    return { success: true };
  } catch (err: any) {
    console.debug('Camera permission request error:', err);
    return { success: false, error: err?.message || 'Camera permission was denied.' };
  }
};

/**
 * Request Microphone Permission
 */
export const requestMicrophonePermission = async (): Promise<{ success: boolean; error?: string }> => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestMicrophonePermission();
    } catch (e) {}
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { success: false, error: 'Microphone API not supported on this browser/device.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    triggerHaptic('success').catch(() => {});
    return { success: true };
  } catch (err: any) {
    console.debug('Microphone permission request error:', err);
    return { success: false, error: err?.message || 'Microphone permission was denied.' };
  }
};

/**
 * Request Notification Permission
 */
export const requestNotificationPermission = async (): Promise<{ success: boolean; permission: string }> => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestNotificationPermission();
      return { success: true, permission: 'granted' };
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      triggerHaptic('success').catch(() => {});
      return { success: perm === 'granted', permission: perm };
    } catch (e) {
      return { success: false, permission: 'denied' };
    }
  }
  return { success: true, permission: 'granted' };
};

/**
 * Request all essential runtime permissions (Camera, Microphone, Notifications)
 * Works seamlessly in native Android / iOS Capacitor WebViews and desktop browsers
 */
export const requestAllNativePermissions = async () => {
  const results: { camera?: boolean; mic?: boolean; notifications?: string } = {};

  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestAllPermissions();
    } catch (e) {}
  }

  // 1. Request Microphone
  try {
    const micRes = await requestMicrophonePermission();
    results.mic = micRes.success;
  } catch (e) {
    results.mic = false;
  }

  // 2. Request Camera
  try {
    const camRes = await requestCameraPermission();
    results.camera = camRes.success;
  } catch (e) {
    results.camera = false;
  }

  // 3. Request Notifications
  try {
    const notifRes = await requestNotificationPermission();
    results.notifications = notifRes.permission;
  } catch (e) {
    results.notifications = 'default';
  }

  triggerHaptic('success').catch(() => {});
  return results;
};


