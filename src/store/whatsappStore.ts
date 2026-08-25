"use client";

import { useSyncExternalStore } from 'react';

interface WhatsAppState {
  conversations: any[];
  activeConvDetail: any | null;
  setConversations: (conversations: any[] | ((prev: any[]) => any[])) => void;
  setActiveConvDetail: (detail: any | ((prev: any) => any)) => void;
  
  aiLogs: any[];
  aiLogStats: any;
  setAiLogs: (logs: any[]) => void;
  setAiLogStats: (stats: any) => void;
  
  webhookEvents: any[];
  webhookPayloads: any[];
  webhookStats: any;
  setWebhookEvents: (events: any[]) => void;
  setWebhookPayloads: (payloads: any[]) => void;
  setWebhookStats: (stats: any) => void;
}

let state: WhatsAppState = {
  conversations: [],
  activeConvDetail: null,
  setConversations: (update) => {
    state = {
      ...state,
      conversations: typeof update === 'function' ? update(state.conversations) : update
    };
    listeners.forEach((l) => l());
  },
  setActiveConvDetail: (update) => {
    state = {
      ...state,
      activeConvDetail: typeof update === 'function' ? update(state.activeConvDetail) : update
    };
    listeners.forEach((l) => l());
  },
  aiLogs: [],
  aiLogStats: { total: 0, success: 0, error: 0, manual: 0, avgDuration: 0 },
  setAiLogs: (logs) => {
    state = { ...state, aiLogs: logs };
    listeners.forEach((l) => l());
  },
  setAiLogStats: (stats) => {
    state = { ...state, aiLogStats: stats };
    listeners.forEach((l) => l());
  },
  webhookEvents: [],
  webhookPayloads: [],
  webhookStats: { totalReceived: 0, totalRead: 0, totalText: 0, totalMedia: 0 },
  setWebhookEvents: (events) => {
    state = { ...state, webhookEvents: events };
    listeners.forEach((l) => l());
  },
  setWebhookPayloads: (payloads) => {
    state = { ...state, webhookPayloads: payloads };
    listeners.forEach((l) => l());
  },
  setWebhookStats: (stats) => {
    state = { ...state, webhookStats: stats };
    listeners.forEach((l) => l());
  },
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWhatsAppStore<T = WhatsAppState>(selector?: (s: WhatsAppState) => T): T {
  const currentState = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
  return selector ? selector(currentState) : (currentState as unknown as T);
}

