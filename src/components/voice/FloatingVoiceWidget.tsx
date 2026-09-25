"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Heart,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Maximize2,
  Send,
  Loader2,
  CheckCircle2,
  Plus,
  ExternalLink,
  Check,
  AlertCircle
} from "lucide-react";
import StylishHeart from "./StylishHeart";
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  abortSpeechRecognition,
  isSpeechRecognitionSupported,
  isIncompleteCommand,
  speakText,
  stopSpeaking
} from "@/lib/speechService";
import { sendVoiceCommand } from "@/lib/voiceClient";
import { executeConfirmedVoiceAction, ConfirmedVoiceActionPayload } from "@/app/actions/voiceActionExecutor";
import { useVoiceStore } from "@/lib/stores/voiceStore";

export default function FloatingVoiceWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { openAssistant } = useVoiceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [lastExecutedQuery, setLastExecutedQuery] = useState("");
  const [language, setLanguage] = useState<"en-IN" | "hi-IN">("en-IN");
  const [voiceMuted, setVoiceMuted] = useState(false);
  const accumulatedTranscriptRef = useRef("");
  const [lastFeedback, setLastFeedback] = useState<{
    text: string;
    success?: boolean;
    actionText?: string;
    route?: string;
    suggestedActions?: Array<{ label: string; href?: string; voiceCommand?: string }>;
    cardType?: string;
    cardData?: any;
    keyMetrics?: Array<{ label: string; value: string; positive?: boolean }>;
  } | null>(null);

  const [pendingConfirmation, setPendingConfirmation] = useState<{
    payload: ConfirmedVoiceActionPayload;
    title: string;
    spokenText: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Restore preferred language
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("erp_voice_language");
      if (savedLang === "hi-IN" || savedLang === "en-IN") {
        setLanguage(savedLang);
      }
    } catch {}
  }, []);

  const handleLanguageToggle = () => {
    const next = language === "en-IN" ? "hi-IN" : "en-IN";
    setLanguage(next);
    try {
      localStorage.setItem("erp_voice_language", next);
    } catch {}
  };

  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionActiveRef = useRef(false);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll description to top when new feedback arrives
  useEffect(() => {
    if (lastFeedback && transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = 0;
    }
  }, [lastFeedback]);

  // Sync state with global event listener (e.g. from Topbar or Ctrl+Space)
  useEffect(() => {
    const handleToggleEvent = () => {
      toggleListening();
    };

    window.addEventListener("erp:toggle-floating-voice", handleToggleEvent);
    return () => {
      window.removeEventListener("erp:toggle-floating-voice", handleToggleEvent);
    };
  }, [isListening, isOpen]);

  // Global Keyboard Shortcut: Ctrl + Space or Alt + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.code === "Space") || (e.altKey && (e.key === "v" || e.key === "V"))) {
        // Prevent default space scroll
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isListening, isOpen]);

  // Stop listening and speaking when unmounted
  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      stopSpeaking();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const speakResponse = (text: string) => {
    if (voiceMuted || !text) return;
    speakText(text, {
      lang: language,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const handleCancelMisunderstood = () => {
    handleStopSpeaking();
    setLastFeedback(null);
    setTranscript("");
    setInterimTranscript("");
    setTypedInput("");
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;
    setIsConfirming(true);
    try {
      const result = await executeConfirmedVoiceAction(pendingConfirmation.payload);
      setIsConfirming(false);
      if (result.success) {
        const succMsg = result.message || (language === "hi-IN" ? "कार्य सफलतापूर्वक पूरा हुआ!" : "Action executed successfully!");
        if (!voiceMuted) {
          speakResponse(succMsg);
        }
        const dest = result.recordUrl || result.route || (pendingConfirmation.payload as any)?.route;
        if (dest) {
          router.push(dest);
        }
        setLastFeedback({
          text: succMsg,
          success: true,
          route: dest
        });
        setPendingConfirmation(null);
      } else {
        const errTxt = result.error || (language === "hi-IN" ? "कार्य पूरा नहीं हो सका।" : "Failed to execute action.");
        if (!voiceMuted) speakResponse(errTxt);
        setLastFeedback({
          text: errTxt,
          success: false
        });
      }
    } catch (err: any) {
      setIsConfirming(false);
      const errTxt = err.message || (language === "hi-IN" ? "पुष्टि करने में त्रुटि आई।" : "Error executing confirmation.");
      setLastFeedback({
        text: errTxt,
        success: false
      });
    }
  };

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null);
    const cancelMsg = language === "hi-IN" ? "कार्य रद्द कर दिया गया।" : "Action cancelled.";
    if (!voiceMuted) speakResponse(cancelMsg);
    setLastFeedback({ text: cancelMsg, success: true });
  };

  const handleCommandExecution = async (spokenCommand: string) => {
    const trimmed = spokenCommand.trim();
    if (!trimmed) return;

    setIsListening(false);
    stopSpeechRecognition();
    recognitionActiveRef.current = false;
    setIsProcessing(true);
    setLastExecutedQuery(trimmed);
    setLastFeedback(null);

    try {
      let preferredProvider: "gemini" | "openai" | undefined = "gemini";
      try {
        const saved = localStorage.getItem("erp_preferred_ai_provider");
        if (saved === "gemini" || saved === "openai") {
          preferredProvider = saved;
        }
      } catch {}

      const response = await sendVoiceCommand(trimmed, preferredProvider);

      setIsProcessing(false);

      if (response) {
        if (!response.success && response.spokenText) {
          if (!voiceMuted) speakResponse(response.spokenText);
          setLastFeedback({
            text: response.spokenText,
            success: false,
            actionText: response.actionText
          });
          return;
        }

        // 1. Handle Confirmation Requirements
        if (response.requiresConfirmation && response.confirmationPayload) {
          setPendingConfirmation({
            payload: response.confirmationPayload,
            title: response.confirmationPayload.title || (language === "hi-IN" ? "कार्य की पुष्टि करें" : "Confirm Action"),
            spokenText: response.spokenText || (language === "hi-IN" ? "कृपया पुष्टि करें।" : "Please confirm.")
          });
        } else {
          setPendingConfirmation(null);
        }

        // 2. Handle Client-side Actions (e.g. adding quotation item or setting customer directly)
        if (response.clientAction) {
          const isQuotationBuilder =
            window.location.pathname === "/quotations/new" ||
            window.location.pathname.startsWith("/quotations/new") ||
            window.location.pathname.includes("/edit");

          if (response.clientAction.type === "ADD_QUOTATION_ITEM") {
            const item = (response.clientAction as any).data || (response.clientAction as any).payload || {};
            if (isQuotationBuilder) {
              window.dispatchEvent(
                new CustomEvent("erp:add-quotation-item", { detail: item })
              );
            } else {
              const q = item.quantity ? `&qty=${encodeURIComponent(item.quantity)}` : "";
              const r = item.rate || item.unitPrice ? `&rate=${encodeURIComponent(item.rate || item.unitPrice)}` : "";
              const pName = item.productName || item.name || "Item";
              router.push(`/quotations/new?add_product=${encodeURIComponent(pName)}${q}${r}`);
            }
          } else if (response.clientAction.type === "SET_QUOTATION_CUSTOMER") {
            const cust = (response.clientAction as any).data || (response.clientAction as any).payload || {};
            if (isQuotationBuilder) {
              window.dispatchEvent(
                new CustomEvent("erp:set-quotation-customer", { detail: cust })
              );
            } else {
              const cName = cust.customerName || cust.name || "";
              router.push(`/quotations/new?customer=${encodeURIComponent(cName)}`);
            }
          }
        }

        // 3. Handle Navigation Routes (only navigate if explicitly NAVIGATION card and not dashboard home)
        if (
          response.route &&
          response.route !== "/" &&
          !response.clientAction &&
          response.cardType === "NAVIGATION"
        ) {
          router.push(response.route);
        }

        // 4. Spoken Feedback
        if (response.spokenText && !voiceMuted) {
          speakResponse(response.spokenText);
        }

        setLastFeedback({
          text: response.spokenText || response.actionText || "Command executed successfully.",
          success: response.success ?? true,
          actionText: response.actionText,
          route: response.route,
          suggestedActions: response.suggestedActions as any,
          cardType: response.cardType,
          cardData: response.cardData,
          keyMetrics: response.keyMetrics
        });
      }
    } catch (err: any) {
      console.error("Heart voice execution error:", err);
      setIsProcessing(false);
      const rawMsg = err?.message || "";
      const isMinifiedReact =
        rawMsg.includes("Minified React error") ||
        rawMsg.includes("react.dev/errors") ||
        rawMsg.includes("digest");
      const errMsg = isMinifiedReact
        ? (language === "hi-IN"
            ? "आदेश का निष्पादन नहीं हो सका। कृपया पुनः प्रयास करें।"
            : "Could not complete this command right now. Please try again.")
        : (rawMsg || (language === "hi-IN" ? "आदेश का निष्पादन नहीं हो सका।" : "Failed to process command. Please try again."));
      setLastFeedback({ text: errMsg, success: false });
    }
  };

  // Safety watchdog: auto-recover from any stuck isProcessing state after 7 seconds
  useEffect(() => {
    let timer: any = null;
    if (isProcessing) {
      timer = setTimeout(() => {
        console.warn("Heart isProcessing watchdog: auto-recovering from stuck state");
        setIsProcessing(false);
        setIsListening(false);
        recognitionActiveRef.current = false;
        setInterimTranscript("");
        setLastFeedback({
          text: language === "hi-IN"
            ? "प्रोसेसिंग में अधिक समय लगा। कृपया दोबारा बोलें या नीचे टाइप करें।"
            : "Voice processing took too long. Please tap mic to try again or type below.",
          success: false
        });
        try {
          abortSpeechRecognition();
          stopSpeechRecognition();
        } catch {}
      }, 7000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isProcessing, language]);

  const startListening = async () => {
    if (!isSpeechRecognitionSupported()) {
      setLastFeedback({
        text: language === "hi-IN"
          ? "इस ब्राउज़र या डिवाइस में आवाज़ पहचान समर्थित नहीं है।"
          : "Voice recognition is not supported in this browser or device.",
        success: false
      });
      setIsOpen(true);
      return;
    }

    // Stop TTS if speaking when user starts talking
    handleStopSpeaking();

    setIsOpen(true);
    setLastFeedback(null);
    setTranscript("");
    setInterimTranscript("");
    accumulatedTranscriptRef.current = "";
    setIsProcessing(false);
    setIsListening(true);
    recognitionActiveRef.current = true;

    try {
      await startSpeechRecognition({
        language,
        continuous: false,
        interimResults: true,
        onStart: () => {
          setIsListening(true);
          setIsProcessing(false);
          recognitionActiveRef.current = true;
        },
        onResult: (currentTranscript: string, isFinal: boolean) => {
          if (
            currentTranscript.toLowerCase().includes("processing voice") ||
            currentTranscript.includes("पहचानी जा रही")
          ) {
            setInterimTranscript(language === "hi-IN" ? "✨ AI द्वारा आवाज़ पहचानी जा रही है..." : "✨ Processing voice with AI...");
            setIsProcessing(true);
            setIsListening(false);
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

          if (!isPlaceholder(currentTranscript)) {
            accumulatedTranscriptRef.current = currentTranscript;
            setInterimTranscript(currentTranscript);
          } else {
            setInterimTranscript(currentTranscript);
          }

          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

          // If result is final (from MediaRecorder AI transcription or Web Speech final result)
          if (isFinal) {
            const finalCmd = currentTranscript.trim();
            if (finalCmd.length > 0 && !isPlaceholder(finalCmd)) {
              setTranscript(finalCmd);
              setInterimTranscript("");
              setIsProcessing(true);
              stopListening();
              handleCommandExecution(finalCmd);
              return;
            } else {
              setIsProcessing(false);
            }
          }

          // If the user spoke an incomplete fragment (e.g. "take me to", "open", "show me"),
          // DO NOT auto-submit! Wait up to 2.8s for the rest of the sentence.
          const isFragment = isIncompleteCommand(currentTranscript);
          const timeoutMs = isFragment ? 2800 : 1600;

          silenceTimeoutRef.current = setTimeout(() => {
            const finalCmd = accumulatedTranscriptRef.current.trim();
            if (finalCmd.length > 0 && !isPlaceholder(finalCmd)) {
              setTranscript(finalCmd);
              setInterimTranscript("");
              setIsProcessing(true);
              stopListening();
              handleCommandExecution(finalCmd);
            } else {
              setIsProcessing(false);
            }
          }, timeoutMs);
        },
        onError: (err, errCode) => {
          if (errCode !== "no-speech") {
            console.warn("Speech recognition warning:", err, errCode);
          }
          setIsListening(false);
          setIsProcessing(false);
          recognitionActiveRef.current = false;

          if (errCode === "not-allowed") {
            setLastFeedback({
              text: language === "hi-IN"
                ? "माइक्रोफ़ोन अनुमति नहीं मिली। कृपया सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।"
                : "Microphone permission denied. Please allow microphone access in device settings.",
              success: false
            });
          } else if (errCode === "no-speech") {
            setLastFeedback({
              text: err || (language === "hi-IN"
                ? "कोई आवाज़ नहीं सुनाई दी। माइक दबाकर दोबारा बोलें।"
                : "No speech detected. Tap mic to speak again."),
              success: false
            });
          } else {
            setLastFeedback({
              text: err || (language === "hi-IN" ? "आवाज़ पहचानने में त्रुटि आई। कृपया पुनः प्रयास करें।" : "Could not recognize speech. Tap mic to retry."),
              success: false
            });
          }
        },
        onEnd: () => {
          setIsListening(false);
          recognitionActiveRef.current = false;
          if (!accumulatedTranscriptRef.current && !transcript) {
            setIsProcessing(false);
          }
        }
      });
    } catch (e: any) {
      setIsListening(false);
      setIsProcessing(false);
      recognitionActiveRef.current = false;
      setLastFeedback({
        text: e?.message || (language === "hi-IN" ? "माइक शुरू करने में त्रुटि आई।" : "Failed to start microphone. Please retry."),
        success: false
      });
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsProcessing(false);
    recognitionActiveRef.current = false;
    setInterimTranscript("");
    try {
      abortSpeechRecognition();
      stopSpeechRecognition();
    } catch {}
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  };

  const toggleListening = () => {
    if (isListening) {
      // User manually tapped to finish speaking: execute whatever was accumulated
      const textToRun = accumulatedTranscriptRef.current.trim() || interimTranscript.trim();
      const isPlaceholder =
        !textToRun ||
        textToRun.toLowerCase().includes("processing voice") ||
        textToRun.toLowerCase().includes("voice detected") ||
        textToRun.toLowerCase().includes("listening") ||
        textToRun.toLowerCase().includes("सुन रहे हैं") ||
        textToRun.toLowerCase().includes("पहचानी जा रही");

      if (!isPlaceholder) {
        stopListening();
        setTranscript(textToRun);
        setInterimTranscript("");
        setIsProcessing(true);
        handleCommandExecution(textToRun);
      } else {
        // Nothing spoke yet or placeholder: stop cleanly without entering stuck processing
        stopListening();
        setLastFeedback({
          text: language === "hi-IN"
            ? "कोई आवाज़ नहीं सुनाई दी। माइक दबाकर दोबारा बोलें।"
            : "No speech detected. Tap mic to speak your command.",
          success: false
        });
      }
    } else {
      startListening();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const cmd = typedInput.trim();
    stopListening();
    setTypedInput("");
    setTranscript(cmd);
    handleCommandExecution(cmd);
  };

  // Dynamic quick suggestions based on current route and selected language
  const isQuotationBuilder = pathname === "/quotations/new" || pathname?.startsWith("/quotations/new") || pathname?.includes("/edit");
  const quickChips = isQuotationBuilder
    ? language === "hi-IN"
      ? [
          { label: "50 ट्रैकपेंट जोड़ो @ 450", cmd: "50 ट्रैकपेंट 450 रुपये में जोड़ो" },
          { label: "20 शर्ट्स जोड़ो @ 300", cmd: "20 शर्ट्स 300 रुपये में जोड़ो" },
          { label: "ग्राहक प्रीत गारमेंट्स", cmd: "कस्टमर प्रीत गारमेंट्स" }
        ]
      : [
          { label: "Add 50 Trackpants @ 450", cmd: "add 50 trackpants at 450" },
          { label: "Add 20 Shirts @ 300", cmd: "add 20 shirts at 300" },
          { label: "Customer Preet Garments", cmd: "customer Preet Garments" }
        ]
    : language === "hi-IN"
    ? [
        { label: "➕ नया कोटेशन बनाएं", cmd: "नया कोटेशन बनाओ" },
        { label: "📦 50 ट्रैकपेंट जोड़ो @ 450", cmd: "50 ट्रैकपेंट 450 रुपये में जोड़ो" },
        { label: "📊 आज की बिक्री", cmd: "आज की बिक्री कितनी है" },
        { label: "👥 आज की हाजिरी", cmd: "आज की हाजिरी दिखाओ" }
      ]
    : [
        { label: "➕ Create Quotation", cmd: "create new quotation" },
        { label: "📦 Add 50 Trackpants @ 450", cmd: "add 50 trackpants at 450" },
        { label: "📊 Today's Sales", cmd: "what are today's sales?" },
        { label: "👥 Attendance Logs", cmd: "show today's attendance" }
      ];

  return (
    <>
      {/* 1. COMPACT FLOATING VOICE DOCK / CAPSULE */}
      {isOpen && (
        <div
          className="floating-voice-capsule no-print"
          style={{
            position: "fixed",
            bottom: "94px",
            right: "24px",
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            borderRadius: "20px",
            boxShadow: "0 20px 45px -8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(99, 102, 241, 0.2)",
            backdropFilter: "blur(16px)",
            zIndex: 99998,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "slideUpFade 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
            fontFamily: "inherit"
          }}
        >
          {/* Capsule Header */}
          <div
            style={{
              padding: "12px 16px",
              background: "linear-gradient(135deg, #e11d48 0%, #be123c 45%, #4f46e5 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <StylishHeart
                size={20}
                isBeating={true}
                isFast={isListening}
                variant="white"
              />
              <span style={{ fontSize: "0.86rem", fontWeight: 700, letterSpacing: "0.3px" }}>
                {isListening
                  ? language === "hi-IN" ? "Heart सुन रहा है..." : "Heart is Listening..."
                  : isProcessing
                  ? language === "hi-IN" ? "Heart प्रोसेस कर रहा है..." : "Heart is Thinking..."
                  : language === "hi-IN" ? "Heart वॉयस AI" : "Heart — Voice AI Copilot"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Stop Speaking Button */}
              {isSpeaking && (
                <button
                  type="button"
                  onClick={handleStopSpeaking}
                  title="Stop speaking"
                  style={{
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fca5a5",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px"
                  }}
                >
                  <VolumeX size={12} />
                  <span>Stop 🛑</span>
                </button>
              )}

              {/* Language Switcher */}
              <button
                type="button"
                onClick={handleLanguageToggle}
                title={language === "en-IN" ? "हिंदी में बदलें (Switch to Hindi)" : "Switch to English"}
                style={{
                  backgroundColor: language === "hi-IN" ? "#fbbf24" : "rgba(255, 255, 255, 0.2)",
                  color: language === "hi-IN" ? "#1e1b4b" : "#ffffff",
                  border: "none",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {language === "en-IN" ? "EN" : "HI (हिंदी)"}
              </button>

              {/* Mute/Unmute TTS */}
              <button
                type="button"
                onClick={() => setVoiceMuted(!voiceMuted)}
                title={voiceMuted ? "Unmute Voice" : "Mute Voice"}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#ffffff",
                  padding: "4px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {voiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Expand Full Assistant Dialog */}
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setIsOpen(false);
                  const qToPass = lastExecutedQuery || transcript || typedInput || (lastFeedback?.actionText || "");
                  openAssistant(
                    qToPass,
                    false,
                    lastFeedback
                      ? {
                          query: qToPass,
                          ...lastFeedback
                        }
                      : undefined
                  );
                }}
                title="Open Full Copilot Dialog"
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#ffffff",
                  padding: "4px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <Maximize2 size={15} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setIsOpen(false);
                }}
                title="Close Voice Assistant"
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#ffffff",
                  padding: "4px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Capsule Content Area */}
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Waveform Animation while listening */}
            {isListening && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  height: "28px"
                }}
              >
                {[1, 2, 3, 4, 5].map((bar) => (
                  <span
                    key={bar}
                    style={{
                      width: "4px",
                      height: `${10 + (bar % 3) * 8}px`,
                      backgroundColor: "#6366f1",
                      borderRadius: "2px",
                      animation: `waveBar 0.8s ease-in-out infinite alternate ${bar * 0.15}s`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Transcript & Status text */}
            <div
              ref={transcriptBoxRef}
              style={{
                position: "relative",
                minHeight: "44px",
                maxHeight: "min(240px, 38vh)",
                overflowY: "auto",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                fontSize: "0.85rem",
                color: "#1e293b",
                display: "flex",
                flexDirection: "column",
                justifyContent: lastFeedback ? "flex-start" : "center",
                WebkitOverflowScrolling: "touch",
                scrollBehavior: "smooth"
              }}
            >
              {lastFeedback && (
                <button
                  type="button"
                  onClick={() => setLastFeedback(null)}
                  title="Dismiss"
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <X size={13} />
                </button>
              )}

              {isProcessing ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6366f1" }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontWeight: 600 }}>
                    {interimTranscript && interimTranscript.toLowerCase().includes("processing voice")
                      ? (language === "hi-IN" ? "AI द्वारा आवाज़ पहचानी जा रही है..." : "Processing voice with AI...")
                      : (language === "hi-IN" ? "आदेश पूरा किया जा रहा है..." : "Executing ERP command...")}
                  </span>
                </div>
              ) : isListening ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                      boxShadow: "0 0 8px #ef4444",
                      animation: "pulse 1.2s infinite",
                      flexShrink: 0
                    }}
                  />
                  {interimTranscript ? (
                    <strong style={{ color: "#4338ca" }}>{interimTranscript}</strong>
                  ) : (
                    <span style={{ color: "#64748b" }}>
                      {language === "hi-IN"
                        ? "सुन रहे हैं... बोलिए (उदा: '50 ट्रैकपेंट 450 में जोड़ो' या 'कोटेशन बनाओ')"
                        : "Listening... speak now (e.g. \"Create quotation\" or \"Today's sales\")"}
                    </span>
                  )}
                </span>
              ) : lastFeedback ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", paddingRight: "16px" }}>
                    {lastFeedback.success ? (
                      <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
                    ) : (
                      <Sparkles size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: "2px" }} />
                    )}
                    <span style={{ fontWeight: 500, lineHeight: 1.55, wordBreak: "break-word", color: "#0f172a" }}>{lastFeedback.text}</span>
                  </div>

                  {/* Guide Steps Preview */}
                  {lastFeedback.cardType === "GUIDE" && lastFeedback.cardData?.steps && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", margin: "4px 0", backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #c7d2fe" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#4338ca", letterSpacing: "0.3px" }}>
                        {language === "hi-IN" ? "सॉफ्टवेयर गाइड स्टेप्स:" : "GUIDE STEPS:"}
                      </span>
                      {lastFeedback.cardData.steps.slice(0, 4).map((st: any, sIdx: number) => (
                        <div key={sIdx} style={{ fontSize: "0.74rem", color: "#1e293b", display: "flex", gap: "6px", lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 700, color: "#4f46e5", flexShrink: 0 }}>{st.stepNumber}.</span>
                          <span>{language === "hi-IN" && st.instructionHindi ? st.instructionHindi : st.instruction}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Key Metrics Chips */}
                  {lastFeedback.keyMetrics && lastFeedback.keyMetrics.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "2px 0" }}>
                      {lastFeedback.keyMetrics.map((km, kmIdx) => (
                        <span
                          key={kmIdx}
                          style={{
                            fontSize: "0.72rem",
                            backgroundColor: km.positive ? "#ecfdf5" : "#f1f5f9",
                            padding: "2px 7px",
                            borderRadius: "6px",
                            color: km.positive ? "#065f46" : "#334155",
                            fontWeight: 600,
                            border: `1px solid ${km.positive ? "#a7f3d0" : "#e2e8f0"}`
                          }}
                        >
                          {km.label}: <strong>{km.value}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Route Jump Button */}
                  {lastFeedback.route && (
                    <button
                      type="button"
                      onClick={() => {
                        if (lastFeedback.route) {
                          router.push(lastFeedback.route);
                        }
                      }}
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        border: "none",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "2px"
                      }}
                    >
                      <span>{language === "hi-IN" ? "पेज पर जाएं" : "Open Page"}</span>
                      <ExternalLink size={11} />
                    </button>
                  )}

                  {/* Suggested Action Pills */}
                  {lastFeedback.suggestedActions && lastFeedback.suggestedActions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                      {lastFeedback.suggestedActions.map((sAction, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            if (sAction.href) {
                              router.push(sAction.href);
                            } else if (sAction.voiceCommand) {
                              handleCommandExecution(sAction.voiceCommand);
                            }
                          }}
                          style={{
                            backgroundColor: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            borderRadius: "6px",
                            padding: "2px 7px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {sAction.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cancel / Misunderstood & Teach Heart Actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleCancelMisunderstood}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#64748b",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <X size={11} />
                      <span>{language === "hi-IN" ? "गलत समझा? रद्द करें" : "Misunderstood? Cancel"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopListening();
                        handleStopSpeaking();
                        setIsOpen(false);
                        openAssistant(lastExecutedQuery || transcript || "", false, undefined);
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#059669",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <span>🎓 Teach Heart</span>
                    </button>
                  </div>
                </div>
              ) : (
                <span style={{ color: "#64748b" }}>
                  {language === "hi-IN"
                    ? "नीचे माइक दबाएं या सुझाव चुनें:"
                    : "Tap the mic below or choose a quick prompt:"}
                </span>
              )}
            </div>

            {/* Pending Confirmation Card */}
            {pendingConfirmation && (
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  animation: "fadeIn 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b45309", fontWeight: 700, fontSize: "0.82rem" }}>
                  <AlertCircle size={15} />
                  <span>{pendingConfirmation.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#78350f", lineHeight: "1.3" }}>
                  {pendingConfirmation.spokenText}
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                  <button
                    type="button"
                    onClick={handleConfirmAction}
                    disabled={isConfirming}
                    style={{
                      flex: 1,
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: isConfirming ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px"
                    }}
                  >
                    {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>{language === "hi-IN" ? "✓ पुष्टि करें (हाँ)" : "✓ Confirm (Yes)"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelConfirmation}
                    disabled={isConfirming}
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <span>{language === "hi-IN" ? "✕ रद्द करें" : "✕ Cancel"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    stopListening();
                    setTranscript(chip.cmd);
                    handleCommandExecution(chip.cmd);
                  }}
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    borderRadius: "20px",
                    padding: "5px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff1f2";
                    e.currentTarget.style.borderColor = "#fda4af";
                    e.currentTarget.style.color = "#be123c";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.color = "#334155";
                  }}
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Dedicated Stop Speaking button when TTS is active */}
            {isSpeaking && (
              <button
                type="button"
                onClick={handleStopSpeaking}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid #fca5a5",
                  backgroundColor: "#fff1f2",
                  color: "#be123c",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  boxShadow: "0 2px 6px rgba(225, 29, 72, 0.15)",
                  transition: "all 0.15s ease"
                }}
              >
                <VolumeX size={16} />
                <span>{language === "hi-IN" ? "🛑 बोलना रोकें (Stop Speaking)" : "🛑 Stop Speaking"}</span>
              </button>
            )}

            {/* Prominent In-Capsule Tap to Speak Button */}
            {isListening ? (
              <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                <button
                  type="button"
                  onClick={toggleListening}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)"
                  }}
                >
                  <Send size={14} />
                  <span>{language === "hi-IN" ? "हो गया / भेजें (Send Now)" : "Done / Send Now"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    abortSpeechRecognition();
                    stopListening();
                  }}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "10px",
                    border: "1px solid #fecaca",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: "#dc2626",
                    backgroundColor: "#fef2f2"
                  }}
                >
                  <X size={14} />
                  <span>{language === "hi-IN" ? "रद्द करें" : "Cancel"}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleListening}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
                  transition: "all 0.15s ease"
                }}
              >
                <Mic size={15} />
                <span>{language === "hi-IN" ? "माइक दबाएं और बोलें" : "Tap to Speak"}</span>
              </button>
            )}

            {/* Manual Text Input Fallback */}
            <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
              <input
                type="text"
                placeholder={language === "hi-IN" ? "Heart से पूछें या टाइप करें..." : "Ask Heart or type command..."}
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                disabled={!typedInput.trim() || isProcessing}
                style={{
                  backgroundColor: typedInput.trim() ? "#4f46e5" : "#e2e8f0",
                  color: typedInput.trim() ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0 12px",
                  cursor: typedInput.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. THE SMALL, STYLISH FLOATING MIC BUTTON (FAB) */}
      <div
        className="floating-voice-button-container no-print"
        style={{
          position: "fixed",
          bottom: "28px",
          right: "24px",
          zIndex: 820,
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        {/* Subtle hover prompt / pill */}
        {!isOpen && (
          <div
            className="floating-voice-tooltip"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.96)",
              color: "#1e293b",
              padding: "3.5px 9px 3.5px 7px",
              borderRadius: "16px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(225, 29, 72, 0.05)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              animation: "fadeIn 0.2s ease",
              border: "1px solid rgba(244, 63, 94, 0.22)"
            }}
          >
            <StylishHeart size={13} isBeating={true} variant="gradient" showGlow={false} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", lineHeight: 1 }}>
              <span
                style={{
                  color: "#475569",
                  fontWeight: 550,
                  fontSize: "0.68rem",
                  letterSpacing: "0.2px"
                }}
              >
                Talk to
              </span>
              <span
                style={{
                  color: "#e11d48",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  letterSpacing: "0.3px"
                }}
              >
                Heart
              </span>
            </span>
          </div>
        )}

        {/* Hero Button: Transparent — just the beating heart, no circle */}
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Heart — ERP Voice AI Copilot (Click to Speak or Ctrl+Space)"}
          style={{
            position: "relative",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "transparent",
            color: "transparent",
            border: "none",
            boxShadow: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: isListening ? "scale(1.08)" : "scale(1)"
          }}
          onMouseEnter={(e) => {
            if (!isListening) e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            if (!isListening) e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {/* Animated pulse rings when listening */}
          {isListening && (
            <>
              <span
                style={{
                  position: "absolute",
                  inset: "-8px",
                  borderRadius: "50%",
                  border: "2px solid rgba(244, 63, 94, 0.65)",
                  animation: "heartPulseRing 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite"
                }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: "-16px",
                  borderRadius: "50%",
                  border: "2px solid rgba(244, 63, 94, 0.35)",
                  animation: "heartPulseRing 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite 0.35s"
                }}
              />
            </>
          )}

          {/* Stylish 3D Beating Heart with Animated ECG */}
          <StylishHeart
            size={38}
            isBeating={true}
            isFast={isListening}
          />
        </button>
      </div>

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.9);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        @keyframes waveBar {
          0% {
            height: 6px;
          }
          100% {
            height: 24px;
          }
        }

        @keyframes pulseDot {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .floating-voice-button-container {
            bottom: 84px !important;
            right: 18px !important;
          }
          .floating-voice-capsule {
            bottom: 148px !important;
            right: 16px !important;
          }
          .floating-voice-tooltip {
            display: none !important;
          }
        }

        @media print {
          .floating-voice-button-container,
          .floating-voice-capsule,
          .floating-voice-tooltip,
          .stylish-heart-container,
          [data-voice-widget],
          .no-print {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        }
      `}</style>
    </>
  );
}
