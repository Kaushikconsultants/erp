"use client";

import { useSyncExternalStore } from 'react';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  actionType?: string;
  route?: string;
  cardData?: any;
  cardType?: 'BALANCE_SHEET' | 'CUSTOMER' | 'ORDER' | 'STOCK' | 'PAYROLL' | 'EXPENSE' | 'NAVIGATION' | 'GENERAL';
  timestamp: string;
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

  openAssistant: (initialQuery?: string) => void;
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
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      text: "Namaste! I'm your ERP & CRM Voice AI Assistant. You can ask me about Balance Sheet, Net Profit, Stock, Payroll, Customer receivables, or tell me to log an expense or add a customer.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],
  voiceEnabled: true,

  openAssistant: (initialQuery?: string) => {
    updateState({ isOpen: true, transcript: initialQuery || '' });
  },

  closeAssistant: () => {
    state.stopSpeaking();
    updateState({ isOpen: false, isListening: false, isProcessing: false, transcript: '', feedbackText: '' });
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#_`~[\]()]/g, '')
      .replace(/₹/g, 'Rupees ')
      .replace(/\+/g, 'plus ')
      .slice(0, 350);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = state.language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const indVoice = voices.find(v => v.lang.includes('IN') || v.name.includes('India') || v.name.includes('Natural'));
    if (indVoice) utterance.voice = indVoice;

    utterance.onstart = () => updateState({ isSpeaking: true });
    utterance.onend = () => updateState({ isSpeaking: false });
    utterance.onerror = () => updateState({ isSpeaking: false });

    window.speechSynthesis.speak(utterance);
  },

  stopSpeaking: () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      updateState({ isSpeaking: false });
    }
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
