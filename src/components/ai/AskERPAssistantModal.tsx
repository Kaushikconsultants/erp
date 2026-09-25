"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  X,
  Sparkles,
  Send,
  Mic,
  MicOff,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Bot,
  User,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Ban,
  Edit3,
  Loader2,
  Globe,
  ShoppingCart,
  Users,
  Package,
  Wallet,
  FileSpreadsheet,
  Building2,
  Navigation,
  Cpu,
  Compass,
  Wrench,
  Ticket,
  HelpCircle,
  CheckCheck,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVoiceStore } from "@/lib/stores/voiceStore";
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  abortSpeechRecognition,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
  requestMicrophonePermission,
  isIncompleteCommand
} from "@/lib/speechService";
import { sendVoiceCommand } from "@/lib/voiceClient";
import { executeVoiceCommand, VoiceAssistantResponse, VoiceMetricItem } from "@/app/actions/voiceActions";
import { executeConfirmedVoiceAction, ConfirmedVoiceActionPayload } from "@/app/actions/voiceActionExecutor";
import { askERPAssistant } from "@/app/actions/aiAskERPActions";
import { searchErpGuide, GuideArticle } from "@/app/actions/erpGuideActions";
import { diagnoseErpIssue, DiagnosticResult } from "@/app/actions/erpDiagnosticActions";
import { createSupportTicket } from "@/app/actions/supportTicketActions";
import VoiceWaveform from "@/components/voice/VoiceWaveform";
import StylishHeart from "@/components/voice/StylishHeart";
import LearningModePanel, { LearnedRuleItem } from "@/components/ai/LearningModePanel";

interface AskERPAssistantModalProps {
  onClose?: () => void;
  isOpen?: boolean;
  autoStartListening?: boolean;
}

interface MessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  mode?: "copilot" | "guide" | "diagnostic";
  guideArticle?: GuideArticle;
  diagnosticResult?: DiagnosticResult;
  ticketNumber?: string;
  data?: {
    answer: string;
    keyMetrics?: VoiceMetricItem[];
    suggestedActions?: { label: string; href?: string; voiceCommand?: string }[];
    followUpQuestions?: string[];
  };
  cardType?: string;
  cardData?: any;
  route?: string;
  actionText?: string;
  requiresConfirmation?: boolean;
  confirmationPayload?: ConfirmedVoiceActionPayload;
  executionStatus?: "pending" | "executing" | "confirmed" | "cancelled" | "error";
  executionResultText?: string;
  provider?: string;
}

const VOICE_SUGGESTIONS = [
  { label: "🧾 Create Invoice", query: "Create invoice for order ORD-1025" },
  { label: "👤 Add Customer", query: "Add customer Apex Sports phone 9876543210 from Delhi" },
  { label: "📦 Add Product", query: "Add product Air Flex Shorts price 499" },
  { label: "📊 Today's Sales", query: "Show today's sales summary" },
  { label: "📝 Create Quotation", query: "Create quotation" },
  { label: "💰 Pending Receivables", query: "What is our pending receivables and cash flow position?" },
  { label: "⚠️ Low Stock Products", query: "Which products are low in stock?" },
  { label: "🏆 Top 5 Customers", query: "Who are our top 5 most profitable customers?" },
  { label: "⏱️ Punch Attendance", query: "Punch in attendance for today" }
];

const GUIDE_SUGGESTIONS = [
  { label: "📝 Create Quotation", query: "How to create a new quotation?" },
  { label: "🧾 Create Tax Invoice", query: "How to create a tax invoice?" },
  { label: "🚚 Transfer Stock", query: "How to transfer stock between godowns?" },
  { label: "🏦 Bank Reconciliation", query: "How to reconcile bank statements?" },
  { label: "⏱️ Mark Attendance", query: "How to mark staff attendance?" },
  { label: "⚙️ Invoice Prefix", query: "How to customize bill numbering format?" },
];

const DIAGNOSTIC_SUGGESTIONS = [
  { label: "🔒 Invoice Locked", query: "Why cannot I delete this invoice?" },
  { label: "📦 Negative Stock", query: "Why is product stock showing negative?" },
  { label: "👤 Customer Delete Block", query: "Why cannot I delete this customer?" },
  { label: "🧾 GST Calculation", query: "Why is GST not calculating properly?" },
  { label: "🎫 Support Desk", query: "How to raise priority support ticket?" }
];

const INITIAL_WELCOME_MESSAGE: MessageItem = {
  id: "welcome",
  sender: "ai",
  text: "Namaste! I am Heart, your Executive Voice AI Copilot. Speak or type any command to navigate, analyze revenue, inspect stock, or manage quotations and orders hands-free.",
  data: {
    answer: "Namaste! I am Heart, your Executive Voice AI Copilot. Speak or type any command to navigate, analyze revenue, inspect stock, or manage quotations and orders hands-free.",
    keyMetrics: [],
    suggestedActions: [
      { label: "View Reports", href: "/reports" },
      { label: "Sales Orders", href: "/orders" },
      { label: "Customer Master", href: "/customers" }
    ],
    followUpQuestions: [
      "What is our MTD Revenue and sprint pace?",
      "Who are our top 5 most profitable customers?",
      "How much inventory capital is currently locked up?"
    ]
  },
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase(),
  provider: "gemini"
};

