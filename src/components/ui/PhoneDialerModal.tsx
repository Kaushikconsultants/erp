"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
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
  Trash2,
  MoreVertical,
  Wifi,
  Battery,
  Signal,
  ChevronLeft,
  ChevronDown,
  Pencil
} from "lucide-react";
import { logCall, getCustomersForCallModal, getDialerRecentCalls, deleteCall, deleteCallRecording, syncDeviceCallLogs, saveOrUpdateCallFollowUp } from "@/app/actions/callActions";
import { createQuickLead } from "@/app/actions/leadActions";
import { analyzeCallVoiceDebrief } from "@/app/actions/callAiActions";
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
  RecordingCapabilityInfo,
  hasCallLogPermission,
  requestCallLogPermission,
  getDeviceCallLogs,
  DeviceCallLogItem
} from "@/lib/capacitor";
import "./phone-dialer.css";

export function WhatsAppLogo({ size = 24, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

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
  { digit: "1", sub: "oo" },
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

function getOutcomeMeta(val: string) {
  const lower = (val || "").toLowerCase();
  if (lower.includes("order") || lower.includes("deal") || lower.includes("won") || lower.includes("placed")) {
    return { color: "#10b981", bg: "#dcfce7", border: "#86efac", label: "Order / Closed" };
  }
  if (lower.includes("quotation") || lower.includes("quote") || lower.includes("negotiation") || lower.includes("price")) {
    return { color: "#f59e0b", bg: "#fef3c7", border: "#fde68a", label: "Quotation / Price" };
  }
  if (lower.includes("callback") || lower.includes("call back") || lower.includes("schedule")) {
    return { color: "#8b5cf6", bg: "#f3e8ff", border: "#d8b4fe", label: "Callback" };
  }
  if (lower.includes("interested") || lower.includes("follow-up") || lower.includes("follow up")) {
    return { color: "#4f46e5", bg: "#e0e7ff", border: "#a5b4fc", label: "Interested" };
  }
  if (lower.includes("busy") || lower.includes("no answer") || lower.includes("missed") || lower.includes("voicemail") || lower.includes("switched off")) {
    return { color: "#ef4444", bg: "#fee2e2", border: "#fca5a5", label: "Unanswered" };
  }
  if (lower.includes("not interested") || lower.includes("lost") || lower.includes("wrong") || lower.includes("invalid")) {
    return { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", label: "Lost / Invalid" };
  }
  return { color: "#0ea5e9", bg: "#e0f2fe", border: "#7dd3fc", label: "General" };
}

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
    if (this.state.hasError) {
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

// T9 Keypad mapping for fast name matching while typing digits (2=ABC, 3=DEF, 4=GHI, 5=JKL, 6=MNO, 7=PQRS, 8=TUV, 9=WXYZ)
const T9_CHAR_MAP: Record<string, string> = {
  a: '2', b: '2', c: '2',
  d: '3', e: '3', f: '3',
  g: '4', h: '4', i: '4',
  j: '5', k: '5', l: '5',
  m: '6', n: '6', o: '6',
  p: '7', q: '7', r: '7', s: '7',
  t: '8', u: '8', v: '8',
  w: '9', x: '9', y: '9', z: '9',
};

export function stringToT9Digits(str: string): string {
  if (!str) return "";
  let digits = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i].toLowerCase();
    if (T9_CHAR_MAP[ch]) {
      digits += T9_CHAR_MAP[ch];
    } else if (ch >= '0' && ch <= '9') {
      digits += ch;
    } else if (ch === ' ' || ch === '-' || ch === '_') {
      digits += ' ';
    }
  }
  return digits;
}

export function matchesT9(targetName: string, queryDigits: string): boolean {
  if (!targetName || !queryDigits) return false;
  const cleanQuery = queryDigits.replace(/[^0-9]/g, '');
  if (!cleanQuery) return false;
  const t9Digits = stringToT9Digits(targetName);
  if (t9Digits.includes(cleanQuery)) return true;
  const words = t9Digits.split(' ');
  return words.some(w => w.startsWith(cleanQuery));
}

// Pure module-level utility: Normalize 12-hour follow-up time
export function normalizeFollowUpHour(raw: any): string {
  if (!raw) return "11";
  const num = parseInt(String(raw).replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 1 || num > 12) return "11";
  return String(num).padStart(2, "0");
}

export function normalizeFollowUpMinute(raw: any): string {
  if (raw == null) return "00";
  const num = parseInt(String(raw).replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 0 || num > 59) return "00";
  const rounded = Math.round(num / 5) * 5;
  const clamped = rounded >= 60 ? 55 : rounded;
  return String(clamped).padStart(2, "0");
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
  const deferredPhoneDigits = useDeferredValue(phoneDigits);
  const [contacts, setContacts] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState<boolean>(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isSavingRecordRef = useRef<boolean>(false);
  const [showNewLeadForm, setShowNewLeadForm] = useState<boolean>(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("12:45");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      const h12 = h % 12 || 12;
      setCurrentTimeStr(`${h12}:${m}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  // Search & Filter states for Call Logs & Contacts tabs
  const [callLogSearch, setCallLogSearch] = useState<string>("");
  const [callLogFilter, setCallLogFilter] = useState<"ALL" | "CONNECTED" | "MISSED" | "OUTBOUND" | "INBOUND">("ALL");
  const [contactSearch, setContactSearch] = useState<string>("");
  const [contactFilter, setContactFilter] = useState<"ALL" | "DEVICE" | "CUSTOMER" | "LEAD">("ALL");

  // Device Phone Contacts state (synced from Android native phonebook or Web Contact Picker)
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [isScanningContacts, setIsScanningContacts] = useState<boolean>(false);

  // Defer loading cached contacts to background idle time (0ms initial render lag)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const cached = localStorage.getItem("crm_device_contacts_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDeviceContacts(parsed);
          }
        }
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Call Duration & Auto Debrief Engine State
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [autoDebriefTrigger, setAutoDebriefTrigger] = useState<number>(0);
  const callStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCallInitiatedRef = useRef<boolean>(false);
  const isUserExplicitStatusRef = useRef<boolean>(false);
  const phoneDigitsRef = useRef<string>(initialPhone);
  phoneDigitsRef.current = phoneDigits;
  const selectedContactRef = useRef<any>(null);
  selectedContactRef.current = selectedContact;
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);
  const isLeadNameManuallyEditedRef = useRef<boolean>(false);
  const isContactDismissedRef = useRef<boolean>(false);
  const prevPhoneDigitsRef = useRef<string>(initialPhone || "");
  const [allFilesGranted, setAllFilesGranted] = useState<boolean>(true);

  // Caret & Cursor position tracking for middle-digit editing and selection
  const digitsInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const updateCursorFromInput = useCallback(() => {
    if (digitsInputRef.current) {
      cursorPositionRef.current = {
        start: digitsInputRef.current.selectionStart ?? phoneDigits.length,
        end: digitsInputRef.current.selectionEnd ?? phoneDigits.length
      };
    }
  }, [phoneDigits.length]);

  const setDigitsAndCursor = useCallback((nextDigits: string, newCursorPos: number) => {
    setPhoneDigits(nextDigits);
    cursorPositionRef.current = { start: newCursorPos, end: newCursorPos };
    requestAnimationFrame(() => {
      if (digitsInputRef.current) {
        digitsInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        digitsInputRef.current.focus({ preventScroll: true });
      }
    });
  }, []);

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

  // Recent Calls In-place Edit & Follow-up State
  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [editFollowUpDate, setEditFollowUpDate] = useState<string>("");
  const [editFollowUpHour, setEditFollowUpHour] = useState<string>("11");
  const [editFollowUpMinute, setEditFollowUpMinute] = useState<string>("00");
  const [editFollowUpPeriod, setEditFollowUpPeriod] = useState<"AM" | "PM">("AM");
  const [editOutcome, setEditOutcome] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleToggleEditCall = useCallback((c: any) => {
    if (editingCallId === c.id) {
      setEditingCallId(null);
      return;
    }

    setEditingCallId(c.id);
    setEditOutcome(c.outcome || "Completed");
    setEditNotes(c.notes || c.summary || "");

    if (c.followUpDate) {
      const d = new Date(c.followUpDate);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setEditFollowUpDate(`${yyyy}-${mm}-${dd}`);

        let h = d.getHours();
        const period = h >= 12 ? "PM" : "AM";
        h = h % 12;
        if (h === 0) h = 12;
        setEditFollowUpHour(String(h).padStart(2, '0'));
        setEditFollowUpMinute(String(d.getMinutes()).padStart(2, '0'));
        setEditFollowUpPeriod(period);
        return;
      }
    }

    // Default to tomorrow 11:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setEditFollowUpDate(`${yyyy}-${mm}-${dd}`);
    setEditFollowUpHour("11");
    setEditFollowUpMinute("00");
    setEditFollowUpPeriod("AM");
  }, [editingCallId]);

  const setQuickEditFollowUp = useCallback((days: number, hour12: number, min: number, period: "AM" | "PM") => {
    if (days < 0) {
      setEditFollowUpDate("");
      return;
    }
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setEditFollowUpDate(`${yyyy}-${mm}-${dd}`);
    setEditFollowUpHour(String(hour12).padStart(2, '0'));
    setEditFollowUpMinute(String(min).padStart(2, '0'));
    setEditFollowUpPeriod(period);
  }, []);

  const getCompiledEditFollowUpDate = useCallback(() => {
    if (!editFollowUpDate) return null;
    let h = parseInt(editFollowUpHour || "11", 10);
    if (editFollowUpPeriod === "PM" && h < 12) h += 12;
    if (editFollowUpPeriod === "AM" && h === 12) h = 0;
    const [year, month, day] = editFollowUpDate.split('-');
    const m = parseInt(editFollowUpMinute || "00", 10);
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), h, m, 0);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  }, [editFollowUpDate, editFollowUpHour, editFollowUpMinute, editFollowUpPeriod]);

  const handleSaveCallEdit = useCallback(async (callItem: any) => {
    setIsSavingEdit(true);
    try {
      const compiledFollowUp = getCompiledEditFollowUpDate();
      let res: any;
      try {
        res = await saveOrUpdateCallFollowUp({
          callId: callItem.id,
          phoneNumber: callItem.phoneNumber || callItem.phone,
          contactName: callItem.contactName || callItem.contactPerson,
          outcome: editOutcome,
          notes: editNotes,
          followUpDate: compiledFollowUp
        });
      } catch (callErr: any) {
        const errMsg = String(callErr?.message || "");
        if (errMsg.includes("Server Action") || errMsg.includes("not found on the server") || errMsg.includes("failed-to-find-server-action")) {
          console.warn("Server action hash mismatch in follow-up edit. Attempting /api/calls/follow-up fallback:", callErr);
          const apiRes = await fetch("/api/calls/follow-up", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callId: callItem.id,
              phoneNumber: callItem.phoneNumber || callItem.phone,
              contactName: callItem.contactName || callItem.contactPerson,
              outcome: editOutcome,
              notes: editNotes,
              followUpDate: compiledFollowUp
            })
          }).then(r => r.json()).catch(() => null);
          if (apiRes) {
            res = apiRes;
          } else {
            throw callErr;
          }
        } else {
          throw callErr;
        }
      }

      if (res?.error) {
        alert(res.error);
        return;
      }

      const savedCall = res?.call;
      setRecentCalls((prev) =>
        prev.map((c) => {
          if (c.id === callItem.id) {
            return {
              ...c,
              id: savedCall?.id || c.id,
              outcome: editOutcome,
              notes: editNotes,
              summary: editNotes,
              followUpDate: compiledFollowUp
            };
          }
          return c;
        })
      );

      setEditingCallId(null);
      setFeedbackMsg(compiledFollowUp ? "📅 Follow-up scheduled & call updated!" : "✅ Call details updated!");
      setTimeout(() => setFeedbackMsg(""), 2500);
    } catch (err: any) {
      console.error("Failed to update call:", err);
      const errMsg = String(err?.message || "");
      if (errMsg.includes("Server Action") || errMsg.includes("not found on the server") || errMsg.includes("failed-to-find-server-action")) {
        setFeedbackMsg("🔄 App updated. Reloading now...");
        setTimeout(() => window.location.reload(), 800);
      } else {
        alert(err?.message || "Failed to update call record");
      }
    } finally {
      setIsSavingEdit(false);
    }
  }, [editOutcome, editNotes, getCompiledEditFollowUpDate]);

  const formatFollowUpDisplay = useCallback((isoStr: string) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${timeStr}`;
  }, []);

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
    const dur = explicitDuration !== undefined && explicitDuration > 0 ? explicitDuration : (callDurationSec || 0);

    // Never transcribe audio for unconnected calls (0s duration, No Answer, Busy, Voicemail, Switched Off)
    if (
      dur <= 0 ||
      callStatus === "No Answer" ||
      callStatus === "Busy" ||
      callStatus === "Missed" ||
      outcome === "No Answer / Busy" ||
      outcome === "Voicemail / Switched Off" ||
      outcome === "Wrong Number"
    ) {
      return;
    }

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

      const contactName = selectedContact?.companyName || selectedContact?.contactPerson || newLeadName || "Direct Contact";
      const contactPhone = phoneDigits || selectedContact?.phone || "";

      let analysisResult: any = null;

      const callContextPayload = {
        contactName,
        contactPhone,
        callType: callType || "OUTBOUND",
        durationSec: dur,
        customerId: selectedContact?.type === "customer" ? selectedContact.id : (initialCustomerId || undefined),
        leadId: selectedContact?.type === "lead" ? selectedContact.id : (initialLeadId || undefined),
        isOldCustomer: selectedContact?.type === "customer" || Boolean(initialCustomerId),
      };

      // 1. Primary: REST API route
      try {
        const res = await fetch("/api/calls/analyze-debrief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: rawB64,
            mimeType: mime,
            callContext: callContextPayload
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
            callContext: callContextPayload
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
          if (a.suggestedFollowUp.hour12) setFollowUpHour(normalizeFollowUpHour(a.suggestedFollowUp.hour12));
          if (a.suggestedFollowUp.minute) setFollowUpMinute(normalizeFollowUpMinute(a.suggestedFollowUp.minute));
          if (a.suggestedFollowUp.period) setFollowUpPeriod(a.suggestedFollowUp.period === "PM" ? "PM" : "AM");
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
  }, [callDurationSec, selectedContact, newLeadName, phoneDigits, callStatus, outcome]);

  useEffect(() => {
    handleTranscribeAudioRef.current = handleTranscribeAudio;
  }, [handleTranscribeAudio]);

  const [isSyncingDeviceCalls, setIsSyncingDeviceCalls] = useState(false);
  const loadRecentCallsRef = useRef<((shouldPromptPermission?: boolean) => Promise<void>) | null>(null);

  // Load Recent Calls safely and sync with native Android call logs (missed & incoming calls)
  const loadRecentCalls = useCallback(async (shouldPromptPermission: boolean = false) => {
    setIsLoadingCalls(true);
    let serverCalls: any[] = [];
    try {
      const res = await getDialerRecentCalls(50);
      if (res && res.success && Array.isArray(res.calls)) {
        serverCalls = res.calls;
        setRecentCalls(res.calls);
      }
    } catch (err) {
      console.warn("Could not load recent calls for dialer:", err);
    } finally {
      setIsLoadingCalls(false);
    }

    // On Android Native, query real device call logs (missed calls, incoming calls, outbound calls)
    if (isAndroidNativeApp()) {
      try {
        const hasPerm = hasCallLogPermission();
        if (!hasPerm) {
          if (shouldPromptPermission) {
            requestCallLogPermission();
            setFeedbackMsg("📱 Grant Call Log permission in prompt to load missed and incoming calls.");
          }
        } else {
          setIsSyncingDeviceCalls(true);
          const devLogs = await getDeviceCallLogs(60, "ALL");
          if (devLogs && Array.isArray(devLogs) && devLogs.length > 0) {
            const formattedDevCalls = devLogs.map((d: DeviceCallLogItem) => {
              const isMissed = d.type === "MISSED" || d.type === "REJECTED" || d.type === "BLOCKED";
              const isIncoming = d.type === "INCOMING";
              const callType = (isIncoming || isMissed) ? "INBOUND" : "OUTBOUND";
              const status = isMissed ? "No Answer" : (d.duration > 0 ? "Connected" : "No Answer");
              const outcome = isMissed
                ? "Missed Call"
                : isIncoming
                  ? (d.duration > 0 ? "Incoming Call Connected" : "Missed Call")
                  : (d.duration > 0 ? "Outbound Call Connected" : "No Answer / Busy");

              const contactName = d.name && d.name !== d.number ? d.name : (d.number || "Direct Contact");

              return {
                id: `dev_${d.id || d.timestamp}`,
                createdAt: new Date(d.timestamp).toISOString(),
                callType,
                durationSec: isMissed ? 0 : Math.max(0, d.duration || 0),
                status,
                outcome,
                notes: `[Phone: ${d.number}]${d.name ? ` [Name: ${d.name}]` : ""} Device ${d.type.toLowerCase()} call`,
                followUpDate: null,
                contactName,
                contactPerson: d.name || "",
                phone: d.number,
                phoneNumber: d.number,
                contactType: "DeviceCall",
                customerId: null,
                leadId: null,
                employeeName: "Device",
                recordingUrl: null,
                summary: null,
                _isDeviceLog: true
              };
            });

            // Merge with server calls: deduplicate based on phone (last 10 digits) and timestamp within 45s
            setRecentCalls((prev) => {
              const base = prev && prev.length > 0 ? [...prev] : [...serverCalls];
              const merged = [...base];

              for (const dev of formattedDevCalls) {
                const devPhone = String(dev.phone || "").replace(/\D/g, "").slice(-10);
                const devTime = new Date(dev.createdAt).getTime();

                const isAlreadyPresent = base.some((existing) => {
                  const existPhone = String(existing.phone || existing.phoneNumber || "").replace(/\D/g, "").slice(-10);
                  const existTime = new Date(existing.createdAt).getTime();
                  return existPhone && devPhone && existPhone === devPhone && Math.abs(existTime - devTime) < 45000;
                });

                if (!isAlreadyPresent) {
                  merged.push(dev);
                }
              }

              merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              return merged;
            });

            // Sync to server in background
            syncDeviceCallLogs(devLogs).catch((syncErr) => {
              console.warn("Background syncDeviceCallLogs notice:", syncErr);
            });
          }
        }
      } catch (devErr) {
        console.warn("Error fetching device call logs:", devErr);
      } finally {
        setIsSyncingDeviceCalls(false);
      }
    }
  }, []);

  useEffect(() => {
    loadRecentCallsRef.current = loadRecentCalls;
  }, [loadRecentCalls]);

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
            if (!newLeadShop) setNewLeadShop((match as any)?.shopName || match.companyName || "");
          }
        } else if (initialLeadId) {
          const match = res.customers.find((c: any) => c.id === initialLeadId && c.type === "Lead");
          const cleanInitPhone = String(initialPhone || '').replace(/\D/g, '');
          const matchPhone = String(match?.phone || '').replace(/\D/g, '');
          if (match && (!cleanInitPhone || matchPhone.includes(cleanInitPhone) || cleanInitPhone.includes(matchPhone))) {
            setSelectedContact(match);
            if (!newLeadName) setNewLeadName(match.contactPerson || match.companyName || "");
            if (!newLeadShop) setNewLeadShop((match as any)?.shopName || match.companyName || "");
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
            if (!newLeadName) setNewLeadName(match.contactPerson || match.companyName || (match as any)?.name || "");
            if (!newLeadShop) setNewLeadShop((match as any)?.shopName || match.companyName || "");
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
        setTimeout(() => {
          try {
            localStorage.setItem("crm_device_contacts_cache", JSON.stringify(found.slice(0, 800)));
          } catch {}
        }, 200);
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

  // Load contacts whenever user navigates to Contacts tab
  useEffect(() => {
    if (activeTab === "CONTACTS") {
      if (contacts.length === 0) loadContacts();
      if (isAndroidNativeApp() && deviceContacts.length === 0) {
        loadDeviceContacts();
      }
    }
  }, [activeTab, contacts.length, deviceContacts.length, loadDeviceContacts]);

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

      if (state === "MISSED") {
        const caller = detail.phoneNumber || "Unknown Caller";
        setFeedbackMsg(`🔴 Missed call from ${caller}`);
        handleVibrate(40);
        loadRecentCallsRef.current?.(false);
      } else if (state === "RINGING" || state === "DIALING") {
        setCallStatus("No Answer");
        setIsTimerRunning(false);
        const caller = detail.phoneNumber;
        if (caller && caller !== "Unknown") {
          setFeedbackMsg(state === "DIALING" ? `📞 Calling: ${caller}...` : `📞 Incoming call ringing: ${caller}`);
        }
      } else if (state === "CONNECTED") {
        if (!callStartTimeRef.current) {
          callStartTimeRef.current = Date.now();
        }
        setIsTimerRunning(true);
        setCallStatus("Connected");
        setFeedbackMsg("🟢 Call connected! Live talk timer started.");
      } else if (state === "ENDED") {
        setIsTimerRunning(false);
        const finalDur = (typeof dur === "number" && dur > 0) ? dur : 0;
        callStartTimeRef.current = null;
        isCallInitiatedRef.current = false;
        loadRecentCallsRef.current?.(false);

        // If the call was not connected (duration is 0s)
        if (finalDur <= 0) {
          if (!isUserExplicitStatusRef.current) {
            setCallStatus("No Answer");
            setOutcome("No Answer / Busy");
            setCallDurationSec(0);
            setQuickFollowUp(1, 11, 0, "AM");
          }
          setRecordingUrl("");
          setAutoRecordTranscript("");
          setCallSummary("");
          setNotes((prev) => prev ? prev.replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "").replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "").trim() : "");
          try {
            (window as any).AndroidNative?.clearLastCallRecording?.();
          } catch (e) {}
          if (!isAndroidNativeApp() && isAutoRecording) {
            stopAutoRecording(0);
          } else if (isAndroidNativeApp()) {
            setIsAutoRecording(false);
          }
          setFeedbackMsg("ℹ️ Call not connected (0s talk time). Follow-up scheduled.");
          return;
        }

        // Stop auto-recording if running (only on desktop web)
        if (!isAndroidNativeApp() && isAutoRecording) {
          stopAutoRecording(finalDur);
        } else if (isAndroidNativeApp()) {
          setIsAutoRecording(false);
        }

        // On Native Android, retrieve the actual recording from device / MediaStore (only when finalDur > 0)
        const nativeCandidate = detail?.recordingUrl;
        const hasValidRecording = Boolean(nativeCandidate && typeof nativeCandidate === "string" && nativeCandidate.startsWith("data:audio") && nativeCandidate.length > 500);

        if (hasValidRecording) {
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
                if (!isUserExplicitStatusRef.current || callStatus === "Completed" || callStatus === "Connected") {
                  if (exactDur > 0) setCallDurationSec(exactDur);
                  setCallStatus("Completed");
                }
                setRecordingUrl(rec);
                setFeedbackMsg(`🎙️ Cellular call recording (${formatDuration(exactDur)}) attached! Transcribing with Gemini AI...`);
                handleTranscribeAudioRef.current?.(rec, exactDur);
                return;
              }
            } catch (e) {}

            if (attempts >= 5) {
              clearInterval(pollTimer);
              setRecordingUrl("");
              if (isUserExplicitStatusRef.current && (callStatus === "Busy" || callStatus === "No Answer" || callStatus === "Callback")) {
                setFeedbackMsg("ℹ️ Call not connected (0s talk time). Follow-up scheduled.");
              } else if (callStatus === "Completed" || callStatus === "Connected") {
                setFeedbackMsg("ℹ️ Call completed. Ensure auto-recording is ON in Phone Settings, or tap 'Scan Phone'.");
              } else {
                setFeedbackMsg("ℹ️ Call not connected (0s talk time). Follow-up scheduled.");
              }
            }
          }, 700);
        }

        // Respect explicit user status selection if user already interacted
        if (isUserExplicitStatusRef.current) {
          if (callStatus !== "Completed" && callStatus !== "Connected") {
            setCallDurationSec(0);
          }
        } else {
          // Outgoing calls <= 25s without native recording are unanswered ring, busy signal, or IVR
          const isConnectedCall = (finalDur > 25) || hasValidRecording;
          if (isConnectedCall) {
            setCallDurationSec(finalDur);
            setCallStatus("Completed");
            if (outcome === "No Answer / Busy" || outcome === "Voicemail / Switched Off") {
              setOutcome("Interested / Follow-up Needed");
            }
            setFeedbackMsg(`⏹ Call completed (${formatDuration(finalDur)}). Review and save call details below.`);
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

    window.addEventListener("native-call-state", handleNativeCallState);
    const onCallLogPermGranted = () => {
      loadRecentCallsRef.current?.(false);
      setFeedbackMsg("✓ Call Log permission granted! Device calls loaded.");
    };
    window.addEventListener("native-call-log-permission-granted", onCallLogPermGranted);
    return () => {
      window.removeEventListener("native-call-state", handleNativeCallState);
      window.removeEventListener("native-call-log-permission-granted", onCallLogPermGranted);
    };
  }, [outcome]);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      setPhoneDigits(initialPhone || "");
      setNewLeadName(initialName || "");
      setNewLeadShop("");
      isLeadNameManuallyEditedRef.current = false;
      isContactDismissedRef.current = false;
      prevPhoneDigitsRef.current = initialPhone || "";
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

      // Non-blocking deferred loading: let the dialer open and paint first!
      if (contacts.length === 0) {
        setTimeout(() => {
          loadContacts();
        }, 80);
      }

      if (recentCalls.length === 0) {
        setTimeout(() => {
          loadRecentCalls();
        }, 200);
      }
    } else {
      // Clear phone digits and transient state when exiting dialer
      setPhoneDigits("");
      cursorPositionRef.current = { start: 0, end: 0 };
      setSelectedContact(null);
      isLeadNameManuallyEditedRef.current = false;
      isContactDismissedRef.current = false;
      prevPhoneDigitsRef.current = "";
      setNewLeadName("");
      setNewLeadShop("");
      setShowNewLeadForm(false);
      setShowOverflowMenu(false);
    }
  }, [isOpen, initialPhone, initialName, initialCustomerId, initialLeadId, initialTab]);

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

          // NEVER fallback to elapsed wall-clock / ringing time!
          // Outgoing calls that ring and are not answered, busy, rejected or dropped have 0s talk duration.
          // Talk duration must only be set when verified by carrier call log, native recording, or user confirmation.
          callStartTimeRef.current = null;

          const isConnected = isUserExplicitStatusRef.current
            ? (callStatus === "Completed" || callStatus === "Connected")
            : (duration > 25);

          if (!isConnected) {
            // Unconnected call (0s talk time, unanswered or busy)
            if (!isUserExplicitStatusRef.current) {
              setCallStatus("No Answer");
              setOutcome("No Answer / Busy");
              setCallDurationSec(0);
              setQuickFollowUp(1, 11, 0, "AM");
              setFeedbackMsg("ℹ️ Call not connected (0s talk time). Follow-up scheduled.");
            } else {
              setCallDurationSec(0);
            }
            setRecordingUrl("");
            setAutoRecordTranscript("");
            setCallSummary("");
            setNotes((prev) => prev ? prev.replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "").replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "").trim() : "");
            try {
              (window as any).AndroidNative?.clearLastCallRecording?.();
            } catch (e) {}
            if (isAndroidNativeApp()) {
              setIsAutoRecording(false);
            } else if (isAutoRecording) {
              stopAutoRecording(0);
            }
          } else {
            // Connected call with verified talk duration
            setCallDurationSec(duration);
            setCallStatus("Completed");
            if (outcome === "No Answer / Busy" || outcome === "Voicemail / Switched Off") {
              setOutcome("Interested / Follow-up Needed");
            }
            setFeedbackMsg(`⏹ Returned from call (${formatDuration(duration)}).`);

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
                    if (!isUserExplicitStatusRef.current || callStatus === "Completed" || callStatus === "Connected") {
                      if (exactDur > 0) setCallDurationSec(exactDur);
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

  // Pre-index contacts with normalized strings & T9 mappings once on load for 0ms lag during typing
  const indexedContacts = useMemo(() => {
    if (!Array.isArray(allCombinedContacts) || allCombinedContacts.length === 0) return [];
    const slice = allCombinedContacts.length > 500 ? allCombinedContacts.slice(0, 500) : allCombinedContacts;
    return slice.map(c => {
      const rawName = c?.contactPerson || c?.companyName || c?.name || "";
      const rawComp = c?.shopName || c?.companyName || "";
      const lowerName = rawName.toLowerCase();
      const lowerComp = rawComp.toLowerCase();
      const rawPhone = String(c?.phone || c?.mobile || "");
      const cleanPhone = rawPhone.replace(/\D/g, "");
      return {
        ...c,
        _cleanPhone: cleanPhone,
        _cleanPhoneSuffix: cleanPhone.slice(-10),
        _lowerName: lowerName,
        _lowerComp: lowerComp,
        _t9Name: stringToT9Digits(lowerName),
        _t9Comp: stringToT9Digits(lowerComp),
      };
    });
  }, [allCombinedContacts]);

  // Auto-manage selectedContact as phoneDigits changes:
  // 1. If phoneDigits is empty, clear selectedContact and unedited lead fields.
  // 2. If a contact is already selected, verify it still matches the dialed digits.
  // 3. If no contact is selected, only auto-link when the dialed number is a full exact phone match (7+ digits).
  // Partial matches (T9 / name / prefix) are shown in the suggestions dropdown (filteredKeypadContacts),
  // preventing rapid oscillation, infinite re-render loops, and UI blinking.
  useEffect(() => {
    if (prevPhoneDigitsRef.current !== phoneDigits) {
      prevPhoneDigitsRef.current = phoneDigits;
      isContactDismissedRef.current = false;
    }

    if (!phoneDigits || phoneDigits.trim() === "") {
      if (selectedContact) setSelectedContact(null);
      if (!isLeadNameManuallyEditedRef.current) {
        setNewLeadName("");
        setNewLeadShop("");
      }
      return;
    }

    const cleanNum = phoneDigits.replace(/\D/g, '');

    // Check if the currently selected contact still matches dialed number
    if (selectedContact) {
      const cPhone = String(selectedContact.phone || selectedContact.mobile || '').replace(/\D/g, '');
      const stillMatches = cPhone && (
        cPhone === cleanNum || 
        (cleanNum.length >= 1 && (cPhone.startsWith(cleanNum) || (cleanNum.length <= 10 && cPhone.slice(-10).startsWith(cleanNum)))) || 
        (cleanNum.length >= 7 && (cPhone.endsWith(cleanNum) || cPhone.slice(-10) === cleanNum.slice(-10)))
      );
      if (!stillMatches) {
        setSelectedContact(null);
        if (!isLeadNameManuallyEditedRef.current) {
          setNewLeadName("");
          setNewLeadShop("");
        }
      }
      return;
    }

    // Only auto-link if there is an EXACT full phone number match (7+ digits)
    // and user has not manually dismissed the contact with [X]
    if (!selectedContact && !isContactDismissedRef.current && cleanNum.length >= 7 && indexedContacts.length > 0) {
      const exactMatch = indexedContacts.find((c: any) =>
        (c._cleanPhone && c._cleanPhone === cleanNum) ||
        (cleanNum.length >= 10 && c._cleanPhoneSuffix && c._cleanPhoneSuffix === cleanNum.slice(-10))
      );

      if (exactMatch) {
        setSelectedContact(exactMatch);
        const cName = exactMatch.contactPerson || exactMatch.companyName || exactMatch.name || "";
        const sName = exactMatch.shopName || exactMatch.companyName || "";
        if (!isLeadNameManuallyEditedRef.current) {
          setNewLeadName(cName);
          setNewLeadShop(sName);
        }
      }
    }
  }, [phoneDigits, indexedContacts, selectedContact]);

  const handleVibrate = (duration = 15) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        window.requestAnimationFrame(() => {
          try { navigator.vibrate(duration); } catch {}
        });
      } catch {}
    }
  };

  const lastKeyPointerTimeRef = useRef<number>(0);

  const handleDigitPressStart = (digit: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    lastKeyPointerTimeRef.current = Date.now();
    handleVibrate(15);

    const input = digitsInputRef.current;
    let start = input && typeof input.selectionStart === "number" ? input.selectionStart : (cursorPositionRef.current.start || phoneDigits.length);
    let end = input && typeof input.selectionEnd === "number" ? input.selectionEnd : (cursorPositionRef.current.end || phoneDigits.length);

    if (start > phoneDigits.length) start = phoneDigits.length;
    if (end > phoneDigits.length) end = phoneDigits.length;

    const before = phoneDigits.slice(0, Math.min(start, end));
    const after = phoneDigits.slice(Math.max(start, end));

    if (digit === "0") {
      isLongPressRef.current = false;
      const nextDigits = before + "0" + after;
      const nextPos = Math.min(start, end) + 1;
      setDigitsAndCursor(nextDigits, nextPos);

      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        handleVibrate(35);
        setDigitsAndCursor(before + "+" + after, nextPos);
      }, 450);
    } else {
      const nextDigits = before + digit + after;
      const nextPos = Math.min(start, end) + 1;
      setDigitsAndCursor(nextDigits, nextPos);
    }
  };

  const handleDigitPressEnd = (digit: string) => {
    if (digit === "0" && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDigitClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleZeroPressStart = () => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      handleVibrate(40);
      const input = digitsInputRef.current;
      const start = input && typeof input.selectionStart === "number" ? input.selectionStart : phoneDigits.length;
      const before = phoneDigits.slice(0, start);
      const after = phoneDigits.slice(start);
      setDigitsAndCursor(before + "+" + after, start + 1);
    }, 450);
  };

  const handleZeroPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBackspace = () => {
    handleVibrate(20);
    const input = digitsInputRef.current;
    let start = input && typeof input.selectionStart === "number" ? input.selectionStart : (cursorPositionRef.current.start || phoneDigits.length);
    let end = input && typeof input.selectionEnd === "number" ? input.selectionEnd : (cursorPositionRef.current.end || phoneDigits.length);

    if (start > phoneDigits.length) start = phoneDigits.length;
    if (end > phoneDigits.length) end = phoneDigits.length;

    // 1. If range of digits is selected (start !== end), delete the selected range
    if (start !== end) {
      const selStart = Math.min(start, end);
      const selEnd = Math.max(start, end);
      const before = phoneDigits.slice(0, selStart);
      const after = phoneDigits.slice(selEnd);
      const nextDigits = before + after;
      setDigitsAndCursor(nextDigits, selStart);
      if (!nextDigits) {
        setSelectedContact(null);
        if (!isLeadNameManuallyEditedRef.current) {
          setNewLeadName("");
          setNewLeadShop("");
        }
      }
      return;
    }

    // 2. If cursor is at position 0, nothing before it to delete
    if (start === 0) return;

    // 3. Delete single character before the cursor
    const before = phoneDigits.slice(0, start - 1);
    const after = phoneDigits.slice(start);
    const nextDigits = before + after;
    const newPos = start - 1;
    setDigitsAndCursor(nextDigits, newPos);

    if (!nextDigits) {
      setSelectedContact(null);
      if (!isLeadNameManuallyEditedRef.current) {
        setNewLeadName("");
        setNewLeadShop("");
      }
    }
  };

  const handleClear = () => {
    handleVibrate(25);
    setDigitsAndCursor("", 0);
    setSelectedContact(null);
    isLeadNameManuallyEditedRef.current = false;
    isContactDismissedRef.current = false;
    prevPhoneDigitsRef.current = "";
    setNewLeadName("");
    setNewLeadShop("");
  };

  const eraseHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEraseHeldRef = useRef<boolean>(false);
  const lastErasePointerTimeRef = useRef<number>(0);

  const handleErasePressStart = (e?: React.PointerEvent) => {
    if (e && e.button !== 0) return;
    if (e) e.preventDefault();
    lastErasePointerTimeRef.current = Date.now();
    isEraseHeldRef.current = false;
    handleBackspace();

    if (eraseHoldTimerRef.current) clearTimeout(eraseHoldTimerRef.current);
    eraseHoldTimerRef.current = setTimeout(() => {
      isEraseHeldRef.current = true;
      handleClear();
      setShowNewLeadForm(false);
    }, 450);
  };

  const handleErasePressEnd = () => {
    if (eraseHoldTimerRef.current) {
      clearTimeout(eraseHoldTimerRef.current);
      eraseHoldTimerRef.current = null;
    }
  };

  const handleEraseClick = (e: React.MouseEvent) => {
    e.preventDefault();
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
    const cleanNumber = phoneDigits.replace(/[^\d+]/g, "").trim();
    if (!cleanNumber) {
      setFeedbackMsg("⚠️ Please enter a phone number first.");
      setTimeout(() => setFeedbackMsg(""), 2500);
      return;
    }
    setIsSaving(true);
    try {
      const timeoutPromise = new Promise<{ success: boolean; error?: string; lead?: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please check network.")), 10000)
      );
      const leadName = newLeadName.trim() || newLeadShop.trim() || `Lead ${cleanNumber.slice(-4) || cleanNumber}`;
      const res = await Promise.race([
        createQuickLead({
          name: leadName,
          shopName: newLeadShop.trim() || undefined,
          whatsappNumber: cleanNumber,
          notes: "Created from Smart Dialer"
        }),
        timeoutPromise
      ]);
      if (res && res.success && res.lead) {
        setSelectedContact({
          id: res.lead.id,
          companyName: res.lead.shopName,
          contactPerson: res.lead.name,
          phone: res.lead.whatsappNumber,
          type: res.lead.isCustomer ? "Customer" : "Lead"
        });
        setNewLeadName("");
        setNewLeadShop("");
        isLeadNameManuallyEditedRef.current = false;
        setShowNewLeadForm(false);
        setFeedbackMsg("✓ Lead created and linked!");
        loadContacts();
        setTimeout(() => setFeedbackMsg(""), 2500);
      } else {
        setFeedbackMsg(`❌ ${res?.error || "Could not save lead."}`);
      }
    } catch (e: any) {
      const errMsg = String(e?.message || "");
      if (errMsg.includes("Server Action") || errMsg.includes("not found on the server") || errMsg.includes("failed-to-find-server-action")) {
        setFeedbackMsg("🔄 App updated. Reloading now...");
        setTimeout(() => window.location.reload(), 800);
      } else {
        setFeedbackMsg(`❌ ${e?.message || "Error saving lead."}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMatchedContact = (contact: any) => {
    isContactDismissedRef.current = false;
    setSelectedContact(contact);
    if (contact?.phone) {
      const p = String(contact.phone).trim();
      const hasPlus = p.startsWith("+");
      const cleanDigits = p.replace(/[^\d]/g, "");
      const formatted = hasPlus ? `+${cleanDigits}` : (cleanDigits.length === 12 && cleanDigits.startsWith("91") ? `+${cleanDigits}` : cleanDigits);
      setPhoneDigits(formatted || p);
      prevPhoneDigitsRef.current = formatted || p;
    }
    const cName = contact?.companyName || contact?.contactPerson || contact?.name || "";
    setNewLeadName(cName);
    const sName = contact?.shopName || contact?.companyName || "";
    setNewLeadShop(sName);
    isLeadNameManuallyEditedRef.current = false;
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
      const cName = targetContact?.companyName || targetContact?.contactPerson || targetContact?.name || "";
      setNewLeadName(cName);
      const sName = targetContact?.shopName || targetContact?.companyName || "";
      setNewLeadShop(sName);
      isLeadNameManuallyEditedRef.current = false;
    }

    handleVibrate(30);

    const now = Date.now();
    callStartTimeRef.current = null;
    setCallDurationSec(0);
    setIsTimerRunning(false);
    isCallInitiatedRef.current = true;
    isUserExplicitStatusRef.current = false;
    setCallStatus("No Answer");
    setOutcome("No Answer / Busy");
    setCallType("OUTBOUND");

    setRecordingUrl("");
    setAutoRecordTranscript("");
    setCallSummary("");
    setNotes("");

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
    setFeedbackMsg(`📞 Outbound call dialed. Awaiting answer...${recMsg}`);
  };

  // Handle connection status toggle — immediately reset duration to 0 if not connected
  const handleCallStatusChange = (newStatus: string) => {
    isUserExplicitStatusRef.current = true;
    setCallStatus(newStatus);
    if (newStatus !== "Connected" && newStatus !== "Completed") {
      setCallDurationSec(0);
      setIsTimerRunning(false);
      callStartTimeRef.current = null;
      setRecordingUrl("");
      setAutoRecordTranscript("");
      setCallSummary("");
      setNotes((prev) => prev ? prev.replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "").replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "").trim() : "");
      try {
        (window as any).AndroidNative?.clearLastCallRecording?.();
      } catch (e) {}
      if (newStatus === "Busy" || newStatus === "No Answer") {
        setOutcome("No Answer / Busy");
      } else if (newStatus === "Callback") {
        setOutcome("Call Back Later");
      }
    } else {
      if (callDurationSec === 0) setCallDurationSec(30);
      if (outcome === "No Answer / Busy" || outcome === "Call Back Later") {
        setOutcome("Interested / Follow-up Needed");
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
    if (isSavingRecordRef.current || isSaving) return;
    isSavingRecordRef.current = true;
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
          const typeLower = String(selectedContact.type || "").toLowerCase();
          if (typeLower === "customer") activeCustomerId = selectedContact.id;
          else if (typeLower === "lead") activeLeadId = selectedContact.id;
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

      if (!activeCustomerId && !activeLeadId && (newLeadName.trim() || newLeadShop.trim()) && cleanPhone.length >= 7) {
        try {
          const timeoutLead = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Lead creation timeout")), 8000));
          const leadRes = await Promise.race([
            createQuickLead({
              name: newLeadName.trim() || "New Phone Lead",
              shopName: newLeadShop.trim() || "Phone Inquiry",
              whatsappNumber: phoneDigits,
              notes: `Created from Phone Dialer call (${outcome}) - Duration: ${callDurationSec}s`
            }),
            timeoutLead
          ]);
          if (leadRes && leadRes.success && leadRes.lead) {
            activeLeadId = leadRes.lead.id;
            loadContacts();
          }
        } catch (leadErr) {
          console.warn("Could not quick-create lead in save:", leadErr);
        }
      }

      // Encode auto-recorded audio chunks to Base64 URL if recordingUrl not already set
      let finalRecordingUrl = recordingUrl;
      if (!finalRecordingUrl && lastRecordedChunksRef.current && lastRecordedChunksRef.current.length > 0) {
        try {
          const audioBlob = new Blob(lastRecordedChunksRef.current, { type: "audio/webm" });
          finalRecordingUrl = await new Promise<string>((resolve) => {
            const timeout = setTimeout(() => resolve(""), 3000);
            const reader = new FileReader();
            reader.onloadend = () => {
              clearTimeout(timeout);
              resolve((reader.result as string) || "");
            };
            reader.onerror = () => {
              clearTimeout(timeout);
              resolve("");
            };
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
      const isConnected = (callStatus === "Completed" || callStatus === "Connected") &&
        callDurationSec > 0 &&
        outcome !== "No Answer / Busy" &&
        outcome !== "Voicemail / Switched Off" &&
        outcome !== "Wrong Number";
      const finalDurationSec = isConnected ? callDurationSec : 0;
      formData.append("type", callType);
      formData.append("status", isConnected ? callStatus : "No Answer");
      formData.append("outcome", outcome);
      formData.append("durationSec", String(finalDurationSec));

      let cleanNotes = (notes || "").trim();
      if (!isConnected) {
        cleanNotes = cleanNotes
          .replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "")
          .replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "")
          .trim();
      }
      formData.append("notes", cleanNotes);
      if (isConnected && finalRecordingUrl) formData.append("recordingUrl", finalRecordingUrl);
      const effectiveSummary = isConnected ? (callSummary || autoRecordTranscriptRef.current || autoRecordTranscript) : "";
      if (effectiveSummary) formData.append("summary", effectiveSummary);

      const compiledFollowUp = getCompiledFollowUpDate();
      if (compiledFollowUp) {
        formData.append("followUpDate", compiledFollowUp);
      }

      const timeoutCall = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Call logging timeout")), 15000));
      let res: any;
      try {
        res = await Promise.race([
          logCall(formData),
          timeoutCall
        ]);
      } catch (callErr: any) {
        const errMsg = String(callErr?.message || "");
        if (errMsg.includes("Server Action") || errMsg.includes("not found on the server") || errMsg.includes("failed-to-find-server-action")) {
          console.warn("Server action hash mismatch detected. Attempting /api/calls/log fallback:", callErr);
          const apiRes = await fetch("/api/calls/log", {
            method: "POST",
            body: formData
          }).then(r => r.json()).catch(() => null);
          if (apiRes && apiRes.success) {
            res = apiRes;
          } else {
            throw callErr;
          }
        } else {
          throw callErr;
        }
      }

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
      const errMsg = String(err?.message || "");
      if (errMsg.includes("Server Action") || errMsg.includes("not found on the server") || errMsg.includes("failed-to-find-server-action")) {
        setFeedbackMsg("🔄 App updated. Reloading now...");
        setTimeout(() => window.location.reload(), 800);
      } else {
        setFeedbackMsg(`❌ ${err?.message || "Error saving call record. Check connection and retry."}`);
      }
    } finally {
      isSavingRecordRef.current = false;
      setIsSaving(false);
    }
  };

  // Filter contacts dropdown in keypad — matches across BOTH CRM and Phone contacts with pre-indexed T9 search!
  const filteredKeypadContacts = useMemo(() => {
    if (!deferredPhoneDigits || deferredPhoneDigits.trim().length < 2 || indexedContacts.length === 0) return [];
    const q = deferredPhoneDigits.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    const cleanLen = cleanQ.length;
    if (cleanLen < 2) return [];

    const results: any[] = [];
    for (let i = 0; i < indexedContacts.length; i++) {
      const c = indexedContacts[i];
      const phoneMatch = c._cleanPhone.includes(cleanQ) || 
        c._cleanPhoneSuffix.startsWith(cleanQ) || 
        (cleanLen >= 7 && c._cleanPhoneSuffix === cleanQ.slice(-10));
      const t9Match = c._t9Name.includes(cleanQ) || c._t9Comp.includes(cleanQ);

      if (phoneMatch || t9Match) {
        results.push(c);
        if (results.length >= 4) break;
      }
    }
    return results;
  }, [indexedContacts, deferredPhoneDigits]);

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
      if (callLogFilter === "CONNECTED") return (c.status === "Connected" || c.status === "Completed") && (c.durationSec || 0) > 0;
      if (callLogFilter === "MISSED") return c.status !== "Connected" && c.status !== "Completed";
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
        const matchT9 = cleanQ.length >= 2 && (matchesT9(c.contactPerson || c.name || "", cleanQ) || matchesT9(c.companyName || c.shopName || "", cleanQ));
        if (!matchName && !matchComp && !matchPhone && !matchT9) return false;
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`dialer-backdrop ${isOpen ? "dialer-open" : "dialer-closed"}`}
      style={{
        display: isOpen ? "flex" : "none",
        visibility: isOpen ? "visible" : "hidden",
        pointerEvents: isOpen ? "auto" : "none"
      }}
      onClick={onClose}
    >
      <div className="dialer-sheet" onClick={(e) => e.stopPropagation()}>
        {/* S26 TOP ACTION BAR */}
        <div className="s26-top-bar">
          <div className="s26-top-left">
            {activeTab !== "DIALPAD" ? (
              <button
                type="button"
                className="s26-back-btn"
                onClick={() => setActiveTab("DIALPAD")}
                title="Back to Keypad"
              >
                <ChevronLeft size={24} />
              </button>
            ) : null}
            <span className="s26-screen-title">
              {activeTab === "DIALPAD" ? (
                <div className="s26-brand-pill">
                  <span className="s26-live-dot" />
                  <span>TeleCRM 5G · {selectedSim?.slotLabel || "SIM 1"}</span>
                </div>
              ) : activeTab === "CALL_LOGS" ? (
                "Recent Calls"
              ) : activeTab === "CONTACTS" ? (
                "Contacts Directory"
              ) : activeTab === "POST_CALL" ? (
                "Log Call"
              ) : activeTab === "WHATSAPP" ? (
                "WhatsApp Templates"
              ) : (
                "Calling Scripts"
              )}
            </span>
          </div>

          <div className="s26-top-right">
            {activeTab === "POST_CALL" && (
              <button
                type="button"
                onClick={handleSaveCallRecord}
                disabled={isSaving}
                className="s26-header-save-btn"
                title="Save Call & Lead to CRM"
              >
                {isSaving ? (
                  <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Check size={13} />
                )}
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>
            )}

            {/* Search Button (Switches to Contacts Search - hidden on Log Call tab to prevent header congestion) */}
            {activeTab !== "POST_CALL" && (
              <button
                type="button"
                className="s26-icon-btn"
                onClick={() => {
                  setActiveTab("CONTACTS");
                  setShowOverflowMenu(false);
                }}
                title="Search Contacts"
              >
                <Search size={20} />
              </button>
            )}

            {/* 3-Dots More Options with Signature Orange Badge Dot */}
            <button
              type="button"
              className="s26-icon-btn s26-more-btn"
              onClick={() => setShowOverflowMenu(prev => !prev)}
              title="More Options"
            >
              <MoreVertical size={20} />
              <span className="s26-badge-dot" />
            </button>

            {/* Close Dialer Button */}
            <button
              type="button"
              className="s26-icon-btn"
              onClick={onClose}
              title="Close Dialer (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* S26 FROSTED GLASS OVERFLOW MENU POPOVER */}
          {showOverflowMenu && (
            <>
              <div className="s26-overflow-backdrop" onClick={() => setShowOverflowMenu(false)} />
              <div className="s26-overflow-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="s26-menu-item"
                  onClick={() => {
                    setActiveTab("POST_CALL");
                    setShowOverflowMenu(false);
                  }}
                >
                  <div className="s26-menu-item-left">
                    <Clock size={16} style={{ color: "#4f46e5" }} />
                    <span>Log Call / CRM Note</span>
                  </div>
                  <span className="s26-menu-badge">CRM</span>
                </button>

                <button
                  type="button"
                  className="s26-menu-item"
                  onClick={() => {
                    setActiveTab("WHATSAPP");
                    setShowOverflowMenu(false);
                  }}
                >
                  <div className="s26-menu-item-left">
                    <WhatsAppLogo size={16} style={{ color: "#25d366" }} />
                    <span>WhatsApp Templates</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="s26-menu-item"
                  onClick={() => {
                    setActiveTab("SCRIPTS");
                    setShowOverflowMenu(false);
                  }}
                >
                  <div className="s26-menu-item-left">
                    <BookOpen size={16} style={{ color: "#f59e0b" }} />
                    <span>Sales Calling Scripts</span>
                  </div>
                </button>

                <div className="s26-menu-divider" />

                {/* Multi-SIM Switch in Menu */}
                {availableSims.length > 1 && (
                  <button
                    type="button"
                    className="s26-menu-item"
                    onClick={() => {
                      const nextIndex = availableSims.findIndex(s => s?.subscriptionId === selectedSim?.subscriptionId) === 0 ? 1 : 0;
                      const nextSim = availableSims[nextIndex] || availableSims[0];
                      setSelectedSim(nextSim);
                      handleVibrate(20);
                      setFeedbackMsg(`📶 Switched to ${nextSim?.slotLabel || "SIM"}: ${nextSim?.carrierName || "Cellular"}`);
                      setShowOverflowMenu(false);
                    }}
                  >
                    <div className="s26-menu-item-left">
                      <Radio size={16} style={{ color: "#06b6d4" }} />
                      <span>Switch SIM</span>
                    </div>
                    <span className="s26-menu-badge">{selectedSim?.slotLabel || "SIM 1"}</span>
                  </button>
                )}

                {/* Auto-Recording Toggle */}
                <button
                  type="button"
                  className="s26-menu-item"
                  onClick={() => {
                    if (!autoRecordEnabled) setShowRecordConsentDialog(true);
                    else {
                      setAutoRecordEnabled(false);
                      try { localStorage.setItem('crm_auto_record_calls', 'false'); } catch {}
                    }
                    setShowOverflowMenu(false);
                  }}
                >
                  <div className="s26-menu-item-left">
                    <Volume2 size={16} style={{ color: autoRecordEnabled ? "#ef4444" : "#64748b" }} />
                    <span>Call Recording</span>
                  </div>
                  <span className="s26-menu-badge" style={{ color: autoRecordEnabled ? "#15803d" : "#64748b" }}>
                    {autoRecordEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                {/* Sync Phonebook Contacts */}
                <button
                  type="button"
                  className="s26-menu-item"
                  onClick={() => {
                    loadDeviceContacts();
                    setShowOverflowMenu(false);
                  }}
                >
                  <div className="s26-menu-item-left">
                    <Smartphone size={16} style={{ color: "#3b82f6" }} />
                    <span>Sync Phonebook</span>
                  </div>
                </button>

                {/* Sync Missed & Incoming Calls */}
                {isAndroidNativeApp() && (
                  <button
                    type="button"
                    className="s26-menu-item"
                    onClick={() => {
                      loadRecentCalls(true);
                      setShowOverflowMenu(false);
                      setActiveTab("CALL_LOGS");
                    }}
                  >
                    <div className="s26-menu-item-left">
                      <History size={16} style={{ color: "#10b981" }} />
                      <span>Sync Missed & Inbound Calls</span>
                    </div>
                  </button>
                )}

                {/* Create Quick Lead */}
                <button
                  type="button"
                  className="s26-menu-item"
                  onClick={() => {
                    setShowNewLeadForm(true);
                    setActiveTab("DIALPAD");
                    setShowOverflowMenu(false);
                  }}
                >
                  <div className="s26-menu-item-left">
                    <UserPlus size={16} style={{ color: "#8b5cf6" }} />
                    <span>Create CRM Lead</span>
                  </div>
                </button>

                <div className="s26-menu-divider" />

                <button
                  type="button"
                  className="s26-menu-item danger"
                  onClick={() => {
                    setShowOverflowMenu(false);
                    onClose();
                  }}
                >
                  <div className="s26-menu-item-left">
                    <X size={16} />
                    <span>Close Dialer</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* FEEDBACK MSG TOAST */}
        {feedbackMsg && (
          <div className="dialer-feedback-toast">
            {feedbackMsg.includes("Server Action") || feedbackMsg.includes("not found on the server") || feedbackMsg.includes("failed-to-find-server-action") ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                <span>🔄 App updated to new version. Please reload to apply changes.</span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Reload Now
                </button>
              </div>
            ) : (
              <>
                <span className="dialer-feedback-toast-text">{feedbackMsg}</span>
                <button type="button" onClick={() => setFeedbackMsg("")} className="dialer-toast-close" title="Dismiss">
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        )}

        {/* BODY SCROLL CONTENT */}
        <div className={`dialer-body-scroll ${activeTab === "DIALPAD" ? (showNewLeadForm ? "dialpad-lead-form-active" : "dialpad-tab-active") : ""}`}>
          {/* =========================================================
              TAB 1: NUMERIC KEYPAD & DIALER
              ========================================================= */}
          {/* =========================================================
              TAB 1: NUMERIC KEYPAD & DIALER (MODERN REDESIGN)
              ========================================================= */}
          {activeTab === "DIALPAD" && (
            <div className={`s26-dialpad-screen ${showNewLeadForm ? "lead-form-open" : ""}`}>
              {showNewLeadForm ? (
                <div className="s26-lead-form-container">
                  <div className="s26-lead-form-view">
                    <div className="s26-lead-form-header">
                      <div className="s26-lead-form-header-title">
                        <div className="s26-lead-form-icon-circle">
                          <UserPlus size={18} color="#2563eb" />
                        </div>
                        <div>
                          <div className="s26-lead-form-title-text">Add New CRM Lead</div>
                          <div className="s26-lead-form-subtitle-text">
                            {phoneDigits ? `Saving for: ${phoneDigits}` : "Enter lead details below"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="s26-lead-form-header-close"
                        onClick={() => setShowNewLeadForm(false)}
                        title="Cancel & Back to Keypad"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Phone Number Field */}
                    <div className="s26-lead-input-group">
                      <label className="s26-lead-input-label">
                        <Phone size={12} /> Phone Number <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phoneDigits}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^\d+*#\s-]/g, "");
                          setDigitsAndCursor(clean, clean.length);
                        }}
                        className="s26-lead-input-box"
                      />
                    </div>

                    {/* Contact / Person Name Field */}
                    <div className="s26-lead-input-group">
                      <label className="s26-lead-input-label">
                        <User size={12} /> Contact / Person Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={newLeadName}
                        onChange={(e) => {
                          isLeadNameManuallyEditedRef.current = true;
                          setNewLeadName(e.target.value);
                        }}
                        className="s26-lead-input-box"
                        autoFocus
                      />
                    </div>

                    {/* Shop / Business Name Field */}
                    <div className="s26-lead-input-group">
                      <label className="s26-lead-input-label">
                        <Store size={12} /> Shop / Business Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sharma Traders"
                        value={newLeadShop}
                        onChange={(e) => {
                          isLeadNameManuallyEditedRef.current = true;
                          setNewLeadShop(e.target.value);
                        }}
                        className="s26-lead-input-box"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="s26-lead-form-actions">
                      <button
                        type="button"
                        onClick={handleCreateQuickLeadInline}
                        disabled={isSaving || !phoneDigits.trim()}
                        className="s26-lead-save-primary-btn"
                      >
                        <Check size={16} />
                        <span>{isSaving ? "Saving Lead..." : "Save to CRM"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowNewLeadForm(false)}
                        className="s26-lead-cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* S26 DISPLAY ZONE: Clean, spacious typography */}
                  <div className="s26-display-zone">
                    <div className="s26-digits-wrapper">
                      <input
                        ref={digitsInputRef}
                        type="text"
                        inputMode="none"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="s26-digits-input"
                        value={phoneDigits}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^\d+*#\s-]/g, "");
                          const pos = e.target.selectionStart ?? clean.length;
                          setDigitsAndCursor(clean, pos);
                        }}
                        onSelect={updateCursorFromInput}
                        onClick={updateCursorFromInput}
                        onKeyUp={updateCursorFromInput}
                        onTouchEnd={() => {
                          setTimeout(updateCursorFromInput, 60);
                        }}
                        style={{
                          fontSize: phoneDigits.length <= 7 
                            ? '38px' 
                            : phoneDigits.length <= 11 
                              ? '34px' 
                              : phoneDigits.length <= 14 
                                ? '28px' 
                                : '22px',
                          ['--dialed-font-size' as string]: phoneDigits.length <= 7 
                            ? '38px' 
                            : phoneDigits.length <= 11 
                              ? '34px' 
                              : phoneDigits.length <= 14 
                                ? '28px' 
                                : '22px',
                          fontWeight: 400,
                          letterSpacing: '0.8px',
                          color: 'var(--s26-text-main, #0f172a)',
                          lineHeight: 1.15,
                          minHeight: '48px',
                          display: 'block',
                          textAlign: 'center',
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          padding: '0 8px',
                          caretColor: '#2563eb',
                          cursor: 'text'
                        }}
                        placeholder=""
                      />
                    </div>

                    {/* S26 CONTEXT CANVAS */}
                    <div className="s26-context-canvas">
                      {selectedContact ? (
                        <div className="s26-matched-contact-pill">
                          <div className="s26-matched-contact-left">
                            <div className="s26-matched-avatar">
                              {(selectedContact.companyName || selectedContact.contactPerson || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className="s26-matched-info">
                              <span className="s26-matched-name">{selectedContact.companyName || selectedContact.contactPerson}</span>
                              <span className="s26-matched-meta">
                                <span className={`dialer-pill-badge ${selectedContact.type === "Customer" ? "customer" : "lead"}`}>
                                  {selectedContact.type || "Contact"}
                                </span>
                                <span>{selectedContact.phone}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              isContactDismissedRef.current = true;
                              setSelectedContact(null);
                            }}
                            style={{ background: "none", border: "none", color: "var(--s26-text-sub)", cursor: "pointer", padding: "4px" }}
                            title="Clear Contact"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : phoneDigits.trim().length >= 2 && filteredKeypadContacts.length > 0 ? (
                        <div className="s26-suggestions-box">
                          <div className="s26-suggestions-header">
                            <span>Matching Contacts ({filteredKeypadContacts.length})</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newLeadName && filteredKeypadContacts.length > 0) {
                                  setNewLeadName(filteredKeypadContacts[0].contactPerson || filteredKeypadContacts[0].companyName || "");
                                  setNewLeadShop(filteredKeypadContacts[0].companyName || "");
                                }
                                setShowNewLeadForm(true);
                              }}
                              style={{
                                background: "rgba(37, 99, 235, 0.08)",
                                color: "#2563eb",
                                border: "1px solid rgba(37, 99, 235, 0.2)",
                                borderRadius: "10px",
                                padding: "2px 7px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px"
                              }}
                            >
                              <UserPlus size={10} /> + New Lead
                            </button>
                          </div>
                          <div className="s26-suggestions-list">
                            {filteredKeypadContacts.slice(0, 3).map((c: any) => (
                              <div
                                key={c.id}
                                onClick={() => handleSelectMatchedContact(c)}
                                className="s26-suggestion-row"
                              >
                                <div className="s26-suggestion-avatar">
                                  {(c.companyName || c.contactPerson || "C").charAt(0).toUpperCase()}
                                </div>
                                <div className="s26-suggestion-info">
                                  <span className="s26-suggestion-name">{c.companyName || c.contactPerson}</span>
                                  <span className="s26-suggestion-phone">{c.phone}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInitiateCall(c.phone, c);
                                  }}
                                  className="s26-suggestion-call-btn"
                                  title="Call"
                                >
                                  <PhoneCall size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* S26 DUAL-SIM INDICATOR BAR */}
                  <div className="s26-sim-bar">
                    {availableSims.length > 1 ? (
                      availableSims.map((sim, idx) => {
                        const isSelected = (selectedSim?.subscriptionId != null && selectedSim.subscriptionId === sim?.subscriptionId)
                          || (selectedSim?.slotIndex != null && selectedSim.slotIndex === sim?.slotIndex);
                        return (
                          <button
                            key={sim?.subscriptionId ?? idx}
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
                            className={`s26-sim-pill ${isSelected ? "active" : ""}`}
                          >
                            <Radio size={11} />
                            <span>{sim?.slotLabel || `SIM ${idx + 1}`}: {sim?.carrierName || sim?.displayName || "Carrier"}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="s26-sim-pill active">
                        <Radio size={11} />
                        <span>{availableSims[0]?.carrierName || availableSims[0]?.displayName || "Cellular"} ({availableSims[0]?.slotLabel || "SIM 1"})</span>
                      </div>
                    )}
                  </div>

                  {/* S26 KEYPAD & CALL CONTROLS */}
                  <div className="s26-keypad-container">
                    <div className="s26-keypad-grid">
                      {DIALPAD_KEYS.map((k) => (
                        <button
                          key={k.digit}
                          type="button"
                          className="s26-key-btn"
                          onPointerDown={(e) => handleDigitPressStart(k.digit, e)}
                          onPointerUp={() => handleDigitPressEnd(k.digit)}
                          onPointerCancel={() => handleDigitPressEnd(k.digit)}
                          onClick={(e) => handleDigitClick(e)}
                          onContextMenu={(e) => {
                            if (k.digit === "0") {
                              e.preventDefault();
                              handleVibrate(30);
                              setPhoneDigits(prev => prev + "+");
                            }
                          }}
                        >
                          <span className="s26-key-digit">{k.digit}</span>
                          {k.sub && <span className="s26-key-sub">{k.sub}</span>}
                        </button>
                      ))}
                    </div>

                    {/* S26 CALL BUTTON ROW - 3 COLUMNS MATCHING KEYPAD (*, 0, #) */}
                    <div className="s26-actions-row">
                      {/* Column 1: WhatsApp Button aligned directly below * button */}
                      <button
                        type="button"
                        className="s26-aux-btn wa"
                        onClick={() => handleInitiateWhatsApp()}
                        title="Open WhatsApp Chat"
                      >
                        <WhatsAppLogo size={24} />
                      </button>

                      {/* Column 2: Call Button aligned directly below 0 button */}
                      <button
                        type="button"
                        className="s26-call-btn"
                        onClick={() => handleInitiateCall()}
                        title="Call Now"
                      >
                        <PhoneCall size={28} />
                      </button>

                      {/* Column 3: Erase / Backspace Button aligned directly below # button */}
                      <button
                        type="button"
                        className={`s26-aux-btn erase ${phoneDigits ? "active" : "muted"}`}
                        onPointerDown={phoneDigits ? (e) => handleErasePressStart(e) : undefined}
                        onPointerUp={phoneDigits ? handleErasePressEnd : undefined}
                        onPointerCancel={phoneDigits ? handleErasePressEnd : undefined}
                        onClick={phoneDigits ? (e) => handleEraseClick(e) : undefined}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (phoneDigits) {
                            handleClear();
                            setShowNewLeadForm(false);
                          }
                        }}
                        disabled={!phoneDigits}
                        title={phoneDigits ? "Tap to erase digit, hold to clear all" : "Backspace"}
                        aria-label="Erase"
                      >
                        <Delete size={26} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </>
              )}
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
                      {((selectedContact?.companyName || selectedContact?.contactPerson || newLeadName.trim() || "D")[0] || "D").toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--dialer-text-main, #0f172a)" }}>
                          {selectedContact?.companyName || selectedContact?.contactPerson || newLeadName.trim() || (phoneDigits ? `Direct: ${phoneDigits}` : "Direct Call")}
                        </span>
                        <span style={{
                          fontSize: "0.62rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: selectedContact?.type === "Customer" ? "#e0e7ff" : selectedContact?.type === "Lead" ? "#fef3c7" : "#f1f5f9",
                          color: selectedContact?.type === "Customer" ? "#3730a3" : selectedContact?.type === "Lead" ? "#92400e" : "#475569",
                          fontWeight: 700
                        }}>
                          {selectedContact?.type === "DeviceContact" 
                            ? "📱 Phonebook" 
                            : selectedContact?.type === "Customer"
                              ? "Customer"
                              : selectedContact?.type === "Lead"
                                ? "CRM Lead"
                                : newLeadName.trim()
                                  ? "New Lead"
                                  : "Direct Call"}
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
                          <WhatsAppLogo size={15} />
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
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
                      onChange={(e) => {
                        isLeadNameManuallyEditedRef.current = true;
                        setNewLeadName(e.target.value);
                      }}
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
                      onChange={(e) => {
                        isLeadNameManuallyEditedRef.current = true;
                        setNewLeadShop(e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* ── Follow-up & Save Lead Option (Placed right below Lead Name / Shop Section) ── */}
                <div className="dialer-lead-followup-box">
                  <div className="dialer-followup-header">
                    <span className="dialer-followup-title">
                      <Calendar size={13} style={{ color: "#4f46e5" }} /> Next Follow-up & Reminder
                    </span>
                  </div>
                  <div className="dialer-quick-preset-chips">
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(0, 16, 0, "PM")}
                      className="dialer-preset-chip"
                    >
                      Today 4 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(1, 11, 0, "AM")}
                      className="dialer-preset-chip"
                    >
                      Tomorrow 11 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(2, 11, 0, "AM")}
                      className="dialer-preset-chip"
                    >
                      In 2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(7, 11, 0, "AM")}
                      className="dialer-preset-chip"
                    >
                      Next Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(-1, 0, 0, "AM")}
                      className="dialer-preset-chip clear"
                    >
                      ✕ None
                    </button>
                  </div>

                  <div className="dialer-datetime-row">
                    <input
                      type="date"
                      className="dialer-text-input dialer-date-input"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                    <div className="dialer-time-selects">
                      <select
                        className="dialer-select-input dialer-time-select"
                        value={followUpHour}
                        onChange={(e) => setFollowUpHour(e.target.value)}
                        aria-label="Hour"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="dialer-time-colon">:</span>
                      <select
                        className="dialer-select-input dialer-time-select"
                        value={followUpMinute}
                        onChange={(e) => setFollowUpMinute(e.target.value)}
                        aria-label="Minute"
                      >
                        {["00", "15", "30", "45"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setFollowUpPeriod(prev => prev === "AM" ? "PM" : "AM")}
                        className="dialer-period-toggle-btn"
                        title="Toggle AM/PM"
                      >
                        {followUpPeriod}
                      </button>
                    </div>
                  </div>

                  {/* Save Lead Status / Quick Save Button */}
                  <div className="dialer-save-lead-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={13} color="#10b981" />
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--dialer-text-sub, #475569)" }}>
                        {selectedContact?.type === "Customer" 
                          ? "Existing Customer Record" 
                          : selectedContact?.type === "Lead" 
                            ? "Existing CRM Lead" 
                            : newLeadName.trim()
                              ? "Will be saved as CRM Lead on Log Call"
                              : "Call will be logged (No Lead created)"}
                      </span>
                    </div>
                    {(!selectedContact || selectedContact.type === "DeviceContact") && newLeadName.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={handleCreateQuickLeadInline}
                        disabled={isSaving}
                        className="dialer-quick-save-lead-btn"
                      >
                        <UserPlus size={12} /> {isSaving ? "Saving..." : "Save Lead Now"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: CALL STATUS & OUTCOME */}
              <div className="dialer-postcall-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="dialer-field-label" style={{ margin: 0 }}>Call Connection Status</label>
                  <div className="dialer-segment-group" style={{ height: "26px" }}>
                    <button
                      type="button"
                      className={`dialer-segment-btn ${callType === "OUTBOUND" ? "active" : ""}`}
                      onClick={() => setCallType("OUTBOUND")}
                      style={{ padding: "0 8px", fontSize: "0.7rem" }}
                    >
                      <PhoneOutgoing size={11} /> Out
                    </button>
                    <button
                      type="button"
                      className={`dialer-segment-btn ${callType === "INBOUND" ? "active" : ""}`}
                      onClick={() => setCallType("INBOUND")}
                      style={{ padding: "0 8px", fontSize: "0.7rem" }}
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
                    onClick={() => handleCallStatusChange("Completed")}
                  >
                    <div className="dialer-status-chip-label">
                      <PhoneCall size={13} />
                      <span>Talked</span>
                    </div>
                    <span className="dialer-status-chip-sub">Connected</span>
                  </button>

                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "Busy" ? "active-busy" : ""}`}
                    onClick={() => handleCallStatusChange("Busy")}
                  >
                    <div className="dialer-status-chip-label">
                      <PhoneOff size={13} />
                      <span>Busy</span>
                    </div>
                    <span className="dialer-status-chip-sub">Engaged</span>
                  </button>

                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "No Answer" ? "active-noanswer" : ""}`}
                    onClick={() => handleCallStatusChange("No Answer")}
                  >
                    <div className="dialer-status-chip-label">
                      <PhoneMissed size={13} />
                      <span>No Answer</span>
                    </div>
                    <span className="dialer-status-chip-sub">Missed</span>
                  </button>

                  <button
                    type="button"
                    className={`dialer-status-chip ${callStatus === "Callback" ? "active-callback" : ""}`}
                    onClick={() => handleCallStatusChange("Callback")}
                  >
                    <div className="dialer-status-chip-label">
                      <Clock size={13} />
                      <span>Callback</span>
                    </div>
                    <span className="dialer-status-chip-sub">Call later</span>
                  </button>
                </div>

                {/* Talk Duration - Only if status is Connected or Completed */}
                {(callStatus === "Completed" || callStatus === "Connected") ? (
                  <div className="dialer-stopwatch-box">
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.64rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                        Talk Duration
                      </span>
                      <div className="dialer-stopwatch-digits">
                        {isTimerRunning && <span className="dialer-pulse-dot" />}
                        <span>{formatDuration(callDurationSec)}</span>
                        {isTimerRunning && (
                          <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 800, background: "#dcfce7", padding: "1px 5px", borderRadius: "4px" }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "4px", alignItems: "center", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setCallDurationSec(prev => Math.max(0, prev - 15))}
                        className="dialer-timer-adj-btn"
                        title="Minus 15s"
                      >
                        -15s
                      </button>
                      <button
                        type="button"
                        onClick={() => setCallDurationSec(prev => prev + 15)}
                        className="dialer-timer-adj-btn"
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
                          className="dialer-timer-action-btn end"
                        >
                          <PhoneOff size={11} /> End
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            callStartTimeRef.current = Date.now() - (callDurationSec * 1000);
                            setIsTimerRunning(true);
                            setCallStatus("Connected");
                          }}
                          className="dialer-timer-action-btn resume"
                        >
                          <Play size={11} /> Resume
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    marginTop: "8px",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    backgroundColor: "var(--dialer-bg-subtle, #f8fafc)",
                    border: "1px dashed var(--dialer-border, #cbd5e1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--dialer-text-sub, #64748b)", fontWeight: 600 }}>
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
                      + Add Time
                    </button>
                  </div>
                )}

                {/* Call Outcome / Disposition */}
                <div style={{ marginTop: "12px" }}>
                  <label className="dialer-field-label" style={{ marginBottom: "6px" }}>Call Outcome / Disposition</label>
                  <div className="dialer-stylish-outcome-container">
                    <div className="dialer-stylish-outcome-btn">
                      <div className="dialer-stylish-outcome-left">
                        <span
                          className="dialer-stylish-outcome-indicator"
                          style={{
                            backgroundColor: getOutcomeMeta(outcome).color,
                            boxShadow: `0 0 0 3px ${getOutcomeMeta(outcome).bg}`
                          }}
                        />
                        <span className="dialer-stylish-outcome-text">
                          {outcome || "Select Call Outcome..."}
                        </span>
                      </div>
                      <div className="dialer-stylish-outcome-chevron">
                        <ChevronDown size={15} />
                      </div>
                    </div>
                    <select
                      className="dialer-stylish-outcome-select"
                      value={outcome}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutcome(val);
                        const isUnconnectedOutcome = val === "No Answer / Busy" || val === "Voicemail / Switched Off" || val === "Wrong Number";
                        if (isUnconnectedOutcome) {
                          setCallStatus("No Answer");
                          setCallDurationSec(0);
                          setRecordingUrl("");
                          setAutoRecordTranscript("");
                          setCallSummary("");
                          setNotes((prev) => prev ? prev.replace(/\[Auto-Transcript\][\s\S]*?(?=\n\n|$)/g, "").replace(/\[AI Summary\][\s\S]*?(?=\n\n|$)/g, "").trim() : "");
                          try {
                            (window as any).AndroidNative?.clearLastCallRecording?.();
                          } catch (err) {}
                        }
                      }}
                      aria-label="Call Outcome / Disposition"
                    >
                      {DEFAULT_OUTCOMES.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                      {outcome && !DEFAULT_OUTCOMES.includes(outcome) && (
                        <option value={outcome}>{outcome}</option>
                      )}
                    </select>
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
                  rows={5}
                  placeholder="Key discussion points, customer requirements, pricing quotes, call transcript..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ minHeight: "100px", fontSize: "0.86rem", lineHeight: 1.5, resize: "vertical" }}
                />
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
                        if (callDurationSec <= 0 && callStatus !== "Connected" && callStatus !== "Completed") {
                          setFeedbackMsg("ℹ️ Call was not connected (0s). Unanswered calls have no audio recording.");
                          return;
                        }
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
                    <span>Save Call & Follow-up</span>
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
                {isAndroidNativeApp() && (
                  <button
                    type="button"
                    onClick={() => {
                      handleVibrate(20);
                      loadRecentCalls(true);
                      setFeedbackMsg("🔄 Syncing device missed & incoming calls...");
                    }}
                    disabled={isSyncingDeviceCalls || isLoadingCalls}
                    style={{
                      height: "36px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      backgroundColor: isSyncingDeviceCalls ? "#e0e7ff" : "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      color: isSyncingDeviceCalls ? "#4338ca" : "#475569",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                    title="Sync device missed & incoming calls"
                  >
                    <RefreshCw size={13} style={{ animation: isSyncingDeviceCalls ? "spin 1s linear infinite" : undefined }} />
                    <span>Sync</span>
                  </button>
                )}
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
                    const isConnected = (c.status === "Connected" || c.status === "Completed") && (c.durationSec || 0) > 0;
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
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", minWidth: 0, flex: 1 }}>
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
                            <div style={{ overflow: "hidden", minWidth: 0 }}>
                              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {c.contactName || c.contactPerson || "Direct Contact"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {callPhone || "No Phone"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", gap: "4px", alignItems: "center", marginTop: "1px" }}>
                                <span style={{ color: !isConnected ? "#dc2626" : undefined, fontWeight: !isConnected ? 700 : undefined, whiteSpace: "nowrap" }}>
                                  {isConnected ? formatDuration(c.durationSec || 0) : (c.outcome?.includes("Missed") ? "Missed Call" : (c.status === "Busy" || c.outcome?.includes("Busy")) ? "Busy" : (c.status === "Callback" || c.outcome?.includes("Callback") || c.outcome?.includes("Call Back")) ? "Callback" : "00:00 (NC)")}
                                </span>
                                <span style={{ opacity: 0.5 }}>•</span>
                                <span style={{ whiteSpace: "nowrap" }}>{formatRelativeTime(c.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "4px", flexShrink: 0, alignItems: "center" }}>
                            {callPhone && (
                              <button
                                type="button"
                                onClick={() => handleInitiateWhatsApp("", callPhone)}
                                style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#25d366", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="WhatsApp"
                              >
                                <WhatsAppLogo size={14} />
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
                              onClick={() => handleToggleEditCall(c)}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                backgroundColor: editingCallId === c.id ? "#4f46e5" : "#e0e7ff",
                                color: editingCallId === c.id ? "#ffffff" : "#4338ca",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s ease"
                              }}
                              title={editingCallId === c.id ? "Close edit" : "Edit Follow-up & Details"}
                            >
                              <Pencil size={13} />
                            </button>
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

                        {/* Middle row: Outcome badge + Follow-up badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {c.outcome && (
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
                          )}

                          {/* Follow-up Badge / Button */}
                          {c.followUpDate ? (
                            <button
                              type="button"
                              onClick={() => handleToggleEditCall(c)}
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#fef3c7",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                              title="Click to edit or reschedule follow-up"
                            >
                              <Calendar size={11} color="#b45309" />
                              <span>Follow-up: {formatFollowUpDisplay(c.followUpDate)}</span>
                              <Pencil size={9} style={{ opacity: 0.7 }} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleEditCall(c)}
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#f1f5f9",
                                color: "#475569",
                                border: "1px dashed #cbd5e1",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                              title="Schedule a follow-up for this contact"
                            >
                              <Calendar size={11} color="#64748b" />
                              <span>+ Set Follow-up</span>
                            </button>
                          )}

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

                        {/* AI Summary / Notes snippet */}
                        {(c.summary || c.notes) && editingCallId !== c.id && (
                          <div
                            onClick={() => handleToggleEditCall(c)}
                            style={{
                              fontSize: "0.72rem",
                              color: "#334155",
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              lineHeight: 1.4,
                              cursor: "pointer"
                            }}
                            title="Click to edit notes"
                          >
                            <span style={{ fontWeight: 700, color: "#4f46e5" }}>AI Notes: </span>
                            {(c.summary || c.notes).slice(0, 160)}
                            {(c.summary || c.notes).length > 160 ? "..." : ""}
                          </div>
                        )}

                        {/* INLINE EDIT FOLLOW-UP & NOTES SECTION */}
                        {editingCallId === c.id && (
                          <div
                            style={{
                              marginTop: "4px",
                              padding: "12px",
                              borderRadius: "10px",
                              backgroundColor: "#ffffff",
                              border: "1.5px solid #818cf8",
                              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.08)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px"
                            }}
                          >
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e1b4b", display: "flex", alignItems: "center", gap: "5px" }}>
                                <Calendar size={13} color="#4f46e5" />
                                Schedule / Update Follow-up
                              </span>
                              {editFollowUpDate && (
                                <button
                                  type="button"
                                  onClick={() => setQuickEditFollowUp(-1, 0, 0, "AM")}
                                  style={{
                                    fontSize: "0.68rem",
                                    color: "#dc2626",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    padding: 0
                                  }}
                                  title="Remove scheduled follow-up"
                                >
                                  Remove Follow-up
                                </button>
                              )}
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {[
                                { label: "Today 4 PM", days: 0, h: 4, m: 0, p: "PM" },
                                { label: "Tomorrow 11 AM", days: 1, h: 11, m: 0, p: "AM" },
                                { label: "In 2 Days", days: 2, h: 11, m: 0, p: "AM" },
                                { label: "Next Week", days: 7, h: 11, m: 0, p: "AM" }
                              ].map((qp) => (
                                <button
                                  key={qp.label}
                                  type="button"
                                  onClick={() => setQuickEditFollowUp(qp.days, qp.h, qp.m, qp.p as "AM" | "PM")}
                                  style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 600,
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    backgroundColor: "#f1f5f9",
                                    color: "#334155",
                                    border: "1px solid #e2e8f0",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  {qp.label}
                                </button>
                              ))}
                            </div>

                            {/* Custom Date & Time Picker */}
                            <div style={{ display: "flex", gap: "4px", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
                              <input
                                type="date"
                                value={editFollowUpDate}
                                onChange={(e) => setEditFollowUpDate(e.target.value)}
                                style={{
                                  flex: "1 1 0",
                                  minWidth: 0,
                                  width: 0,
                                  height: "32px",
                                  padding: "0 6px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.75rem",
                                  color: "#0f172a",
                                  backgroundColor: "#f8fafc",
                                  boxSizing: "border-box"
                                }}
                              />
                              <select
                                value={editFollowUpHour}
                                onChange={(e) => setEditFollowUpHour(e.target.value)}
                                style={{
                                  width: "36px",
                                  minWidth: "34px",
                                  flex: "0 0 auto",
                                  height: "32px",
                                  padding: 0,
                                  textAlign: "center",
                                  textAlignLast: "center",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.75rem",
                                  color: "#0f172a",
                                  backgroundColor: "#f8fafc",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  boxSizing: "border-box"
                                }}
                              >
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, padding: "0 1px" }}>:</span>
                              <select
                                value={editFollowUpMinute}
                                onChange={(e) => setEditFollowUpMinute(e.target.value)}
                                style={{
                                  width: "36px",
                                  minWidth: "34px",
                                  flex: "0 0 auto",
                                  height: "32px",
                                  padding: 0,
                                  textAlign: "center",
                                  textAlignLast: "center",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.75rem",
                                  color: "#0f172a",
                                  backgroundColor: "#f8fafc",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  boxSizing: "border-box"
                                }}
                              >
                                {["00", "15", "30", "45"].map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditFollowUpPeriod(prev => prev === "AM" ? "PM" : "AM")}
                                style={{
                                  height: "32px",
                                  width: "36px",
                                  minWidth: "36px",
                                  flex: "0 0 auto",
                                  padding: 0,
                                  borderRadius: "6px",
                                  border: "1px solid #818cf8",
                                  backgroundColor: "#eff6ff",
                                  color: "#2563eb",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  textAlign: "center",
                                  boxSizing: "border-box"
                                }}
                              >
                                {editFollowUpPeriod}
                              </button>
                            </div>

                            {/* Outcome Selection */}
                            <div>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                                Call Outcome / Status:
                              </span>
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                {[
                                  "Interested / Follow-up Needed",
                                  "Order Placed / Deal Closed",
                                  "Quotation Requested",
                                  "No Answer / Busy",
                                  "Callback Scheduled",
                                  "Not Interested / Lost"
                                ].map(out => {
                                  const isSel = editOutcome === out || (editOutcome.toLowerCase().includes("busy") && out.includes("Busy")) || (editOutcome.toLowerCase().includes("interested") && out.includes("Interested"));
                                  return (
                                    <button
                                      key={out}
                                      type="button"
                                      onClick={() => setEditOutcome(out)}
                                      style={{
                                        fontSize: "0.68rem",
                                        fontWeight: 600,
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        border: isSel ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                                        backgroundColor: isSel ? "#e0e7ff" : "#f8fafc",
                                        color: isSel ? "#3730a3" : "#475569",
                                        cursor: "pointer"
                                      }}
                                    >
                                      {out.split(" / ")[0]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Notes textarea */}
                            <div>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                                Notes / Discussion:
                              </span>
                              <textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Type discussion notes or reason for follow-up..."
                                rows={2}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.75rem",
                                  color: "#0f172a",
                                  backgroundColor: "#f8fafc",
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                  lineHeight: 1.35
                                }}
                              />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "2px" }}>
                              <button
                                type="button"
                                onClick={() => setEditingCallId(null)}
                                disabled={isSavingEdit}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  backgroundColor: "#ffffff",
                                  color: "#475569",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveCallEdit(c)}
                                disabled={isSavingEdit}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: "6px",
                                  border: "none",
                                  backgroundColor: "#4f46e5",
                                  color: "#ffffff",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 1px 3px rgba(79, 70, 229, 0.3)"
                                }}
                              >
                                {isSavingEdit ? (
                                  <>
                                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} />
                                    <span>Save Changes</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Call Recording Audio Player */}
                        {hasAudio && (
                          <div style={{ width: "100%", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <audio
                              controls
                              src={c.recordingUrl}
                              style={{ flex: 1, minWidth: "160px", height: "30px", borderRadius: "6px" }}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`Delete audio recording for this call with ${c.contactName || "this contact"}?`)) return;
                                const res = await deleteCallRecording(c.id);
                                if (res?.error) {
                                  alert(res.error);
                                } else {
                                  setFeedbackMsg("Audio recording deleted.");
                                  setTimeout(() => setFeedbackMsg(""), 2000);
                                  loadRecentCalls();
                                }
                              }}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#fee2e2",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                              }}
                              title="Delete Audio Recording"
                            >
                              Delete Audio
                            </button>
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
                            <WhatsAppLogo size={14} />
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

        {/* S26 CRM QUICK TABS STRIP */}
        <div className="s26-crm-quick-bar">
          <button
            type="button"
            className={`s26-crm-tab-chip ${showNewLeadForm ? "active" : ""}`}
            onClick={() => {
              if (activeTab !== "DIALPAD") setActiveTab("DIALPAD");
              setShowNewLeadForm(prev => {
                const next = !prev;
                if (next && !newLeadName) {
                  if (selectedContact) {
                    setNewLeadName(selectedContact.contactPerson || selectedContact.companyName || "");
                    setNewLeadShop(selectedContact.companyName || "");
                  } else if (filteredKeypadContacts.length > 0) {
                    setNewLeadName(filteredKeypadContacts[0].contactPerson || filteredKeypadContacts[0].companyName || "");
                    setNewLeadShop(filteredKeypadContacts[0].companyName || "");
                  }
                }
                return next;
              });
            }}
            title="Save as CRM Lead"
          >
            <UserPlus size={12} /> Add Lead
          </button>
          <button
            type="button"
            className={`s26-crm-tab-chip ${activeTab === "POST_CALL" ? "active" : ""}`}
            onClick={() => setActiveTab("POST_CALL")}
          >
            <Clock size={12} /> Log Call
          </button>
          <button
            type="button"
            className={`s26-crm-tab-chip ${activeTab === "WHATSAPP" ? "active" : ""}`}
            onClick={() => setActiveTab("WHATSAPP")}
          >
            <WhatsAppLogo size={12} style={{ marginRight: "2px" }} /> WhatsApp
          </button>
          <button
            type="button"
            className={`s26-crm-tab-chip ${activeTab === "SCRIPTS" ? "active" : ""}`}
            onClick={() => setActiveTab("SCRIPTS")}
          >
            <BookOpen size={12} /> Scripts
          </button>
        </div>

        {/* 3. S26 BOTTOM NAVIGATION DOCK (EXACT MATCH TO USER REFERENCE IMAGE) */}
        <div className="s26-bottom-dock">
          <div className="s26-dock-pill-bar">
            <button
              type="button"
              className={`s26-dock-item ${activeTab === "DIALPAD" ? "active" : ""}`}
              onClick={() => setActiveTab("DIALPAD")}
            >
              <Grid size={16} />
              <span>Keypad</span>
            </button>

            <button
              type="button"
              className={`s26-dock-item ${activeTab === "CALL_LOGS" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("CALL_LOGS");
                loadRecentCalls();
              }}
            >
              <History size={16} />
              <span>Recents</span>
              {recentCalls.length > 0 && (
                <span className="s26-dock-badge">{recentCalls.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`s26-dock-item ${activeTab === "CONTACTS" ? "active" : ""}`}
              onClick={() => setActiveTab("CONTACTS")}
            >
              <Users size={16} />
              <span>Contacts</span>
              {contactCounts.all > 0 && (
                <span className="s26-dock-badge">{contactCounts.all}</span>
              )}
            </button>
          </div>
        </div>

        {/* 4. S26 SYSTEM NAVIGATION 3-BUTTON BAR (|||  ○  <) */}
        <div className="s26-system-nav">
          <button
            type="button"
            className="s26-sys-btn"
            onClick={() => {
              setActiveTab(prev => prev === "DIALPAD" ? "CALL_LOGS" : "DIALPAD");
            }}
            title="Recent Apps / Toggle Recents"
          >
            <div className="s26-sys-recents-icon">
              <span className="s26-sys-recents-bar" />
              <span className="s26-sys-recents-bar" />
              <span className="s26-sys-recents-bar" />
            </div>
          </button>

          <button
            type="button"
            className="s26-sys-btn"
            onClick={() => setActiveTab("DIALPAD")}
            title="Home (Keypad)"
          >
            <div className="s26-sys-home-icon" />
          </button>

          <button
            type="button"
            className="s26-sys-btn"
            onClick={() => {
              if (activeTab !== "DIALPAD") setActiveTab("DIALPAD");
              else onClose();
            }}
            title="Back / Close"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}


export default function PhoneDialerModal(props: PhoneDialerModalProps) {
  return (
    <DialerErrorBoundary onClose={props.onClose} isOpen={props.isOpen}>
      <PhoneDialerModalContent {...props} />
    </DialerErrorBoundary>
  );
}
