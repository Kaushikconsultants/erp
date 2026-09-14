"use client";

import React, { useState } from "react";
import { Phone, PhoneCall, Clock, User, Calendar, Volume2, Sparkles, FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface CallRecord {
  id: string;
  callType: string;
  durationSec?: number | null;
  status: string;
  outcome: string;
  notes?: string | null;
  summary?: string | null;
  recordingUrl?: string | null;
  followUpDate?: Date | string | null;
  createdAt: Date | string;
  employee?: {
    id?: string;
    user?: {
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

interface CustomerInteractionHistoryProps {
  calls: CallRecord[];
  customerName?: string;
  customerPhone?: string;
}

export default function CustomerInteractionHistory({
  calls = [],
  customerName = "Customer",
  customerPhone = ""
}: CustomerInteractionHistoryProps) {
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTranscripts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyTranscript = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatDuration = (sec?: number | null) => {
    if (!sec || sec <= 0) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const parseCallNotes = (rawNotes?: string | null, rawSummary?: string | null) => {
    let transcript = "";
    let summary = rawSummary || "";
    let userNotes = "";

    if (!rawNotes) return { transcript, summary, userNotes };

    // Extract [AI Summary]: ...
    const summaryMatch = rawNotes.match(/\[AI Summary\]:\s*([\s\S]*?)(?=(\n\n\[|$))/i);
    if (summaryMatch && !summary) {
      summary = summaryMatch[1].trim();
    }

    // Extract [Auto-Transcript]: ...
    const transcriptMatch = rawNotes.match(/\[Auto-Transcript\]:\s*([\s\S]*?)(?=(\n\n\[AI Summary\]|\n\n\[Dialed|\n\n\[|$))/i);
    if (transcriptMatch) {
      transcript = transcriptMatch[1].trim();
    }

    // Remaining notes
    let remaining = rawNotes
      .replace(/\[Auto-Transcript\]:\s*[\s\S]*?(?=(\n\n\[AI Summary\]|\n\n\[Dialed|\n\n\[|$))/i, "")
      .replace(/\[AI Summary\]:\s*[\s\S]*?(?=(\n\n\[|$))/i, "")
      .replace(/\[Dialed:\s*[^\]]+\]/gi, "")
      .trim();

    userNotes = remaining;
    return { transcript, summary, userNotes };
  };

  const formatDialogue = (transcriptText: string) => {
    // Splits lines like "IVR: ...", "Customer: ...", "Agent: ...", "Rep: ..."
    const lines = transcriptText.split(/(?=(?:IVR|Customer|Agent|Rep|Caller|Receiver|System):)/i);
    return lines.map(line => line.trim()).filter(Boolean);
  };

  const getOutcomeStyle = (outcome: string) => {
    const lower = (outcome || "").toLowerCase();
    if (lower.includes("order") || lower.includes("won") || lower.includes("confirm")) {
      return { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" };
    }
    if (lower.includes("support") || lower.includes("inquiry") || lower.includes("general")) {
      return { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" };
    }
    if (lower.includes("follow") || lower.includes("interest")) {
      return { bg: "#fefce8", border: "#fef08a", color: "#854d0e" };
    }
    if (lower.includes("not") || lower.includes("busy") || lower.includes("wrong") || lower.includes("cancel")) {
      return { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" };
    }
    return { bg: "#f8fafc", border: "#e2e8f0", color: "#334155" };
  };

  return (
    <div className="glass-panel" style={{ padding: "24px", borderRadius: "16px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "#eef2ff", color: "#4f46e5" }}>
            <PhoneCall size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
              Interaction History ({calls.length})
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Full call transcripts, AI debriefs, and agent communication logs
            </span>
          </div>
        </div>
      </div>

      {calls.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #e2e8f0" }}>
          <Phone size={28} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: 500, fontSize: "0.9rem" }}>No interactions logged yet.</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
            Calls and messages logged with this customer will appear here with full auto-transcripts.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {calls.map((call) => {
            const { transcript, summary, userNotes } = parseCallNotes(call.notes, call.summary);
            const isExpanded = !!expandedTranscripts[call.id];
            const dialogueLines = formatDialogue(transcript);
            const repName = call.employee?.user?.name || "Admin User";
            const outcomeStyle = getOutcomeStyle(call.outcome);
            const callDate = new Date(call.createdAt);

            return (
              <div
                key={call.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  overflow: "hidden",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 18px",
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: call.callType === "INBOUND" ? "#e0e7ff" : "#dbeafe",
                        color: call.callType === "INBOUND" ? "#3730a3" : "#1d4ed8"
                      }}
                    >
                      {call.callType || "OUTBOUND"}
                    </span>

                    <span
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: "6px",
                        backgroundColor: outcomeStyle.bg,
                        border: `1px solid ${outcomeStyle.border}`,
                        color: outcomeStyle.color
                      }}
                    >
                      {call.outcome || "Completed"}
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        color: "#475569"
                      }}
                    >
                      <Clock size={12} color="#64748b" /> {formatDuration(call.durationSec)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.78rem", color: "#64748b" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <User size={13} color="#4f46e5" />
                      Rep: <strong style={{ color: "#1e293b" }}>{repName}</strong>
                    </span>

                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={13} color="#94a3b8" />
                      {callDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at{" "}
                      {callDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Audio Player if recording exists */}
                  {call.recordingUrl && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px"
                      }}
                    >
                      <Volume2 size={16} color="#16a34a" />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#15803d", display: "block", marginBottom: "4px" }}>
                          Call Audio Recording
                        </span>
                        <audio controls src={call.recordingUrl} style={{ width: "100%", height: "32px" }} />
                      </div>
                    </div>
                  )}

                  {/* AI Summary Block */}
                  {summary && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        backgroundColor: "#faf5ff",
                        border: "1px solid #e9d5ff",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Sparkles size={14} color="#9333ea" />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7e22ce", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          AI Summary & Debrief
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#3b0764", lineHeight: 1.5, fontWeight: 500 }}>
                        {summary}
                      </p>
                    </div>
                  )}

                  {/* Auto-Transcript Section */}
                  {transcript ? (
                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                          <FileText size={14} color="#3b82f6" />
                          Call Auto-Transcript
                        </span>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleCopyTranscript(call.id, transcript)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              color: "#475569",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                            title="Copy transcript to clipboard"
                          >
                            {copiedId === call.id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                            {copiedId === call.id ? "Copied!" : "Copy"}
                          </button>

                          {dialogueLines.length > 3 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(call.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #c7d2fe",
                                backgroundColor: "#eef2ff",
                                color: "#4338ca",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={12} /> Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} /> Show All ({dialogueLines.length} lines)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Formatted Dialogue Bubbles */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(isExpanded ? dialogueLines : dialogueLines.slice(0, 3)).map((line, idx) => {
                          const isIVR = line.toLowerCase().startsWith("ivr:") || line.toLowerCase().startsWith("system:");
                          const isCustomer = line.toLowerCase().startsWith("customer:") || line.toLowerCase().startsWith("caller:");
                          const isAgent = line.toLowerCase().startsWith("agent:") || line.toLowerCase().startsWith("rep:");

                          let tagColor = "#475569";
                          let bubbleBg = "#ffffff";
                          let borderColor = "#e2e8f0";

                          if (isIVR) {
                            tagColor = "#d97706";
                            bubbleBg = "#fffbeb";
                            borderColor = "#fef3c7";
                          } else if (isCustomer) {
                            tagColor = "#2563eb";
                            bubbleBg = "#eff6ff";
                            borderColor = "#dbeafe";
                          } else if (isAgent) {
                            tagColor = "#16a34a";
                            bubbleBg = "#f0fdf4";
                            borderColor = "#dcfce7";
                          }

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                backgroundColor: bubbleBg,
                                border: `1px solid ${borderColor}`,
                                fontSize: "0.82rem",
                                lineHeight: 1.45,
                                color: "#1e293b"
                              }}
                            >
                              <strong style={{ color: tagColor, marginRight: "6px" }}>
                                {line.split(":")[0]}:
                              </strong>
                              <span>{line.substring(line.indexOf(":") + 1).trim() || line}</span>
                            </div>
                          );
                        })}

                        {!isExpanded && dialogueLines.length > 3 && (
                          <div
                            onClick={() => toggleExpand(call.id)}
                            style={{
                              textAlign: "center",
                              fontSize: "0.75rem",
                              color: "#4f46e5",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: "4px"
                            }}
                          >
                            + {dialogueLines.length - 3} more dialogue lines. Click to expand full transcript.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Manual User Notes if present */}
                  {userNotes && (
                    <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.4 }}>
                      <strong style={{ color: "#334155" }}>Notes: </strong>
                      <span>{userNotes}</span>
                    </div>
                  )}

                  {/* Scheduled Follow-up info if present */}
                  {call.followUpDate && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#c2410c",
                        backgroundColor: "#fff7ed",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid #ffedd5",
                        width: "fit-content"
                      }}
                    >
                      <Calendar size={12} color="#ea580c" />
                      Follow-up Scheduled: {new Date(call.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
