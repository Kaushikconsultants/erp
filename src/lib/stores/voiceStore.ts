"use client";

import { useSyncExternalStore } from 'react';
import { speakText as speakSpeech, stopSpeaking as stopSpeech } from "@/lib/speechService";

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  actionType?: string;
  route?: string;
  cardData?: any;
  cardType?:
    | 'BALANCE_SHEET'
    | 'CUSTOMER'
    | 'ORDER'
    | 'STOCK'
    | 'PAYROLL'
    | 'EXPENSE'
    | 'NAVIGATION'
    | 'GENERAL'
    | 'CONFIRMATION'
    | 'REPORT'
    | 'ATTENDANCE'
    | 'CLIENT_ACTION'
    | 'GUIDE';
  clientAction?: {
    type: string;
    data: any;
  };
  timestamp: string;
}

export interface ActiveVoiceFeedback {
  query?: string;
  text: string;
  success?: boolean;
  actionText?: string;
  route?: string;
  suggestedActions?: Array<{ label: string; href?: string; voiceCommand?: string }>;
  cardType?: string;
  cardData?: any;
  keyMetrics?: Array<{ label: string; value: string; positive?: boolean }>;
  requiresConfirmation?: boolean;
  confirmationPayload?: any;
}

export interface VoiceState {
  isOpen: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  feedbackText: string;
  language: 'en-IN' | 'hi-IN';
  messages: VoiceMessage[];
  voiceEnabled: boolean;

  autoStartListening?: boolean;
  activeFeedback?: ActiveVoiceFeedback | null;
  activeQuery?: string;

  openAssistant: (initialQuery?: string, autoListen?: boolean, feedback?: ActiveVoiceFeedback | null) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  setIsListening: (isListening: boolean) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setIsSpeaking: (isSpeaking: boolean) => void;
  setTranscript: (transcript: string) => void;
  setFeedbackText: (feedback: string) => void;
  setLanguage: (lang: 'en-IN' | 'hi-IN') => void;
  setVoiceEnabled: (enabled: boolean) => void;
  addMessage: (msg: Omit<VoiceMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
}

type Listener = () => void;

let state: VoiceState = {
  isOpen: false,
  isListening: false,
  isProcessing: false,
  isSpeaking: false,
  transcript: '',
  feedbackText: '',
  language: 'en-IN',
  autoStartListening: false,
  activeFeedback: null,
  activeQuery: '',
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      text: "Namaste! I'm Heart, your ERP Voice AI Copilot. You can ask me about Balance Sheet, Net Profit, Stock, Payroll, Customer receivables, or tell me to log an expense or add a customer.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()
    }
  ],
  voiceEnabled: true,

  openAssistant: (initialQuery?: string, autoListen?: boolean, feedback?: ActiveVoiceFeedback | null) => {
    updateState({
      isOpen: true,
      transcript: initialQuery || '',
      activeQuery: initialQuery || '',
      activeFeedback: feedback || null,
      autoStartListening: !!autoListen
    });
  },

  closeAssistant: () => {
    state.stopSpeaking();
    updateState({
      isOpen: false,
      isListening: false,
      isProcessing: false,
      transcript: '',
      feedbackText: '',
      activeQuery: '',
      activeFeedback: null,
      autoStartListening: false
    });
  },

  toggleAssistant: () => {
    if (state.isOpen) {
      state.closeAssistant();
    } else {
      state.openAssistant();
    }
  },

  setIsListening: (isListening: boolean) => updateState({ isListening }),
  setIsProcessing: (isProcessing: boolean) => updateState({ isProcessing }),
  setIsSpeaking: (isSpeaking: boolean) => updateState({ isSpeaking }),
  setTranscript: (transcript: string) => updateState({ transcript }),
  setFeedbackText: (feedbackText: string) => updateState({ feedbackText }),
  setLanguage: (language: 'en-IN' | 'hi-IN') => updateState({ language }),
  setVoiceEnabled: (voiceEnabled: boolean) => updateState({ voiceEnabled }),

  addMessage: (msg: Omit<VoiceMessage, 'id' | 'timestamp'>) => {
    const newMsg: VoiceMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()
    };
    updateState({
      messages: [...state.messages.slice(-30), newMsg]
    });

    if (msg.role === 'assistant' && state.voiceEnabled && msg.text) {
      state.speakText(msg.text);
    }
  },

  clearMessages: () => updateState({ messages: [] }),

  speakText: (text: string) => {
    speakSpeech(text, {
      lang: state.language as any,
      onStart: () => updateState({ isSpeaking: true }),
      onEnd: () => updateState({ isSpeaking: false }),
      onError: () => updateState({ isSpeaking: false })
    });
  },

  stopSpeaking: () => {
    stopSpeech();
    updateState({ isSpeaking: false });
  }
};

const listeners = new Set<Listener>();

function updateState(partial: Partial<VoiceState>) {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): VoiceState {
  return state;
}

export function useVoiceStore(): VoiceState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

useVoiceStore.getState = () => state;
