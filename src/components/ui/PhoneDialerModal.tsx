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
  Check
} from "lucide-react";
import { logCall, getCustomersForCallModal, getDialerRecentCalls } from "@/app/actions/callActions";
import { createQuickLead } from "@/app/actions/leadActions";
import CallVoiceDebriefWidget from "@/components/telecalling/CallVoiceDebriefWidget";
import {
  getNativeSims,
  makeDirectCellularCall,
  getCallRecordingCapability,
  isDefaultDialer,
  requestDefaultDialer,
  isAndroidNativeApp,
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
  const [contactFilter, setContactFilter] = useState<"ALL" | "CUSTOMER" | "LEAD">("ALL");

  // Call Duration & Auto Debrief Engine State
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [autoDebriefTrigger, setAutoDebriefTrigger] = useState<number>(0);
  const callStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCallInitiatedRef = useRef<boolean>(false);

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
  const [availableSims, setAvailableSims] = useState<NativeSimInfo[]>([]);
  const [selectedSim, setSelectedSim] = useState<NativeSimInfo | null>(null);
  const [isDefaultApp, setIsDefaultApp] = useState<boolean>(true);
  const [recordingCap, setRecordingCap] = useState<RecordingCapabilityInfo | null>(null);

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

  // Load Contacts Directory safely
  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const res = await getCustomersForCallModal();
      if (res && res.success && Array.isArray(res.customers)) {
        setContacts(res.customers);
        if (initialCustomerId) {
          const match = res.customers.find((c: any) => c.id === initialCustomerId && c.type === "Customer");
          if (match) setSelectedContact(match);
        } else if (initialLeadId) {
          const match = res.customers.find((c: any) => c.id === initialLeadId && c.type === "Lead");
          if (match) setSelectedContact(match);
        } else if (initialPhone) {
          const cleanInit = String(initialPhone).replace(/\D/g, '');
          const match = res.customers.find((c: any) =>
            c.phone && String(c.phone).replace(/\D/g, '').includes(cleanInit)
          );
          if (match) setSelectedContact(match);
        }
      }
    } catch (err) {
      console.warn("Could not load contacts for dialer:", err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

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

  // Multi-SIM & Capability Discovery on Mount
  useEffect(() => {
    if (!isOpen) return;
    if (isAndroidNativeApp()) {
      try {
        const sims = getNativeSims();
        if (Array.isArray(sims) && sims.length > 0) {
          setAvailableSims(sims);
          let savedSubId: string | null = null;
          try {
            savedSubId = typeof window !== "undefined" ? localStorage.getItem("crm_preferred_sim_id") : null;
          } catch (storageErr) {
            console.warn("Could not read preferred sim from storage:", storageErr);
          }
          const preferred = (savedSubId ? sims.find((s) => s && s.subscriptionId != null && String(s.subscriptionId) === savedSubId) : null)
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
  }, [isOpen]);

  // Listen for Automatic Post-Call Cellular Audio Transcription
  useEffect(() => {
    const handleTranscription = (e: any) => {
      const detail = e.detail || {};
      if (detail.text) {
        setNotes((prev) => (prev ? `${prev}\n\n[Auto-Transcript]: ${detail.text}` : `[Auto-Transcript]: ${detail.text}`));
        if (detail.outcome) {
          setOutcome(detail.outcome);
        }
        setFeedbackMsg(`🎙️ Automatic Cellular Transcript Attached!`);
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

        if (finalDur > 0) {
          setCallStatus("Completed");
          if (outcome === "No Answer / Busy" || outcome === "Voicemail / Switched Off") {
            setOutcome("Interested / Follow-up Needed");
          }
          setFeedbackMsg(`⏹ Call completed (${formatDuration(finalDur)}). AI Voice Debrief starting... 🎙️`);
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
      if (initialPhone) setPhoneDigits(initialPhone);
      if (initialName) setNewLeadName(initialName);
      setCallDurationSec(0);
      setIsTimerRunning(false);
      setAutoDebriefTrigger(0);
      callStartTimeRef.current = null;
      isCallInitiatedRef.current = false;
      setNotes("");
      setFeedbackMsg("");
      setShowNewLeadForm(false);
      setActiveTab(initialTab || "DIALPAD");

      loadContacts();
      loadRecentCalls();
    }
  }, [isOpen, initialPhone, initialName, initialCustomerId, initialLeadId, initialTab]);

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

          if (duration === 0 && callStartTimeRef.current) {
            const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
            if (elapsed > 0) duration = elapsed;
          }

          callStartTimeRef.current = null;
          setCallDurationSec(duration);

          if (duration > 0) {
            setCallStatus("Completed");
            setFeedbackMsg(`⏹ Returned from call (${formatDuration(duration)}). AI Voice Debrief starting... 🎙️`);
            setAutoDebriefTrigger(Date.now());
          } else {
            setCallStatus("Busy");
            setOutcome("No Answer / Busy");
            setQuickFollowUp(1, 11, 0, "AM");
            setFeedbackMsg("❌ Call ended (0s). Scheduled follow-up for tomorrow 11 AM.");
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

  // Auto match contact as user types
  useEffect(() => {
    if (!phoneDigits) {
      if (!initialCustomerId && !initialLeadId) setSelectedContact(null);
      return;
    }
    const cleanNum = phoneDigits.replace(/\D/g, '');
    if (cleanNum.length >= 3 && Array.isArray(contacts)) {
      const match = contacts.find(c => {
        const cPhone = (c?.phone || '').replace(/\D/g, '');
        const cName = (c?.contactPerson || c?.companyName || '').toLowerCase();
        return (cPhone && cPhone.includes(cleanNum)) || cName.includes(phoneDigits.toLowerCase());
      });
      if (match) {
        setSelectedContact(match);
      } else {
        if (!initialCustomerId && !initialLeadId) setSelectedContact(null);
      }
    }
  }, [phoneDigits, contacts, initialCustomerId, initialLeadId]);

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

  const handleSelectMatchedContact = (contact: any) => {
    setSelectedContact(contact);
    if (contact?.phone) {
      setPhoneDigits(contact.phone);
    }
  };

  // Trigger Phone Call & Switch to Post-Call Session
  const handleInitiateCall = (targetPhone?: string, targetContact?: any) => {
    const numberToCall = targetPhone || phoneDigits;
    const cleanNum = (numberToCall || '').replace(/\D/g, '');
    if (!cleanNum) {
      setFeedbackMsg("⚠️ Please enter a valid phone number to call.");
      return;
    }

    if (targetPhone) setPhoneDigits(targetPhone);
    if (targetContact) setSelectedContact(targetContact);

    handleVibrate(30);

    const now = Date.now();
    callStartTimeRef.current = now;
    setCallDurationSec(0);
    setIsTimerRunning(true);
    isCallInitiatedRef.current = true;
    setCallStatus("Connected");
    setCallType("OUTBOUND");

    // Grant App Lock exemption & trigger SIM cellular call
    if (typeof window !== "undefined") {
      (window as any).grantAppLockExemption?.(300);
      makeDirectCellularCall(cleanNum, selectedSim?.subscriptionId ?? -1);
    }

    // Switch to post-call maintenance view
    setActiveTab("POST_CALL");
    setFeedbackMsg("📞 Outbound call dialed. Live stopwatch active.");
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

  // Save Call Record & Maintain CRM Lead
  const handleSaveCallRecord = async () => {
    setIsSaving(true);
    setFeedbackMsg("");
    handleVibrate(25);

    try {
      let activeLeadId = selectedContact?.type === "Lead" ? selectedContact.id : (initialLeadId || null);
      let activeCustomerId = selectedContact?.type === "Customer" ? selectedContact.id : (initialCustomerId || null);

      if (!activeCustomerId && !activeLeadId && (newLeadName || newLeadShop) && phoneDigits) {
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

  // Filter contacts dropdown in keypad
  const filteredKeypadContacts = useMemo(() => {
    if (!phoneDigits || !Array.isArray(contacts)) return [];
    const q = phoneDigits.toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    return contacts.filter(c => {
      const cPhone = (c?.phone || '').replace(/\D/g, '');
      const cName = (c?.contactPerson || '').toLowerCase();
      const cComp = (c?.companyName || '').toLowerCase();
      return (cleanQ && cPhone.includes(cleanQ)) || cName.includes(q) || cComp.includes(q);
    }).slice(0, 3);
  }, [contacts, phoneDigits]);

  // Filtered Call Logs list
  const filteredCallLogs = useMemo(() => {
    if (!Array.isArray(recentCalls)) return [];
    return recentCalls.filter(c => {
      if (!c) return false;
      if (callLogSearch) {
        const q = callLogSearch.toLowerCase();
        const cleanQ = q.replace(/\D/g, '');
        const matchName = (c.contactName || "").toLowerCase().includes(q);
        const matchPerson = (c.contactPerson || "").toLowerCase().includes(q);
        const matchPhone = (c.phoneNumber || "").replace(/\D/g, '').includes(cleanQ);
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
    if (!Array.isArray(contacts)) return [];
    return contacts.filter(c => {
      if (!c) return false;
      if (contactSearch) {
        const q = contactSearch.toLowerCase();
        const cleanQ = q.replace(/\D/g, '');
        const matchName = (c.contactPerson || "").toLowerCase().includes(q);
        const matchComp = (c.companyName || "").toLowerCase().includes(q);
        const matchPhone = (c.phone || "").replace(/\D/g, '').includes(cleanQ);
        if (!matchName && !matchComp && !matchPhone) return false;
      }
      if (contactFilter === "CUSTOMER") return c.type === "Customer";
      if (contactFilter === "LEAD") return c.type === "Lead";
      return true;
    });
  }, [contacts, contactSearch, contactFilter]);

  return (
    <div className="dialer-backdrop" onClick={onClose}>
      <div className="dialer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dialer-drag-handle" />

        {/* HEADER */}
        <div className="dialer-header">
          <div className="dialer-title-box">
            <div className="dialer-icon-badge">
              <PhoneCall size={18} />
            </div>
            <div className="dialer-title-text">
              <h3>TeleCRM Smart Dialer</h3>
              <span>Enterprise Voice & AI Debrief</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="dialer-close-btn" title="Close">
            <X size={16} />
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
        <div className="dialer-body-scroll">
          {/* =========================================================
              TAB 1: NUMERIC KEYPAD & DIALER
              ========================================================= */}
          {activeTab === "DIALPAD" && (
            <div>
              {/* Phone Input Box — readOnly prevents native keyboard; digits come only from keypad buttons */}
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
                  <button type="button" onClick={handleBackspace} className="dialer-backspace-btn" title="Delete">
                    <Delete size={18} />
                  </button>
                )}
              </div>

              {/* Matched Contact Snippet */}
              {selectedContact ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    backgroundColor: "#eef2ff",
                    borderRadius: "8px",
                    border: "1px solid #c7d2fe",
                    marginBottom: "10px",
                    fontSize: "0.78rem"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                    <User size={13} style={{ color: "#4f46e5", flexShrink: 0 }} />
                    <strong style={{ color: "#1e1b4b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {selectedContact.companyName || selectedContact.contactPerson}
                    </strong>
                    <span style={{ fontSize: "0.68rem", backgroundColor: "#dbeafe", color: "#1e40af", padding: "1px 5px", borderRadius: "4px" }}>
                      {selectedContact.type || "Customer"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "2px" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : filteredKeypadContacts.length > 0 ? (
                <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {filteredKeypadContacts.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectMatchedContact(c)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>
                        {c.companyName || c.contactPerson}
                      </span>
                      <span style={{ color: "#64748b", fontFamily: "monospace" }}>{c.phone}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Multi-SIM Cellular Selector */}
              {availableSims.length > 1 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "4px 0 10px 0" }}>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>Call via:</span>
                  {availableSims.map((sim, idx) => {
                    const simId = sim?.subscriptionId ?? idx;
                    const isSelected = selectedSim?.subscriptionId === sim?.subscriptionId;
                    return (
                      <button
                        key={simId}
                        type="button"
                        onClick={() => {
                          handleVibrate(15);
                          setSelectedSim(sim);
                          if (typeof window !== "undefined" && sim?.subscriptionId != null) {
                            try {
                              localStorage.setItem("crm_preferred_sim_id", String(sim.subscriptionId));
                            } catch {}
                          }
                        }}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "16px",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          border: isSelected ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                          backgroundColor: isSelected ? "#eef2ff" : "#f8fafc",
                          color: isSelected ? "#4338ca" : "#475569",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        <span style={{ fontSize: "0.65rem", backgroundColor: isSelected ? "#4338ca" : "#94a3b8", color: "#ffffff", padding: "1px 5px", borderRadius: "6px" }}>
                          {sim?.slotLabel || `SIM ${idx + 1}`}
                        </span>
                        <span>{sim?.carrierName || sim?.displayName || "Cellular"}</span>
                      </button>
                    );
                  })}
                </div>
              ) : availableSims.length === 1 ? (
                <div style={{ textAlign: "center", margin: "2px 0 6px 0" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                    Cellular SIM: <strong style={{ color: "#334155" }}>{availableSims[0]?.carrierName || availableSims[0]?.displayName || "Cellular SIM"}</strong> ({availableSims[0]?.slotLabel || "SIM 1"})
                  </span>
                </div>
              ) : null}

              {/* Default Phone App Prompt Banner (Optional / Dismissable) */}
              {!isDefaultApp && isAndroidNativeApp() && !isPromptDismissed && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "8px 12px", margin: "0 0 10px 0", fontSize: "0.76rem", color: "#166534" }}>
                  <span>⚡ Optional: Set Antigravity as Default Phone App for system in-call screen.</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => requestDefaultDialer()}
                      style={{ padding: "4px 10px", borderRadius: "6px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Enable
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPromptDismissed(true)}
                      style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", padding: "2px 6px", fontSize: "0.85rem", fontWeight: "bold" }}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Cellular Audio Recording Capability Status */}
              {recordingCap && (
                <div style={{ textAlign: "center", margin: "0 0 8px 0" }}>
                  <span style={{
                    fontSize: "0.70rem",
                    padding: "2px 10px",
                    borderRadius: "12px",
                    backgroundColor: recordingCap.canRecordBothSides ? "#ecfdf5" : "#f1f5f9",
                    color: recordingCap.canRecordBothSides ? "#047857" : "#64748b",
                    border: `1px solid ${recordingCap.canRecordBothSides ? "#a7f3d0" : "#e2e8f0"}`,
                    fontWeight: 600
                  }}>
                    {recordingCap.canRecordBothSides ? "🎙️ Two-Way Cellular Audio Capture Active" : "🎙️ Voice Debrief Capture Active"}
                  </span>
                </div>
              )}

              {/* Keypad Grid */}
              <div className="dialer-keypad-grid">
                {DIALPAD_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    type="button"
                    className="dialer-key-btn"
                    onClick={() => handleDigitClick(k.digit)}
                  >
                    <span className="dialer-key-digit">{k.digit}</span>
                    {k.sub && <span className="dialer-key-sub">{k.sub}</span>}
                  </button>
                ))}
              </div>

              {/* Action Buttons Dock */}
              <div className="dialer-actions-dock">
                <button
                  type="button"
                  className="dialer-wa-btn"
                  onClick={() => handleInitiateWhatsApp()}
                  title="WhatsApp"
                >
                  <MessageSquare size={20} />
                </button>

                <button
                  type="button"
                  className="dialer-call-btn"
                  onClick={() => handleInitiateCall()}
                  title="Place Direct Call"
                >
                  <PhoneCall size={26} />
                </button>

                <button
                  type="button"
                  className="dialer-notes-btn"
                  onClick={() => {
                    setActiveTab("POST_CALL");
                  }}
                  title="Open Log Call Form"
                >
                  <Clock size={20} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: UNIFIED POST-CALL / LOG CALL WORKSPACE
              ========================================================= */}
          {activeTab === "POST_CALL" && (
            <div>
              {/* CONTACT HEADER CARD */}
              <div className="dialer-contact-pill">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="dialer-contact-avatar">
                    {((selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "C")[0] || "C").toUpperCase()}
                  </div>
                  <div className="dialer-contact-info">
                    <h4>{selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "Direct Contact"}</h4>
                    <span>{phoneDigits || selectedContact?.phone || "No phone entered"}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  {phoneDigits && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleInitiateWhatsApp()}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: "#25d366",
                          color: "#fff",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title="WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateCall()}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: "#10b981",
                          color: "#fff",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title="Re-dial"
                      >
                        <PhoneCall size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* CALL STATS & DURATION CARD */}
              <div className="dialer-stats-card">
                <div className="dialer-timer-row">
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                      Call Duration
                    </span>
                    <div className="dialer-timer-digits">
                      {isTimerRunning && <span className="dialer-pulse-dot" />}
                      <span>{formatDuration(callDurationSec)}</span>
                      {isTimerRunning && (
                        <span style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: 700 }}>LIVE</span>
                      )}
                    </div>
                  </div>

                  {/* Stop/Start timer toggle */}
                  <div>
                    {isTimerRunning ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsTimerRunning(false);
                          callStartTimeRef.current = null;
                          if (callDurationSec > 0) {
                            setCallStatus("Completed");
                          }
                          setAutoDebriefTrigger(Date.now());
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <PhoneOff size={13} /> End Talk
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
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Play size={13} /> Resume Timer
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Duration Preset Chips */}
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {QUICK_DURATIONS.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => {
                        setCallDurationSec(d.sec);
                        setIsTimerRunning(false);
                        callStartTimeRef.current = null;
                        if (d.sec === 0) {
                          setCallStatus("Busy");
                          setOutcome("No Answer / Busy");
                        } else {
                          setCallStatus("Completed");
                        }
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        border: callDurationSec === d.sec ? "1px solid var(--accent-primary, #4f46e5)" : "1px solid #e2e8f0",
                        backgroundColor: callDurationSec === d.sec ? "#eef2ff" : "#f8fafc",
                        color: callDurationSec === d.sec ? "var(--accent-primary, #4f46e5)" : "#64748b",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCallDurationSec(prev => Math.max(0, prev - 15))}
                    style={{ padding: "3px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#64748b", fontSize: "0.7rem", cursor: "pointer" }}
                  >
                    -15s
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallDurationSec(prev => prev + 15)}
                    style={{ padding: "3px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#64748b", fontSize: "0.7rem", cursor: "pointer" }}
                  >
                    +15s
                  </button>
                </div>

                {/* Call Type Toggle & Status Chips */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div>
                    <label className="dialer-field-label">Direction</label>
                    <div className="dialer-segment-group">
                      <button
                        type="button"
                        className={`dialer-segment-btn ${callType === "OUTBOUND" ? "active" : ""}`}
                        onClick={() => setCallType("OUTBOUND")}
                      >
                        <PhoneOutgoing size={12} /> Outbound
                      </button>
                      <button
                        type="button"
                        className={`dialer-segment-btn ${callType === "INBOUND" ? "active" : ""}`}
                        onClick={() => setCallType("INBOUND")}
                      >
                        <PhoneIncoming size={12} /> Inbound
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="dialer-field-label">Connection Status</label>
                    <select
                      className="dialer-select-input"
                      value={callStatus}
                      onChange={(e) => {
                        setCallStatus(e.target.value);
                        if (e.target.value === "Busy" || e.target.value === "No Answer") {
                          setOutcome("No Answer / Busy");
                          setCallDurationSec(0);
                        }
                      }}
                    >
                      {CALL_STATUSES.map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 🎙️ 1-TAP AI VOICE DEBRIEF WIDGET — wrapped in local error boundary so a crash here doesn't kill the whole dialer */}
              <AIDebriefSafeWrapper>
                <CallVoiceDebriefWidget
                  contactName={selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "Direct Contact"}
                  contactPhone={phoneDigits || selectedContact?.phone || ""}
                  customerId={selectedContact?.type === "Customer" ? selectedContact?.id : initialCustomerId}
                  leadId={selectedContact?.type === "Lead" ? selectedContact?.id : initialLeadId}
                  callDurationSec={callDurationSec}
                  callType={callType}
                  autoStartTrigger={autoDebriefTrigger}
                  onApplyToForm={(data) => {
                    if (data.outcome) setOutcome(data.outcome);
                    if (data.notes) setNotes(data.notes);
                    if (data.followUpDate) setFollowUpDate(data.followUpDate);
                    if (data.followUpHour) setFollowUpHour(data.followUpHour);
                    if (data.followUpMinute) setFollowUpMinute(data.followUpMinute);
                    if (data.followUpPeriod) setFollowUpPeriod(data.followUpPeriod);
                    setFeedbackMsg("✨ AI Intelligence populated into call log!");
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

              {/* CALL OUTCOME DISPOSITION */}
              <div style={{ marginBottom: "12px" }}>
                <label className="dialer-field-label">Call Outcome / Disposition</label>
                <select
                  className="dialer-select-input"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  {DEFAULT_OUTCOMES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* DISCUSSION NOTES & TAGS */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
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
                      padding: "2px 8px",
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
                  rows={3}
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

              {/* FOLLOW-UP TASK SCHEDULER */}
              <div style={{ marginBottom: "12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Calendar size={14} style={{ color: "#4f46e5" }} /> Next Follow-up Task
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

              {/* SINGLE UNIFIED PRIMARY ACTION CTA */}
              <button
                type="button"
                className="dialer-save-cta"
                onClick={handleSaveCallRecord}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Saving Call to CRM...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Save Call Log & Schedule Task</span>
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
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
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
                            <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", gap: "6px" }}>
                              <span>{c.phoneNumber}</span>
                              <span>•</span>
                              <span>{formatDuration(c.durationSec || 0)}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(c.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleInitiateWhatsApp("", c.phoneNumber)}
                            style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitiateCall(c.phoneNumber, { companyName: c.contactName, phone: c.phoneNumber })}
                            style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#10b981", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Call"
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
              TAB 4: CONTACTS DIRECTORY
              ========================================================= */}
          {activeTab === "CONTACTS" && (
            <div>
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="dialer-text-input"
                    style={{ paddingLeft: "30px", height: "36px" }}
                    placeholder="Search customers or leads..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
                <select
                  className="dialer-select-input"
                  style={{ width: "110px", height: "36px" }}
                  value={contactFilter}
                  onChange={(e: any) => setContactFilter(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="CUSTOMER">Customers</option>
                  <option value="LEAD">Leads</option>
                </select>
              </div>

              {isLoadingContacts ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b" }}>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px auto" }} />
                  <span style={{ fontSize: "0.82rem" }}>Loading Contacts...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                  <Users size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: "0.82rem" }}>No contacts found</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filteredContacts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "8px",
                            backgroundColor: c.type === "Customer" ? "#eef2ff" : "#fffbeb",
                            color: c.type === "Customer" ? "#4f46e5" : "#d97706",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            flexShrink: 0
                          }}
                        >
                          {(c.companyName || c.contactPerson || "C")[0].toUpperCase()}
                        </div>
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.companyName || c.contactPerson}
                            </span>
                            <span style={{ fontSize: "0.62rem", padding: "1px 5px", borderRadius: "4px", backgroundColor: "#e2e8f0", color: "#475569", fontWeight: 700 }}>
                              {c.type}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                            {c.phone}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleInitiateWhatsApp("", c.phone)}
                          style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="WhatsApp"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInitiateCall(c.phone, c)}
                          style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#10b981", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Call"
                        >
                          <PhoneCall size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
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
