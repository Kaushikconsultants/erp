"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVoiceStore, VoiceMessage } from "@/lib/stores/voiceStore";
import { executeVoiceCommand } from "@/app/actions/voiceActions";
import VoiceWaveform from "./VoiceWaveform";
import StylishHeart from "./StylishHeart";
import {
  Heart,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  X,
  Scale,
  TrendingUp,
  Package,
  Users,
  Wallet,
  ExternalLink,
  PlusCircle,
  Loader2
} from "lucide-react";

const SUGGESTIONS = [
  { label: "Balance Sheet status", icon: Scale, query: "What is our Balance Sheet status and total assets?" },
  { label: "Bank & Cash balances", icon: Wallet, query: "How much bank and cash balance do we have?" },
  { label: "Net Profit & Revenue", icon: TrendingUp, query: "What is our net profit and revenue this month?" },
  { label: "Trackpants Stock", icon: Package, query: "Check stock of Sportswear Trackpants" },
  { label: "Customer Receivables", icon: Users, query: "Who owes us money and what are total receivables?" },
  { label: "August Payroll Payout", icon: Wallet, query: "Show August payroll payout and staff salaries" },
  { label: "Log Expense ₹500", icon: PlusCircle, query: "Log expense 500 for Office Tea and Snacks" }
];

