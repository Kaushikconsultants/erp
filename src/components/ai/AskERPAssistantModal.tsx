"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Send,
  Mic,
  MicOff,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  Bot,
  User,
  RefreshCw,
  Zap
} from "lucide-react";
import Link from "next/link";
import { askERPAssistant, AskERPResponse } from "@/app/actions/aiAskERPActions";

interface AskERPAssistantModalProps {
  onClose: () => void;
}

interface MessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  data?: AskERPResponse;
  timestamp: string;
}

export default function AskERPAssistantModal({ onClose }: AskERPAssistantModalProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Namaste! I am your Executive AI Business Copilot. Ask me anything about your revenue, top customers, inventory valuation, quotation pipeline, or receivables.",
        data: {
          answer: "Namaste! I am your Executive AI Business Copilot. Ask me anything about your revenue, top customers, inventory valuation, quotation pipeline, or receivables.",
          keyMetrics: [],
          suggestedActions: [
            { label: "View Reports", href: "/reports" },
            { label: "Re-Order Predictor", href: "/customers" }
          ],
          followUpQuestions: [
            "What is our MTD Revenue and sprint pace?",
            "Who are our top 5 most profitable customers?",
            "What is our pending receivables and cash flow position?"
          ]
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()
      }
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text || isLoading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);

    const res = await askERPAssistant(text);
    setIsLoading(false);

    if (res.success && res.data) {
      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.data.answer,
        data: res.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()
      };
      setMessages(prev => [...prev, aiMsg]);
    } else {
      const errorMsg: MessageItem = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: res.error || "I encountered an error processing your query. Please try asking again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Web Speech API Voice Recognition
  const toggleVoiceRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // Supports English (India) & mixed phrases

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "860px",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#f5f3ff",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                  Ask ERP Executive Copilot
                </h2>
                <span style={{ fontSize: "0.68rem", backgroundColor: "#f5f3ff", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                  Gemini 2.5
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>
                Instant natural language insights across your business finances, customers, pipeline & inventory.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div
          style={{
            padding: "10px 18px",
            backgroundColor: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            whiteSpace: "nowrap"
          }}
        >
          {[
            { label: "🏆 Top 5 Customers", query: "Who are our top 5 most profitable customers?" },
            { label: "💰 Receivables & Cash", query: "What is our pending receivables and cash flow position?" },
            { label: "📦 Inventory Valuation", query: "How much inventory and dead stock capital is in our warehouse?" },
            { label: "🎯 Pipeline & Quotes", query: "What is the status of our open quotation pipeline?" }
          ].map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleSend(p.query)}
              disabled={isLoading}
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.72rem",
                fontWeight: 500,
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Conversation Message List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
                  maxWidth: msg.sender === "user" ? "80%" : "92%",
                  flexDirection: msg.sender === "user" ? "row-reverse" : "row"
                }}
              >
                {/* Avatar Icon */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: msg.sender === "user" ? "#4f46e5" : "#7c3aed",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {msg.sender === "user" ? <User size={15} /> : <Bot size={15} />}
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    backgroundColor: msg.sender === "user" ? "#4f46e5" : "#f8fafc",
                    color: msg.sender === "user" ? "#ffffff" : "#0f172a",
                    padding: "12px 16px",
                    borderRadius: msg.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    border: msg.sender === "user" ? "none" : "1px solid #e2e8f0",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                  }}
                >
                  <div>{msg.text}</div>

                  {/* AI Response Extensions (KPIs, Actions, Follow-ups) */}
                  {msg.data && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                      
                      {/* Highlighted Key Metrics */}
                      {msg.data.keyMetrics && msg.data.keyMetrics.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                          {msg.data.keyMetrics.map((m, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: "8px 10px",
                                borderRadius: "8px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0"
                              }}
                            >
                              <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>{m.label}</span>
                              <span style={{ fontSize: "1.05rem", fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                                {m.value}
                              </span>
                              {m.subtext && (
                                <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>{m.subtext}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggested Action Links */}
                      {msg.data.suggestedActions && msg.data.suggestedActions.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingTop: "4px" }}>
                          {msg.data.suggestedActions.map((act, i) => (
                            <Link
                              key={i}
                              href={act.href}
                              onClick={onClose}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
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
                          ))}
                        </div>
                      )}

                      {/* Follow-up Questions */}
                      {msg.data.followUpQuestions && msg.data.followUpQuestions.length > 0 && (
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                          <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>
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
                  )}
                </div>
              </div>

              <span style={{ fontSize: "0.68rem", color: "#94a3b8", padding: "0 40px" }}>
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "#7c3aed",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Bot size={15} />
              </div>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "10px 16px",
                  borderRadius: "14px 14px 14px 2px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.85rem",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <Sparkles size={14} className="animate-spin" color="#7c3aed" />
                <span>AI Copilot is analyzing live ERP database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "14px 18px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: "8px",
            alignItems: "center"
          }}
        >
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              border: isListening ? "1px solid #dc2626" : "1px solid #cbd5e1",
              backgroundColor: isListening ? "#fee2e2" : "#f8fafc",
              color: isListening ? "#dc2626" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease"
            }}
            title={isListening ? "Listening... Click to stop" : "Speak question (Voice Search)"}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={isListening ? "Listening to your voice..." : "Ask anything about sales, customers, stock, or receivables..."}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "0.875rem",
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
              width: "38px",
              height: "38px",
              borderRadius: "10px",
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
          >
            <Send size={15} />
          </button>
        </div>

      </div>
    </div>
  );
}