export default function AskERPAssistantModal({
  onClose,
  isOpen: propIsOpen,
  autoStartListening: propAutoListen
}: AskERPAssistantModalProps) {
  const router = useRouter();
  const voiceStore = useVoiceStore();

  // Unified modal visibility
  const isVisible = propIsOpen !== undefined ? propIsOpen : voiceStore.isOpen;

  const [query, setQuery] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [language, setLanguage] = useState<"en-IN" | "hi-IN" | "auto">("auto");
  const [selectedProvider, setSelectedProvider] = useState<"gemini" | "openai" | "auto">("gemini");
  const [statusFeedback, setStatusFeedback] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeTab, setActiveTab] = useState<"copilot" | "guide" | "diagnostic" | "learning">("copilot");
  const [trainPhrase, setTrainPhrase] = useState<string>("");
  const [raisingTicketForId, setRaisingTicketForId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedModalTranscriptRef = useRef<string>("");
  const hasAutoStarted = useRef(false);
  const lastSyncedFeedbackRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handler for raising an escalated support ticket directly from diagnostic audit
  const handleRaiseTicket = async (msgId: string, diag: DiagnosticResult) => {
    setRaisingTicketForId(msgId);
    try {
      const res = await createSupportTicket({
        category: (diag.issueCategory as any) || "SYSTEM",
        subject: `Diagnostic Escalation: ${diag.diagnosis.slice(0, 55)}...`,
        description: `User triggered issue escalation from In-App Diagnostics.\nDiagnosis: ${diag.diagnosis}\nRoot Cause: ${diag.rootCause}\nSolution Steps: ${diag.solutionSteps.join('; ')}`,
        priority: "HIGH",
        diagnosticSnapshot: diag.diagnosticSnapshot
      });
      if (res.success && res.ticket) {
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? { ...m, ticketNumber: res.ticket?.ticketNumber } : m))
        );
        setStatusFeedback(`✅ Support Ticket #${res.ticket.ticketNumber} created! Our technical desk has been notified.`);
      } else {
        setStatusFeedback(`⚠️ Failed to create ticket: ${res.error}`);
      }
    } catch {
      setStatusFeedback("Error creating ticket. Please retry.");
    } finally {
      setRaisingTicketForId(null);
    }
  };

  // Restore preferred AI model from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp_preferred_ai_provider");
      if (saved && ["gemini", "openai", "auto"].includes(saved)) {
        setSelectedProvider(saved as any);
      }
    } catch (e) {}
  }, []);

  const handleProviderChange = (newProvider: "gemini" | "openai" | "auto") => {
    setSelectedProvider(newProvider);
    try {
      localStorage.setItem("erp_preferred_ai_provider", newProvider);
    } catch (e) {}
  };

  // Initial welcome message
  useEffect(() => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
  }, []);

  // Synchronize state when opened or updated with activeFeedback or transcript from FloatingVoiceWidget
  useEffect(() => {
    if (!isVisible) {
      lastSyncedFeedbackRef.current = null;
      return;
    }

    if (voiceStore.activeFeedback && voiceStore.activeFeedback !== lastSyncedFeedbackRef.current) {
      lastSyncedFeedbackRef.current = voiceStore.activeFeedback;
      const fb = voiceStore.activeFeedback;
      const userQ = fb.query || voiceStore.activeQuery || voiceStore.transcript || "Guide Request";
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase();

      const userMsg: MessageItem = {
        id: `user-sync-${Date.now()}`,
        sender: "user",
        text: userQ,
        timestamp: timeStr
      };

      const aiMsg: MessageItem = {
        id: `ai-sync-${Date.now()}`,
        sender: "ai",
        text: fb.text || fb.actionText || "Here are the requested details:",
        timestamp: timeStr,
        mode: fb.cardType === "GUIDE" ? "guide" : "copilot",
        guideArticle: fb.cardType === "GUIDE" && fb.cardData ? {
          id: fb.cardData.id || "guide-active",
          moduleKey: fb.cardData.moduleKey || "general",
          title: fb.cardData.title,
          titleHindi: fb.cardData.titleHindi,
          summary: fb.cardData.summary,
          steps: fb.cardData.steps || [],
          targetRoute: fb.cardData.targetRoute || fb.route || "/dashboard",
          keywords: []
        } : undefined,
        cardType: fb.cardType,
        cardData: fb.cardData,
        route: fb.route,
        actionText: fb.actionText,
        requiresConfirmation: fb.requiresConfirmation,
        confirmationPayload: fb.confirmationPayload,
        data: {
          answer: fb.text || "",
          keyMetrics: fb.keyMetrics || [],
          suggestedActions: fb.suggestedActions || (fb.route ? [{ label: "Open Screen", href: fb.route }] : [])
        }
      };

      setMessages([INITIAL_WELCOME_MESSAGE, userMsg, aiMsg]);
      if (fb.cardType === "GUIDE") {
        setActiveTab("guide");
      }
    } else if (voiceStore.transcript && !query) {
      setQuery(voiceStore.transcript);
    }
  }, [isVisible, voiceStore.activeFeedback, voiceStore.activeQuery, voiceStore.transcript]);

  const handleClose = useCallback((keepSpeaking: boolean | any = false) => {
    const shouldKeepSpeaking = typeof keepSpeaking === "boolean" ? keepSpeaking : false;
    stopSpeechRecognition();
    if (!shouldKeepSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }
    setIsListening(false);
    voiceStore.closeAssistant();
    if (onClose) onClose();
  }, [onClose, voiceStore]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, interimTranscript]);

  // Stop TTS when modal closes or unmounts
  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      stopSpeaking();
    };
  }, []);

  // Global hotkeys (Ctrl+Space or Alt+V to toggle, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.code === "Space") || (e.altKey && (e.key === "v" || e.key === "V"))) {
        e.preventDefault();
        if (isVisible) {
          handleClose();
        } else {
          voiceStore.openAssistant("", true);
        }
      } else if (e.key === "Escape" && isVisible) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleClose, voiceStore]);

  // Auto-start listening if requested
  useEffect(() => {
    const shouldListen = propAutoListen || voiceStore.autoStartListening;
    if (isVisible && shouldListen && !hasAutoStarted.current && !isListening) {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => {
        handleStartListening();
      }, 300);
      return () => clearTimeout(timer);
    }
    if (!isVisible) {
      hasAutoStarted.current = false;
    }
  }, [isVisible, propAutoListen, voiceStore.autoStartListening]);

  // Execute a query
  const handleSend = async (textToSend?: string) => {
    const rawText = (textToSend || query).trim();
    if (!rawText || isLoading) return;

    // Stop speaking any ongoing audio
    stopSpeaking();
    setIsSpeaking(false);

    // Add user message
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery("");
    setInterimTranscript("");

    // Check if there is a pending confirmation action and user says "yes" or "confirm"
    const pendingMsg = [...messages].reverse().find(m => m.executionStatus === "pending" && m.confirmationPayload);
    const cleanLower = rawText.toLowerCase().replace(/[.!?,]/g, '').trim();

    const isAffirmative = [
      "yes", "confirm", "proceed", "haan", "haanji", "kar do", "theek hai",
      "yes please", "ok", "okay", "confirm action", "do it", "sure", "banao", "create it"
    ].includes(cleanLower);

    const isNegative = [
      "no", "cancel", "mat karo", "nahi", "stop", "abort", "don't do it", "cancel action",
      "leave it", "forget it", "cancel this", "cancel quotation", "cancel invoice", "cancel order"
    ].includes(cleanLower) ||
      cleanLower.startsWith("cancel") ||
      cleanLower.startsWith("stop") ||
      cleanLower.includes("cancel this");

    if (pendingMsg && isAffirmative && pendingMsg.confirmationPayload) {
      setStatusFeedback("Executing your confirmed action...");
      await handleConfirmAction(pendingMsg.id, pendingMsg.confirmationPayload);
      return;
    }

    if (pendingMsg && isNegative) {
      setStatusFeedback("Action cancelled.");
      handleCancelAction(pendingMsg.id);
      return;
    }

    setIsLoading(true);
    setStatusFeedback("Understanding your command across ERP modules...");

    try {
      const providerParam = selectedProvider === "auto" ? undefined : selectedProvider;

      // ---------------------------------------------------------------------
      // ROUTE 0: FAST-TRACK LEARNED RULES & LOCAL ALIASES
      // ---------------------------------------------------------------------
      try {
        const localRules = JSON.parse(localStorage.getItem("heart_learned_rules") || "[]");
        const match = localRules.find((r: any) => 
          cleanLower === r.phrase.toLowerCase() || 
          cleanLower.includes(r.phrase.toLowerCase()) || 
          r.phrase.toLowerCase().includes(cleanLower)
        );
        if (match) {
          const spoken = match.response || (match.action === "NAVIGATE" ? `Opening ${match.actionLabel || match.route}` : `Guidance for ${match.phrase}`);
          if (!voiceMuted) {
            setIsSpeaking(true);
            speakText(spoken, { lang: language, onEnd: () => setIsSpeaking(false) });
          }
          const aiMsg: MessageItem = {
            id: `ai-learned-${Date.now()}`,
            sender: "ai",
            text: spoken,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase(),
            mode: "copilot",
            route: match.route,
            actionText: match.actionLabel || (match.route ? `Go to ${match.route}` : undefined),
            data: {
              answer: spoken,
              suggestedActions: match.route ? [{ label: match.actionLabel || "Open Screen", href: match.route }] : []
            }
          };
          setMessages(prev => [...prev, aiMsg]);
          setStatusFeedback("");
          setIsLoading(false);
          return;
        }
      } catch (e) {}

      // ---------------------------------------------------------------------
      // ROUTE 1: SOFTWARE GUIDE & WALKTHROUGH MODE
      // ---------------------------------------------------------------------
      const isGuideIntent = activeTab === "guide" ||
        cleanLower.includes("guide") ||
        cleanLower.includes("गाइड") ||
        cleanLower.includes("how to") ||
        cleanLower.includes("how do i") ||
        cleanLower.includes("how can i") ||
        cleanLower.includes("tell me how") ||
        cleanLower.includes("show me how") ||
        cleanLower.includes("walkthrough") ||
        cleanLower.includes("tutorial") ||
        cleanLower.includes("overview") ||
        cleanLower.includes("help") ||
        cleanLower.includes("how to use") ||
        cleanLower.includes("सॉफ्टवेयर") ||
        cleanLower.includes("कैसे करें") ||
        cleanLower.includes("का तरीका") ||
        cleanLower.includes("kaise banaye") ||
        cleanLower.includes("kaise kare") ||
        cleanLower.includes("batao") ||
        cleanLower.includes("samjhao");

      if (isGuideIntent) {
        setStatusFeedback("Searching ERP Knowledge Base & feature walkthroughs...");
        const guideRes = await searchErpGuide(rawText, providerParam);
        if (guideRes.article) {
          const spoken = guideRes.article.titleHindi
            ? `${guideRes.article.titleHindi}。 ${guideRes.article.summary}`
            : `${guideRes.article.title}. ${guideRes.article.summary}`;

          if (!voiceMuted) {
            setIsSpeaking(true);
            speakText(spoken, { lang: language, onEnd: () => setIsSpeaking(false) });
          }

          const aiMsg: MessageItem = {
            id: `ai-guide-${Date.now()}`,
            sender: "ai",
            text: guideRes.article.summary,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase(),
            mode: "guide",
            guideArticle: guideRes.article,
            provider: guideRes.provider,
            data: {
              answer: guideRes.article.summary,
              suggestedActions: guideRes.article.suggestedActions || [{ label: "Open Screen", href: guideRes.article.targetRoute }]
            }
          };

          setMessages(prev => [...prev, aiMsg]);
          setStatusFeedback("");
          setIsLoading(false);
          return;
        }
      }

      // ---------------------------------------------------------------------
      // ROUTE 2: DIAGNOSTIC & ISSUE SOLVER MODE
      // ---------------------------------------------------------------------
      const isDiagnosticIntent = activeTab === "diagnostic" ||
        cleanLower.includes("why cannot") ||
        cleanLower.includes("why can't") ||
        cleanLower.includes("issue") ||
        cleanLower.includes("error") ||
        cleanLower.includes("problem") ||
        cleanLower.includes("locked") ||
        cleanLower.includes("negative stock") ||
        cleanLower.includes("kyu nahi") ||
        cleanLower.includes("डिलीट नहीं") ||
        cleanLower.includes("खराबी");

      if (isDiagnosticIntent) {
        setStatusFeedback("Running self-service diagnostic audit...");
        const diagRes = await diagnoseErpIssue({ issueQuery: rawText, preferredProvider: providerParam });
        if (diagRes.success) {
          const spoken = diagRes.diagnosisHindi || diagRes.diagnosis;
          if (!voiceMuted) {
            setIsSpeaking(true);
            speakText(spoken, { lang: language, onEnd: () => setIsSpeaking(false) });
          }

          const aiMsg: MessageItem = {
            id: `ai-diag-${Date.now()}`,
            sender: "ai",
            text: diagRes.diagnosis,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase(),
            mode: "diagnostic",
            diagnosticResult: diagRes,
            provider: diagRes.provider,
            data: {
              answer: diagRes.diagnosis,
              suggestedActions: diagRes.suggestedAction ? [diagRes.suggestedAction] : []
            }
          };

          setMessages(prev => [...prev, aiMsg]);
          setStatusFeedback("");
          setIsLoading(false);
          return;
        }
      }

      // ---------------------------------------------------------------------
      // ROUTE 3: UNIVERSAL VOICE & EXECUTIVE COPILOT (DEFAULT)
      // ---------------------------------------------------------------------
      // Execute command through universal voice AI engine with selected model
      const res: VoiceAssistantResponse = await sendVoiceCommand(rawText, providerParam);

      // Speak response if voice is not muted
      if (!voiceMuted && res.spokenText) {
        setIsSpeaking(true);
        speakText(res.spokenText, {
          lang: language,
          onEnd: () => setIsSpeaking(false)
        });
      }

      // Format response message
      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.spokenText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase(),
        data: {
          answer: res.spokenText,
          keyMetrics: res.keyMetrics,
          suggestedActions: res.suggestedActions,
          followUpQuestions: res.followUpQuestions
        },
        cardType: res.cardType,
        cardData: res.cardData,
        route: res.route,
        actionText: res.actionText,
        requiresConfirmation: res.requiresConfirmation,
        confirmationPayload: res.confirmationPayload,
        executionStatus: res.requiresConfirmation ? "pending" : undefined,
        provider: res.provider || (selectedProvider === "auto" ? "auto" : selectedProvider)
      };

      setMessages(prev => [...prev, aiMsg]);
      setStatusFeedback("");
    } catch (err: any) {
      console.error("Error executing voice command:", err);
      // Fallback to legacy assistant
      try {
        const providerParam = selectedProvider === "auto" ? undefined : selectedProvider;
        const fallbackRes = await askERPAssistant(rawText, providerParam);
        if (fallbackRes.success && fallbackRes.data) {
          const aiMsg: MessageItem = {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: fallbackRes.data.answer,
            data: fallbackRes.data,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase(),
            provider: fallbackRes.provider || fallbackRes.data.provider || selectedProvider
          };
          setMessages(prev => [...prev, aiMsg]);
        } else {
          throw new Error(fallbackRes.error || "Failed");
        }
      } catch (fbErr) {
        const errorMsg: MessageItem = {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "I encountered an error processing your query. Please try again or rephrase.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
      setStatusFeedback("");
    } finally {
      setIsLoading(false);
    }
  };

  // Start Speech Recognition
  const handleStartListening = async () => {
    if (isListening) {
      const finalCmd = accumulatedModalTranscriptRef.current.trim() || interimTranscript.trim() || query.trim();
      const isPlaceholder = (t: string) => {
        const low = t.toLowerCase();
        return (
          low.includes("processing voice") ||
          low.includes("voice detected") ||
          low.includes("listening") ||
          low.includes("सुन रहे हैं") ||
          low.includes("पहचानी जा रही")
        );
      };

      stopSpeechRecognition();
      setIsListening(false);
      if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);
      if (finalCmd && !isPlaceholder(finalCmd)) {
        setInterimTranscript("");
        setStatusFeedback(`✨ Understood: "${finalCmd}"`);
        handleSend(finalCmd);
      } else {
        setStatusFeedback(language === "hi-IN" ? "कोई आवाज़ नहीं सुनाई दी। माइक दबाकर बोलें।" : "No speech detected. Tap mic to speak.");
      }
      return;
    }

    // Stop TTS if speaking
    stopSpeaking();
    setIsSpeaking(false);

    // Permission check
    const hasPerm = await requestMicrophonePermission();
    if (!hasPerm.success) {
      setStatusFeedback("⚠️ Microphone permission denied. Please allow microphone access in your browser/device.");
      return;
    }

    setStatusFeedback("🎙️ Listening... speak your ERP command now");
    setIsListening(true);
    setInterimTranscript("");
    accumulatedModalTranscriptRef.current = "";

    startSpeechRecognition({
      language,
      continuous: true,
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript: string, isFinal: boolean) => {
        if (
          transcript.toLowerCase().includes("processing voice") ||
          transcript.includes("पहचानी जा रही")
        ) {
          setStatusFeedback(language === "hi-IN" ? "✨ AI द्वारा आवाज़ पहचानी जा रही है..." : "✨ Processing voice with AI...");
          return;
        }

        const isPlaceholder = (t: string) => {
          const low = t.toLowerCase();
          return (
            low.includes("processing voice") ||
            low.includes("voice detected") ||
            low.includes("listening") ||
            low.includes("सुन रहे हैं") ||
            low.includes("पहचानी जा रही")
          );
        };

        if (!isPlaceholder(transcript)) {
          accumulatedModalTranscriptRef.current = transcript;
          setInterimTranscript(transcript);
          setQuery(transcript);
        } else {
          setInterimTranscript(transcript);
        }

        if (speechDebounceRef.current) {
          clearTimeout(speechDebounceRef.current);
        }

        // If result is final (from MediaRecorder AI transcription or Web Speech final result)
        if (isFinal) {
          const finalCmd = transcript.trim();
          if (finalCmd.length > 0 && !isPlaceholder(finalCmd)) {
            stopSpeechRecognition();
            setIsListening(false);
            setInterimTranscript("");
            setStatusFeedback(`✨ Understood: "${finalCmd}"`);
            handleSend(finalCmd);
            return;
          }
        }

        const isFragment = isIncompleteCommand(transcript);
        const timeoutMs = isFragment ? 2800 : 1600;

        speechDebounceRef.current = setTimeout(() => {
          const finalCmd = accumulatedModalTranscriptRef.current.trim();
          if (finalCmd.length > 0 && !isPlaceholder(finalCmd)) {
            stopSpeechRecognition();
            setIsListening(false);
            setInterimTranscript("");
            setStatusFeedback(`✨ Understood: "${finalCmd}"`);
            handleSend(finalCmd);
          }
        }, timeoutMs);
      },
      onError: (errorMsg: string, errorCode?: string) => {
        console.warn("Speech error:", errorMsg, errorCode);
        setIsListening(false);
        setInterimTranscript("");
        if (errorCode === "not-allowed" || errorMsg === "not-allowed") {
          setStatusFeedback("⚠️ Microphone access denied. Check your system/browser permissions.");
        } else if (errorCode === "no-speech" || errorMsg.toLowerCase().includes("no speech")) {
          setStatusFeedback("Tap the microphone or type your command below.");
        } else if (errorCode === "aborted") {
          setStatusFeedback("");
        } else {
          setStatusFeedback(errorMsg);
        }
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  };

  // Confirm ERP Action
  const handleConfirmAction = async (msgId: string, payload: ConfirmedVoiceActionPayload) => {
    // Update message status to executing
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, executionStatus: "executing" } : m))
    );

    try {
      const result = await executeConfirmedVoiceAction(payload);
      if (result.success) {
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  executionStatus: "confirmed",
                  executionResultText: result.message,
                  route: result.recordUrl || m.route
                }
              : m
          )
        );

        if (!voiceMuted && result.message) {
          speakText(result.message, { lang: language, onEnd: () => setIsSpeaking(false) });
        }

        const destinationRoute = result.recordUrl || (result as any).route || (payload as any).route;
        if (destinationRoute) {
          setStatusFeedback("Action executed successfully.");
        }
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  executionStatus: "error",
                  executionResultText: result.error || "Action execution failed."
                }
              : m
          )
        );
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {
                ...m,
                executionStatus: "error",
                executionResultText: err.message || "An unexpected error occurred."
              }
            : m
        )
      );
    }
  };

  // Cancel ERP Action
  const handleCancelAction = (msgId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? {
              ...m,
              executionStatus: "cancelled",
              executionResultText: "Action cancelled. No changes were made to your ERP data."
            }
          : m
      )
    );
  };

  // Edit action: Load into input for user to modify
  const handleEditAction = (payload: ConfirmedVoiceActionPayload) => {
    const params = (payload as any).parameters || payload.data;
    const summary = `${payload.actionType}: ${JSON.stringify(params)}`;
    setQuery(summary);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? "0px" : "16px",
        animation: "fadeIn 0.2s ease"
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: isMobile ? "20px 20px 0 0" : "20px",
          width: "100%",
          maxWidth: "880px",
          height: isMobile ? "96dvh" : "88vh",
          maxHeight: isMobile ? "100dvh" : "860px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid #cbd5e1",
          overflow: "hidden",
          position: "relative"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: isMobile ? "10px 14px 8px 14px" : "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "8px" : "10px"
          }}
        >
          {/* Top Row: Title & Quick Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              width: "100%"
            }}
          >
            {/* Title & Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px", minWidth: 0 }}>
              <div
                style={{
                  width: isMobile ? "34px" : "40px",
                  height: isMobile ? "34px" : "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ff1744 0%, #f43f5e 50%, #e11d48 100%)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(244, 63, 94, 0.4)",
                  flexShrink: 0
                }}
              >
                <StylishHeart size={isMobile ? 20 : 24} isBeating={true} variant="white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: isMobile ? "0.95rem" : "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    Heart
                  </h2>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      backgroundColor: "#fff1f2",
                      color: "#e11d48",
                      padding: "1px 6px",
                      borderRadius: "5px",
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      border: "1px solid #fecdd3",
                      whiteSpace: "nowrap"
                    }}
                  >
                    VOICE COPILOT
                  </span>
                  {isSpeaking && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        padding: "1px 6px",
                        borderRadius: "5px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <Volume2 size={11} className="animate-pulse" /> Speaking...
                    </span>
                  )}
                </div>
                {!isMobile && (
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                    Hands-free voice operations & natural intelligence across all 11 ERP modules.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions (Stop Speaking, Mute, Close) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setIsSpeaking(false);
                  }}
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fca5a5",
                    borderRadius: "7px",
                    padding: "3px 8px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                  title="Stop speaking"
                >
                  <VolumeX size={12} />
                  <span>Stop</span>
                </button>
              )}

              {/* TTS Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (!voiceMuted) stopSpeaking();
                  setVoiceMuted(!voiceMuted);
                }}
                style={{
                  background: voiceMuted ? "#fee2e2" : "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  width: isMobile ? "30px" : "32px",
                  height: isMobile ? "30px" : "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: voiceMuted ? "#dc2626" : "#475569"
                }}
                title={voiceMuted ? "Audio muted (Click to unmute)" : "Audio enabled (Click to mute)"}
              >
                {voiceMuted ? <VolumeX size={isMobile ? 14 : 15} /> : <Volume2 size={isMobile ? 14 : 15} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  width: isMobile ? "30px" : "32px",
                  height: isMobile ? "30px" : "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b"
                }}
                title="Close Copilot (Esc)"
              >
                <X size={isMobile ? 15 : 16} />
              </button>
            </div>
          </div>

          {/* Row 2: Model Engine & Language Selectors */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%"
            }}
          >
            {/* AI Model Engine Selector */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: isMobile ? "3px 6px" : "2px 8px",
                boxShadow: "none",
                transition: "all 0.15s ease"
              }}
              title="Select Active AI Model Engine"
            >
              <Cpu size={12} color="#64748b" style={{ flexShrink: 0 }} />
              <select
                value={selectedProvider}
                onChange={e => handleProviderChange(e.target.value as any)}
                style={{
                  width: "100%",
                  minWidth: 0,
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: isMobile ? "0.7rem" : "0.75rem",
                  fontWeight: 600,
                  color: selectedProvider === "gemini" ? "#0369a1" : "#334155",
                  outline: "none",
                  cursor: "pointer",
                  textOverflow: "ellipsis"
                }}
              >
                <option value="gemini">🧠 Google Gemini (Active)</option>
                <option value="openai">🤖 OpenAI GPT-4o</option>
                <option value="auto">🔄 Auto (Smart Fallback)</option>
              </select>
            </div>

            {/* Language Selector */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: isMobile ? "3px 6px" : "2px 6px"
              }}
              title="Select Voice Language"
            >
              <Globe size={12} color="#64748b" style={{ flexShrink: 0 }} />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as any)}
                style={{
                  width: "100%",
                  minWidth: 0,
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: isMobile ? "0.7rem" : "0.75rem",
                  fontWeight: 600,
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer",
                  textOverflow: "ellipsis"
                }}
              >
                <option value="auto">🇮🇳 Hindi + English</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिन्दी / Hinglish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs: Copilot / Guide / Diagnostic / Learning */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            padding: isMobile ? "6px 10px 4px 10px" : "8px 20px 4px 20px",
            borderBottom: "1px solid #e2e8f0",
            gap: isMobile ? "6px" : "8px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("copilot")}
            style={{
              padding: isMobile ? "5px 10px" : "6px 14px",
              borderRadius: "10px",
              border: activeTab === "copilot" ? "1px solid #fecdd3" : "1px solid transparent",
              backgroundColor: activeTab === "copilot" ? "#ffffff" : "transparent",
              color: activeTab === "copilot" ? "#e11d48" : "#64748b",
              fontWeight: activeTab === "copilot" ? 700 : 500,
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: activeTab === "copilot" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}
          >
            <StylishHeart size={isMobile ? 14 : 16} isBeating={activeTab === "copilot"} variant="gradient" />
            <span>Heart Copilot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            style={{
              padding: isMobile ? "5px 10px" : "6px 14px",
              borderRadius: "10px",
              border: activeTab === "guide" ? "1px solid #bae6fd" : "1px solid transparent",
              backgroundColor: activeTab === "guide" ? "#ffffff" : "transparent",
              color: activeTab === "guide" ? "#0369a1" : "#64748b",
              fontWeight: activeTab === "guide" ? 700 : 500,
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: activeTab === "guide" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}
          >
            <Compass size={14} color={activeTab === "guide" ? "#0ea5e9" : "#94a3b8"} />
            <span>Software Guide & How-To</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diagnostic")}
            style={{
              padding: isMobile ? "5px 10px" : "6px 14px",
              borderRadius: "10px",
              border: activeTab === "diagnostic" ? "1px solid #fecdd3" : "1px solid transparent",
              backgroundColor: activeTab === "diagnostic" ? "#ffffff" : "transparent",
              color: activeTab === "diagnostic" ? "#be123c" : "#64748b",
              fontWeight: activeTab === "diagnostic" ? 700 : 500,
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: activeTab === "diagnostic" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}
          >
            <Wrench size={14} color={activeTab === "diagnostic" ? "#e11d48" : "#94a3b8"} />
            <span>Diagnostics & Issue Solver</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("learning")}
            style={{
              padding: isMobile ? "5px 10px" : "6px 14px",
              borderRadius: "10px",
              border: activeTab === "learning" ? "1px solid #bbf7d0" : "1px solid transparent",
              backgroundColor: activeTab === "learning" ? "#ffffff" : "transparent",
              color: activeTab === "learning" ? "#16a34a" : "#64748b",
              fontWeight: activeTab === "learning" ? 700 : 500,
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: activeTab === "learning" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}
          >
            <GraduationCap size={15} color={activeTab === "learning" ? "#16a34a" : "#94a3b8"} />
            <span>🎓 Learning Mode</span>
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div
          style={{
            padding: isMobile ? "6px 10px" : "8px 16px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none"
          }}
        >
          {(activeTab === "guide"
            ? GUIDE_SUGGESTIONS
            : activeTab === "diagnostic"
            ? DIAGNOSTIC_SUGGESTIONS
            : VOICE_SUGGESTIONS
          ).map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleSend(p.query)}
              disabled={isLoading || isListening}
              style={{
                padding: isMobile ? "4px 8px" : "4px 10px",
                borderRadius: "20px",
                fontSize: "0.72rem",
                fontWeight: 600,
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#334155",
                cursor: isLoading || isListening ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
                whiteSpace: "nowrap"
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Active Listening Indicator / Waveform Banner */}
        {isListening && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              padding: isMobile ? "8px 12px" : "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: isMobile ? "8px" : "12px",
              animation: "fadeIn 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#dc2626",
                  boxShadow: "0 0 0 4px rgba(220, 38, 38, 0.2)",
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: isMobile ? "0.78rem" : "0.82rem", color: "#991b1b", display: "block" }}>
                  Listening live...
                </strong>
                <span
                  style={{
                    fontSize: isMobile ? "0.72rem" : "0.78rem",
                    color: "#b91c1c",
                    fontStyle: "italic",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {interimTranscript || "Speak your command in English, Hindi, or Hinglish..."}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <div style={{ width: isMobile ? "60px" : "100px", height: "30px" }}>
                <VoiceWaveform isActive={true} isSpeaking={false} />
              </div>
              <button
                type="button"
                onClick={handleStartListening}
                style={{
                  padding: "5px 11px",
                  borderRadius: "7px",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)"
                }}
              >
                <Send size={12} />
                <span>Send</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  abortSpeechRecognition();
                  setIsListening(false);
                  setInterimTranscript("");
                  setStatusFeedback("");
                }}
                style={{
                  padding: "5px 9px",
                  borderRadius: "7px",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fca5a5",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <Ban size={12} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback / Status text */}
        {statusFeedback && !isListening && (
          <div
            style={{
              padding: "6px 16px",
              backgroundColor: "#eff6ff",
              borderBottom: "1px solid #bfdbfe",
              fontSize: "0.75rem",
              color: "#1e40af",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Sparkles size={12} color="#2563eb" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {/* Message Stream or Learning Mode Panel */}
        {activeTab === "learning" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 10px" : "16px 20px", WebkitOverflowScrolling: "touch" }}>
            <LearningModePanel
              initialPhrase={trainPhrase}
              onSwitchToCopilot={() => setActiveTab("copilot")}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "12px 10px" : "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "10px" : "14px",
              WebkitOverflowScrolling: "touch"
            }}
          >
            {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                gap: "4px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  maxWidth: msg.sender === "user" ? "82%" : "94%",
                  flexDirection: msg.sender === "user" ? "row-reverse" : "row"
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: msg.sender === "user" ? "#4f46e5" : "#e11d48",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: msg.sender === "user" ? "0 2px 6px rgba(0,0,0,0.1)" : "0 2px 8px rgba(225, 29, 72, 0.35)"
                  }}
                >
                  {msg.sender === "user" ? <User size={16} /> : <StylishHeart size={18} isBeating={true} variant="white" />}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    backgroundColor: msg.sender === "user" ? "#4f46e5" : "#f8fafc",
                    color: msg.sender === "user" ? "#ffffff" : "#0f172a",
                    padding: "12px 16px",
                    borderRadius: msg.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    border: msg.sender === "user" ? "none" : "1px solid #e2e8f0",
                    fontSize: "0.85rem",
                    lineHeight: 1.55,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                  {/* Highlighted Key Metrics */}
                  {msg.data?.keyMetrics && msg.data.keyMetrics.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "8px",
                        marginTop: "12px"
                      }}
                    >
                      {msg.data.keyMetrics.map((m, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                          }}
                        >
                          <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>
                            {m.label}
                          </span>
                          <span
                            style={{
                              fontSize: "1.05rem",
                              fontWeight: 700,
                              color: m.positive === false ? "#dc2626" : "#0f172a",
                              fontVariantNumeric: "tabular-nums",
                              display: "block",
                              marginTop: "2px"
                            }}
                          >
                            {m.value}
                          </span>
                          {m.subtext && (
                            <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                              {m.subtext}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Confirmation Card (Write / Destructive ERP Actions) */}
                  {msg.requiresConfirmation && msg.confirmationPayload && (
                    <div
                      style={{
                        marginTop: "12px",
                        borderRadius: "12px",
                        border: "1px solid #f59e0b",
                        backgroundColor: "#fffbeb",
                        padding: "14px",
                        boxShadow: "0 2px 6px rgba(245, 158, 11, 0.1)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <AlertTriangle size={18} color="#d97706" />
                        <strong style={{ fontSize: "0.85rem", color: "#92400e" }}>
                          Confirmation Required: {msg.confirmationPayload.title}
                        </strong>
                      </div>

                      {/* Parameters Table */}
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #fde68a",
                          padding: "8px 12px",
                          fontSize: "0.78rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          marginBottom: "12px"
                        }}
                      >
                        {Object.entries((msg.confirmationPayload as any).parameters || msg.confirmationPayload.data || {}).map(([k, v]) => {
                          let formattedValue: React.ReactNode = String(v ?? "");

                          if (k.toLowerCase() === "items" && Array.isArray(v)) {
                            formattedValue = (
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px", textAlign: "right" }}>
                                {v.map((item: any, idx: number) => (
                                  <div key={idx} style={{ fontSize: "0.76rem" }}>
                                    <span style={{ fontWeight: 600 }}>{item.productName || item.name || "Item"}</span>: {item.quantity || 1} &times; ₹{(item.price || item.rate || 0).toLocaleString('en-IN')}
                                    {item.totalPrice ? ` (= ₹${item.totalPrice.toLocaleString('en-IN')})` : ''}
                                  </div>
                                ))}
                              </div>
                            );
                          } else if (typeof v === "object" && v !== null) {
                            formattedValue = JSON.stringify(v);
                          } else if (
                            typeof v === "number" &&
                            (k.toLowerCase().includes("price") ||
                              k.toLowerCase().includes("amount") ||
                              k.toLowerCase().includes("total") ||
                              k.toLowerCase().includes("subtotal") ||
                              k.toLowerCase().includes("tax"))
                          ) {
                            formattedValue = `₹${v.toLocaleString('en-IN')}`;
                          }

                          return (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                              <span style={{ color: "#78350f", textTransform: "capitalize", fontWeight: 500, minWidth: "90px" }}>
                                {k.replace(/([A-Z])/g, " $1")}:
                              </span>
                              <span style={{ color: "#0f172a", fontWeight: 600 }}>
                                {formattedValue}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action status or Confirm/Cancel Buttons */}
                      {msg.executionStatus === "pending" && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleConfirmAction(msg.id, msg.confirmationPayload!)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "8px",
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              border: "none",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <Check size={14} /> Confirm Action
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelAction(msg.id)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#ffffff",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <Ban size={14} /> Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditAction(msg.confirmationPayload!)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#ffffff",
                              color: "#475569",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.78rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                        </div>
                      )}

                      {msg.executionStatus === "executing" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#d97706", fontSize: "0.78rem" }}>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Executing verified ERP transaction in database...</span>
                        </div>
                      )}

                      {msg.executionStatus === "confirmed" && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            backgroundColor: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            color: "#065f46",
                            fontSize: "0.78rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle2 size={16} color="#059669" />
                            <span>{msg.executionResultText || "Action executed successfully."}</span>
                          </div>
                          {msg.route && (
                            <Link
                              href={msg.route}
                              onClick={handleClose}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#059669",
                                color: "#ffffff",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <span>Open Record</span>
                              <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>
                      )}

                      {msg.executionStatus === "cancelled" && (
                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9",
                            color: "#64748b",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <Ban size={14} />
                          <span>{msg.executionResultText}</span>
                        </div>
                      )}

                      {msg.executionStatus === "error" && (
                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            backgroundColor: "#fee2e2",
                            color: "#b91c1c",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <AlertTriangle size={14} />
                          <span>{msg.executionResultText}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Software Guide Card */}
                  {msg.guideArticle && (
                    <div
                      style={{
                        marginTop: "12px",
                        borderRadius: "12px",
                        border: "1px solid #bae6fd",
                        backgroundColor: "#f0f9ff",
                        padding: "14px",
                        boxShadow: "0 2px 6px rgba(14, 165, 233, 0.08)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Compass size={16} color="#0284c7" />
                          <strong style={{ fontSize: "0.85rem", color: "#0369a1" }}>
                            {msg.guideArticle.title}
                          </strong>
                        </div>
                        {msg.guideArticle.targetRoute === "#learning-mode" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTrainPhrase(msg.guideArticle?.keywords?.[0] || "");
                              setActiveTab("learning");
                            }}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor: "#16a34a",
                              color: "#ffffff",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <GraduationCap size={12} />
                            <span>Train in Learning Mode</span>
                          </button>
                        ) : (
                          <Link
                            href={msg.guideArticle.targetRoute}
                            onClick={() => handleClose(true)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor: "#0284c7",
                              color: "#ffffff",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>Open Screen</span>
                            <ExternalLink size={11} />
                          </Link>
                        )}
                      </div>

                      {msg.guideArticle.titleHindi && (
                        <div style={{ fontSize: "0.76rem", color: "#0c4a6e", fontWeight: 600, marginBottom: "8px" }}>
                          {msg.guideArticle.titleHindi}
                        </div>
                      )}

                      {/* Steps List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {msg.guideArticle.steps.map((st, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              backgroundColor: "#ffffff",
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #e0f2fe",
                              fontSize: "0.78rem"
                            }}
                          >
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                backgroundColor: "#0284c7",
                                color: "#ffffff",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}
                            >
                              {st.stepNumber}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: "#0f172a", fontWeight: 500 }}>{st.instruction}</div>
                              {st.instructionHindi && (
                                <div style={{ color: "#0369a1", fontSize: "0.72rem", marginTop: "2px" }}>
                                  {st.instructionHindi}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Guide Suggested Actions / Shortcuts */}
                      {msg.guideArticle.suggestedActions && msg.guideArticle.suggestedActions.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                          {msg.guideArticle.suggestedActions.map((act, i) =>
                            act.href === "#learning-mode" ? (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setTrainPhrase(msg.guideArticle?.keywords?.[0] || "");
                                  setActiveTab("learning");
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px"
                                }}
                              >
                                <GraduationCap size={13} />
                                <span>{act.label}</span>
                              </button>
                            ) : (
                              <Link
                                key={i}
                                href={act.href}
                                onClick={() => handleClose(true)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  backgroundColor: "#ffffff",
                                  color: "#0369a1",
                                  border: "1px solid #bae6fd",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                <span>{act.label}</span>
                                <ExternalLink size={11} />
                              </Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Issue Diagnostic Result Card */}
                  {msg.diagnosticResult && (
                    <div
                      style={{
                        marginTop: "12px",
                        borderRadius: "12px",
                        border: `1px solid ${msg.diagnosticResult.status === "IDENTIFIED" ? "#fecdd3" : "#bbf7d0"}`,
                        backgroundColor: msg.diagnosticResult.status === "IDENTIFIED" ? "#fff1f2" : "#f0fdf4",
                        padding: "14px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Wrench size={16} color={msg.diagnosticResult.status === "IDENTIFIED" ? "#e11d48" : "#16a34a"} />
                          <strong style={{ fontSize: "0.85rem", color: msg.diagnosticResult.status === "IDENTIFIED" ? "#9f1239" : "#166534" }}>
                            Diagnostic Audit: {msg.diagnosticResult.issueCategory.replace(/_/g, " ")}
                          </strong>
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            backgroundColor: msg.diagnosticResult.status === "IDENTIFIED" ? "#ffe4e6" : "#dcfce7",
                            color: msg.diagnosticResult.status === "IDENTIFIED" ? "#be123c" : "#15803d"
                          }}
                        >
                          {msg.diagnosticResult.status === "IDENTIFIED" ? "CAUSE IDENTIFIED" : "SYSTEM NORMAL"}
                        </span>
                      </div>

                      {/* Root cause box */}
                      {msg.diagnosticResult.rootCause && (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid #fecdd3",
                            marginBottom: "10px",
                            fontSize: "0.76rem"
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#be123c", display: "block" }}>Root Cause:</span>
                          <span style={{ color: "#334155" }}>{msg.diagnosticResult.rootCause}</span>
                        </div>
                      )}

                      {/* Solution Steps */}
                      {msg.diagnosticResult.solutionSteps && msg.diagnosticResult.solutionSteps.length > 0 && (
                        <div style={{ marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                            HOW TO RESOLVE:
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {msg.diagnosticResult.solutionSteps.map((step, idx) => (
                              <div key={idx} style={{ fontSize: "0.76rem", color: "#1e293b", display: "flex", gap: "6px" }}>
                                <span>•</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Action & Raise Support Ticket */}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "10px" }}>
                        {msg.diagnosticResult.suggestedAction && (
                          <Link
                            href={msg.diagnosticResult.suggestedAction.href}
                            onClick={() => handleClose(true)}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#0f172a",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px"
                            }}
                          >
                            <span>{msg.diagnosticResult.suggestedAction.label}</span>
                            <ExternalLink size={11} />
                          </Link>
                        )}

                        {msg.ticketNumber ? (
                          <div
                            style={{
                              padding: "5px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#ecfdf5",
                              border: "1px solid #a7f3d0",
                              color: "#047857",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px"
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Ticket #{msg.ticketNumber} Raised (Support Notified)</span>
                          </div>
                        ) : msg.diagnosticResult.canEscalateToTicket ? (
                          <button
                            type="button"
                            onClick={() => handleRaiseTicket(msg.id, msg.diagnosticResult!)}
                            disabled={raisingTicketForId === msg.id}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "8px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #fda4af",
                              color: "#e11d48",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px"
                            }}
                          >
                            {raisingTicketForId === msg.id ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Submitting Ticket...</span>
                              </>
                            ) : (
                              <>
                                <Ticket size={13} />
                                <span>Raise Support Ticket</span>
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Navigation / Action Link */}
                  {msg.route && !msg.requiresConfirmation && (
                    <div style={{ marginTop: "10px" }}>
                      <Link
                        href={msg.route}
                        onClick={() => handleClose(true)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <Navigation size={13} />
                        <span>{msg.actionText || "Navigate to ERP Record"}</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}

                  {/* Suggested Action Links */}
                  {msg.data?.suggestedActions && msg.data.suggestedActions.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                      {msg.data.suggestedActions
                        .filter(act => !act.href || act.href !== msg.route)
                        .map((act, i) =>
                          act.href ? (
                            <Link
                              key={i}
                              href={act.href}
                              onClick={() => handleClose(true)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#f8fafc",
                              color: "#2563eb",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>{act.label}</span>
                            <ExternalLink size={11} />
                          </Link>
                        ) : act.voiceCommand ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSend(act.voiceCommand)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#f5f3ff",
                              color: "#7c3aed",
                              border: "1px solid #ddd6fe",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Mic size={11} />
                            <span>{act.label}</span>
                          </button>
                        ) : null
                      )}
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {msg.data?.followUpQuestions && msg.data.followUpQuestions.length > 0 && (
                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "12px" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "#64748b",
                          fontWeight: 700,
                          display: "block",
                          marginBottom: "4px",
                          letterSpacing: "0.3px"
                        }}
                      >
                        SUGGESTED NEXT QUESTIONS:
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {msg.data.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSend(q)}
                            style={{
                              textAlign: "left",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              fontSize: "0.75rem",
                              color: "#4f46e5",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <ArrowRight size={11} />
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 42px" }}>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                  {msg.timestamp}
                </span>
                {msg.sender === "ai" && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: "10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      backgroundColor:
                          msg.provider === "gemini"
                          ? "#eff6ff"
                          : msg.provider === "openai"
                          ? "#faf5ff"
                          : "#f1f5f9",
                      color:
                          msg.provider === "gemini"
                          ? "#1d4ed8"
                          : msg.provider === "openai"
                          ? "#7e22ce"
                          : "#475569",
                      border: `1px solid ${
                          msg.provider === "gemini"
                          ? "#bfdbfe"
                          : msg.provider === "openai"
                          ? "#e9d5ff"
                          : "#cbd5e1"
                      }`
                    }}
                  >
                    {msg.provider === "gemini"
                      ? "🧠 Google Gemini Flash"
                      : msg.provider === "openai"
                      ? "🤖 GPT-4o"
                      : "🧠 Google Gemini"}
                  </span>
                )}

                {msg.sender === "ai" && (
                  <button
                    type="button"
                    onClick={() => {
                      const userMsg = messages.slice(0, messages.findIndex(m => m.id === msg.id)).reverse().find(m => m.sender === "user");
                      setTrainPhrase(userMsg?.text || "");
                      setActiveTab("learning");
                    }}
                    style={{
                      fontSize: "0.68rem",
                      color: "#059669",
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: "10px",
                      padding: "1px 7px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      fontWeight: 600
                    }}
                    title="Teach Heart custom command for this query"
                  >
                    <GraduationCap size={11} />
                    <span>Teach Heart</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#e11d48",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(225, 29, 72, 0.35)"
                }}
              >
                <StylishHeart size={18} isBeating={true} isFast={true} variant="white" />
              </div>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "10px 16px",
                  borderRadius: "16px 16px 16px 2px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.85rem",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <Sparkles size={14} className="animate-spin" color="#e11d48" />
                <span>Heart is querying live ERP database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        )}

        {/* Input Bar */}
        <div
          style={{
            padding: isMobile ? "8px 10px calc(10px + env(safe-area-inset-bottom, 0px)) 10px" : "12px 18px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: isMobile ? "8px" : "10px",
            alignItems: "center"
          }}
        >
          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={handleStartListening}
            style={{
              width: isMobile ? "40px" : "42px",
              height: isMobile ? "40px" : "42px",
              borderRadius: "12px",
              border: isListening ? "2px solid #dc2626" : "1px solid #cbd5e1",
              backgroundColor: isListening ? "#fee2e2" : "#f8fafc",
              color: isListening ? "#dc2626" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease",
              boxShadow: isListening ? "0 0 0 4px rgba(220, 38, 38, 0.15)" : "none"
            }}
            title={isListening ? "Listening... Click to stop" : "Speak question / command"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Stop Speaking Button */}
          {isSpeaking && (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setIsSpeaking(false);
              }}
              style={{
                height: isMobile ? "40px" : "42px",
                padding: isMobile ? "0 10px" : "0 14px",
                borderRadius: "12px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                fontWeight: 700,
                fontSize: isMobile ? "0.75rem" : "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap"
              }}
              title="Stop speech output"
            >
              <VolumeX size={15} />
              <span>Stop Speaking 🛑</span>
            </button>
          )}

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              isListening
                ? (isMobile ? "Listening... (Speak now)" : "Heart is listening... (Speak your command)")
                : (isMobile ? "Ask Heart or command ERP..." : "Ask Heart anything or command ERP: 'Show MTD sales', 'Create quote for ABC'...")
            }
            value={interimTranscript || query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile ? "9px 12px" : "10px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: isMobile ? "0.82rem" : "0.875rem",
              color: "#0f172a",
              outline: "none"
            }}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!query.trim() || isLoading}
            style={{
              width: isMobile ? "40px" : "42px",
              height: isMobile ? "40px" : "42px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: !query.trim() || isLoading ? "#cbd5e1" : "#4f46e5",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: !query.trim() || isLoading ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease"
            }}
            title="Send query"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
