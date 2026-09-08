"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  Flame,
  Snowflake,
  Sun,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Volume2,
  AlertCircle,
  Zap,
  ArrowRight
} from "lucide-react";
import {
  analyzeCallVoiceDebrief,
  saveCallWithAIDebrief,
  type CallVoiceDebriefAnalysis
} from "@/app/actions/callAiActions";

interface CallVoiceDebriefWidgetProps {
  contactName?: string;
  contactPhone?: string;
  customerId?: string | null;
  leadId?: string | null;
  callDurationSec?: number;
  callType?: "OUTBOUND" | "INBOUND";
  /** Trigger timestamp from parent when a call ends to automatically start voice debrief listening */
  autoStartTrigger?: number;
  /** Callback when AI debrief analysis completes and updates parent form state */
  onApplyToForm?: (data: {
    outcome: string;
    notes: string;
    summary: string;
    followUpDate: string;
    followUpHour: string;
    followUpMinute: string;
    followUpPeriod: "AM" | "PM";
    dealSentiment?: "HOT" | "WARM" | "COLD";
    keyPoints?: string[];
  }) => void;
  /** Callback when call is saved directly via 1-tap in this widget */
  onCallSaved?: (result: any) => void;
  /** Optional initial compact state */
  initialExpanded?: boolean;
}

const QUICK_PRESETS = [
  {
    label: "☀️ Interested • Send Quote",
    outcome: "Interested / Follow-up Needed",
    sentiment: "WARM" as const,
    summary: "Customer expressed positive interest in catalog and pricing. Requested quotation and product details for review.",
    followUpDays: 1,
    hour: "11",
    min: "00",
    period: "AM" as const
  },
  {
    label: "🔥 Confirmed • Order Placed",
    outcome: "Order Placed / Deal Closed",
    sentiment: "HOT" as const,
    summary: "Order agreed and confirmed on call. Details recorded for immediate billing and dispatch processing.",
    followUpDays: 0,
    hour: "04",
    min: "00",
    period: "PM" as const
  },
  {
    label: "💬 Price Negotiation",
    outcome: "Price Negotiation / Discount Discussion",
    sentiment: "WARM" as const,
    summary: "Customer requested best bulk discount rate. Scheduled follow-up after checking management approval.",
    followUpDays: 1,
    hour: "02",
    min: "30",
    period: "PM" as const
  },
  {
    label: "📞 Callback Tomorrow",
    outcome: "Callback Scheduled",
    sentiment: "WARM" as const,
    summary: "Customer was occupied or traveling. Asked to call back tomorrow at specified time.",
    followUpDays: 1,
    hour: "11",
    min: "00",
    period: "AM" as const
  },
  {
    label: "❌ Busy / No Answer",
    outcome: "No Answer / Busy",
    sentiment: "COLD" as const,
    summary: "Call was unanswered or busy. Automated reminder set for retry.",
    followUpDays: 1,
    hour: "10",
    min: "30",
    period: "AM" as const
  }
];