export default function VoiceAIAssistant() {
  const router = useRouter();
  const {
    isOpen,
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    feedbackText,
    language,
    messages,
    voiceEnabled,
    openAssistant,
    closeAssistant,
    toggleAssistant,
    setIsListening,
    setIsProcessing,
    setTranscript,
    setFeedbackText,
    setLanguage,
    setVoiceEnabled,
    addMessage,
    stopSpeaking
  } = useVoiceStore();

  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isProcessing]);

  // Global hotkey listener (Ctrl + Space or Alt + V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.code === "Space") || (e.altKey && (e.key === "v" || e.key === "V"))) {
        e.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAssistant]);

  // Hardware back button listener to dismiss assistant overlay
  useEffect(() => {
    if (!isOpen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      closeAssistant();
    };
    window.addEventListener("app-back-button", handleBack);
    return () => window.removeEventListener("app-back-button", handleBack);
  }, [isOpen, closeAssistant]);

  // Initialize Speech Recognition
  const startListeningSession = () => {
    stopSpeaking();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        (window as any).grantAppLockExemption?.(180);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setFeedbackText("🎙️ Listening... speak naturally in English or Hindi");
      };

      recognition.onresult = (event: any) => {
        const current = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");

        setTranscript(current);

        if (event.results[0] && event.results[0].isFinal) {
          setIsListening(false);
          handleExecuteQuery(current);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        setFeedbackText(event.error === "no-speech" ? "No speech detected. Tap mic to try again." : "Microphone error.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const stopListeningSession = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleExecuteQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    // Add user message to history
    addMessage({
      role: "user",
      text: q
    });

    setIsProcessing(true);
    setTranscript("");
    setFeedbackText("🤖 AI Processing your command...");

    try {
      const res = await executeVoiceCommand(q);
      setIsProcessing(false);
      setFeedbackText("");

      addMessage({
        role: "assistant",
        text: res.spokenText,
        actionType: res.actionText,
        route: res.route,
        cardType: res.cardType,
        cardData: res.cardData
      });

      // If there's an automatic route navigation
      if (res.route && res.cardType === "NAVIGATION") {
        setTimeout(() => {
          router.push(res.route!);
        }, 800);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setFeedbackText("");
      addMessage({
        role: "assistant",
        text: "I encountered an error executing that request. Please try again."
      });
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const q = textInput.trim();
    setTextInput("");
    handleExecuteQuery(q);
  };

  return (
    <>
      {/* ─── 1. FLOATING GLOBAL TRIGGER BUTTON (Bottom-Right) ─── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            openAssistant();
            setTimeout(() => startListeningSession(), 200);
          }}
          title="Heart — Voice AI Copilot (Ctrl + Space)"
          className="hover-lift"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ff1744 0%, #f43f5e 50%, #e11d48 100%)",
            color: "#ffffff",
            border: "none",
            boxShadow: "0 8px 24px rgba(244, 63, 94, 0.45)",
            cursor: "pointer",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease"
          }}
        >
          <StylishHeart size={30} isBeating={true} variant="white" />
        </button>
      )}

      {/* ─── 2. VOICE ASSISTANT MODAL OVERLAY ─── */}
      {isOpen && (
        <div
          className="modal-backdrop"
          onClick={closeAssistant}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            className="animate-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "680px",
              height: "85vh",
              maxHeight: "720px",
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid var(--border, #e2e8f0)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ff1744 0%, #f43f5e 50%, #e11d48 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(244, 63, 94, 0.4)"
                  }}
                >
                  <StylishHeart size={22} isBeating={true} variant="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Heart — Voice AI Copilot
                  </h2>
                  <p style={{ margin: "1px 0 0", fontSize: "0.74rem", color: "#64748b" }}>
                    Hands-free Executive Intelligence (English & Hindi)
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Language Select */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.75rem",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (India)</option>
                </select>

                {/* TTS Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  title={voiceEnabled ? "Mute Voice Audio" : "Enable Voice Audio"}
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: voiceEnabled ? "#eef2ff" : "#ffffff",
                    color: voiceEnabled ? "#4f46e5" : "#94a3b8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={closeAssistant}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conversation History & Results Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                background: "#fafafa"
              }}
            >
              {messages.map((msg: VoiceMessage) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                    gap: "4px"
                  }}
                >
                  {/* Bubble */}
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      backgroundColor: msg.role === "user" ? "var(--accent-primary, #4f46e5)" : "#ffffff",
                      color: msg.role === "user" ? "#ffffff" : "#0f172a",
                      border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      fontSize: "0.85rem",
                      lineHeight: "1.45"
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Rich Action Card (if present) */}
                  {msg.cardData && (
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "92%",
                        marginTop: "4px",
                        backgroundColor: "#ffffff",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        padding: "12px 14px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}
                    >
                      {/* BALANCE SHEET CARD */}
                      {msg.cardType === "BALANCE_SHEET" && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>Balance Sheet (Schedule III)</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: msg.cardData.isBalanced ? "#059669" : "#dc2626", background: msg.cardData.isBalanced ? "#ecfdf5" : "#fef2f2", padding: "2px 8px", borderRadius: "6px" }}>
                              {msg.cardData.isBalanced ? "Balanced (Paise Accurate)" : "Calculated"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
                            <div>
                              <span style={{ color: "#64748b" }}>Total Assets</span>
                              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>₹{msg.cardData.totalAssets?.toLocaleString("en-IN")}</div>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Liabilities & Equity</span>
                              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>₹{msg.cardData.totalLiabilitiesAndEquity?.toLocaleString("en-IN")}</div>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Sundry Debtors</span>
                              <div style={{ fontWeight: 500, color: "#2563eb" }}>₹{msg.cardData.debtors?.toLocaleString("en-IN")}</div>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Bank & Cash</span>
                              <div style={{ fontWeight: 500, color: "#059669" }}>₹{msg.cardData.bankCash?.toLocaleString("en-IN")}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STOCK CARD */}
                      {msg.cardType === "STOCK" && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>Stock & Inventory</span>
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Live Master</span>
                          </div>
                          {msg.cardData.productName ? (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                              <div>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{msg.cardData.productName}</div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>SKU: {msg.cardData.sku}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 600, color: "#2563eb", fontSize: "0.95rem" }}>{msg.cardData.stockQuantity} Units</div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>₹{msg.cardData.sellingPrice}/unit</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
                              <div>
                                <span style={{ color: "#64748b" }}>Total Products</span>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{msg.cardData.totalProducts}</div>
                              </div>
                              <div>
                                <span style={{ color: "#64748b" }}>Total Quantity</span>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{msg.cardData.totalUnits} Units</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CUSTOMER / RECEIVABLES CARD */}
                      {msg.cardType === "CUSTOMER" && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>{msg.cardData.title || "Customer Ledger"}</span>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>₹{msg.cardData.totalDue?.toLocaleString("en-IN")}</span>
                          </div>
                          {msg.cardData.items && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.78rem" }}>
                              {msg.cardData.items.map((it: any, idx: number) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "#f8fafc", borderRadius: "4px" }}>
                                  <span style={{ color: "#334155" }}>{it.party}</span>
                                  <span style={{ fontWeight: 600, color: "#0f172a" }}>₹{it.amount.toLocaleString("en-IN")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXPENSE LOGGED CARD */}
                      {msg.cardType === "EXPENSE" && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{msg.cardData.category}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Voucher #{msg.cardData.expenseNumber}</div>
                          </div>
                          <div style={{ fontWeight: 600, color: "#059669", fontSize: "0.95rem" }}>
                            ₹{msg.cardData.amount.toLocaleString("en-IN")}
                          </div>
                        </div>
                      )}

                      {/* GENERAL METRICS CARD */}
                      {msg.cardType === "GENERAL" && msg.cardData.metrics && (
                        <div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>{msg.cardData.title || "Summary"}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.78rem" }}>
                            {msg.cardData.metrics.map((m: any, idx: number) => (
                              <div key={idx} style={{ padding: "4px 6px", background: "#f8fafc", borderRadius: "4px" }}>
                                <span style={{ color: "#64748b", display: "block", fontSize: "0.7rem" }}>{m.label}</span>
                                <span style={{ fontWeight: 600, color: m.highlight ? "#059669" : "#0f172a" }}>{m.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deep Link Route Button */}
                      {msg.route && (
                        <button
                          type="button"
                          onClick={() => {
                            closeAssistant();
                            router.push(msg.route!);
                          }}
                          style={{
                            marginTop: "8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "var(--accent-primary, #4f46e5)",
                            backgroundColor: "var(--accent-light, #eef2ff)",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer"
                          }}
                        >
                          <span>Open in App</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{msg.timestamp}</span>
                </div>
              ))}

              {isProcessing && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#ffffff", borderRadius: "10px", width: "fit-content", border: "1px solid #e2e8f0" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-primary, #4f46e5)" }} />
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Thinking & querying software records...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div
              style={{
                padding: "8px 16px",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                whiteSpace: "nowrap"
              }}
            >
              {SUGGESTIONS.map((sug, i) => {
                const Icon = sug.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleExecuteQuery(sug.query)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#475569",
                      cursor: "pointer",
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#eef2ff";
                      (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc";
                      (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                    }}
                  >
                    <Icon size={12} style={{ color: "var(--accent-primary, #4f46e5)" }} />
                    {sug.label}
                  </button>
                );
              })}
            </div>

            {/* Speech Waveform / Active Transcript Panel */}
            {(isListening || transcript) && (
              <div
                style={{
                  padding: "10px 16px",
                  background: "#f0fdf4",
                  borderTop: "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ flex: 1, marginRight: "12px" }}>
                  <VoiceWaveform isActive={isListening} isSpeaking={isSpeaking} />
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "#166534", textAlign: "center", marginTop: "2px" }}>
                    {transcript ? `"${transcript}"` : feedbackText || "Listening..."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={stopListeningSession}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #86efac",
                    background: "#ffffff",
                    color: "#166534",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Done
                </button>
              </div>
            )}

            {/* Bottom Interaction Bar (Mic Button + Text Input) */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              {/* Central Mic Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListeningSession();
                  else startListeningSession();
                }}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: isListening ? "#ef4444" : "var(--accent-primary, #4f46e5)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: isListening ? "0 0 12px rgba(239, 68, 68, 0.4)" : "0 2px 6px rgba(79, 70, 229, 0.25)",
                  transition: "all 0.2s ease"
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Text Fallback Form */}
              <form onSubmit={handleTextSubmit} style={{ flex: 1, display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder={isListening ? "Listening to your voice..." : "Or type any command or question..."}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isProcessing}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: textInput.trim() ? "var(--accent-primary, #4f46e5)" : "#f1f5f9",
                    color: textInput.trim() ? "#ffffff" : "#94a3b8",
                    cursor: textInput.trim() ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
