"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  User,
  Users,
  Search,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Delete,
  Sparkles,
  UserPlus,
  Building,
  Loader2,
  Clipboard,
  Copy,
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Send,
  BookOpen,
  History,
  Grid,
  MapPin,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
  Check,
  Radio,
  StopCircle,
  Settings2,
  Upload,
  Volume2,
  FileAudio,
  Store,
  Smartphone,
  Trash2
} from "lucide-react";
import { logCall, getCustomersForCallModal, getDialerRecentCalls, deleteCall } from "@/app/actions/callActions";
import { createQuickLead } from "@/app/actions/leadActions";
import { analyzeCallVoiceDebrief } from "@/app/actions/callAiActions";
import CallVoiceDebriefWidget from "@/components/telecalling/CallVoiceDebriefWidget";
import {
  getNativeSims,
  makeDirectCellularCall,
  getCallRecordingCapability,
  isDefaultDialer,
  requestDefaultDialer,
  isAndroidNativeApp,
  startNativeCallRecording,
  stopNativeCallRecording,
  NativeSimInfo,
  RecordingCapabilityInfo
} from "@/lib/capacitor";
import "./phone-dialer.css";

interface PhoneDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialName?: string;
  initialCustomerId?: string;
  initialLeadId?: string;
  initialTab?: "DIALPAD" | "CALL_LOGS" | "CONTACTS" | "POST_CALL" | "WHATSAPP" | "SCRIPTS";
}

const DIALPAD_KEYS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

const DEFAULT_OUTCOMES = [
  "Interested / Follow-up Needed",
  "Order Placed / Deal Closed",
  "Quotation Requested",
  "Price Negotiation / Discount Discussion",
  "No Answer / Busy",
  "Voicemail / Switched Off",
  "Callback Scheduled",
  "Not Interested / Lost",
  "Wrong / Invalid Number",
  "Support / General Inquiry"
];

