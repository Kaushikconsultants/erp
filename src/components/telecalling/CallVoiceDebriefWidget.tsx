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
  AlertCircle
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
  /** Callback when AI debrief analysis completes and user chooses to apply it to parent form */
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

export default function CallVoiceDebriefWidget({
  contactName = "Contact",
  contactPhone = "",
  customerId,
  leadId,
  callDurationSec = 0,
  callType = "OUTBOUND",
  onApplyToForm,
  onCallSaved,
  initialExpanded = true
}: CallVoiceDebriefWidgetProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<CallVoiceDebriefAnalysis | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Editable fields in review card
  const [editableSummary, setEditableSummary] = useState<string>("");
  const [editableOutcome, setEditableOutcome] = useState<string>("");
  const [editableFollowUpDate, setEditableFollowUpDate] = useState<string>("");
  const [editableHour, setEditableHour] = useState<string>("11");
  const [editableMin, setEditableMin] = useState<string>("00");
  const [editablePeriod, setEditablePeriod] = useState<"AM" | "PM">("AM");

  // Audio / Speech refs
  const speechRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Update editable fields when analysis changes
  useEffect(() => {
    if (analysis) {
      setEditableSummary(analysis.summary || "");
      setEditableOutcome(analysis.detectedOutcome || "Interested / Follow-up Needed");
      setEditableFollowUpDate(analysis.suggestedFollowUp?.date || "");
      setEditableHour(analysis.suggestedFollowUp?.hour12 || "11");
      setEditableMin(analysis.suggestedFollowUp?.minute || "00");
      setEditablePeriod(analysis.suggestedFollowUp?.period || "AM");
    }
  }, [analysis]);

  // Start Voice Debrief Recording
  const startRecording = async () => {
    setErrorMessage("");
    setSaveSuccessMsg("");
    setLiveTranscript("");
    setAnalysis(null);
    setRecordingSec(0);

    // Grant app lock exemption to avoid biometric interruption
    if (typeof window !== "undefined") {
      (window as any).grantAppLockExemption?.(180);
    }

    // 1. Initialize Web Speech Recognition
    const SpeechRec = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    let speechActive = false;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "hi-IN"; // Handles Hindi, English & Hinglish

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
          console.warn("Speech recognition warning:", e);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        speechActive = true;
      } catch (e) {
        console.warn("Could not start Web Speech API:", e);
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
      console.warn("Microphone access error:", err);
      if (!speechActive) {
        setErrorMessage("Microphone access denied. Please enable microphone permissions.");
        return;
      }
    }

    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setRecordingSec((prev) => {
        if (prev >= 90) {
          // Auto-stop after 90 seconds
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
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

    // Stop MediaRecorder
    let audioBase64: string | undefined = undefined;
    let mimeType: string | undefined = undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        const audioBlobPromise = new Promise<Blob>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
              const blob = new Blob(audioChunksRef.current, { type: mime });
              resolve(blob);
            };
            mediaRecorderRef.current.stop();
          }
        });

        // Stop all tracks
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());

        const blob = await audioBlobPromise;
        if (blob.size > 0) {
          mimeType = blob.type || "audio/webm";
          const buffer = await blob.arrayBuffer();
          audioBase64 = Buffer.from(buffer).toString("base64");
        }
      } catch (err) {
        console.warn("Error processing audio blob:", err);
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
    if (!text && !audioBase64) {
      setErrorMessage("No voice speech was detected. Please speak closer to your microphone and try again.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const res = await analyzeCallVoiceDebrief({
        spokenText: text,
        audioBase64,
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
      } else {
        setErrorMessage(res.error || "Failed to analyze voice debrief.");
      }
    } catch (err: any) {
      console.error("AI Debrief error:", err);
      setErrorMessage(err?.message || "An unexpected error occurred during AI analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 1-Tap Save Call Directly
  const handleDirectSave = async () => {
    if (!analysis) return;
    setIsSaving(true);
    setErrorMessage("");

    try {
      let followUpDateStr: string | null = null;
      if (editableFollowUpDate) {
        let hour24 = parseInt(editableHour, 10);
        if (editablePeriod === "PM" && hour24 < 12) hour24 += 12;
        if (editablePeriod === "AM" && hour24 === 12) hour24 = 0;
        followUpDateStr = `${editableFollowUpDate}T${String(hour24).padStart(2, '0')}:${editableMin}:00`;
      }

      const res = await saveCallWithAIDebrief({
        customerId: customerId || null,
        leadId: leadId || null,
        phone: contactPhone,
        contactName,
        durationSec: callDurationSec,
        callType,
        outcome: editableOutcome || analysis.detectedOutcome,
        summary: editableSummary || analysis.summary,
        notes: `[AI Voice Debrief]\n${analysis.transcript}\n\nKey Points:\n${(analysis.keyPoints || []).map((k) => `• ${k}`).join("\n")}`,
        dealSentiment: analysis.dealSentiment,
        followUpDateStr,
        followUpTaskTitle: analysis.suggestedFollowUp?.actionTitle,
        createTask: true
      });

      if (res.success) {
        setSaveSuccessMsg("Call logged and follow-up task scheduled successfully!");
        if (onCallSaved) {
          onCallSaved(res);
        }
      } else {
        setErrorMessage(res.error || "Failed to save call log.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error saving call debrief.");
    } finally {
      setIsSaving(false);
    }
  };

  // Apply AI Debrief to Parent Form
  const handleApplyToParentForm = () => {
    if (!analysis) return;
    if (onApplyToForm) {
      onApplyToForm({
        outcome: editableOutcome || analysis.detectedOutcome,
        summary: editableSummary || analysis.summary,
        notes: `[AI Voice Debrief Transcript]: ${analysis.transcript}\n\nKey Points:\n${(analysis.keyPoints || []).map(p => `• ${p}`).join("\n")}`,
        followUpDate: editableFollowUpDate,
        followUpHour: editableHour,
        followUpMinute: editableMin,
        followUpPeriod: editablePeriod,
        dealSentiment: analysis.dealSentiment,
        keyPoints: analysis.keyPoints
      });
    }
  };

  // Helper formatting for seconds
  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
        border: "1.5px solid #c7d2fe",
        borderRadius: "18px",
        padding: "14px 16px",
        marginBottom: "16px",
        boxShadow: "0 4px 16px rgba(79, 70, 229, 0.08)",
        transition: "all 0.2s ease"
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
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
              flexShrink: 0
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#1e1b4b" }}>
                1-Tap AI Voice Debrief
              </h4>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  backgroundColor: "#dbeafe",
                  color: "#1d4ed8",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  textTransform: "uppercase"
                }}
              >
                Gemini 2.5
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>
              Speak 10-30s in Hindi/English → Auto-logs summary & follow-up task
            </p>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "#6366f1",
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
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                color: "#b91c1c",
                fontSize: "0.76rem",
                marginBottom: "10px"
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {saveSuccessMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                color: "#15803d",
                fontSize: "0.8rem",
                fontWeight: 700,
                marginBottom: "10px"
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* RECORDING / IDLE STATE */}
          {!analysis && !isAnalyzing && (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: isRecording ? "2px solid #ef4444" : "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "14px",
                textAlign: "center",
                boxShadow: isRecording ? "0 0 0 4px rgba(239, 68, 68, 0.15)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              {!isRecording ? (
                <div>
                  <button
                    type="button"
                    onClick={startRecording}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)"
                    }}
                  >
                    <Mic size={18} />
                    <span>Tap to Speak Voice Debrief</span>
                  </button>
                  <p style={{ margin: "8px 0 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
                    Example: &quot;Customer ko 50 tracksuits chahiye ₹420 mein, parso 11 baje quotation final karna hai&quot;
                  </p>
                </div>
              ) : (
                <div>
                  {/* Live Recording Animation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: "#ef4444",
                        animation: "pulse 1.2s infinite ease-in-out"
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444" }}>
                      Listening... {formatSec(recordingSec)} / 01:30
                    </span>
                  </div>

                  {/* Waveform bars simulation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", height: "24px", marginBottom: "10px" }}>
                    {[12, 20, 28, 16, 24, 14, 26, 18, 10, 22, 16].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: "4px",
                          height: `${h}px`,
                          backgroundColor: "#6366f1",
                          borderRadius: "2px",
                          opacity: 0.8
                        }}
                      />
                    ))}
                  </div>

                  {/* Live Transcript Preview */}
                  {liveTranscript && (
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        fontSize: "0.78rem",
                        color: "#334155",
                        textAlign: "left",
                        marginBottom: "10px",
                        maxHeight: "60px",
                        overflowY: "auto"
                      }}
                    >
                      &quot;{liveTranscript}&quot;
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Done Speaking • Process with AI</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI PROCESSING STATE */}
          {isAnalyzing && (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #c7d2fe",
                borderRadius: "14px",
                padding: "20px 16px",
                textAlign: "center"
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px auto"
                }}
              >
                <Loader2 size={24} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
              </div>
              <h5 style={{ margin: "0 0 4px 0", fontSize: "0.88rem", fontWeight: 800, color: "#1e1b4b" }}>
                Gemini 2.5 Flash Analyzing Debrief...
              </h5>
              <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b" }}>
                Extracting deal sentiment, key points, outcome & scheduled follow-up
              </p>
            </div>
          )}

          {/* AI REVIEW CARD */}
          {analysis && !isAnalyzing && (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #c7d2fe",
                borderRadius: "14px",
                padding: "14px",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.06)"
              }}
            >
              {/* Sentiment & Outcome Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                {/* Sentiment Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    backgroundColor:
                      analysis.dealSentiment === "HOT"
                        ? "#fef2f2"
                        : analysis.dealSentiment === "COLD"
                        ? "#f0f9ff"
                        : "#fffbeb",
                    color:
                      analysis.dealSentiment === "HOT"
                        ? "#dc2626"
                        : analysis.dealSentiment === "COLD"
                        ? "#0284c7"
                        : "#d97706",
                    border: `1px solid ${
                      analysis.dealSentiment === "HOT"
                        ? "#fecaca"
                        : analysis.dealSentiment === "COLD"
                        ? "#bae6fd"
                        : "#fde68a"
                    }`
                  }}
                >
                  {analysis.dealSentiment === "HOT" ? (
                    <Flame size={14} color="#dc2626" />
                  ) : analysis.dealSentiment === "COLD" ? (
                    <Snowflake size={14} color="#0284c7" />
                  ) : (
                    <Sun size={14} color="#d97706" />
                  )}
                  <span>
                    {analysis.dealSentiment === "HOT"
                      ? "HOT DEAL 🔥"
                      : analysis.dealSentiment === "COLD"
                      ? "COLD LEAD ❄️"
                      : "WARM LEAD 🟡"}
                  </span>
                </div>

                {/* Re-record button */}
                <button
                  type="button"
                  onClick={startRecording}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#64748b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 6px"
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Re-record</span>
                </button>
              </div>

              {/* Detected Outcome */}
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "3px" }}>
                  Call Outcome
                </label>
                <select
                  value={editableOutcome}
                  onChange={(e) => setEditableOutcome(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    backgroundColor: "#f8fafc"
                  }}
                >
                  {[
                    "Interested / Follow-up Needed",
                    "Order Placed / Deal Closed",
                    "Quotation Requested",
                    "Price Negotiation / Discount Discussion",
                    "Callback Scheduled",
                    "No Answer / Busy",
                    "Voicemail / Switched Off",
                    "Not Interested / Lost",
                    "Wrong / Invalid Number",
                    "Support / General Inquiry"
                  ].map((oc) => (
                    <option key={oc} value={oc}>{oc}</option>
                  ))}
                </select>
              </div>

              {/* AI Executive Summary */}
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "3px" }}>
                  Executive Summary
                </label>
                <textarea
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    color: "#1e293b",
                    backgroundColor: "#ffffff",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Key Discussion Points Chips */}
              {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Key Points Extracted
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {analysis.keyPoints.map((kp, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          backgroundColor: "#f1f5f9",
                          color: "#334155",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0"
                        }}
                      >
                        • {kp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto Scheduled Follow-up */}
              {editableFollowUpDate && (
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    marginBottom: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <Calendar size={14} color="#4f46e5" />
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155" }}>
                      Auto-Scheduled Follow-up Task:
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="date"
                      value={editableFollowUpDate}
                      onChange={(e) => setEditableFollowUpDate(e.target.value)}
                      style={{
                        flex: "1 1 140px",
                        minWidth: "130px",
                        height: "36px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.8rem",
                        backgroundColor: "#ffffff",
                        color: "#0f172a",
                        boxSizing: "border-box"
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                      <select
                        value={editableHour}
                        onChange={(e) => setEditableHour(e.target.value)}
                        style={{
                          height: "36px",
                          padding: "0 6px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          backgroundColor: "#ffffff",
                          color: "#0f172a",
                          boxSizing: "border-box"
                        }}
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span style={{ fontWeight: 800, color: "#64748b" }}>:</span>
                      <select
                        value={editableMin}
                        onChange={(e) => setEditableMin(e.target.value)}
                        style={{
                          height: "36px",
                          padding: "0 6px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          backgroundColor: "#ffffff",
                          color: "#0f172a",
                          boxSizing: "border-box"
                        }}
                      >
                        {["00", "15", "30", "45"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div style={{ display: "flex", height: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden", boxSizing: "border-box" }}>
                        <button
                          type="button"
                          onClick={() => setEditablePeriod("AM")}
                          style={{
                            padding: "0 9px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            border: "none",
                            backgroundColor: editablePeriod === "AM" ? "#4f46e5" : "#f1f5f9",
                            color: editablePeriod === "AM" ? "#ffffff" : "#475569",
                            cursor: "pointer"
                          }}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditablePeriod("PM")}
                          style={{
                            padding: "0 9px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            border: "none",
                            backgroundColor: editablePeriod === "PM" ? "#4f46e5" : "#f1f5f9",
                            color: editablePeriod === "PM" ? "#ffffff" : "#475569",
                            cursor: "pointer"
                          }}
                        >
                          PM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleDirectSave}
                  disabled={isSaving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                  }}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>1-Tap Save & Task</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyToParentForm}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer"
                  }}
                >
                  <FileText size={14} />
                  <span>Apply to Form</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
