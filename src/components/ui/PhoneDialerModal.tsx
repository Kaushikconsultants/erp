"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Plus
} from "lucide-react";
import { logCall, getCustomersForCallModal, getDialerRecentCalls } from "@/app/actions/callActions";
import { createQuickLead } from "@/app/actions/leadActions";

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
  { label: "Connected", value: "Connected", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  { label: "Busy / Engaged", value: "Busy", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  { label: "No Answer", value: "No Answer", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { label: "Voicemail / Off", value: "Voicemail", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { label: "Wrong Number", value: "Wrong Number", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  { label: "Callback", value: "Callback", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" }
];

const DISCUSSION_TAGS = [
  "Price Quoted",
  "Sample Catalog Sent",
  "Decision Maker Away",
  "Discount Negotiated",
  "High Interest",
  "Ready to Order",
  "Payment Promised",
  "Follow-up Friday",
  "Competitor Comparison",
  "Reorder Requested"
];

const QUICK_DURATIONS = [
  { label: "0s (Missed)", sec: 0 },
  { label: "30s", sec: 30 },
  { label: "1m", sec: 60 },
  { label: "2m", sec: 120 },
  { label: "3m", sec: 180 },
  { label: "5m", sec: 300 },
  { label: "10m", sec: 600 }
];

const TELE_SCRIPTS = [
  {
    title: "Opening Pitch (Standard)",
    text: "Namaste! This is [Your Name] from our sales team. I am reaching out regarding your business inquiry for our latest product range & wholesale pricing."
  },
  {
    title: "Price Objection Handler",
    text: "I completely understand price is key. Our items offer 2x higher durability, GST invoices, and fast courier dispatch, giving your shop higher margin turnover."
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

export default function PhoneDialerModal({
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

  // Call Duration Engine State
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const callStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Post-Call Maintenance State
  const [callType, setCallType] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [callStatus, setCallStatus] = useState<string>("Connected");
  const [outcome, setOutcome] = useState<string>(DEFAULT_OUTCOMES[0]);
  const [notes, setNotes] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpHour, setFollowUpHour] = useState<string>("11");
  const [followUpMinute, setFollowUpMinute] = useState<string>("00");
  const [followUpPeriod, setFollowUpPeriod] = useState<"AM" | "PM">("AM");
  const [newLeadName, setNewLeadName] = useState<string>(initialName);
  const [newLeadShop, setNewLeadShop] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);

  // Speech Recognition ref
  const speechRecognitionRef = useRef<any>(null);

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
          const cleanInit = initialPhone.replace(/\D/g, '');
          const match = res.customers.find((c: any) =>
            c.phone && c.phone.replace(/\D/g, '').includes(cleanInit)
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

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      if (initialPhone) setPhoneDigits(initialPhone);
      if (initialName) setNewLeadName(initialName);
      setCallDurationSec(0);
      setIsTimerRunning(false);
      callStartTimeRef.current = null;
      setNotes("");
      setFeedbackMsg("");
      setShowNewLeadForm(false);
      setActiveTab(initialTab || (initialPhone ? "DIALPAD" : "DIALPAD"));

      loadContacts();
      loadRecentCalls();
    }
  }, [isOpen, initialPhone, initialName, initialCustomerId, initialLeadId, initialTab]);

  // Live Timer Interval
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setCallDurationSec(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  // ─── CRITICAL: AUTO-STOP & FREEZE DURATION ON APP RETURN ───
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && callStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        if (elapsed > 0) {
          setCallDurationSec(elapsed);
          setIsTimerRunning(false); // Auto-freeze timer at exact duration
          callStartTimeRef.current = null;
          setFeedbackMsg(`✅ Call ended. Recorded duration: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s. Save your notes below.`);
        }
      }
    };

    const handleWindowFocus = () => {
      if (callStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        if (elapsed > 0) {
          setCallDurationSec(elapsed);
          setIsTimerRunning(false); // Auto-freeze timer at exact duration
          callStartTimeRef.current = null;
          setFeedbackMsg(`✅ Call ended. Recorded duration: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s. Save your notes below.`);
        }
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

  // Trigger Native Phone Dialer and start smart call duration timer
  const handleInitiateCall = (targetPhone?: string, targetContact?: any) => {
    const numberToCall = targetPhone || phoneDigits;
    const cleanNum = (numberToCall || '').replace(/\D/g, '');
    if (!cleanNum) {
      alert("Please enter a valid phone number to call.");
      return;
    }

    if (targetPhone) setPhoneDigits(targetPhone);
    if (targetContact) setSelectedContact(targetContact);

    handleVibrate(30);
    // Record start time
    callStartTimeRef.current = Date.now();
    setCallDurationSec(0);
    setIsTimerRunning(true);
    setCallStatus("Connected");
    setCallType("OUTBOUND");

    // Open native dialer
    if (typeof window !== "undefined") {
      window.location.href = `tel:${cleanNum}`;
    }

    // Switch to post-call maintenance view
    setActiveTab("POST_CALL");
    setFeedbackMsg("📞 Call in progress. Timer will automatically freeze duration upon return.");
  };

  // WhatsApp Message
  const handleInitiateWhatsApp = (customText?: string, targetPhone?: string) => {
    const rawNum = targetPhone || phoneDigits;
    const cleanNum = (rawNum || '').replace(/\D/g, '');
    if (!cleanNum) {
      alert("Please enter a valid phone number first.");
      return;
    }
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    const textParam = customText ? `?text=${encodeURIComponent(customText)}` : '';
    if (typeof window !== "undefined") {
      window.open(`https://wa.me/${formatted}${textParam}`, '_blank');
    }
  };

  // Format seconds to mm:ss
  const formatDuration = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Relative time formatter for call logs
  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
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
      return dateStr || "";
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
      alert("Speech recognition is not supported on this browser.");
      return;
    }

    if (isListeningSpeech) {
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      setIsListeningSpeech(false);
      return;
    }

    try {
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

  // Quick follow-up helpers
  const setQuickFollowUp = (days: number, hour12: number, min: number, period: "AM" | "PM") => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFollowUpDate(`${yyyy}-${mm}-${dd}`);
    setFollowUpHour(String(hour12).padStart(2, '0'));
    setFollowUpMinute(String(min).padStart(2, '0'));
    setFollowUpPeriod(period);
  };

  const getCompiledFollowUpDate = () => {
    if (!followUpDate) return "";
    let h = parseInt(followUpHour || "11", 10);
    if (followUpPeriod === "PM" && h < 12) h += 12;
    if (followUpPeriod === "AM" && h === 12) h = 0;
    const [year, month, day] = followUpDate.split('-');
    const m = parseInt(followUpMinute || "00", 10);
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), h, m, 0);
    return localDate.toISOString();
  };

  // Save Call Record & Maintain CRM Lead
  const handleSaveCallRecord = async () => {
    setIsSaving(true);
    setFeedbackMsg("");

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
        setFeedbackMsg("✅ Call & Duration Logged to CRM!");
        
        loadRecentCalls();

        setTimeout(() => {
          setActiveTab("CALL_LOGS");
          setFeedbackMsg("");
        }, 900);
      } else {
        alert(res?.error || "Failed to log call record.");
      }
    } catch (err: any) {
      console.warn("Dialer save error:", err);
      setIsSaving(false);
      alert("Error saving call record.");
    }
  };

  // Safe Filter contacts dropdown in keypad
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

  // Safe Filtered Call Logs list
  const filteredCallLogs = useMemo(() => {
    if (!Array.isArray(recentCalls)) return [];
    return recentCalls.filter(c => {
      if (!c) return false;
      if (callLogSearch) {
        const q = callLogSearch.toLowerCase();
        const cleanQ = q.replace(/\D/g, '');
        const matchName = (c.contactName || "").toLowerCase().includes(q);
        const matchPerson = (c.contactPerson || "").toLowerCase().includes(q);
        const matchPhone = cleanQ ? (c.phone || "").replace(/\D/g, "").includes(cleanQ) : false;
        const matchOutcome = (c.outcome || "").toLowerCase().includes(q);
        const matchNotes = (c.notes || "").toLowerCase().includes(q);
        if (!matchName && !matchPerson && !matchPhone && !matchOutcome && !matchNotes) return false;
      }

      if (callLogFilter === "CONNECTED") {
        return (c.durationSec || 0) > 0 || c.status === "Connected";
      }
      if (callLogFilter === "MISSED") {
        const oc = (c.outcome || "").toLowerCase();
        return oc.includes("no answer") || oc.includes("busy") || oc.includes("missed") || oc.includes("switched off") || (c.durationSec === 0 && c.status !== "Connected");
      }
      if (callLogFilter === "OUTBOUND") {
        return (c.callType || "").toUpperCase() === "OUTBOUND";
      }
      if (callLogFilter === "INBOUND") {
        return (c.callType || "").toUpperCase() === "INBOUND";
      }
      return true;
    });
  }, [recentCalls, callLogSearch, callLogFilter]);

  // Safe Filtered Contacts list
  const filteredContactsList = useMemo(() => {
    if (!Array.isArray(contacts)) return [];
    return contacts.filter(c => {
      if (!c) return false;
      if (contactFilter === "CUSTOMER" && c.type !== "Customer") return false;
      if (contactFilter === "LEAD" && c.type !== "Lead") return false;

      if (contactSearch) {
        const q = contactSearch.toLowerCase();
        const cleanQ = q.replace(/\D/g, '');
        const matchComp = (c.companyName || "").toLowerCase().includes(q);
        const matchPerson = (c.contactPerson || "").toLowerCase().includes(q);
        const matchPhone = cleanQ ? (c.phone || "").replace(/\D/g, "").includes(cleanQ) : false;
        const matchCity = (c.city || "").toLowerCase().includes(q);
        return matchComp || matchPerson || matchPhone || matchCity;
      }
      return true;
    });
  }, [contacts, contactSearch, contactFilter]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
          overflowY: "auto",
          animation: "slideUpDialer 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle */}
        <div style={{ padding: "10px 0 2px 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "42px", height: "4px", backgroundColor: "#cbd5e1", borderRadius: "3px" }} />
        </div>

        {/* Modal Header */}
        <div style={{ padding: "8px 20px 10px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(79, 70, 229, 0.3)"
            }}>
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                TeleCRM Phone Dialer
              </h3>
              <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Call Tracker & CRM Directory</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              color: "#64748b",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs Bar (Scrollable & Clean) */}
        <div style={{
          display: "flex",
          backgroundColor: "#f8fafc",
          padding: "6px 12px",
          borderBottom: "1px solid #e2e8f0",
          gap: "4px",
          overflowX: "auto",
          scrollbarWidth: "none"
        }}>
          {/* 1. Keypad */}
          <button
            type="button"
            onClick={() => setActiveTab("DIALPAD")}
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === "DIALPAD" ? "#ffffff" : "transparent",
              color: activeTab === "DIALPAD" ? "#4f46e5" : "#64748b",
              boxShadow: activeTab === "DIALPAD" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease"
            }}
          >
            <Grid size={14} />
            <span>Keypad</span>
          </button>

          {/* 2. Call Logs / History */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("CALL_LOGS");
              loadRecentCalls();
            }}
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === "CALL_LOGS" ? "#ffffff" : "transparent",
              color: activeTab === "CALL_LOGS" ? "#4f46e5" : "#64748b",
              boxShadow: activeTab === "CALL_LOGS" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <History size={14} />
            <span>Call Logs</span>
            {Array.isArray(recentCalls) && recentCalls.length > 0 && (
              <span style={{
                fontSize: "0.65rem",
                padding: "1px 5px",
                borderRadius: "10px",
                backgroundColor: activeTab === "CALL_LOGS" ? "#e0e7ff" : "#e2e8f0",
                color: activeTab === "CALL_LOGS" ? "#3730a3" : "#64748b",
                fontWeight: 800
              }}>
                {recentCalls.length}
              </span>
            )}
          </button>

          {/* 3. Phone Contacts Directory */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("CONTACTS");
              if (!Array.isArray(contacts) || contacts.length === 0) loadContacts();
            }}
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === "CONTACTS" ? "#ffffff" : "transparent",
              color: activeTab === "CONTACTS" ? "#4f46e5" : "#64748b",
              boxShadow: activeTab === "CONTACTS" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <Users size={14} />
            <span>Contacts</span>
          </button>

          {/* 4. Notes & Duration */}
          <button
            type="button"
            onClick={() => setActiveTab("POST_CALL")}
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === "POST_CALL" ? "#ffffff" : "transparent",
              color: activeTab === "POST_CALL" ? "#4f46e5" : "#64748b",
              boxShadow: activeTab === "POST_CALL" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            {isTimerRunning ? (
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10b981", animation: "pulse 1.2s infinite" }} />
            ) : (
              <Clock size={14} />
            )}
            <span>Notes & Duration</span>
          </button>

          {/* 5. WhatsApp */}
          <button
            type="button"
            onClick={() => setActiveTab("WHATSAPP")}
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === "WHATSAPP" ? "#ffffff" : "transparent",
              color: activeTab === "WHATSAPP" ? "#10b981" : "#64748b",
              boxShadow: activeTab === "WHATSAPP" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <MessageSquare size={14} />
            <span>WhatsApp</span>
          </button>

          {/* 6. Scripts */}
          <button
            type="button"
            onClick={() => setActiveTab("SCRIPTS")}
            style={{
              flexShrink: 0,
              padding: "7px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              backgroundColor: activeTab === "SCRIPTS" ? "#ffffff" : "transparent",
              color: activeTab === "SCRIPTS" ? "#f59e0b" : "#64748b",
              boxShadow: activeTab === "SCRIPTS" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <BookOpen size={14} />
            <span>Scripts</span>
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div style={{
            padding: "9px 16px",
            backgroundColor: "#ecfdf5",
            color: "#047857",
            fontSize: "0.82rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderBottom: "1px solid #a7f3d0"
          }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Selected Contact Pill (Shown across tabs if selected) */}
        {selectedContact && (
          <div style={{ padding: "8px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#ffffff",
              padding: "7px 12px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: selectedContact.type === "Customer" ? "#dbeafe" : "#fef3c7",
                  color: selectedContact.type === "Customer" ? "#1d4ed8" : "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.82rem"
                }}>
                  {selectedContact.companyName?.charAt(0) || "C"}
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{selectedContact.companyName}</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    {selectedContact.contactPerson || selectedContact.phone} • <span style={{ fontWeight: 700, color: selectedContact.type === "Customer" ? "#2563eb" : "#d97706" }}>{selectedContact.type}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: REDESIGNED CIRCULAR TOUCH KEYPAD
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "DIALPAD" && (
          <div style={{ padding: "8px 20px 20px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            
            {/* Phone Number Display Input */}
            <div style={{ width: "100%", maxWidth: "340px", padding: "8px 0 10px 0", position: "relative" }}>
              <input
                type="text"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value)}
                placeholder="Enter Number..."
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  letterSpacing: "1.5px",
                  fontFamily: "monospace, sans-serif"
                }}
              />

              {phoneDigits && (
                <div style={{ position: "absolute", right: "0", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "5px" }}>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    style={{
                      background: "#f1f5f9",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 8px",
                      cursor: "pointer",
                      color: "#475569"
                    }}
                    title="Backspace"
                  >
                    <Delete size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{
                      background: "#fee2e2",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 8px",
                      cursor: "pointer",
                      color: "#dc2626"
                    }}
                    title="Clear All"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
            </div>

            {/* Auto-matching Directory Suggestions Dropdown */}
            {filteredKeypadContacts.length > 0 && !selectedContact && (
              <div style={{ width: "100%", maxWidth: "340px", marginBottom: "10px" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "3px" }}>
                  Matching CRM Contacts
                </div>
                <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #cbd5e1", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {filteredKeypadContacts.map((c: any) => (
                    <div
                      key={c.id + c.type}
                      onClick={() => handleSelectMatchedContact(c)}
                      style={{
                        padding: "7px 10px",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#f8fafc"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{c.companyName}</div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{c.contactPerson} ({c.phone})</div>
                      </div>
                      <span style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "5px",
                        backgroundColor: c.type === "Customer" ? "#e0e7ff" : "#fef3c7",
                        color: c.type === "Customer" ? "#3730a3" : "#92400e"
                      }}>
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── PERFECT CIRCULAR KEYPAD BUTTONS (Fixed Stretched Oval Bug) ─── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              justifyItems: "center",
              rowGap: "12px",
              columnGap: "24px",
              width: "100%",
              maxWidth: "290px",
              margin: "6px auto 16px auto"
            }}>
              {DIALPAD_KEYS.map((item) => (
                <button
                  key={item.digit}
                  type="button"
                  onClick={() => handleDigitClick(item.digit)}
                  style={{
                    width: "62px",
                    height: "62px",
                    minWidth: "62px",
                    minHeight: "62px",
                    borderRadius: "50%",
                    border: "1.5px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(15, 23, 42, 0.04)",
                    transition: "transform 0.1s ease, background-color 0.15s ease, border-color 0.15s ease",
                    padding: 0,
                    userSelect: "none"
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#e0e7ff";
                    (e.currentTarget as HTMLElement).style.borderColor = "#6366f1";
                    (e.currentTarget as HTMLElement).style.transform = "scale(0.92)";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc";
                    (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#e0e7ff";
                    (e.currentTarget as HTMLElement).style.borderColor = "#6366f1";
                    (e.currentTarget as HTMLElement).style.transform = "scale(0.92)";
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc";
                    (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{item.digit}</span>
                  {item.sub ? (
                    <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "1.2px", marginTop: "1px" }}>{item.sub}</span>
                  ) : (
                    <span style={{ height: "10px" }} />
                  )}
                </button>
              ))}
            </div>

            {/* CALL CONTROLS FLOATING DOCK */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "22px", width: "100%", marginTop: "4px" }}>
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={() => handleInitiateWhatsApp()}
                title="Send WhatsApp Message"
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#25d366",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
                  transition: "transform 0.15s ease"
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <MessageSquare size={22} />
              </button>

              {/* MAIN NATIVE GREEN CALL BUTTON */}
              <button
                type="button"
                onClick={() => handleInitiateCall()}
                title="Call via Phone"
                style={{
                  width: "66px",
                  height: "66px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(16, 185, 129, 0.45)",
                  transition: "transform 0.15s ease"
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Phone size={30} />
              </button>

              {/* Notes / Log Shortcut Button */}
              <button
                type="button"
                onClick={() => setActiveTab("POST_CALL")}
                title="Open Notes & Call Tracker"
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e7ff",
                  color: "#4f46e5",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.2)",
                  transition: "transform 0.15s ease"
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Sparkles size={22} />
              </button>
            </div>

            {/* Quick Helper Links */}
            <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "0.74rem", color: "#64748b" }}>
              <span
                onClick={() => {
                  setActiveTab("CALL_LOGS");
                  loadRecentCalls();
                }}
                style={{ color: "#4f46e5", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
              >
                <History size={13} /> View Call Logs
              </span>
              <span>•</span>
              <span
                onClick={() => {
                  setActiveTab("CONTACTS");
                  loadContacts();
                }}
                style={{ color: "#4f46e5", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
              >
                <Users size={13} /> Open Contacts
              </span>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: DEDICATED CALL LOGS & HISTORY (Requirement 2 & 3)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "CALL_LOGS" && (
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Search and Refresh Bar */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#f8fafc",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0"
              }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search call logs by name, phone, outcome..."
                  value={callLogSearch}
                  onChange={(e) => setCallLogSearch(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "0.82rem",
                    width: "100%",
                    color: "#0f172a"
                  }}
                />
                {callLogSearch && (
                  <button onClick={() => setCallLogSearch("")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={loadRecentCalls}
                disabled={isLoadingCalls}
                title="Refresh Logs"
                style={{
                  padding: "9px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <RefreshCw size={16} className={isLoadingCalls ? "animate-spin text-indigo-600" : ""} />
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "2px" }}>
              {(["ALL", "CONNECTED", "MISSED", "OUTBOUND", "INBOUND"] as const).map((flt) => (
                <button
                  key={flt}
                  type="button"
                  onClick={() => setCallLogFilter(flt)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: callLogFilter === flt ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                    backgroundColor: callLogFilter === flt ? "#eef2ff" : "#ffffff",
                    color: callLogFilter === flt ? "#4f46e5" : "#64748b",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {flt === "ALL" && "All Calls"}
                  {flt === "CONNECTED" && "Connected ⏱"}
                  {flt === "MISSED" && "Missed / Busy"}
                  {flt === "OUTBOUND" && "Outbound ↗"}
                  {flt === "INBOUND" && "Inbound ↙"}
                </button>
              ))}
            </div>

            {/* Call Logs List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "55vh", overflowY: "auto" }}>
              {isLoadingCalls && (!Array.isArray(recentCalls) || recentCalls.length === 0) ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={24} className="animate-spin text-indigo-600" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ fontSize: "0.82rem", margin: 0 }}>Loading call history...</p>
                </div>
              ) : filteredCallLogs.length === 0 ? (
                <div style={{ padding: "30px 20px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  <History size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "#0f172a" }}>No Call Logs Found</h4>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.75rem", color: "#64748b" }}>
                    {callLogSearch ? "Try searching for another phone number or name." : "Make your first call using the Keypad tab!"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("DIALPAD")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Open Keypad
                  </button>
                </div>
              ) : (
                filteredCallLogs.map((log: any) => {
                  const isOutbound = (log?.callType || "").toUpperCase() === "OUTBOUND";
                  const dur = log?.durationSec || 0;
                  const isConnected = dur > 0 || log?.status === "Connected";

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        gap: "10px"
                      }}
                    >
                      {/* Left Call Direction Icon */}
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        backgroundColor: !isConnected ? "#fee2e2" : isOutbound ? "#ecfdf5" : "#e0e7ff",
                        color: !isConnected ? "#dc2626" : isOutbound ? "#059669" : "#4f46e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {!isConnected ? (
                          <PhoneMissed size={18} />
                        ) : isOutbound ? (
                          <PhoneOutgoing size={18} />
                        ) : (
                          <PhoneIncoming size={18} />
                        )}
                      </div>

                      {/* Middle Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log?.contactName || "Contact"}
                          </span>
                          {log?.contactType && (
                            <span style={{
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: "4px",
                              backgroundColor: log.contactType === "Customer" ? "#dbeafe" : "#fef3c7",
                              color: log.contactType === "Customer" ? "#1d4ed8" : "#b45309"
                            }}>
                              {log.contactType}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "#64748b", flexWrap: "wrap" }}>
                          <span>{log?.phone || "No Number"}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(log?.createdAt)}</span>
                          <span>•</span>
                          {dur > 0 ? (
                            <span style={{ fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "1px 4px", borderRadius: "4px" }}>
                              ⏱ {formatDuration(dur)}
                            </span>
                          ) : (
                            <span style={{ fontWeight: 600, color: "#94a3b8" }}>0s</span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "5px",
                            backgroundColor: isConnected ? "#f0fdf4" : "#fff1f2",
                            color: isConnected ? "#15803d" : "#be123c",
                            border: isConnected ? "1px solid #bbf7d0" : "1px solid #fecdd3"
                          }}>
                            {log?.outcome || log?.status || "Completed"}
                          </span>
                          {log?.notes && (
                            <span style={{ fontSize: "0.68rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                              "{log.notes}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right 1-Tap Action Controls */}
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        {/* 1-Tap WhatsApp */}
                        {log?.phone && (
                          <button
                            type="button"
                            onClick={() => handleInitiateWhatsApp(undefined, log.phone)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              backgroundColor: "#25d366",
                              color: "#ffffff",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title="WhatsApp Contact"
                          >
                            <MessageSquare size={15} />
                          </button>
                        )}

                        {/* 1-Tap Redial */}
                        <button
                          type="button"
                          onClick={() => {
                            if (log?.phone) {
                              setPhoneDigits(log.phone);
                              handleInitiateCall(log.phone, {
                                id: log.customerId || log.leadId,
                                companyName: log.contactName,
                                contactPerson: log.contactPerson,
                                phone: log.phone,
                                type: log.contactType
                              });
                            }
                          }}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#10b981",
                            color: "#ffffff",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)"
                          }}
                          title="Redial Contact"
                        >
                          <Phone size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: PHONE CONTACTS & CRM DIRECTORY (Requirement 2)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "CONTACTS" && (
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Search Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#f8fafc",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0"
            }}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by customer name, shop, city, phone..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "0.82rem",
                  width: "100%",
                  color: "#0f172a"
                }}
              />
              {contactSearch && (
                <button onClick={() => setContactSearch("")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {(["ALL", "CUSTOMER", "LEAD"] as const).map((cf) => (
                  <button
                    key={cf}
                    type="button"
                    onClick={() => setContactFilter(cf)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      border: contactFilter === cf ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                      backgroundColor: contactFilter === cf ? "#eef2ff" : "#ffffff",
                      color: contactFilter === cf ? "#4f46e5" : "#64748b",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {cf === "ALL" && `All (${Array.isArray(contacts) ? contacts.length : 0})`}
                    {cf === "CUSTOMER" && `Customers (${Array.isArray(contacts) ? contacts.filter(c => c.type === 'Customer').length : 0})`}
                    {cf === "LEAD" && `Leads (${Array.isArray(contacts) ? contacts.filter(c => c.type === 'Lead').length : 0})`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowNewLeadForm(true);
                  setActiveTab("POST_CALL");
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #c7d2fe",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <Plus size={12} /> New Lead
              </button>
            </div>

            {/* Contacts Directory List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "55vh", overflowY: "auto" }}>
              {isLoadingContacts && (!Array.isArray(contacts) || contacts.length === 0) ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={24} className="animate-spin text-indigo-600" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ fontSize: "0.82rem", margin: 0 }}>Loading CRM contacts...</p>
                </div>
              ) : filteredContactsList.length === 0 ? (
                <div style={{ padding: "30px 20px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  <Users size={32} color="#94a3b8" style={{ margin: "0 auto 8px auto" }} />
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "#0f172a" }}>No Contacts Found</h4>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.75rem", color: "#64748b" }}>
                    {contactSearch ? "No matches for your search keyword." : "Add customers or leads in CRM to populate contacts."}
                  </p>
                </div>
              ) : (
                filteredContactsList.map((c: any) => (
                  <div
                    key={c.id + c.type}
                    style={{
                      padding: "10px 12px",
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      gap: "10px"
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: c?.type === "Customer" ? "#dbeafe" : "#fef3c7",
                      color: c?.type === "Customer" ? "#1d4ed8" : "#b45309",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      flexShrink: 0
                    }}>
                      {c?.companyName?.charAt(0) || "C"}
                    </div>

                    {/* Middle Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c?.companyName}
                        </span>
                        <span style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "4px",
                          backgroundColor: c?.type === "Customer" ? "#e0e7ff" : "#fef3c7",
                          color: c?.type === "Customer" ? "#3730a3" : "#92400e"
                        }}>
                          {c?.type}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                        {c?.contactPerson && <span>{c.contactPerson}</span>}
                        {c?.city && (
                          <>
                            <span>•</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              <MapPin size={10} /> {c.city}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span style={{ fontWeight: 600, color: "#334155" }}>{c?.phone || "No phone"}</span>
                      </div>
                    </div>

                    {/* Right 1-Tap Calling Actions */}
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {/* WhatsApp Button */}
                      {c?.phone && (
                        <button
                          type="button"
                          onClick={() => handleInitiateWhatsApp(undefined, c.phone)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#25d366",
                            color: "#ffffff",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer"
                          }}
                          title="WhatsApp Contact"
                        >
                          <MessageSquare size={15} />
                        </button>
                      )}

                      {/* 1-Tap Direct Call */}
                      {c?.phone && (
                        <button
                          type="button"
                          onClick={() => handleInitiateCall(c.phone, c)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#10b981",
                            color: "#ffffff",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)"
                          }}
                          title="Direct Call"
                        >
                          <Phone size={15} />
                        </button>
                      )}

                      {/* Select for Keypad */}
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectMatchedContact(c);
                          setActiveTab("DIALPAD");
                        }}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title="Load into Keypad"
                      >
                        <Grid size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: NOTES & DURATION (SMART AUTO-STOP & OUTCOME LOGGING)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "POST_CALL" && (
          <div style={{ padding: "16px 20px", backgroundColor: "#ffffff" }}>
            
            {/* CALL DURATION STOPWATCH HERO CARD */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderRadius: "16px",
              padding: "14px 16px",
              color: "#ffffff",
              marginBottom: "16px",
              boxShadow: "0 4px 20px rgba(15, 23, 42, 0.15)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={16} color="#38bdf8" />
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Tracked Call Duration
                  </span>
                </div>
                {isTimerRunning ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#34d399", fontWeight: 700 }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#34d399", animation: "pulse 1s infinite" }} />
                    LIVE
                  </span>
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
                    AUTO-FROZEN
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "1px", color: "#ffffff" }}>
                    {formatDuration(callDurationSec)}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>
                    ({callDurationSec} sec)
                  </span>
                </div>

                {/* Timer Manual Controls */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {isTimerRunning ? (
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(false)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Pause size={13} /> Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(true)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Play size={13} /> Resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setCallDurationSec(0);
                      callStartTimeRef.current = null;
                    }}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "8px",
                      border: "1px solid #475569",
                      backgroundColor: "#334155",
                      color: "#cbd5e1",
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}
                    title="Reset to 0s"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* Quick Duration Chips & Micro Adjusters */}
              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {QUICK_DURATIONS.map(d => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => {
                      setCallDurationSec(d.sec);
                      setIsTimerRunning(false);
                    }}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      border: callDurationSec === d.sec ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                      backgroundColor: callDurationSec === d.sec ? "#0284c7" : "rgba(255,255,255,0.06)",
                      color: "#ffffff",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCallDurationSec(prev => Math.max(0, prev - 15))}
                  style={{
                    padding: "3px 6px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                    fontSize: "0.7rem",
                    cursor: "pointer"
                  }}
                >
                  -15s
                </button>
                <button
                  type="button"
                  onClick={() => setCallDurationSec(prev => prev + 15)}
                  style={{
                    padding: "3px 6px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                    fontSize: "0.7rem",
                    cursor: "pointer"
                  }}
                >
                  +15s
                </button>
              </div>
            </div>

            {/* CALL CONNECTION STATUS */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>
                Call Connection Status
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                {CALL_STATUSES.map(st => {
                  const isSel = callStatus === st.value;
                  return (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => {
                        setCallStatus(st.value);
                        if (["Busy", "No Answer", "Voicemail", "Wrong Number"].includes(st.value) && callDurationSec === 0) {
                          if (st.value === "Busy") setOutcome("No Answer / Busy");
                          if (st.value === "No Answer") setOutcome("No Answer / Busy");
                          if (st.value === "Voicemail") setOutcome("Voicemail / Switched Off");
                          if (st.value === "Wrong Number") setOutcome("Wrong / Invalid Number");
                        }
                      }}
                      style={{
                        padding: "7px 4px",
                        borderRadius: "8px",
                        border: isSel ? `2px solid ${st.color}` : "1px solid #e2e8f0",
                        backgroundColor: isSel ? st.bg : "#ffffff",
                        color: isSel ? st.color : "#475569",
                        fontWeight: 700,
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        textAlign: "center"
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CALL DIRECTION (OUTBOUND / INBOUND) */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>Call Type</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setCallType("OUTBOUND")}
                  style={{
                    flex: 1,
                    padding: "7px",
                    borderRadius: "8px",
                    border: callType === "OUTBOUND" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                    backgroundColor: callType === "OUTBOUND" ? "#eef2ff" : "#ffffff",
                    color: callType === "OUTBOUND" ? "#4f46e5" : "#64748b",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  Outbound Call (Made by us)
                </button>
                <button
                  type="button"
                  onClick={() => setCallType("INBOUND")}
                  style={{
                    flex: 1,
                    padding: "7px",
                    borderRadius: "8px",
                    border: callType === "INBOUND" ? "2px solid #059669" : "1px solid #cbd5e1",
                    backgroundColor: callType === "INBOUND" ? "#ecfdf5" : "#ffffff",
                    color: callType === "INBOUND" ? "#059669" : "#64748b",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  Inbound Call (Received)
                </button>
              </div>
            </div>

            {/* CALL OUTCOME / DISPOSITION */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Call Outcome / Disposition
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 600
                }}
              >
                {DEFAULT_OUTCOMES.map((oc, i) => (
                  <option key={i} value={oc}>{oc}</option>
                ))}
              </select>
            </div>

            {/* 1-TAP DISCUSSION POINTS */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                1-Tap Discussion Points
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {DISCUSSION_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #e0e7ff",
                      backgroundColor: "#f5f3ff",
                      color: "#6d28d9",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* DISCUSSION NOTES WITH SPEECH RECOGNITION */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569" }}>
                  Discussion Notes
                </label>
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: isListeningSpeech ? "1px solid #ef4444" : "1px solid #c7d2fe",
                    backgroundColor: isListeningSpeech ? "#fee2e2" : "#eef2ff",
                    color: isListeningSpeech ? "#dc2626" : "#4f46e5",
                    cursor: "pointer"
                  }}
                >
                  {isListeningSpeech ? <MicOff size={12} /> : <Mic size={12} />}
                  <span>{isListeningSpeech ? "Stop Dictation" : "Voice Dictate"}</span>
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Key conversation notes, pricing agreed, next steps..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  outline: "none"
                }}
              />
            </div>

            {/* 12-HOUR FOLLOW-UP DATE & TIME PICKER */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                <Calendar size={13} color="#4f46e5" /> Schedule Next Follow-up (12-Hour Clock)
              </label>

              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#ffffff" }}
                />
                <select
                  value={followUpHour}
                  onChange={(e) => setFollowUpHour(e.target.value)}
                  style={{ padding: "8px 4px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontWeight: 700 }}
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span style={{ fontWeight: 700, color: "#94a3b8" }}>:</span>
                <select
                  value={followUpMinute}
                  onChange={(e) => setFollowUpMinute(e.target.value)}
                  style={{ padding: "8px 4px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontWeight: 700 }}
                >
                  {["00", "15", "30", "45"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div style={{ display: "flex", borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setFollowUpPeriod("AM")}
                    style={{
                      padding: "6px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      border: "none",
                      backgroundColor: followUpPeriod === "AM" ? "#4f46e5" : "#f1f5f9",
                      color: followUpPeriod === "AM" ? "#ffffff" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpPeriod("PM")}
                    style={{
                      padding: "6px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      border: "none",
                      backgroundColor: followUpPeriod === "PM" ? "#4f46e5" : "#f1f5f9",
                      color: followUpPeriod === "PM" ? "#ffffff" : "#475569",
                      cursor: "pointer"
                    }}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Quick Follow-up Presets */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", alignSelf: "center" }}>Quick:</span>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(0, 5, 0, "PM")}
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", cursor: "pointer" }}
                >
                  Today 5 PM
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(1, 11, 0, "AM")}
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", cursor: "pointer" }}
                >
                  Tomorrow 11 AM
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(2, 4, 0, "PM")}
                  style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", cursor: "pointer" }}
                >
                  In 2 Days
                </button>
              </div>
            </div>

            {/* SAVE AS NEW LEAD FOR UNSAVED CONTACT */}
            {(!selectedContact || showNewLeadForm) && (
              <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "10px", border: "1px solid #fde68a", marginBottom: "16px" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <UserPlus size={15} /> Save Contact as New CRM Lead
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Contact Name *"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #fcd34d", fontSize: "0.78rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Shop / Business Name"
                    value={newLeadShop}
                    onChange={(e) => setNewLeadShop(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #fcd34d", fontSize: "0.78rem" }}
                  />
                </div>
              </div>
            )}

            {/* BIG SAVE CALL RECORD & UPDATE CRM BUTTON */}
            <button
              onClick={handleSaveCallRecord}
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                color: "#ffffff",
                border: "none",
                fontSize: "0.92rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 6px 16px rgba(79, 70, 229, 0.35)",
                transition: "transform 0.15s ease"
              }}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>{isSaving ? "Saving Call & Duration..." : `Save Call (${formatDuration(callDurationSec)}) & Lead`}</span>
            </button>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 5: WHATSAPP TEMPLATES
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "WHATSAPP" && (
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <MessageSquare size={16} color="#25d366" /> 1-Tap Post-Call WhatsApp Messages
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {WHATSAPP_TEMPLATES.map((tpl, i) => {
                const messageText = tpl.text(selectedContact?.contactPerson || newLeadName || "");
                return (
                  <div key={i} style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{tpl.title}</span>
                      <button
                        type="button"
                        onClick={() => handleInitiateWhatsApp(messageText)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#25d366",
                          color: "#ffffff",
                          border: "none",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Send size={11} /> Send
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: 1.4 }}>
                      {messageText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 6: CALL SCRIPTS & OBJECTION PLAYBOOK
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "SCRIPTS" && (
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <BookOpen size={16} color="#f59e0b" /> Telecalling Battlecards & Sales Scripts
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {TELE_SCRIPTS.map((sc, i) => (
                <div key={i} style={{ padding: "12px", backgroundColor: "#fffbeb", borderRadius: "12px", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>
                    {sc.title}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#78350f", lineHeight: 1.4 }}>
                    "{sc.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