const CALL_STATUSES = [
  { label: "Call Completed", value: "Completed", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  { label: "Connected (Live Call)", value: "Connected", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { label: "Busy / Engaged", value: "Busy", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  { label: "No Answer", value: "No Answer", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { label: "Voicemail / Off", value: "Voicemail", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { label: "Wrong Number", value: "Wrong Number", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  { label: "Callback", value: "Callback", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" }
];

const DISCUSSION_TAGS = [
  "Price Quoted",
  "Catalog Sent",
  "Decision Maker Away",
  "Discount Requested",
  "High Interest",
  "Ready to Order",
  "Payment Promised",
  "Follow-up Needed",
  "Reorder Inquiry"
];

const QUICK_DURATIONS = [
  { label: "0s (Missed)", sec: 0 },
  { label: "30s", sec: 30 },
  { label: "1m", sec: 60 },
  { label: "2m", sec: 120 },
  { label: "3m", sec: 180 },
  { label: "5m", sec: 300 }
];

const TELE_SCRIPTS = [
  {
    title: "Opening Pitch (Standard)",
    text: "Namaste! This is from our sales team. I am reaching out regarding your business inquiry for our latest product range & wholesale pricing."
  },
  {
    title: "Price Objection Handler",
    text: "I completely understand price is key. Our items offer high durability, GST invoices, and fast courier dispatch, giving your shop higher margin turnover."
  },
  {
    title: "Existing Supplier Objection",
    text: "We don't ask you to replace them completely. You can test a small trial batch of our top 5 bestsellers to see the quality and margin difference yourself."
  },
  {
    title: "Deal Closing Push",
    text: "If we confirm the booking today, I can lock in the special wholesale tier and ensure dispatch by tomorrow morning."
  }
];

const WHATSAPP_TEMPLATES = [
  {
    title: "Catalog & Wholesale Rates",
    text: (name: string) => `Hello ${name || "Sir/Ma'am"}, thank you for taking my call! Here is our latest product catalog and wholesale rate sheet. Please let me know which items you like.`
  },
  {
    title: "Quotation Follow-up",
    text: (name: string) => `Hi ${name || "Sir/Ma'am"}, as discussed on our call, I have prepared your customized quotation. Let me know if you want to proceed with this order.`
  },
  {
    title: "Follow-up & Callback",
    text: (name: string) => `Hi ${name || "Sir/Ma'am"}, our follow-up call is scheduled. Feel free to message here anytime if you have any questions before then.`
  },
  {
    title: "Order Confirmation & Payment",
    text: (name: string) => `Dear ${name || "Customer"}, thank you for placing your order with us! We are preparing the invoice and dispatch details.`
  }
];

class DialerErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void; isOpen?: boolean },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Dialer error caught by boundary:", error, errorInfo);
  }

  componentDidUpdate(prevProps: any) {
    if (prevProps.isOpen !== this.props.isOpen && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    // If closed or if an error occurred, render nothing.
    // NEVER show a disruptive "Dialer Ready" popup or error sheet to the user.
    if (!this.props.isOpen || this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Pure module-level utility: Format seconds to mm:ss
function formatDuration(totalSec: number | null | undefined): string {
  if (!totalSec || isNaN(totalSec) || totalSec <= 0) return "00:00";
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Pure module-level utility: Format phone number preserving '+' and E.164 compliance
export function formatPhoneNumberForCall(raw: string | null | undefined): string {
  if (!raw) return "";
  let clean = String(raw).trim().replace(/[^\d+*#]/g, "");
  if (clean.startsWith("+")) {
    clean = "+" + clean.replace(/\+/g, "");
  } else if (clean.length === 12 && clean.startsWith("91")) {
    // 12-digit Indian number without '+', add '+' so telecom network routes properly
    clean = "+" + clean;
  }
  return clean;
}

// Pure module-level utility: Relative time formatter for call logs
function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return String(dateStr || "");
  }
}

function PhoneDialerModalContent({
  isOpen,
  onClose,
  initialPhone = "",
  initialName = "",
  initialCustomerId,
  initialLeadId,
  initialTab = "DIALPAD"
}: PhoneDialerModalProps) {
  const [activeTab, setActiveTab] = useState<"DIALPAD" | "CALL_LOGS" | "CONTACTS" | "POST_CALL" | "WHATSAPP" | "SCRIPTS">(initialTab);
  const [phoneDigits, setPhoneDigits] = useState<string>(initialPhone);
  const [contacts, setContacts] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState<boolean>(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showNewLeadForm, setShowNewLeadForm] = useState<boolean>(false);

  // Search & Filter states for Call Logs & Contacts tabs
  const [callLogSearch, setCallLogSearch] = useState<string>("");
  const [callLogFilter, setCallLogFilter] = useState<"ALL" | "CONNECTED" | "MISSED" | "OUTBOUND" | "INBOUND">("ALL");
  const [contactSearch, setContactSearch] = useState<string>("");
  const [contactFilter, setContactFilter] = useState<"ALL" | "DEVICE" | "CUSTOMER" | "LEAD">("ALL");

  // Device Phone Contacts state (synced from Android native phonebook or Web Contact Picker)
  const [deviceContacts, setDeviceContacts] = useState<any[]>(() => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem("crm_device_contacts_cache") : null;
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isScanningContacts, setIsScanningContacts] = useState<boolean>(false);

  // Call Duration & Auto Debrief Engine State
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [autoDebriefTrigger, setAutoDebriefTrigger] = useState<number>(0);
  const callStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCallInitiatedRef = useRef<boolean>(false);
  const phoneDigitsRef = useRef<string>(initialPhone);
  phoneDigitsRef.current = phoneDigits;
  const selectedContactRef = useRef<any>(null);
  selectedContactRef.current = selectedContact;
  const [allFilesGranted, setAllFilesGranted] = useState<boolean>(true);

  const checkStoragePermission = useCallback(() => {
    if (isAndroidNativeApp() && typeof window !== "undefined") {
      try {
        const granted = (window as any).AndroidNative?.hasAllFilesPermission?.();
        if (typeof granted === "boolean") {
          setAllFilesGranted(granted);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    checkStoragePermission();
  }, [isOpen, activeTab, checkStoragePermission]);

  // Post-Call Maintenance State
  const [callType, setCallType] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [callStatus, setCallStatus] = useState<string>("Connected");
  const [outcome, setOutcome] = useState<string>(DEFAULT_OUTCOMES[0]);
  const [notes, setNotes] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpHour, setFollowUpHour] = useState<string>("11");
  const [followUpMinute, setFollowUpMinute] = useState<string>("00");
  const [followUpPeriod, setFollowUpPeriod] = useState<"AM" | "PM">("AM");
  const [isPromptDismissed, setIsPromptDismissed] = useState<boolean>(false);
  const [newLeadName, setNewLeadName] = useState<string>(initialName);
  const [newLeadShop, setNewLeadShop] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  // Speech Recognition ref
  const speechRecognitionRef = useRef<any>(null);

  // Quick follow-up helpers defined early to guarantee availability in all effects & callbacks
  const setQuickFollowUp = useCallback((days: number, hour12: number, min: number, period: "AM" | "PM") => {
    if (days < 0) {
      setFollowUpDate("");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFollowUpDate(`${yyyy}-${mm}-${dd}`);
    setFollowUpHour(String(hour12).padStart(2, '0'));
    setFollowUpMinute(String(min).padStart(2, '0'));
    setFollowUpPeriod(period);
  }, []);

  const getCompiledFollowUpDate = useCallback(() => {
    if (!followUpDate) return "";
    let h = parseInt(followUpHour || "11", 10);
    if (followUpPeriod === "PM" && h < 12) h += 12;
    if (followUpPeriod === "AM" && h === 12) h = 0;
    const [year, month, day] = followUpDate.split('-');
    const m = parseInt(followUpMinute || "00", 10);
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), h, m, 0);
    return localDate.toISOString();
  }, [followUpDate, followUpHour, followUpMinute, followUpPeriod]);

  // Telecom Multi-SIM & Recording Capability State
  const [availableSims, setAvailableSims] = useState<NativeSimInfo[]>(() => [
    { subscriptionId: 1, slotIndex: 0, slotLabel: "SIM 1", displayName: "SIM 1", carrierName: "SIM 1", isDefault: true },
    { subscriptionId: 2, slotIndex: 1, slotLabel: "SIM 2", displayName: "SIM 2", carrierName: "SIM 2", isDefault: false }
  ]);
  const [selectedSim, setSelectedSim] = useState<NativeSimInfo | null>(() => ({
    subscriptionId: 1, slotIndex: 0, slotLabel: "SIM 1", displayName: "SIM 1", carrierName: "SIM 1", isDefault: true
  }));
  const [isDefaultApp, setIsDefaultApp] = useState<boolean>(true);
  const [recordingCap, setRecordingCap] = useState<RecordingCapabilityInfo | null>(null);

  // Auto-Record Call State
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('crm_auto_record_calls');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isAutoRecording, setIsAutoRecording] = useState<boolean>(false);
  const [autoRecordTranscript, setAutoRecordTranscript] = useState<string>('');
  const [showRecordConsentDialog, setShowRecordConsentDialog] = useState<boolean>(false);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [callSummary, setCallSummary] = useState<string>('');
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const handleTranscribeAudioRef = useRef<((audioDataUrl: string, explicitDuration?: number) => Promise<void>) | null>(null);
  // Refs for the parallel MediaRecorder + SpeechRecognition running during the call
  const autoRecordMediaRef = useRef<MediaRecorder | null>(null);
  const autoRecordChunksRef = useRef<Blob[]>([]);
  const lastRecordedChunksRef = useRef<Blob[]>([]);
  const autoRecordSpeechRef = useRef<any>(null);
  const autoRecordTranscriptRef = useRef<string>('');

  // Auto-sync call duration to actual recorded audio length whenever recordingUrl is set
  useEffect(() => {
    if (!recordingUrl || typeof recordingUrl !== "string") return;
    try {
      const audio = new Audio();
      audio.src = recordingUrl;
      audio.onloadedmetadata = () => {
        const d = Math.round(audio.duration);
        if (d > 0 && !isNaN(d) && isFinite(d)) {
          setCallDurationSec(d);
        }
      };
    } catch (e) {}
  }, [recordingUrl]);

  // Helper: Automatically analyze and transcribe recorded audio via Gemini AI
  const handleTranscribeAudio = useCallback(async (audioDataUrl: string, explicitDuration?: number) => {
    if (!audioDataUrl || audioDataUrl.length < 50) return;
    setIsTranscribingAudio(true);
    setFeedbackMsg("🎙️ Transcribing call conversation with Gemini AI...");

    try {
      let rawB64 = audioDataUrl;
      let mime = "audio/webm";
      if (audioDataUrl.startsWith("data:")) {
        const match = audioDataUrl.match(/^data:([^;]+);base64,/);
        if (match && match[1]) {
          mime = match[1].trim().toLowerCase();
        }
        if (audioDataUrl.includes(",")) {
          rawB64 = audioDataUrl.split(",")[1];
        }
      }
      if (mime === "audio/mp3") mime = "audio/mpeg";
      if (mime === "audio/m4a" || mime === "audio/x-m4a") mime = "audio/mp4";

      const dur = explicitDuration !== undefined && explicitDuration > 0 ? explicitDuration : (callDurationSec || 0);
      const contactName = selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "Direct Contact";
      const contactPhone = phoneDigits || selectedContact?.phone || "";

      let analysisResult: any = null;

      // 1. Primary: REST API route
      try {
        const res = await fetch("/api/calls/analyze-debrief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: rawB64,
            mimeType: mime,
            callContext: {
              contactName,
              contactPhone,
              durationSec: dur
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.analysis) {
            analysisResult = data.analysis;
          }
        }
      } catch (restErr) {
        console.warn("REST analyze-debrief attempt notice:", restErr);
      }

      // 2. Secondary: Server Action fallback if REST didn't complete
      if (!analysisResult) {
        try {
          const actionRes = await analyzeCallVoiceDebrief({
            audioBase64: rawB64,
            mimeType: mime,
            callContext: {
              contactName,
              contactPhone,
              durationSec: dur
            }
          });
          if (actionRes?.success && actionRes?.analysis) {
            analysisResult = actionRes.analysis;
          }
        } catch (actErr) {
          console.warn("Server Action analyzeCallVoiceDebrief fallback notice:", actErr);
        }
      }

      if (analysisResult) {
        const a = analysisResult;
        if (a.transcript) {
          setAutoRecordTranscript(a.transcript);
          autoRecordTranscriptRef.current = a.transcript;
          setNotes((prev) => {
            const cleanPrev = prev ? prev.replace(/\[Auto-Transcript\][\s\S]*$/, "").trim() : "";
            const summaryPart = a.summary ? `\n\n[AI Summary]: ${a.summary}` : "";
            return cleanPrev ? `${cleanPrev}\n\n[Auto-Transcript]: ${a.transcript}${summaryPart}` : `[Auto-Transcript]: ${a.transcript}${summaryPart}`;
          });
        }
        if (a.detectedOutcome) {
          setOutcome(a.detectedOutcome);
        }
        if (a.summary) {
          setCallSummary(a.summary);
        }
        if (a.suggestedFollowUp?.date) {
          setFollowUpDate(a.suggestedFollowUp.date);
          if (a.suggestedFollowUp.hour12) setFollowUpHour(a.suggestedFollowUp.hour12);
          if (a.suggestedFollowUp.minute) setFollowUpMinute(a.suggestedFollowUp.minute);
          if (a.suggestedFollowUp.period) setFollowUpPeriod(a.suggestedFollowUp.period);
        }
        const isSilent = a.transcript?.includes("[Call connected - silence/hold tone]") || a.transcript?.includes("No discernible speech detected");
        if (isSilent) {
          setFeedbackMsg("ℹ️ Audio attached. Tap 'Dictate' to add discussion notes.");
        } else {
          setFeedbackMsg("✨ Call transcribed & AI summary attached automatically!");
        }
      } else {
        setFeedbackMsg("⚠️ Could not transcribe audio. Recording saved.");
      }
    } catch (err) {
      console.warn("Auto-transcription error:", err);
      setFeedbackMsg("⚠️ Transcription error. Recording saved.");
    } finally {
      setIsTranscribingAudio(false);
    }
  }, [callDurationSec, selectedContact, newLeadName, phoneDigits]);

  useEffect(() => {
    handleTranscribeAudioRef.current = handleTranscribeAudio;
  }, [handleTranscribeAudio]);

  // Load Recent Calls safely
  const loadRecentCalls = async () => {
    setIsLoadingCalls(true);
    try {
      const res = await getDialerRecentCalls(50);
      if (res && res.success && Array.isArray(res.calls)) {
        setRecentCalls(res.calls);
      }
    } catch (err) {
      console.warn("Could not load recent calls for dialer:", err);
    } finally {
      setIsLoadingCalls(false);
    }
  };

  // Delete Call Log and attached recording
  const handleDeleteCallLog = async (callId: string, contactName?: string) => {
    if (!confirm(`Are you sure you want to delete this call record and recording for ${contactName || "this contact"}?`)) {
      return;
    }
    try {
      // Optimistically remove from state immediately
      setRecentCalls(prev => prev.filter(c => c.id !== callId));
      handleVibrate(20);
      const res = await deleteCall(callId);
      if (res && res.success) {
        setFeedbackMsg("✓ Call record and recording deleted.");
        setTimeout(() => setFeedbackMsg(""), 2000);
      } else {
        setFeedbackMsg("❌ Failed to delete call record.");
        loadRecentCalls();
      }
    } catch (err) {
      console.warn("Delete call log error:", err);
      loadRecentCalls();
    }
  };

  // Re-fetch recent calls whenever user navigates to Call Logs tab
  useEffect(() => {
    if (activeTab === "CALL_LOGS") {
      loadRecentCalls();
    }
  }, [activeTab]);

  // Load Contacts Directory safely
  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const res = await getCustomersForCallModal();
      if (res && res.success && Array.isArray(res.customers)) {
        setContacts(res.customers);
        if (initialCustomerId) {
          const match = res.customers.find((c: any) => c.id === initialCustomerId && c.type === "Customer");
          const cleanInitPhone = String(initialPhone || '').replace(/\D/g, '');
          const matchPhone = String(match?.phone || '').replace(/\D/g, '');
          if (match && (!cleanInitPhone || matchPhone.includes(cleanInitPhone) || cleanInitPhone.includes(matchPhone))) {
            setSelectedContact(match);
            if (!newLeadName) setNewLeadName(match.contactPerson || match.companyName || "");
            if (!newLeadShop) setNewLeadShop(match.shopName || match.companyName || "");
          }
        } else if (initialLeadId) {
          const match = res.customers.find((c: any) => c.id === initialLeadId && c.type === "Lead");
          const cleanInitPhone = String(initialPhone || '').replace(/\D/g, '');
          const matchPhone = String(match?.phone || '').replace(/\D/g, '');
          if (match && (!cleanInitPhone || matchPhone.includes(cleanInitPhone) || cleanInitPhone.includes(matchPhone))) {
            setSelectedContact(match);
            if (!newLeadName) setNewLeadName(match.contactPerson || match.companyName || "");
            if (!newLeadShop) setNewLeadShop(match.shopName || match.companyName || "");
          }
        } else if (initialPhone) {
          const cleanInit = String(initialPhone).replace(/\D/g, '');
          let match = res.customers.find((c: any) =>
            c.phone && String(c.phone).replace(/\D/g, '').includes(cleanInit)
          );
          if (!match && Array.isArray(deviceContacts)) {
            match = deviceContacts.find((c: any) =>
              c.phone && String(c.phone).replace(/\D/g, '').includes(cleanInit)
            );
          }
          if (match) {
            setSelectedContact(match);
            if (!newLeadName) setNewLeadName(match.contactPerson || match.companyName || match.name || "");
            if (!newLeadShop) setNewLeadShop(match.shopName || match.companyName || "");
          }
        }
      }
    } catch (err) {
      console.warn("Could not load contacts for dialer:", err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Load Device Phone Contacts from Android native bridge or Web Contact Picker
  const loadDeviceContacts = useCallback(async (searchQuery: string = "") => {
    setIsScanningContacts(true);
    let found: any[] = [];
    try {
      if (isAndroidNativeApp() && typeof window !== "undefined") {
        const hasPerm = (window as any).AndroidNative?.hasContactsPermission?.();
        if (hasPerm === false) {
          (window as any).AndroidNative?.requestContactsPermission?.();
          setFeedbackMsg("📱 Grant Contacts permission in prompt to load saved phone contacts.");
          // Retry automatically after prompt
          setTimeout(() => {
            if ((window as any).AndroidNative?.hasContactsPermission?.()) {
              loadDeviceContacts(searchQuery);
            }
          }, 2500);
          setIsScanningContacts(false);
          return;
        }
        const rawJson = (window as any).AndroidNative?.getDeviceContacts?.(searchQuery || "");
        if (rawJson && typeof rawJson === "string") {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed)) {
            found = parsed.map((item: any, idx: number) => ({
              id: `dev_${item.id || idx}_${(item.phone || '').replace(/\D/g, '')}`,
              companyName: item.name || item.contactPerson || item.companyName || "Phone Contact",
              contactPerson: item.name || item.contactPerson || item.companyName || "Phone Contact",
              phone: item.phone,
              type: "DeviceContact",
              source: "device"
            }));
          }
        }
      } else if (typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window) {
        try {
          const props = ["name", "tel"];
          const contactsList = await (navigator as any).contacts.select(props, { multiple: true });
          if (Array.isArray(contactsList)) {
            found = contactsList.map((c: any, idx: number) => ({
              id: `webcontact_${idx}_${(c.tel?.[0] || '').replace(/\D/g, '')}`,
              companyName: c.name?.[0] || "Phone Contact",
              contactPerson: c.name?.[0] || "Phone Contact",
              phone: c.tel?.[0] || "",
              type: "DeviceContact",
              source: "device"
            }));
          }
        } catch (pickerErr) {
          console.warn("Contact picker cancelled or unsupported:", pickerErr);
        }
      }
      if (found.length > 0) {
        setDeviceContacts(found);
        try {
          localStorage.setItem("crm_device_contacts_cache", JSON.stringify(found.slice(0, 5000)));
        } catch {
          try {
            localStorage.setItem("crm_device_contacts_cache", JSON.stringify(found.slice(0, 1500)));
          } catch {}
        }
        setFeedbackMsg(`📱 Loaded ${found.length} phone contacts!`);
      } else if (isAndroidNativeApp()) {
        if (deviceContacts.length === 0) {
          setFeedbackMsg("📱 No device contacts found. Ensure contacts permission is allowed.");
        }
      }
    } catch (err) {
      console.warn("Error loading device contacts:", err);
    } finally {
      setIsScanningContacts(false);
    }
  }, []);

  // Listener for native contacts permission granted event from Android Bridge
  useEffect(() => {
    const handlePermGranted = () => {
      loadDeviceContacts();
    };
    window.addEventListener("native-contacts-permission-granted", handlePermGranted);
    return () => window.removeEventListener("native-contacts-permission-granted", handlePermGranted);
  }, [loadDeviceContacts]);

  // Global listener for open-phone-dialer event
  useEffect(() => {
    const handleGlobalOpen = (e: any) => {
      const detail = e.detail || {};
      if (detail.phone) setPhoneDigits(detail.phone);
      if (detail.name) setNewLeadName(detail.name);
      if (detail.contact) setSelectedContact(detail.contact);
      if (detail.tab) setActiveTab(detail.tab);
      else setActiveTab("DIALPAD");
    };
    window.addEventListener("open-phone-dialer", handleGlobalOpen);
    return () => window.removeEventListener("open-phone-dialer", handleGlobalOpen);
  }, []);

  // Hardware Back Button (Android Gesture / Key) & Escape Key Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleBackButton = (e: Event) => {
      e.preventDefault();
      if (activeTab !== "DIALPAD") {
        setActiveTab("DIALPAD");
      } else {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (activeTab !== "DIALPAD") {
          setActiveTab("DIALPAD");
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("app-back-button", handleBackButton);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("app-back-button", handleBackButton);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, activeTab, onClose]);

  // Multi-SIM & Capability Discovery on Mount
  useEffect(() => {
    if (!isOpen) return;

    const discoverTelephony = () => {
      if (isAndroidNativeApp()) {
        try {
          const sims = getNativeSims();
          if (Array.isArray(sims) && sims.length > 0) {
            setAvailableSims(sims);
            let savedSubId: string | null = null;
            let savedSlot: string | null = null;
            try {
              savedSubId = typeof window !== "undefined" ? localStorage.getItem("crm_preferred_sim_id") : null;
              savedSlot = typeof window !== "undefined" ? localStorage.getItem("crm_preferred_sim_slot") : null;
            } catch (storageErr) {
              console.warn("Could not read preferred sim from storage:", storageErr);
            }
            const preferred = (savedSubId ? sims.find((s) => s && s.subscriptionId != null && String(s.subscriptionId) === savedSubId) : null)
              || (savedSlot ? sims.find((s) => s && s.slotIndex != null && String(s.slotIndex) === savedSlot) : null)
              || sims.find((s) => s && s.isDefault)
              || sims[0];
            setSelectedSim(preferred || null);
          }
          try {
            setIsDefaultApp(isDefaultDialer());
          } catch (e) {}
          try {
            setRecordingCap(getCallRecordingCapability());
          } catch (e) {}
        } catch (e) {
          console.warn("Telephony discovery error:", e);
        }
      }
    };

    discoverTelephony();
    window.addEventListener("native-telephony-permission-granted", discoverTelephony);
    return () => window.removeEventListener("native-telephony-permission-granted", discoverTelephony);
  }, [isOpen]);

  // Listen for Automatic Post-Call Cellular Audio Transcription
  useEffect(() => {
    const handleTranscription = (e: any) => {
      const detail = e.detail || {};
      if (detail.text) {
        const transcriptText = detail.text;
        const summaryText = detail.summary ? `\n\n[AI Summary]: ${detail.summary}` : "";
        setNotes((prev) => {
          const cleanPrev = prev ? prev.replace(/\[Auto-Transcript\][\s\S]*$/, "").trim() : "";
          return cleanPrev ? `${cleanPrev}\n\n[Auto-Transcript]: ${transcriptText}${summaryText}` : `[Auto-Transcript]: ${transcriptText}${summaryText}`;
        });
        if (detail.outcome) {
          setOutcome(detail.outcome);
        }
        setAutoRecordTranscript(transcriptText);
        setFeedbackMsg("🎙️ Automatic AI Call Transcript & Summary Attached!");
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("native-call-transcription", handleTranscription);
      return () => window.removeEventListener("native-call-transcription", handleTranscription);
    }
  }, []);

  // Listen for Native Android Telephony Call State (CONNECTED = Auto Timer Start, ENDED = Auto AI Debrief)
  useEffect(() => {
    const handleNativeCallState = (e: any) => {
      const detail = e.detail || {};
      const state = detail.state; // "CONNECTED" | "ENDED" | "RINGING"
      const dur = detail.durationSec || 0;

      if (state === "CONNECTED") {
        if (!callStartTimeRef.current) {
          callStartTimeRef.current = Date.now();
        }
        setIsTimerRunning(true);
        setCallStatus("Connected");
        setFeedbackMsg("🟢 Call connected! Live talk timer started.");
      } else if (state === "ENDED") {
        setIsTimerRunning(false);
        const finalDur = dur > 0 ? dur : (callStartTimeRef.current ? Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000)) : 0);
        callStartTimeRef.current = null;
        isCallInitiatedRef.current = false;
        setCallDurationSec(finalDur);

        // Stop auto-recording if running (only on desktop web)
        if (!isAndroidNativeApp() && isAutoRecording) {
          stopAutoRecording(finalDur);
        } else if (isAndroidNativeApp()) {
          setIsAutoRecording(false);
        }

        // On Native Android, retrieve the actual recording from device / MediaStore
        const nativeCandidate = detail?.recordingUrl;
        if (nativeCandidate && typeof nativeCandidate === "string" && nativeCandidate.startsWith("data:audio") && nativeCandidate.length > 500) {
          setRecordingUrl(nativeCandidate);
          setFeedbackMsg(`🎙️ Cellular call recording (${formatDuration(finalDur)}) attached! Transcribing with Gemini AI...`);
          handleTranscribeAudioRef.current?.(nativeCandidate, finalDur);
        } else if (isAndroidNativeApp()) {
          // Poll the AndroidNative bridge over 3.5 seconds (OEM dialers write file right upon hangup)
          const phoneParam = phoneDigitsRef.current || selectedContactRef.current?.phone || "";
          const nameParam = selectedContactRef.current?.companyName || selectedContactRef.current?.contactPerson || newLeadName || "";
          let attempts = 0;
          const pollTimer = setInterval(() => {
            attempts++;
            try {
              const rec = (window as any).AndroidNative?.getLastCallRecording?.(phoneParam, nameParam, finalDur)
                || (window as any).AndroidNative?.getLastCallRecording?.(phoneParam);
              if (rec && typeof rec === "string" && rec.startsWith("data:audio") && rec.length > 500) {
                clearInterval(pollTimer);
                const exactDur = (window as any).AndroidNative?.getLastCallDuration?.() || finalDur;
                if (exactDur > 0) setCallDurationSec(exactDur);
                setRecordingUrl(rec);
                setFeedbackMsg(`🎙️ Cellular call recording (${formatDuration(exactDur)}) attached! Transcribing with Gemini AI...`);
                handleTranscribeAudioRef.current?.(rec, exactDur);
                return;
              }
            } catch (e) {}

            if (attempts >= 5) {
              clearInterval(pollTimer);
              setRecordingUrl("");
              setFeedbackMsg("ℹ️ Call completed. Ensure auto-recording is ON in Phone Settings, or tap 'Scan Phone'.");
            }
          }, 700);
        }

        if (finalDur > 0) {
          setCallStatus("Completed");
          if (outcome === "No Answer / Busy" || outcome === "Voicemail / Switched Off") {
            setOutcome("Interested / Follow-up Needed");
          }
          setFeedbackMsg(`⏹ Call completed (${formatDuration(finalDur)}). Review or tap Debrief below.`);
          setAutoDebriefTrigger(Date.now());
        } else {
          setCallStatus("Busy");
          setOutcome("No Answer / Busy");
          setQuickFollowUp(1, 11, 0, "AM");
          setFeedbackMsg("❌ Call ended without answer (0s). Scheduled follow-up for tomorrow 11 AM.");
        }
      }
    };

    window.addEventListener("native-call-state", handleNativeCallState);
    return () => window.removeEventListener("native-call-state", handleNativeCallState);
  }, [outcome]);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      setPhoneDigits(initialPhone || "");
      setNewLeadName(initialName || "");
      setSelectedContact(null);
      setCallDurationSec(0);
      setIsTimerRunning(false);
      setAutoDebriefTrigger(0);
      callStartTimeRef.current = null;
      isCallInitiatedRef.current = false;
      setNotes("");
      setFeedbackMsg("");
      setRecordingUrl("");
      setAutoRecordTranscript("");
      setCallSummary("");
      setShowNewLeadForm(false);
      setActiveTab(initialTab || "DIALPAD");

      if (typeof window !== "undefined") {
        try {
          (window as any).AndroidNative?.clearLastCallRecording?.();
        } catch (e) {}
      }

      loadContacts();
      loadRecentCalls();
      if (isAndroidNativeApp()) {
        loadDeviceContacts();
      }
    }
  }, [isOpen, initialPhone, initialName, initialCustomerId, initialLeadId, initialTab, loadDeviceContacts]);

  // Lock background body scroll when dialer modal is open
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  // Single Clean Live Stopwatch Timer
  useEffect(() => {
    if (isTimerRunning) {
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now() - (callDurationSec * 1000);
      }
      timerIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setCallDurationSec(Math.max(0, elapsed));
        } else {
          setCallDurationSec(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  // Synchronize duration on window visibility change (Auto-calculate duration & engage AI Debrief on return)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (isCallInitiatedRef.current) {
          isCallInitiatedRef.current = false;
          setIsTimerRunning(false);

          let duration = 0;
          if (typeof window !== "undefined" && (window as any).AndroidNative?.getLastCallDuration) {
            const nativeDur = (window as any).AndroidNative.getLastCallDuration();
            if (nativeDur > 0) duration = nativeDur;
          }

          // On Android Native, do NOT fallback to elapsed wall-clock time!
          // An unanswered, busy, rejected or dropped call has duration 0s.
          if (!isAndroidNativeApp() && duration === 0 && callStartTimeRef.current) {
            const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
            if (elapsed > 0) duration = elapsed;
          }

          callStartTimeRef.current = null;
          setCallDurationSec(duration);

          // Stop auto-recording and trigger transcription when app returns from call
          if (isAndroidNativeApp()) {
            setIsAutoRecording(false);
            const phoneParam = phoneDigitsRef.current || selectedContactRef.current?.phone || "";
            const nameParam = selectedContactRef.current?.companyName || selectedContactRef.current?.contactPerson || newLeadName || "";
            let attempts = 0;
            const scanNativeRec = () => {
              attempts++;
              try {
                const rec = (window as any).AndroidNative?.getLastCallRecording?.(phoneParam, nameParam, duration)
                  || (window as any).AndroidNative?.getLastCallRecording?.(phoneParam);
                if (rec && typeof rec === "string" && rec.startsWith("data:audio") && rec.length > 500) {
                  const exactDur = (window as any).AndroidNative?.getLastCallDuration?.() || duration;
                  if (exactDur > 0) {
                    setCallDurationSec(exactDur);
                    setCallStatus("Completed");
                  }
                  setRecordingUrl(rec);
                  setFeedbackMsg(`🎙️ Cellular call recording (${formatDuration(exactDur)}) attached! Transcribing with Gemini AI...`);
                  handleTranscribeAudioRef.current?.(rec, exactDur);
                  return true;
                }
              } catch (e) {}
              return false;
            };

            if (!scanNativeRec()) {
              const poll = setInterval(() => {
                if (scanNativeRec() || attempts >= 5) {
                  clearInterval(poll);
                }
              }, 700);
            }
          } else if (isAutoRecording) {
            stopAutoRecording(duration);
          }

          if (duration > 0) {
            setCallStatus("Completed");
            setFeedbackMsg(`⏹ Returned from call (${formatDuration(duration)}). AI Voice Debrief starting... 🎙️`);
            setAutoDebriefTrigger(Date.now());
          } else {
            setCallStatus("No Answer");
            setOutcome("No Answer / Busy");
            setCallDurationSec(0);
            setQuickFollowUp(1, 11, 0, "AM");
            setFeedbackMsg("❌ Call not connected (0s). Scheduled follow-up for tomorrow 11 AM.");
          }
        }
      }
    };

    const handleWindowFocus = () => {
      if (isCallInitiatedRef.current) {
        handleVisibilityChange();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Combined CRM and Phone Device Contacts
  const allCombinedContacts = useMemo(() => {
    const list: any[] = [];
    const seenPhones = new Set<string>();

    // 1. First add CRM contacts (Customers and Leads)
    if (Array.isArray(contacts)) {
      contacts.forEach(c => {
        if (!c) return;
        list.push(c);
        const clean = String(c.phone || '').replace(/\D/g, '').slice(-10);
        if (clean.length >= 7) seenPhones.add(clean);
      });
    }

    // 2. Add Device Phone contacts (skip exact duplicates if already in CRM)
    if (Array.isArray(deviceContacts)) {
      deviceContacts.forEach(dc => {
        if (!dc) return;
        const clean = String(dc.phone || '').replace(/\D/g, '').slice(-10);
        if (clean.length >= 7 && seenPhones.has(clean)) {
          return;
        }
        list.push(dc);
      });
    }

    return list;
  }, [contacts, deviceContacts]);

  // Auto match contact as user types across BOTH CRM and phonebook contacts
  useEffect(() => {
    if (!phoneDigits) {
      setSelectedContact(null);
      return;
    }
    const cleanNum = phoneDigits.replace(/\D/g, '');

    // Check if the currently selected contact still matches cleanNum
    if (selectedContact) {
      const cPhone = String(selectedContact.phone || selectedContact.mobile || '').replace(/\D/g, '');
      const stillMatches = cPhone && (cPhone.includes(cleanNum) || cleanNum.includes(cPhone));
      if (!stillMatches) {
        setSelectedContact(null);
      }
    }

    if (cleanNum.length >= 3 && Array.isArray(allCombinedContacts)) {
      const match = allCombinedContacts.find(c => {
        const cPhone = String(c?.phone || c?.mobile || '').replace(/\D/g, '');
        const cName = String(c?.contactPerson || c?.companyName || c?.name || '').toLowerCase();
        return (cPhone && (cPhone.includes(cleanNum) || cleanNum.includes(cPhone))) || (cleanNum.length >= 3 && cName.includes(phoneDigits.toLowerCase()));
      });
      if (match) {
        setSelectedContact(match);
        const cName = match.contactPerson || match.companyName || match.name || "";
        if (cName && !newLeadName) setNewLeadName(cName);
        const sName = match.shopName || match.companyName || "";
        if (sName && !newLeadShop) setNewLeadShop(sName);
      } else {
        setSelectedContact(null);
      }
    } else if (cleanNum.length < 3) {
      setSelectedContact(null);
    }
  }, [phoneDigits, allCombinedContacts]);

  if (!isOpen) return null;

  const handleVibrate = (duration = 20) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch {}
    }
  };

  const handleDigitClick = (digit: string) => {
    handleVibrate(15);
    setPhoneDigits(prev => prev + digit);
  };

  const handleBackspace = () => {
    handleVibrate(20);
    setPhoneDigits(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    handleVibrate(25);
    setPhoneDigits("");
    setSelectedContact(null);
  };

  const handleCopyNumber = (num: string) => {
    if (!num) return;
    try {
      navigator.clipboard.writeText(num);
      setFeedbackMsg("✓ Phone number copied!");
      setTimeout(() => setFeedbackMsg(""), 2000);
    } catch {}
  };

  const handlePasteNumber = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const clean = text.replace(/[^0-9+*#]/g, "");
          if (clean) {
            setPhoneDigits(clean);
            handleVibrate(20);
            setFeedbackMsg("✓ Number pasted from clipboard!");
            setTimeout(() => setFeedbackMsg(""), 2000);
          }
        }
      }
    } catch (err) {
      console.warn("Could not read clipboard:", err);
    }
  };

  const handleCreateQuickLeadInline = async () => {
    if (!phoneDigits) return;
    setIsSaving(true);
    try {
      const res = await createQuickLead({
        name: newLeadName || `Lead ${phoneDigits.slice(-4)}`,
        shopName: newLeadShop || "Phone Lead",
        whatsappNumber: phoneDigits,
        notes: "Created from Smart Dialer"
      });
      if (res && res.success && res.lead) {
        setSelectedContact({
          id: res.lead.id,
          companyName: res.lead.shopName,
          contactPerson: res.lead.name,
          phone: res.lead.whatsappNumber,
          type: "Lead"
        });
        setShowNewLeadForm(false);
        setFeedbackMsg("✓ Lead created and linked!");
        setTimeout(() => setFeedbackMsg(""), 2500);
      } else {
        setFeedbackMsg("❌ Could not save lead.");
      }
    } catch (e) {
      setFeedbackMsg("❌ Error saving lead.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMatchedContact = (contact: any) => {
    setSelectedContact(contact);
    if (contact?.phone) {
      setPhoneDigits(contact.phone);
    }
    const cName = contact?.companyName || contact?.contactPerson || "";
    if (cName) setNewLeadName(cName);
    const sName = contact?.shopName || contact?.companyName || "";
    if (sName) setNewLeadShop(sName);
  };

  // Helper: Start automatic mic + speech recording during a call
  const startAutoRecording = useCallback(async () => {
    autoRecordChunksRef.current = [];
    autoRecordTranscriptRef.current = '';
    setAutoRecordTranscript('');
    setIsAutoRecording(true);

    // In Native Android app, do NOT use browser getUserMedia mic capture during cellular calls.
    // Android OS automatically mutes browser WebRTC mic input during active phone calls,
    // which records pure silence and overrides real phone call recordings.
    if (isAndroidNativeApp()) {
      startNativeCallRecording(`call-${Date.now()}`);
      return;
    }

    // 1. Web Speech API for live transcript
    const SpeechRec = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Hindi + English + Hinglish
        recognition.onresult = (event: any) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + ' ';
          }
          autoRecordTranscriptRef.current = accumulated.trim();
          setAutoRecordTranscript(accumulated.trim());
        };
        recognition.onerror = () => {};
        recognition.onend = () => {};
        autoRecordSpeechRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn('Auto-record speech init:', e);
      }
    }

    // 2. MediaRecorder for audio blob (used by AI debrief)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = (ev) => { if (ev.data.size > 0) autoRecordChunksRef.current.push(ev.data); };
        mr.start(250);
        autoRecordMediaRef.current = mr;
      }
    } catch (e) {
      console.warn('Auto-record mic init:', e);
    }

    // 3. Native two-way recording if capable
    startNativeCallRecording(`call-${Date.now()}`);
  }, []);

  // Helper: Stop automatic recording and return collected data
  const stopAutoRecording = useCallback((explicitDuration?: number): { transcript: string; audioChunks: Blob[] } => {
    setIsAutoRecording(false);
    stopNativeCallRecording();

    // Stop speech
    if (autoRecordSpeechRef.current) {
      try { autoRecordSpeechRef.current.stop(); } catch {}
      autoRecordSpeechRef.current = null;
    }

    // Stop MediaRecorder
    if (autoRecordMediaRef.current && autoRecordMediaRef.current.state !== 'inactive') {
      try {
        autoRecordMediaRef.current.stop();
        autoRecordMediaRef.current.stream?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      } catch {}
    }
    autoRecordMediaRef.current = null;

    const transcript = autoRecordTranscriptRef.current || '';
    const chunks = [...autoRecordChunksRef.current];
    lastRecordedChunksRef.current = chunks;
    autoRecordChunksRef.current = [];
    autoRecordTranscriptRef.current = '';

    // In Android Native app, cellular call recording is retrieved from device/MediaStore upon hangup.
    // Ignore any browser-level audio chunks.
    if (isAndroidNativeApp()) {
      return { transcript, audioChunks: [] };
    }

    if (chunks.length > 0) {
      try {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          if (res && res.length > 100) {
            setRecordingUrl(res);
            // Automatically invoke Gemini AI transcription on the recorded audio!
            handleTranscribeAudioRef.current?.(res, explicitDuration);
          }
        };
        reader.readAsDataURL(audioBlob);
      } catch (e) {
        console.warn("Auto-record blob conversion notice:", e);
      }
    }

    return { transcript, audioChunks: chunks };
  }, []);

  // Cleanup auto-record on dialer close
  useEffect(() => {
    if (!isOpen && isAutoRecording) {
      stopAutoRecording();
    }
  }, [isOpen, isAutoRecording, stopAutoRecording]);

  // Trigger Phone Call & Switch to Post-Call Session
  const handleInitiateCall = (targetPhone?: string, targetContact?: any) => {
    const numberToCall = targetPhone || phoneDigits;
    const cleanNum = formatPhoneNumberForCall(numberToCall);
    if (!cleanNum) {
      setFeedbackMsg("⚠️ Please enter a valid phone number to call.");
      return;
    }

    if (targetPhone) setPhoneDigits(targetPhone);
    if (targetContact) {
      setSelectedContact(targetContact);
      const cName = targetContact?.companyName || targetContact?.contactPerson || "";
      if (cName) setNewLeadName(cName);
      const sName = targetContact?.shopName || targetContact?.companyName || "";
      if (sName) setNewLeadShop(sName);
    }

    handleVibrate(30);

    const now = Date.now();
    callStartTimeRef.current = now;
    setCallDurationSec(0);
    setIsTimerRunning(true);
    isCallInitiatedRef.current = true;
    setCallStatus("Connected");
    setCallType("OUTBOUND");

    setRecordingUrl("");
    setAutoRecordTranscript("");
    setCallSummary("");

    // Start auto-recording if enabled
    if (autoRecordEnabled) {
      startAutoRecording();
    }

    // Grant App Lock exemption & trigger SIM cellular call
    const targetContactName = targetContact?.companyName || targetContact?.contactPerson || selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "";
    if (typeof window !== "undefined") {
      (window as any).grantAppLockExemption?.(300);
      try {
        (window as any).AndroidNative?.clearLastCallRecording?.();
      } catch (e) {}
      const targetSub = selectedSim?.subscriptionId != null && selectedSim.subscriptionId > 0 ? selectedSim.subscriptionId : 1;
      const targetSlot = selectedSim?.slotIndex != null && selectedSim.slotIndex >= 0 ? selectedSim.slotIndex : 0;
      makeDirectCellularCall(cleanNum, targetSub, targetContactName, targetSlot);
    }

    // Switch to post-call maintenance view
    const recMsg = autoRecordEnabled ? " ⏺ Auto-recording your voice notes." : "";
    setActiveTab("POST_CALL");
    setFeedbackMsg(`📞 Outbound call dialed. Live stopwatch active.${recMsg}`);
  };

  // Handle connection status toggle — immediately reset duration to 0 if not connected
  const handleCallStatusChange = (newStatus: string) => {
    setCallStatus(newStatus);
    if (newStatus !== "Connected" && newStatus !== "Completed") {
      setCallDurationSec(0);
      setIsTimerRunning(false);
      callStartTimeRef.current = null;
      if (newStatus === "Busy" || newStatus === "No Answer") {
        setOutcome("No Answer / Busy");
      }
    }
  };

  // WhatsApp Message
  const handleInitiateWhatsApp = (customText?: string, targetPhone?: string) => {
    const rawNum = targetPhone || phoneDigits;
    const cleanNum = (rawNum || '').replace(/\D/g, '');
    if (!cleanNum) {
      setFeedbackMsg("⚠️ Please enter a phone number before opening WhatsApp.");
      return;
    }
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    const textParam = customText ? `?text=${encodeURIComponent(customText)}` : '';
    if (typeof window !== "undefined") {
      window.open(`https://wa.me/${formatted}${textParam}`, '_blank');
    }
  };

  // Append discussion tag
  const handleAddTag = (tag: string) => {
    setNotes(prev => (prev ? `${prev}, ${tag}` : tag));
  };

  // Toggle Speech to Text
  const toggleSpeechRecognition = () => {
    const SpeechRec = (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    if (!SpeechRec) {
      setFeedbackMsg("⚠️ Speech recognition is not supported on this device/browser.");
      return;
    }

    if (isListeningSpeech) {
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      setIsListeningSpeech(false);
      return;
    }

    try {
      (window as any).grantAppLockExemption?.(180);
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => setIsListeningSpeech(true);
      recognition.onerror = () => setIsListeningSpeech(false);
      recognition.onend = () => setIsListeningSpeech(false);

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setNotes(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech rec error:", err);
      setIsListeningSpeech(false);
    }
  };

  // Attach Audio File from phone storage (e.g. Xiaomi OEM call recorder)
  const handleAttachAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setRecordingUrl(base64Data);
        try {
          const tempAudio = new Audio();
          tempAudio.src = base64Data;
          tempAudio.onloadedmetadata = () => {
            const d = Math.round(tempAudio.duration);
            if (d > 0 && !isNaN(d) && isFinite(d)) {
              setCallDurationSec(d);
            }
          };
        } catch (e) {}
        setFeedbackMsg("📁 Audio recording attached! Transcribing with Gemini AI...");
        await handleTranscribeAudioRef.current?.(base64Data, callDurationSec);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("Error reading attached audio:", err);
    }
  };

  // Save Call Record & Maintain CRM Lead
  const handleSaveCallRecord = async () => {
    setIsSaving(true);
    setFeedbackMsg("");
    handleVibrate(25);

    try {
      const cleanPhone = (phoneDigits || "").replace(/\D/g, "");
      let activeLeadId: string | null = null;
      let activeCustomerId: string | null = null;

      // 1. If a contact is explicitly matched and selected, ensure the phone actually matches
      if (selectedContact) {
        const cPhone = String(selectedContact.phone || selectedContact.mobile || "").replace(/\D/g, "");
        const isMatch = !cleanPhone || !cPhone || cPhone.includes(cleanPhone) || cleanPhone.includes(cPhone) || (cleanPhone.length >= 7 && cPhone.slice(-10) === cleanPhone.slice(-10));
        if (isMatch) {
          if (selectedContact.type === "Customer") activeCustomerId = selectedContact.id;
          else if (selectedContact.type === "Lead") activeLeadId = selectedContact.id;
        }
      } 
      // 2. Only fall back to initial IDs if the dialed digits actually match the initial phone
      else if (initialPhone && cleanPhone) {
        const initClean = String(initialPhone).replace(/\D/g, "");
        const matchesInit = initClean && (initClean.includes(cleanPhone) || cleanPhone.includes(initClean) || (cleanPhone.length >= 7 && initClean.slice(-10) === cleanPhone.slice(-10)));
        if (matchesInit) {
          if (initialCustomerId) activeCustomerId = initialCustomerId;
          if (initialLeadId) activeLeadId = initialLeadId;
        }
      }

      if (!activeCustomerId && !activeLeadId && (newLeadName || newLeadShop) && cleanPhone.length >= 7) {
        const leadRes = await createQuickLead({
          name: newLeadName || "New Phone Lead",
          shopName: newLeadShop || "Phone Inquiry",
          whatsappNumber: phoneDigits,
          notes: `Created from Phone Dialer call (${outcome}) - Duration: ${callDurationSec}s`
        });
        if (leadRes && leadRes.success && leadRes.lead) {
          activeLeadId = leadRes.lead.id;
        }
      }

      // Encode auto-recorded audio chunks to Base64 URL if recordingUrl not already set
      let finalRecordingUrl = recordingUrl;
      if (!finalRecordingUrl && lastRecordedChunksRef.current && lastRecordedChunksRef.current.length > 0) {
        try {
          const audioBlob = new Blob(lastRecordedChunksRef.current, { type: "audio/webm" });
          finalRecordingUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(audioBlob);
          });
        } catch (e) {
          console.warn("Error encoding audio blob:", e);
        }
      }

      const formData = new FormData();
      if (activeCustomerId) formData.append("customerId", activeCustomerId);
      if (activeLeadId) formData.append("leadId", activeLeadId);
      formData.append("phone", phoneDigits);
      formData.append("newLeadName", newLeadName);
      formData.append("newLeadShop", newLeadShop);
      formData.append("type", callType);
      formData.append("status", callStatus);
      formData.append("outcome", outcome);
      formData.append("durationSec", String(callDurationSec));
      formData.append("notes", notes);
      if (finalRecordingUrl) formData.append("recordingUrl", finalRecordingUrl);
      const effectiveSummary = callSummary || autoRecordTranscriptRef.current || autoRecordTranscript;
      if (effectiveSummary) formData.append("summary", effectiveSummary);

      const compiledFollowUp = getCompiledFollowUpDate();
      if (compiledFollowUp) {
        formData.append("followUpDate", compiledFollowUp);
      }

      const res = await logCall(formData);
      setIsSaving(false);

      if (res && res.success) {
        setIsTimerRunning(false);
        setFeedbackMsg("✅ Call & Tasks successfully logged to CRM!");
        loadRecentCalls();

        setTimeout(() => {
          setActiveTab("CALL_LOGS");
          setFeedbackMsg("");
        }, 800);
      } else {
        setFeedbackMsg(`❌ ${res?.error || "Failed to log call record. Please try again."}`);
      }
    } catch (err: any) {
      console.warn("Dialer save error:", err);
      setIsSaving(false);
      setFeedbackMsg("❌ Error saving call record. Check connection and retry.");
    }
  };

  // Filter contacts dropdown in keypad — matches across BOTH CRM and Phone contacts!
  const filteredKeypadContacts = useMemo(() => {
    if (!phoneDigits || !Array.isArray(allCombinedContacts)) return [];
    const q = phoneDigits.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    return allCombinedContacts.filter(c => {
      const cPhone = (c?.phone || c?.mobile || '').replace(/\D/g, '');
      const cName = (c?.contactPerson || c?.companyName || c?.name || '').toLowerCase();
      const cComp = (c?.companyName || c?.shopName || '').toLowerCase();
      const phoneMatch = cleanQ.length > 0 && cPhone.includes(cleanQ);
      const nameMatch = q.length > 0 && (cName.includes(q) || cComp.includes(q));
      return phoneMatch || nameMatch;
    }).slice(0, 4);
  }, [allCombinedContacts, phoneDigits]);

  // Filtered Call Logs list
  const filteredCallLogs = useMemo(() => {
    if (!Array.isArray(recentCalls)) return [];
    return recentCalls.filter(c => {
      if (!c) return false;
      if (callLogSearch) {
        const q = callLogSearch.trim().toLowerCase();
        const cleanQ = q.replace(/\D/g, '');
        const matchName = (c.contactName || "").toLowerCase().includes(q);
        const matchPerson = (c.contactPerson || "").toLowerCase().includes(q);
        const matchPhone = cleanQ.length > 0 ? (c.phoneNumber || "").replace(/\D/g, '').includes(cleanQ) : false;
        if (!matchName && !matchPerson && !matchPhone) return false;
      }
      if (callLogFilter === "CONNECTED") return c.status === "Connected" || (c.durationSec || 0) > 0;
      if (callLogFilter === "MISSED") return c.status !== "Connected" && (c.durationSec || 0) === 0;
      if (callLogFilter === "OUTBOUND") return c.type === "OUTBOUND";
      if (callLogFilter === "INBOUND") return c.type === "INBOUND";
      return true;
    });
  }, [recentCalls, callLogSearch, callLogFilter]);

  // Filtered Contacts list
  const filteredContacts = useMemo(() => {
    if (!Array.isArray(allCombinedContacts)) return [];
    return allCombinedContacts.filter(c => {
      if (!c) return false;
      if (contactSearch) {
        const q = contactSearch.trim().toLowerCase();
        const cleanQ = q.replace(/\D/g, '');
        const matchName = (c.contactPerson || "").toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q);
        const matchComp = (c.companyName || "").toLowerCase().includes(q) || (c.shopName || "").toLowerCase().includes(q);
        const matchPhone = cleanQ.length > 0 ? (c.phone || c.mobile || "").replace(/\D/g, '').includes(cleanQ) : false;
        if (!matchName && !matchComp && !matchPhone) return false;
      }
      if (contactFilter === "CUSTOMER") return c.type === "Customer";
      if (contactFilter === "LEAD") return c.type === "Lead";
      if (contactFilter === "DEVICE") return c.type === "DeviceContact";
      return true;
    });
  }, [allCombinedContacts, contactSearch, contactFilter]);

  // Counts breakdown for directory filter badges
  const contactCounts = useMemo(() => {
    let customers = 0;
    let leads = 0;
    let phoneContacts = 0;
    allCombinedContacts.forEach(c => {
      if (c.type === "Customer") customers++;
      else if (c.type === "Lead") leads++;
      else if (c.type === "DeviceContact") phoneContacts++;
    });
    return { all: allCombinedContacts.length, customers, leads, phoneContacts };
  }, [allCombinedContacts]);

  return (
    <div className="dialer-backdrop" onClick={onClose}>
      <div className="dialer-sheet" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="dialer-header">
          <div className="dialer-title-box">
            <div className="dialer-icon-badge">
              <PhoneCall size={20} />
            </div>
            <div className="dialer-title-text">
              <h3>
                <span>TeleCRM Smart Dialer</span>
                <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: "10px", backgroundColor: "#ecfdf5", color: "#047857", fontWeight: 800, border: "1px solid #a7f3d0" }}>
                  GSM ACTIVE
                </span>
              </h3>
              <span>Enterprise Voice · Dual-SIM · AI Debrief</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="dialer-close-btn" title="Close Dialer (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* NAVIGATION TABS BAR */}
        <div className="dialer-tabs-bar">
          <button
            type="button"
            className={`dialer-tab-pill ${activeTab === "DIALPAD" ? "active" : ""}`}
            onClick={() => setActiveTab("DIALPAD")}
          >
            <Grid size={14} /> Keypad
          </button>
          <button
            type="button"
            className={`dialer-tab-pill ${activeTab === "CALL_LOGS" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("CALL_LOGS");
              loadRecentCalls();
            }}
          >
            <History size={14} /> Logs
            {recentCalls.length > 0 && <span className="dialer-count-badge">{recentCalls.length}</span>}
          </button>
          <button
            type="button"
            className={`dialer-tab-pill ${activeTab === "CONTACTS" ? "active" : ""}`}
            onClick={() => setActiveTab("CONTACTS")}
          >
            <Users size={14} /> Contacts
          </button>
          <button
            type="button"
            className={`dialer-tab-pill ${activeTab === "POST_CALL" ? "active" : ""}`}
            onClick={() => setActiveTab("POST_CALL")}
          >
            <Clock size={14} /> Log Call
          </button>
          <button
            type="button"
            className={`dialer-tab-pill ${activeTab === "WHATSAPP" ? "active" : ""}`}
            onClick={() => setActiveTab("WHATSAPP")}
          >
            <MessageSquare size={14} /> WhatsApp
          </button>
          <button
            type="button"
            className={`dialer-tab-pill ${activeTab === "SCRIPTS" ? "active" : ""}`}
            onClick={() => setActiveTab("SCRIPTS")}
          >
            <BookOpen size={14} /> Scripts
          </button>
        </div>

        {/* FEEDBACK MSG TOAST */}
        {feedbackMsg && (
          <div className="dialer-feedback-toast">
            <span>{feedbackMsg}</span>
            <button type="button" onClick={() => setFeedbackMsg("")} className="dialer-toast-close">
              <X size={14} />
            </button>
          </div>
        )}

        {/* BODY SCROLL CONTENT */}
        <div className={`dialer-body-scroll ${activeTab === "DIALPAD" ? "dialpad-tab-active" : ""}`}>
          {/* =========================================================
              TAB 1: NUMERIC KEYPAD & DIALER
              ========================================================= */}
          {/* =========================================================
              TAB 1: NUMERIC KEYPAD & DIALER (MODERN REDESIGN)
              ========================================================= */}
          {activeTab === "DIALPAD" && (
            <div className="dialpad-container">
              {/* TOP SCREEN ZONE: Digits, Smart Canvas, and Meta Controls */}
              <div className="dialer-screen-zone">
                {/* Phone Display Box */}
                <div className="dialer-display-box">
                  <input
                    type="text"
                    inputMode="none"
                    className="dialer-digits-input"
                    placeholder="Enter phone number"
                    value={phoneDigits}
                    onChange={() => {/* controlled via keypad buttons only */}}
                    readOnly
                    tabIndex={-1}
                    style={{ caretColor: "transparent", cursor: "default", userSelect: "none" }}
                  />
                  {phoneDigits && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setPhoneDigits("");
                        setSelectedContact(null);
                        setShowNewLeadForm(false);
                      }}
                      className="dialer-backspace-btn"
                      title="Tap to delete, hold to clear all"
                    >
                      <Delete size={18} />
                    </button>
                  )}
                </div>

                {/* SMART CANVAS: Dynamic context that fills the middle without awkward gaps */}
                <div className="dialer-smart-canvas">
                  {selectedContact ? (
                    /* 1. Matched Contact Card */
                    <div className="dialer-contact-card-premium">
                      <div className="dialer-contact-card-avatar">
                        {(selectedContact.companyName || selectedContact.contactPerson || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="dialer-contact-card-details">
                        <div className="dialer-contact-card-name">
                          {selectedContact.companyName || selectedContact.contactPerson}
                        </div>
                        <div className="dialer-contact-card-meta">
                          <span className={`dialer-pill-badge ${selectedContact.type === "Customer" ? "customer" : "lead"}`}>
                            {selectedContact.type || "Contact"}
                          </span>
                          <span className="dialer-contact-card-phone">{selectedContact.phone}</span>
                          {selectedContact.city && <span>· {selectedContact.city}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedContact(null)}
                        className="dialer-contact-card-dismiss"
                        title="Clear Contact Match"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : phoneDigits.length >= 3 && filteredKeypadContacts.length > 0 ? (
                    /* 2. Multiple Contact Search Matches */
                    <div className="dialer-suggestions-box">
                      <div className="dialer-suggestions-header">Matching Contacts ({filteredKeypadContacts.length}):</div>
                      <div className="dialer-suggestions-list">
                        {filteredKeypadContacts.map((c: any) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectMatchedContact(c)}
                            className="dialer-suggestion-row"
                          >
                            <div className="dialer-suggestion-avatar">
                              {(c.companyName || c.contactPerson || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className="dialer-suggestion-info">
                              <span className="dialer-suggestion-name">{c.companyName || c.contactPerson}</span>
                              <span className="dialer-suggestion-phone">{c.phone}</span>
                            </div>
                            <span className={`dialer-pill-badge ${c.type === "Customer" ? "customer" : c.type === "Lead" ? "lead" : "device"}`}>
                              {c.type === "DeviceContact" ? "📱 Phone" : c.type || "Contact"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInitiateCall(c.phone, c);
                              }}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "8px",
                                backgroundColor: "#10b981",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: "auto",
                                flexShrink: 0
                              }}
                              title="Call Now"
                            >
                              <PhoneCall size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : phoneDigits.length >= 3 ? (
                    /* 3. Unsaved Number Card / Inline Quick Lead Form */
                    <div className="dialer-unsaved-card">
                      {!showNewLeadForm ? (
                        <>
                          <div className="dialer-unsaved-header">
                            <div className="dialer-unsaved-left">
                              <div className="dialer-unsaved-dot" />
                              <span>Unsaved Number · Direct Dial</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowNewLeadForm(true)}
                              className="dialer-add-lead-btn"
                            >
                              <UserPlus size={12} /> Add Lead
                            </button>
                          </div>
                          <div className="dialer-unsaved-actions">
                            <button
                              type="button"
                              onClick={() => handleInitiateWhatsApp()}
                              className="dialer-chip-action wa"
                            >
                              <MessageSquare size={13} /> WhatsApp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber(phoneDigits)}
                              className="dialer-chip-action copy"
                            >
                              <Copy size={13} /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("POST_CALL")}
                              className="dialer-chip-action log"
                            >
                              <Clock size={13} /> Log Note
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Inline Quick Save Lead Form */
                        <div className="dialer-quick-lead-form">
                          <div className="dialer-quick-lead-title">
                            <span>⚡ Quick Save New Lead</span>
                            <button type="button" onClick={() => setShowNewLeadForm(false)}>
                              <X size={14} />
                            </button>
                          </div>
                          <div className="dialer-quick-lead-inputs">
                            <input
                              type="text"
                              placeholder="Name (e.g. Ramesh)"
                              value={newLeadName}
                              onChange={(e) => setNewLeadName(e.target.value)}
                              className="dialer-quick-input"
                            />
                            <input
                              type="text"
                              placeholder="Shop / Business Name"
                              value={newLeadShop}
                              onChange={(e) => setNewLeadShop(e.target.value)}
                              className="dialer-quick-input"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateQuickLeadInline}
                            disabled={isSaving}
                            className="dialer-quick-save-btn"
                          >
                            <Check size={13} /> {isSaving ? "Saving..." : "Save to CRM"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 4. Empty Digits: Recent Speed Dial & Fast Actions */
                    <div className="dialer-recent-speed-dial">
                      <div className="dialer-speed-dial-header">
                        <span>Recent Activity</span>
                        <button
                          type="button"
                          onClick={handlePasteNumber}
                          className="dialer-paste-btn"
                          title="Paste from clipboard"
                        >
                          <Clipboard size={11} /> Paste Number
                        </button>
                      </div>
                      <div className="dialer-speed-dial-chips">
                        {recentCalls.slice(0, 3).map((c: any) => {
                          const display = c.contactName || c.contactPerson || c.phoneNumber || "Direct";
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                const num = c.phoneNumber || c.phone || "";
                                if (num) {
                                  setPhoneDigits(num);
                                  handleVibrate(15);
                                }
                              }}
                              className="dialer-speed-chip"
                            >
                              <div className="dialer-speed-avatar">
                                {display.charAt(0).toUpperCase()}
                              </div>
                              <div className="dialer-speed-text">
                                <span className="dialer-speed-name">{display}</span>
                                <span className="dialer-speed-phone">{c.phoneNumber || c.phone}</span>
                              </div>
                            </div>
                          );
                        })}
                        {recentCalls.length === 0 && (
                          <span style={{ fontSize: "0.74rem", color: "var(--dialer-text-sub)", padding: "4px 0" }}>
                            Dial any number or choose from Contacts.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* CELLULAR SIM SELECTOR & REC ENGINE BAR */}
                <div className="dialer-meta-bar">
                  {availableSims.length > 1 ? (
                    <div className="dialer-sim-pill-group">
                      {availableSims.map((sim, idx) => {
                        const simId = sim?.subscriptionId ?? idx;
                        const isSelected = (selectedSim?.subscriptionId != null && selectedSim.subscriptionId === sim?.subscriptionId)
                          || (selectedSim?.slotIndex != null && selectedSim.slotIndex === sim?.slotIndex);
                        return (
                          <button
                            key={simId}
                            type="button"
                            onClick={() => {
                              handleVibrate(20);
                              setSelectedSim(sim);
                              if (typeof window !== "undefined") {
                                try {
                                  if (sim?.subscriptionId != null) localStorage.setItem("crm_preferred_sim_id", String(sim.subscriptionId));
                                  if (sim?.slotIndex != null) localStorage.setItem("crm_preferred_sim_slot", String(sim.slotIndex));
                                } catch {}
                              }
                            }}
                            className={`dialer-sim-switch-pill ${isSelected ? "active" : ""}`}
                          >
                            <Radio size={11} />
                            <span>{sim?.slotLabel || `SIM ${idx + 1}`}: {sim?.carrierName || sim?.displayName || "Carrier"}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : availableSims.length === 1 ? (
                    <div className="dialer-sim-single-badge">
                      <Radio size={11} style={{ color: "var(--dialer-accent)" }} />
                      <span>{availableSims[0]?.carrierName || availableSims[0]?.displayName || "Cellular"} ({availableSims[0]?.slotLabel || "SIM 1"})</span>
                    </div>
                  ) : null}

                  {/* Auto-Record Toggle & Status */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!autoRecordEnabled) setShowRecordConsentDialog(true);
                      else {
                        setAutoRecordEnabled(false);
                        try { localStorage.setItem('crm_auto_record_calls', 'false'); } catch {}
                      }
                    }}
                    className={`dialer-rec-pill ${autoRecordEnabled ? "active" : ""}`}
                    title="Toggle Call Auto-Recording"
                  >
                    <span className={`dialer-rec-dot ${autoRecordEnabled ? "pulse" : ""}`} />
                    <span>{autoRecordEnabled ? "Auto-Record: ON" : "Auto-Record: OFF"}</span>
                  </button>
                </div>
              </div>

              {/* DOCKED KEYPAD & ACTIONS (Sleek Circular Buttons, Zero Gap) */}
              <div className="dialer-keypad-dock">
                {/* Keypad Grid */}
                <div className="dialer-keypad-grid">
                  {DIALPAD_KEYS.map((k) => (
                    <button
                      key={k.digit}
                      type="button"
                      className="dialer-key-btn"
                      onClick={() => handleDigitClick(k.digit)}
                      onContextMenu={(e) => {
                        if (k.digit === "0") {
                          e.preventDefault();
                          handleDigitClick("+");
                        }
                      }}
                    >
                      <span className="dialer-key-digit">{k.digit}</span>
                      {k.sub && <span className="dialer-key-sub">{k.sub}</span>}
                    </button>
                  ))}
                </div>

                {/* Actions Dock */}
                <div className="dialer-actions-dock">
                  <button
                    type="button"
                    className="dialer-wa-btn"
                    onClick={() => handleInitiateWhatsApp()}
                    title="Open WhatsApp Chat"
                  >
                    <MessageSquare size={22} />
                  </button>

                  <button
                    type="button"
                    className="dialer-call-btn"
                    onClick={() => handleInitiateCall()}
                    title="Call Now"
                  >
                    <PhoneCall size={28} />
                  </button>

                  <button
                    type="button"
                    className="dialer-schedule-btn"
                    onClick={() => setActiveTab("POST_CALL")}
                    title="Log Call / Follow-up"
                  >
                    <Clock size={20} />
                  </button>
                </div>

                {/* Carrier Subtitle */}
                <div className="dialer-carrier-subtitle">
                  Calling via {selectedSim?.carrierName || selectedSim?.displayName || "Cellular"} ({selectedSim?.slotLabel || "SIM 1"})
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: REDESIGNED CLEAN LOG CALL / POST-CALL WORKSPACE
              ========================================================= */}
          {activeTab === "POST_CALL" && (
            <div className="dialer-postcall-container">
              {/* CARD 1: CONTACT IDENTITY & CRM LEAD DETAILS */}
              <div className="dialer-postcall-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="dialer-postcall-header-avatar">
                      {((newLeadName || selectedContact?.companyName || selectedContact?.contactPerson || "L")[0] || "L").toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--dialer-text-main, #0f172a)" }}>
                          {selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "Direct Call"}
                        </span>
                        <span style={{
                          fontSize: "0.62rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: selectedContact?.type === "Customer" ? "#e0e7ff" : selectedContact?.type === "Lead" ? "#fef3c7" : "#dcfce7",
                          color: selectedContact?.type === "Customer" ? "#3730a3" : selectedContact?.type === "Lead" ? "#92400e" : "#15803d",
                          fontWeight: 700
                        }}>
                          {selectedContact?.type === "DeviceContact" ? "📱 Phonebook" : selectedContact?.type || "New Lead"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--dialer-text-sub, #64748b)", fontFamily: "monospace", marginTop: "2px" }}>
                        {phoneDigits || selectedContact?.phone || "No phone entered"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {phoneDigits && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleInitiateWhatsApp()}
                          className="dialer-mini-action-btn wa"
                          title="WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInitiateCall()}
                          className="dialer-mini-action-btn call"
                          title="Re-dial"
                        >
                          <PhoneCall size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Editable Lead Name and Shop Name Input Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--dialer-text-sub, #475569)", marginBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={12} style={{ color: "#4f46e5" }} /> Lead Name *
                    </label>
                    <input
                      type="text"
                      className="dialer-text-input"
                      style={{ height: "36px", fontSize: "0.82rem", fontWeight: 600 }}
                      placeholder="e.g. Rahul Sharma"
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--dialer-text-sub, #475569)", marginBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Store size={12} style={{ color: "#4f46e5" }} /> Shop / Business
                    </label>
                    <input
                      type="text"
                      className="dialer-text-input"
                      style={{ height: "36px", fontSize: "0.82rem", fontWeight: 600 }}
                      placeholder="e.g. Sharma Hardware"
                      value={newLeadShop}
                      onChange={(e) => setNewLeadShop(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: CALL STATUS & TALK DURATION */}
              <div className="dialer-postcall-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="dialer-field-label" style={{ margin: 0 }}>Call Connection Status</label>
                  <div className="dialer-segment-group" style={{ height: "28px" }}>
                    <button
                      type="button"
                      className={`dialer-segment-btn ${callType === "OUTBOUND" ? "active" : ""}`}
                      onClick={() => setCallType("OUTBOUND")}
                      style={{ padding: "0 8px", fontSize: "0.72rem" }}
                    >
                      <PhoneOutgoing size={11} /> Out
                    </button>
                    <button
                      type="button"
                      className={`dialer-segment-btn ${callType === "INBOUND" ? "active" : ""}`}
                      onClick={() => setCallType("INBOUND")}
                      style={{ padding: "0 8px", fontSize: "0.72rem" }}
                    >
                      <PhoneIncoming size={11} /> In
                    </button>
                  </div>
                </div>

                {/* 4 Interactive Status Chips */}
                <div className="dialer-status-chips-grid">
                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "Completed" || callStatus === "Connected" ? "active-completed" : ""}`}
                    onClick={() => {
                      setCallStatus("Completed");
                      if (callDurationSec === 0) setCallDurationSec(30);
                    }}
                  >
                    <span>🟢 Talked</span>
                    <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Connected</span>
                  </button>

                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "Busy" ? "active-busy" : ""}`}
                    onClick={() => handleCallStatusChange("Busy")}
                  >
                    <span>🔴 Busy</span>
                    <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Engaged</span>
                  </button>

                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "No Answer" ? "active-noanswer" : ""}`}
                    onClick={() => handleCallStatusChange("No Answer")}
                  >
                    <span>🟡 No Answer</span>
                    <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Missed</span>
                  </button>

                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "Callback" ? "active-callback" : ""}`}
                    onClick={() => handleCallStatusChange("Callback")}
                  >
                    <span>🟣 Callback</span>
                    <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Call later</span>
                  </button>
                </div>

                {/* Talk Duration - Only if status is Connected or Completed */}
                {(callStatus === "Completed" || callStatus === "Connected") ? (
                  <div className="dialer-stopwatch-box">
                    <div>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                        Talk Duration
                      </span>
                      <div className="dialer-stopwatch-digits">
                        {isTimerRunning && <span className="dialer-pulse-dot" />}
                        <span>{formatDuration(callDurationSec)}</span>
                        {isTimerRunning && (
                          <span style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 700, background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setCallDurationSec(prev => Math.max(0, prev - 15))}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                        title="Minus 15s"
                      >
                        -15s
                      </button>
                      <button
                        type="button"
                        onClick={() => setCallDurationSec(prev => prev + 15)}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                        title="Plus 15s"
                      >
                        +15s
                      </button>
                      {isTimerRunning ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cur = callDurationSec;
                            setIsTimerRunning(false);
                            callStartTimeRef.current = null;
                            if (cur > 0) setCallStatus("Completed");
                            if (isAutoRecording) stopAutoRecording(cur);
                            setAutoDebriefTrigger(Date.now());
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <PhoneOff size={12} /> End Talk
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            callStartTimeRef.current = Date.now() - (callDurationSec * 1000);
                            setIsTimerRunning(true);
                            setCallStatus("Connected");
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            backgroundColor: "#f0fdf4",
                            color: "#16a34a",
                            border: "1px solid #bbf7d0",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Play size={12} /> Resume
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    marginTop: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    backgroundColor: "var(--dialer-bg-subtle, #f8fafc)",
                    border: "1px dashed var(--dialer-border, #cbd5e1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <span style={{ fontSize: "0.76rem", color: "var(--dialer-text-sub, #64748b)", fontWeight: 600 }}>
                      Talk Duration: <strong style={{ color: "#ef4444" }}>00:00 (Not Connected)</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCallStatus("Completed");
                        setCallDurationSec(30);
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "#4f46e5",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      + Add Talk Time
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 3: CALL OUTCOME & FOLLOW-UP TASK */}
              <div className="dialer-postcall-card">
                <div style={{ marginBottom: "10px" }}>
                  <label className="dialer-field-label">Call Outcome / Disposition</label>
                  <select
                    className="dialer-select-input"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    style={{ height: "38px", fontSize: "0.82rem", fontWeight: 600 }}
                  >
                    {DEFAULT_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                {/* Follow-up Task */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={13} style={{ color: "#4f46e5" }} /> Next Follow-up Task
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setQuickFollowUp(1, 11, 0, "AM")}
                        style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", fontWeight: 700, cursor: "pointer" }}
                      >
                        Tomorrow 11 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickFollowUp(2, 11, 0, "AM")}
                        style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", fontWeight: 700, cursor: "pointer" }}
                      >
                        In 2 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickFollowUp(-1, 0, 0, "AM")}
                        style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#94a3b8", cursor: "pointer" }}
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "8px" }}>
                    <input
                      type="date"
                      className="dialer-text-input"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: "4px" }}>
                      <select
                        className="dialer-select-input"
                        style={{ flex: 1, padding: "6px 4px" }}
                        value={followUpHour}
                        onChange={(e) => setFollowUpHour(e.target.value)}
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        className="dialer-select-input"
                        style={{ flex: 1, padding: "6px 4px" }}
                        value={followUpMinute}
                        onChange={(e) => setFollowUpMinute(e.target.value)}
                      >
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setFollowUpPeriod(prev => prev === "AM" ? "PM" : "AM")}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#ffffff",
                          fontWeight: 800,
                          fontSize: "0.74rem",
                          color: "#4f46e5",
                          cursor: "pointer"
                        }}
                      >
                        {followUpPeriod}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: DISCUSSION NOTES & TAGS */}
              <div className="dialer-postcall-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="dialer-field-label" style={{ margin: 0 }}>
                    Discussion Notes
                  </label>
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    style={{
                      background: isListeningSpeech ? "#fee2e2" : "#f1f5f9",
                      border: "none",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      color: isListeningSpeech ? "#dc2626" : "#4f46e5",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Mic size={12} /> {isListeningSpeech ? "Listening..." : "Dictate"}
                  </button>
                </div>
                <textarea
                  className="dialer-textarea-input"
                  rows={2}
                  placeholder="Key discussion points, customer requirements, pricing quotes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {/* Tag chips */}
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                  {DISCUSSION_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="dialer-tag-chip"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD 5: 🎙️ RECORDING ATTACHMENT & PREVIEW */}
              <div className="dialer-postcall-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: recordingUrl ? "8px" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Volume2 size={16} color={recordingUrl ? "#15803d" : "#64748b"} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: recordingUrl ? "#15803d" : "#334155" }}>
                      {recordingUrl ? "🎙️ Call Recording Attached" : "Call Audio Recording"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const phoneParam = phoneDigitsRef.current || selectedContactRef.current?.phone || "";
                          const nameParam = selectedContactRef.current?.companyName || selectedContactRef.current?.contactPerson || newLeadName || "";
                          const audioData = (window as any).AndroidNative?.getLastCallRecording?.(phoneParam, nameParam, callDurationSec)
                            || (window as any).AndroidNative?.getLastCallRecording?.(phoneParam);
                          if (audioData && typeof audioData === "string" && audioData.startsWith("data:audio") && audioData.length > 500) {
                            const nativeDur = (window as any).AndroidNative?.getLastCallDuration?.() || 0;
                            if (nativeDur > 0) {
                              setCallDurationSec(nativeDur);
                              setCallStatus("Completed");
                            }
                            setRecordingUrl(audioData);
                            setFeedbackMsg("✅ Found call recording from phone! Transcribing with Gemini AI...");
                            handleTranscribeAudioRef.current?.(audioData, nativeDur > 0 ? nativeDur : callDurationSec);
                          } else {
                            const hasPerm = (window as any).AndroidNative?.hasAllFilesPermission?.();
                            if (hasPerm === false) {
                              setFeedbackMsg("⚠️ Storage permission required. Please allow All Files Access.");
                              (window as any).AndroidNative?.requestAllFilesPermission?.();
                            } else {
                              setFeedbackMsg("ℹ️ No recent recording found for this contact yet. Ensure auto-recording is ON in Phone Settings.");
                            }
                          }
                        } catch {
                          setFeedbackMsg("Tap 'Attach File' to select your call recording.");
                        }
                      }}
                      style={{
                        fontSize: "0.72rem",
                        padding: "4px 8px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        color: "#0f172a",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <RotateCcw size={12} /> Scan Phone
                    </button>
                    <label
                      style={{
                        fontSize: "0.72rem",
                        padding: "4px 8px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        color: "#4f46e5",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Upload size={12} /> {recordingUrl ? "Replace" : "Attach File"}
                      <input
                        type="file"
                        accept="audio/*"
                        style={{ display: "none" }}
                        onChange={handleAttachAudioFile}
                      />
                    </label>
                  </div>
                </div>

                {recordingUrl ? (
                  <div style={{ marginTop: "6px" }}>
                    <audio
                      controls
                      src={recordingUrl}
                      onLoadedMetadata={(e) => {
                        const d = Math.round(e.currentTarget.duration);
                        if (d > 0 && !isNaN(d) && isFinite(d)) {
                          setCallDurationSec(d);
                          setCallStatus("Completed");
                        }
                      }}
                      style={{ width: "100%", height: "32px", borderRadius: "6px" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ fontSize: "0.68rem", color: "#15803d" }}>✓ Ready to save to CRM</span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleTranscribeAudioRef.current?.(recordingUrl, callDurationSec)}
                          disabled={isTranscribingAudio}
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            fontSize: "0.68rem",
                            cursor: "pointer",
                            fontWeight: 700,
                            borderRadius: "4px",
                            padding: "2px 6px"
                          }}
                        >
                          {isTranscribingAudio ? "Transcribing..." : "✨ Re-transcribe"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordingUrl("")}
                          style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.68rem", cursor: "pointer", fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                    Auto-recording scanned from phone storage upon call completion.
                  </div>
                )}
              </div>

              {/* CARD 6: 🎙️ 1-TAP AI VOICE DEBRIEF WIDGET */}
              <AIDebriefSafeWrapper>
                <CallVoiceDebriefWidget
                  contactName={selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "Direct Contact"}
                  contactPhone={phoneDigits || selectedContact?.phone || ""}
                  customerId={selectedContact?.type === "Customer" ? selectedContact?.id : initialCustomerId}
                  leadId={selectedContact?.type === "Lead" ? selectedContact?.id : initialLeadId}
                  callDurationSec={callDurationSec}
                  callType={callType}
                  autoStartTrigger={autoDebriefTrigger}
                  autoStartRecording={false}
                  initialTranscript={autoRecordTranscript}
                  onApplyToForm={(data) => {
                    if (data.outcome) setOutcome(data.outcome);
                    if (data.notes) setNotes(data.notes);
                    if (data.summary) setCallSummary(data.summary);
                    if (data.recordingUrl && !recordingUrl) setRecordingUrl(data.recordingUrl);
                    if (data.followUpDate) setFollowUpDate(data.followUpDate);
                    if (data.followUpHour) setFollowUpHour(data.followUpHour);
                    if (data.followUpMinute) setFollowUpMinute(data.followUpMinute);
                    if (data.followUpPeriod) setFollowUpPeriod(data.followUpPeriod);
                    setFeedbackMsg("✨ AI Debrief intelligence applied!");
                  }}
                  onCallSaved={() => {
                    setFeedbackMsg("✅ Call logged with AI Debrief & Follow-up scheduled!");
                    loadRecentCalls();
                    setTimeout(() => {
                      onClose();
                    }, 800);
                  }}
                />
              </AIDebriefSafeWrapper>

              {/* SINGLE UNIFIED PRIMARY CTA ACTION BUTTON */}
              <button
                type="button"
                className="dialer-unified-save-cta"
                onClick={handleSaveCallRecord}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Saving Call & Lead to CRM...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Save Call & Lead to CRM</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* =========================================================
              TAB 3: RECENT CALL LOGS
              ========================================================= */}
          {activeTab === "CALL_LOGS" && (
            <div>
              {/* Search & Filter Bar */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="dialer-text-input"
                    style={{ paddingLeft: "30px", height: "36px" }}
                    placeholder="Search past calls..."
                    value={callLogSearch}
                    onChange={(e) => setCallLogSearch(e.target.value)}
                  />
                </div>
                <select
                  className="dialer-select-input"
                  style={{ width: "110px", height: "36px" }}
                  value={callLogFilter}
                  onChange={(e: any) => setCallLogFilter(e.target.value)}
                >
                  <option value="ALL">All Calls</option>
                  <option value="CONNECTED">Connected</option>
                  <option value="MISSED">Missed</option>
                  <option value="OUTBOUND">Outbound</option>
                  <option value="INBOUND">Inbound</option>
                </select>
              </div>

              {isLoadingCalls ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b" }}>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px auto" }} />
                  <span style={{ fontSize: "0.82rem" }}>Loading Call Logs...</span>
                </div>
              ) : filteredCallLogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                  <History size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: "0.82rem" }}>No recent calls found</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filteredCallLogs.map((c) => {
                    const isOutbound = c.type === "OUTBOUND";
                    const isConnected = c.status === "Connected" || (c.durationSec || 0) > 0;
                    const callPhone = c.phoneNumber || c.phone || "";
                    const hasAudio = Boolean(c.recordingUrl && String(c.recordingUrl).length > 20);

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "12px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        {/* Top row: Icon, Name/Phone, Actions */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: isConnected ? "#f0fdf4" : "#fef2f2",
                                color: isConnected ? "#16a34a" : "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              {isConnected ? (
                                isOutbound ? <PhoneOutgoing size={15} /> : <PhoneIncoming size={15} />
                              ) : (
                                <PhoneMissed size={15} />
                              )}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.contactName || c.contactPerson || "Direct Contact"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", gap: "6px", alignItems: "center" }}>
                                <span>{callPhone || "No Phone"}</span>
                                <span>•</span>
                                <span>{formatDuration(c.durationSec || 0)}</span>
                                <span>•</span>
                                <span>{formatRelativeTime(c.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            {callPhone && (
                              <button
                                type="button"
                                onClick={() => handleInitiateWhatsApp("", callPhone)}
                                style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="WhatsApp"
                              >
                                <MessageSquare size={13} />
                              </button>
                            )}
                            {callPhone && (
                              <button
                                type="button"
                                onClick={() => handleInitiateCall(callPhone, { companyName: c.contactName, phone: callPhone })}
                                style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#10b981", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="Call"
                              >
                                <PhoneCall size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCallLog(c.id, c.contactName)}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                backgroundColor: "#fee2e2",
                                color: "#dc2626",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              title="Delete call record & recording"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Middle row: Outcome badge */}
                        {c.outcome && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: c.outcome.includes("Order") ? "#dcfce7" : c.outcome.includes("Interested") ? "#e0e7ff" : "#f1f5f9",
                                color: c.outcome.includes("Order") ? "#15803d" : c.outcome.includes("Interested") ? "#3730a3" : "#475569",
                                border: `1px solid ${c.outcome.includes("Order") ? "#86efac" : c.outcome.includes("Interested") ? "#c7d2fe" : "#e2e8f0"}`
                              }}
                            >
                              {c.outcome}
                            </span>
                            {hasAudio && (
                              <span
                                style={{
                                  fontSize: "0.66rem",
                                  fontWeight: 700,
                                  color: "#059669",
                                  backgroundColor: "#ecfdf5",
                                  border: "1px solid #a7f3d0",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}
                              >
                                <Volume2 size={10} /> Recording
                              </span>
                            )}
                          </div>
                        )}

                        {/* AI Summary / Notes snippet */}
                        {(c.summary || c.notes) && (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "#334155",
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              lineHeight: 1.4
                            }}
                          >
                            <span style={{ fontWeight: 700, color: "#4f46e5" }}>AI Notes: </span>
                            {(c.summary || c.notes).slice(0, 160)}
                            {(c.summary || c.notes).length > 160 ? "..." : ""}
                          </div>
                        )}

                        {/* Call Recording Audio Player */}
                        {hasAudio && (
                          <div style={{ width: "100%", marginTop: "2px" }}>
                            <audio
                              controls
                              src={c.recordingUrl}
                              style={{ width: "100%", height: "30px", borderRadius: "6px" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 4: CONTACTS DIRECTORY
              ========================================================= */}
          {activeTab === "CONTACTS" && (
            <div>
              {/* Search Bar */}
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="dialer-text-input"
                  style={{ paddingLeft: "34px", paddingRight: contactSearch ? "32px" : "12px", height: "38px" }}
                  placeholder="Search phone contacts, customers or leads..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {contactSearch && (
                  <button
                    type="button"
                    onClick={() => setContactSearch("")}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter Pills Bar */}
              <div className="dialer-contacts-filter-bar">
                <button
                  type="button"
                  className={`dialer-contacts-filter-pill ${contactFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setContactFilter("ALL")}
                >
                  <Users size={12} /> All ({contactCounts.all})
                </button>
                <button
                  type="button"
                  className={`dialer-contacts-filter-pill ${contactFilter === "DEVICE" ? "active" : ""}`}
                  onClick={() => setContactFilter("DEVICE")}
                >
                  <Smartphone size={12} /> 📱 Phone ({contactCounts.phoneContacts})
                </button>
                <button
                  type="button"
                  className={`dialer-contacts-filter-pill ${contactFilter === "CUSTOMER" ? "active" : ""}`}
                  onClick={() => setContactFilter("CUSTOMER")}
                >
                  <Building size={12} /> Customers ({contactCounts.customers})
                </button>
                <button
                  type="button"
                  className={`dialer-contacts-filter-pill ${contactFilter === "LEAD" ? "active" : ""}`}
                  onClick={() => setContactFilter("LEAD")}
                >
                  <UserPlus size={12} /> Leads ({contactCounts.leads})
                </button>
              </div>

              {/* Sync Device Contacts Banner */}
              <div className="dialer-sync-contacts-banner">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Smartphone size={18} style={{ color: "#2563eb", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>
                      Phonebook Contacts ({contactCounts.phoneContacts} synced)
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                      Scan phone to call or WhatsApp contacts directly
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => loadDeviceContacts("")}
                  disabled={isScanningContacts}
                  className="dialer-sync-contacts-btn"
                >
                  {isScanningContacts ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      <span>Sync Phone</span>
                    </>
                  )}
                </button>
              </div>

              {isLoadingContacts ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b" }}>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px auto" }} />
                  <span style={{ fontSize: "0.82rem" }}>Loading Contacts Directory...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                  <Users size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                  <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem" }}>No contacts found</p>
                  <button
                    type="button"
                    onClick={() => loadDeviceContacts()}
                    className="dialer-sync-contacts-btn"
                    style={{ margin: "0 auto" }}
                  >
                    <Smartphone size={13} /> Import Phonebook Contacts
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filteredContacts.map((c) => {
                    const isDevice = c.type === "DeviceContact";
                    const isCustomer = c.type === "Customer";
                    const isLead = c.type === "Lead";

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          handleSelectMatchedContact(c);
                          setActiveTab("DIALPAD");
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "12px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              backgroundColor: isCustomer ? "#eef2ff" : isDevice ? "#ecfdf5" : "#fffbeb",
                              color: isCustomer ? "#4f46e5" : isDevice ? "#059669" : "#d97706",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.88rem",
                              flexShrink: 0
                            }}
                          >
                            {(c.companyName || c.contactPerson || "C")[0].toUpperCase()}
                          </div>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.companyName || c.contactPerson}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.62rem",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  backgroundColor: isCustomer ? "#e0e7ff" : isDevice ? "#dcfce7" : "#fef3c7",
                                  color: isCustomer ? "#3730a3" : isDevice ? "#15803d" : "#92400e",
                                  fontWeight: 700
                                }}
                              >
                                {isDevice ? "📱 Phone" : c.type}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b", fontFamily: "monospace", marginTop: "1px" }}>
                              {c.phone}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleInitiateWhatsApp("", c.phone)}
                            className="dialer-mini-action-btn wa"
                            style={{ width: "30px", height: "30px" }}
                            title="WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitiateCall(c.phone, c)}
                            className="dialer-mini-action-btn call"
                            style={{ width: "30px", height: "30px" }}
                            title="Call Directly"
                          >
                            <PhoneCall size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 5: WHATSAPP TEMPLATES
              ========================================================= */}
          {activeTab === "WHATSAPP" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                1-Tap send customized WhatsApp messages to {selectedContact?.companyName || phoneDigits || "recipient"}:
              </div>
              {WHATSAPP_TEMPLATES.map((tpl, i) => {
                const preview = tpl.text(selectedContact?.companyName || selectedContact?.contactPerson || "");
                return (
                  <div
                    key={i}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "0.82rem", color: "#0f172a" }}>{tpl.title}</strong>
                      <button
                        type="button"
                        onClick={() => handleInitiateWhatsApp(preview)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#25d366",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Send size={12} /> Send
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#475569", lineHeight: 1.4 }}>
                      "{preview}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* =========================================================
              TAB 6: CALLING SCRIPTS
              ========================================================= */}
          {activeTab === "SCRIPTS" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                High-converting sales call scripts & objection responses:
              </div>
              {TELE_SCRIPTS.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <strong style={{ fontSize: "0.82rem", color: "#4f46e5", display: "block", marginBottom: "4px" }}>
                    {s.title}
                  </strong>
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "#334155", lineHeight: 1.4 }}>
                    "{s.text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lightweight error boundary scoped to the AI Debrief widget only */
class AIDebriefSafeWrapper extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("AI Debrief widget error (isolated):", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "12px 14px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            marginBottom: "14px",
            textAlign: "center",
            fontSize: "0.78rem",
            color: "#64748b"
          }}
        >
          <Sparkles size={18} style={{ color: "#6366f1", marginBottom: "6px" }} />
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>AI Debrief unavailable</div>
          <div>Use quick presets or type notes manually below.</div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: "8px",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "1px solid #c7d2fe",
              backgroundColor: "#eef2ff",
              color: "#4f46e5",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Retry AI Debrief
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PhoneDialerModal(props: PhoneDialerModalProps) {
  if (!props.isOpen) return null;

  return (
    <DialerErrorBoundary onClose={props.onClose} isOpen={props.isOpen}>
      <PhoneDialerModalContent {...props} />
    </DialerErrorBoundary>
  );
}