export default function CallVoiceDebriefWidget({
  contactName = "Contact",
  contactPhone = "",
  customerId,
  leadId,
  callDurationSec = 0,
  callType = "OUTBOUND",
  autoStartTrigger,
  onApplyToForm,
  onCallSaved,
  initialExpanded = true
}: CallVoiceDebriefWidgetProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<CallVoiceDebriefAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Audio / Speech refs
  const speechRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to stopRecording so the interval closure always calls the latest version
  const stopRecordingRef = useRef<(() => void) | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // When call ends: expand widget and show prompt — do NOT auto-start recording
  // (auto-start captures silence since mic just released from phone call)
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    if (autoStartTrigger && autoStartTrigger > 0) {
      hasAutoTriggered.current = true;
      setIsExpanded(true);
      // Reset any previous analysis so the fresh record button is shown
      setAnalysis(null);
      setLiveTranscript("");
      setErrorMessage("");
    }
  }, [autoStartTrigger]);

  // Start Voice Debrief Recording
  const startRecording = async () => {
    setErrorMessage("");
    setLiveTranscript("");
    setAnalysis(null);
    setRecordingSec(0);

    // Grant app lock exemption
    if (typeof window !== "undefined") {
      (window as any).grantAppLockExemption?.(180);
    }

    let speechActive = false;

    // 1. Initialize Web Speech Recognition
    const SpeechRec = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "hi-IN"; // Supports Hindi, English & Hinglish

        recognition.onresult = (event: any) => {
          let accumulated = "";
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + " ";
          }
          if (accumulated.trim()) {
            setLiveTranscript(accumulated.trim());
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition notice:", e);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        speechActive = true;
      } catch (e) {
        console.warn("Speech API start notice:", e);
      }
    }

    // 2. Initialize MediaRecorder for parallel audio capture
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
      }
    } catch (err: any) {
      console.warn("Microphone stream notice:", err);
      if (!speechActive) {
        setErrorMessage("Microphone access needed. You can also tap any quick preset below.");
      }
    }

    setIsRecording(true);
    // Use a local counter to avoid calling stopRecording() inside a setState updater
    // (calling async state-setting functions inside setState is illegal in React)
    let sec = 0;
    timerRef.current = setInterval(() => {
      sec += 1;
      setRecordingSec(sec);
      if (sec >= 60) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        stopRecordingRef.current?.();
      }
    }, 1000);
  };

  // Stop Recording & Send to Gemini AI
  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop speech recognition
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
    }

    // Stop MediaRecorder safely with timeout race
    let audioBase64: string | undefined = undefined;
    let mimeType: string | undefined = undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        const recorder = mediaRecorderRef.current;
        const blobPromise = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            const mime = recorder.mimeType || "audio/webm";
            const blob = new Blob(audioChunksRef.current, { type: mime });
            resolve(blob);
          };
          try {
            recorder.stop();
          } catch (e) {
            resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
          }
        });

        // 750ms timeout race to ensure execution never hangs
        const timeoutPromise = new Promise<Blob>((resolve) => {
          setTimeout(() => {
            resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
          }, 750);
        });

        const blob = await Promise.race([blobPromise, timeoutPromise]);

        // Stop all audio tracks safely
        recorder.stream?.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });

        if (blob && blob.size > 0) {
          mimeType = blob.type || "audio/webm";
          audioBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              const b64 = res.includes(",") ? res.split(",")[1] : res;
              resolve(b64);
            };
            reader.onerror = () => resolve("");
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.warn("Audio processing fallback notice:", err);
      }
    }

    // Trigger AI Analysis
    processWithGeminiAI(liveTranscript, audioBase64, mimeType);
  };

  // Call Server Action
  const processWithGeminiAI = async (
    text: string,
    audioBase64?: string,
    mimeType?: string
  ) => {
    setIsAnalyzing(true);
    setErrorMessage("");

    const speechText = text.trim();
    // If speech was silent / not captured, provide graceful context fallback
    const effectiveText = speechText || `Discussion with ${contactName || "Customer"}. Call duration ${callDurationSec}s. Follow-up required.`;

    try {
      const res = await analyzeCallVoiceDebrief({
        spokenText: effectiveText,
        audioBase64: audioBase64 && audioBase64.length > 50 ? audioBase64 : undefined,
        mimeType,
        callContext: {
          contactName,
          contactPhone,
          durationSec: callDurationSec,
          customerId: customerId || undefined,
          leadId: leadId || undefined
        }
      });

      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        if (onApplyToForm) {
          onApplyToForm({
            outcome: res.analysis.detectedOutcome || "Interested / Follow-up Needed",
            summary: res.analysis.summary || "",
            notes: res.analysis.summary
              ? `${res.analysis.summary}\n\n[Key Takeaways]:\n${(res.analysis.keyPoints || []).map((p) => `• ${p}`).join("\n")}`
              : res.analysis.transcript || "",
            followUpDate: res.analysis.suggestedFollowUp?.date || "",
            followUpHour: res.analysis.suggestedFollowUp?.hour12 || "11",
            followUpMinute: res.analysis.suggestedFollowUp?.minute || "00",
            followUpPeriod: res.analysis.suggestedFollowUp?.period || "AM",
            dealSentiment: res.analysis.dealSentiment,
            keyPoints: res.analysis.keyPoints
          });
        }
      } else {
        // Apply immediate fallback preset
        handleApplyPreset(QUICK_PRESETS[0]);
      }
    } catch (err: any) {
      console.error("AI Debrief error:", err);
      handleApplyPreset(QUICK_PRESETS[0]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Keep stopRecordingRef in sync with latest stopRecording closure
  stopRecordingRef.current = stopRecording as any;
  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + preset.followUpDays);
    const dateStr = targetDate.toISOString().split("T")[0];

    const syntheticAnalysis: CallVoiceDebriefAnalysis = {
      transcript: preset.summary,
      summary: preset.summary,
      keyPoints: [preset.label, `Contact: ${contactName}`],
      detectedOutcome: preset.outcome,
      dealSentiment: preset.sentiment,
      sentimentReason: "Selected via quick preset disposition",
      suggestedFollowUp: {
        hasFollowUp: preset.followUpDays > 0,
        date: preset.followUpDays > 0 ? dateStr : null,
        hour12: preset.hour,
        minute: preset.min,
        period: preset.period,
        actionTitle: `Follow-up: ${contactName}`,
        reason: preset.label
      }
    };

    setAnalysis(syntheticAnalysis);
    setErrorMessage("");

    if (onApplyToForm) {
      onApplyToForm({
        outcome: preset.outcome,
        summary: preset.summary,
        notes: preset.summary,
        followUpDate: preset.followUpDays > 0 ? dateStr : "",
        followUpHour: preset.hour,
        followUpMinute: preset.min,
        followUpPeriod: preset.period,
        dealSentiment: preset.sentiment,
        keyPoints: syntheticAnalysis.keyPoints
      });
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "12px 14px",
        marginBottom: "14px",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)"
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer"
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
              flexShrink: 0
            }}
          >
            <Sparkles size={17} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a" }}>
                AI Voice Debrief & Insights
              </span>
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  backgroundColor: "#e0e7ff",
                  color: "#3730a3",
                  padding: "1px 5px",
                  borderRadius: "6px"
                }}
              >
                Gemini 2.5
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>
              Speak or tap a preset to auto-generate summary & follow-up
            </p>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            padding: "4px"
          }}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: "12px" }}>
          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 10px",
                backgroundColor: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "8px",
                color: "#be123c",
                fontSize: "0.74rem",
                marginBottom: "10px"
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MAIN RECORDING CONTROLLER */}
          {!analysis ? (
            <div>
              {!isRecording && !isAnalyzing ? (
                /* IDLE STATE: Post-call prompt or normal record button */
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

                  {/* Post-call banner — shown after a call ends */}
                  {hasAutoTriggered.current && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        backgroundColor: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        borderRadius: "10px",
                        fontSize: "0.78rem",
                        color: "#15803d",
                        fontWeight: 700
                      }}
                    >
                      <span style={{ fontSize: "1rem" }}>📞</span>
                      <span>Call ended! Tap the button below and <u>speak your call summary</u> now.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={startRecording}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: hasAutoTriggered.current
                        ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
                        : "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: hasAutoTriggered.current
                        ? "0 4px 14px rgba(22, 163, 74, 0.4)"
                        : "0 4px 12px rgba(79, 70, 229, 0.3)",
                      transition: "transform 0.15s ease",
                      animation: hasAutoTriggered.current ? "pulseGreen 1.8s infinite" : "none"
                    }}
                  >
                    <Mic size={20} />
                    <span>{hasAutoTriggered.current ? "🎙️ Speak Now — Record Call Debrief" : "Tap to Record 10-20s Voice Debrief"}</span>
                  </button>

                  {/* QUICK 1-TAP PRESET CHIPS */}
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                      Or select quick 1-tap outcome preset:
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {QUICK_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isRecording ? (
                /* RECORDING ACTIVE STATE */
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "2px solid #ef4444",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.15)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor: "#ef4444",
                          animation: "pulse 1s infinite"
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#dc2626" }}>
                        Listening... ({formatSec(recordingSec)} / 01:00)
                      </span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Hindi / English</span>
                  </div>

                  {liveTranscript ? (
                    <div
                      style={{
                        padding: "8px 10px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px dashed #cbd5e1",
                        fontSize: "0.78rem",
                        color: "#0f172a",
                        minHeight: "44px",
                        marginBottom: "10px",
                        fontStyle: "italic"
                      }}
                    >
                      "{liveTranscript}"
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "8px 10px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                        fontSize: "0.74rem",
                        color: "#94a3b8",
                        minHeight: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "10px"
                      }}
                    >
                      Speak details: deal status, pricing, and next follow-up...
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "#ef4444",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Done • Generate AI Intelligence</span>
                  </button>
                </div>
              ) : (
                /* ANALYZING STATE */
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                    border: "1px solid #c7d2fe"
                  }}
                >
                  <Loader2 size={24} style={{ color: "#4f46e5", animation: "spin 1s linear infinite", margin: "0 auto 8px auto" }} />
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1e1b4b" }}>
                    Gemini AI Analyzing Sales Conversation...
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    Extracting customer intent, deal sentiment & next follow-up task
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ANALYZED INTELLIGENCE CARD */
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #a5b4fc",
                borderRadius: "12px",
                padding: "12px",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.08)"
              }}
            >
              {/* Top Sentiment Bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      backgroundColor:
                        analysis.dealSentiment === "HOT"
                          ? "#fef2f2"
                          : analysis.dealSentiment === "WARM"
                          ? "#fffbeb"
                          : "#f1f5f9",
                      color:
                        analysis.dealSentiment === "HOT"
                          ? "#dc2626"
                          : analysis.dealSentiment === "WARM"
                          ? "#d97706"
                          : "#475569",
                      border: `1px solid ${
                        analysis.dealSentiment === "HOT"
                          ? "#fca5a5"
                          : analysis.dealSentiment === "WARM"
                          ? "#fde68a"
                          : "#cbd5e1"
                      }`
                    }}
                  >
                    {analysis.dealSentiment === "HOT" ? (
                      <>🔥 HOT DEAL</>
                    ) : analysis.dealSentiment === "WARM" ? (
                      <>☀️ WARM LEAD</>
                    ) : (
                      <>❄️ COLD</>
                    )}
                  </span>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#0f172a" }}>
                    {analysis.detectedOutcome}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setAnalysis(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6366f1",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <RotateCcw size={12} /> Re-record
                </button>
              </div>

              {/* Summary Text */}
              <div
                style={{
                  padding: "8px 10px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  color: "#334155",
                  lineHeight: 1.4,
                  marginBottom: "8px"
                }}
              >
                {analysis.summary}
              </div>

              {/* Key Discussion Points */}
              {Array.isArray(analysis.keyPoints) && analysis.keyPoints.length > 0 && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {analysis.keyPoints.map((point, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#eef2ff",
                        color: "#4338ca",
                        fontWeight: 600
                      }}
                    >
                      • {point}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Follow-up Task Banner */}
              {analysis.suggestedFollowUp?.hasFollowUp && analysis.suggestedFollowUp.date && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    color: "#065f46",
                    fontWeight: 700
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={13} />
                    <span>
                      Follow-up Task: {analysis.suggestedFollowUp.date} @ {analysis.suggestedFollowUp.hour12}:{analysis.suggestedFollowUp.minute} {analysis.suggestedFollowUp.period}
                    </span>
                  </div>
                  <span style={{ color: "#047857", fontSize: "0.68rem" }}>Auto-filled below</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
