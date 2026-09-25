"use client";

import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  MessageSquare, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeftRight, 
  FileText, 
  User, 
  Headphones,
  Info
} from "lucide-react";
import { parseTranscriptDialogue, DialogueTurn } from "@/lib/transcriptUtils";
import { updateCall } from "@/app/actions/callActions";
import "./callTranscriptViewer.css";

interface CallTranscriptViewerProps {
  notes?: string | null;
  summary?: string | null;
  repName?: string | null;
  customerName?: string | null;
  isOldCustomer?: boolean;
  companyName?: string | null;
  callId?: string;
  compact?: boolean;
  initialExpanded?: boolean;
  maxInitialTurns?: number;
  durationSec?: number | null;
  outcome?: string | null;
  status?: string | null;
}

export default function CallTranscriptViewer({
  notes,
  summary: externalSummary,
  repName,
  customerName,
  isOldCustomer,
  companyName,
  callId,
  compact = false,
  initialExpanded = false,
  maxInitialTurns = 3,
  durationSec,
  outcome,
  status
}: CallTranscriptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [viewMode, setViewMode] = useState<"chat" | "text">("chat");
  const [copied, setCopied] = useState(false);
  const [manualSwap, setManualSwap] = useState(false);
  const [isSavingSwap, setIsSavingSwap] = useState(false);
  const [swapToast, setSwapToast] = useState("");

  // Check if call was unconnected (0s duration, No Answer, Busy, Missed, etc.)
  const isUnconnected = useMemo(() => {
    if (typeof durationSec === "number" && durationSec <= 0) return true;
    const combined = `${outcome || ""} ${status || ""}`.toLowerCase();
    return (
      combined.includes("no answer") ||
      combined.includes("missed") ||
      combined.includes("busy") ||
      combined.includes("not connected") ||
      combined.includes("switched off") ||
      combined.includes("voicemail") ||
      combined.includes("rejected") ||
      combined.includes("wrong number")
    );
  }, [durationSec, outcome, status]);

  // Parse notes and detect speaker roles
  const parsed = useMemo(() => {
    return parseTranscriptDialogue(notes, repName, customerName, isOldCustomer, companyName);
  }, [notes, repName, customerName, isOldCustomer, companyName]);

  // Apply manual swap toggle if user explicitly requested it (only if call was connected)
  const turns: DialogueTurn[] = useMemo(() => {
    if (isUnconnected) return [];
    if (!manualSwap) return parsed.dialogueTurns;
    return parsed.dialogueTurns.map((turn) => {
      if (turn.isSystem) return turn;
      return {
        ...turn,
        speaker: turn.isRep ? parsed.effectiveCustomer : parsed.effectiveRep,
        isRep: !turn.isRep,
        isCustomer: !turn.isCustomer
      };
    });
  }, [parsed, manualSwap, isUnconnected]);

  // Priority to external summary if passed, otherwise extract from notes (only if call was connected)
  const effectiveSummary = isUnconnected ? "" : (externalSummary || parsed.aiSummary || "").trim();

  // If call was unconnected and there are no clean manual user notes, render nothing
  if (isUnconnected && !parsed.userNotes) {
    return null;
  }

  // If there are no turns, no notes, and no summary, render null
  if (!notes && !effectiveSummary && turns.length === 0 && !parsed.userNotes) {
    return null;
  }

  // Handle Copy to clipboard
  const handleCopy = () => {
    const textToCopy = turns.length > 0
      ? turns.map((t) => `${t.speaker}: ${t.text}`).join("\n")
      : (notes || "");
    
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle Manual Speaker Role Swap
  const handleSwapSpeakers = async () => {
    const nextSwap = !manualSwap;
    setManualSwap(nextSwap);

    if (callId) {
      setIsSavingSwap(true);
      try {
        // Construct flipped transcript
        const flippedTurns = parsed.dialogueTurns.map((turn) => {
          if (turn.isSystem) return turn;
          return {
            ...turn,
            speaker: turn.isRep ? parsed.effectiveCustomer : parsed.effectiveRep
          };
        });
        const cleanFlipped = flippedTurns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
        const newNotesParts: string[] = [];
        if (cleanFlipped) newNotesParts.push(`[Auto-Transcript]:\n${cleanFlipped}`);
        if (parsed.aiSummary) newNotesParts.push(`[AI Summary]: ${parsed.aiSummary}`);
        if (parsed.userNotes) newNotesParts.push(parsed.userNotes);

        await updateCall(callId, { notes: newNotesParts.join("\n\n") });
        setSwapToast("✅ Speaker roles saved!");
        setTimeout(() => setSwapToast(""), 2500);
      } catch (err) {
        console.warn("Could not save swapped transcript:", err);
      } finally {
        setIsSavingSwap(false);
      }
    }
  };

  const hasManyTurns = turns.length > maxInitialTurns;
  const displayedTurns = (isExpanded || !hasManyTurns) ? turns : turns.slice(0, maxInitialTurns);

  return (
    <div className={`call-transcript-container ${compact ? "compact" : ""}`}>
      {/* ── 1. AI Summary Card (if present) ── */}
      {effectiveSummary && (
        <div className="call-ai-summary-card">
          <div className="call-ai-summary-header">
            <Sparkles size={13} color="#9333ea" />
            <span>AI Call Summary</span>
          </div>
          <p className="call-ai-summary-text">{effectiveSummary}</p>
        </div>
      )}

      {/* ── 2. Dialogue Transcript Box (if turns exist) ── */}
      {turns.length > 0 ? (
        <div className="call-transcript-card">
          {/* Header Bar */}
          <div className="call-transcript-header">
            <div className="call-transcript-title-area">
              <span className="call-transcript-title">
                <MessageSquare size={13} color="#2563eb" />
                Call Transcript
              </span>
              <span className="call-transcript-count-badge">
                {turns.length} {turns.length === 1 ? "turn" : "turns"}
              </span>

              {parsed.wasInverted && (
                <span className="call-transcript-inversion-badge" title="Auto-aligned: Speaker names correctly matched based on conversation context">
                  <Check size={10} /> Auto-Aligned
                </span>
              )}

              {swapToast && (
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#16a34a" }}>
                  {swapToast}
                </span>
              )}
            </div>

            <div className="call-transcript-actions">
              {/* Swap roles button */}
              <button
                type="button"
                className="call-transcript-btn swap-btn"
                onClick={handleSwapSpeakers}
                disabled={isSavingSwap}
                title="Click to flip Sales Rep and Customer speaker names"
              >
                <ArrowLeftRight size={11} />
                <span>{isSavingSwap ? "Saving..." : "Swap Roles"}</span>
              </button>

              {/* View Mode Toggle */}
              <button
                type="button"
                className={`call-transcript-btn ${viewMode === "chat" ? "active" : ""}`}
                onClick={() => setViewMode(viewMode === "chat" ? "text" : "chat")}
                title={viewMode === "chat" ? "Switch to Text View" : "Switch to Chat View"}
              >
                {viewMode === "chat" ? <FileText size={11} /> : <MessageSquare size={11} />}
                <span>{viewMode === "chat" ? "Text" : "Chat"}</span>
              </button>

              {/* Copy Button */}
              <button
                type="button"
                className="call-transcript-btn"
                onClick={handleCopy}
                title="Copy entire transcript to clipboard"
              >
                {copied ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          {viewMode === "chat" ? (
            <div>
              <div className={`call-dialogue-list ${!isExpanded && hasManyTurns ? "collapsed" : ""}`}>
                {displayedTurns.map((turn, index) => {
                  const roleClass = turn.isSystem ? "system" : turn.isRep ? "rep" : "customer";
                  const speakerInit = (turn.speaker || "U").charAt(0).toUpperCase();

                  return (
                    <div key={index} className={`call-dialogue-bubble ${roleClass}`}>
                      {!turn.isSystem && (
                        <div className="call-dialogue-speaker-row">
                          <div className="call-dialogue-speaker-info">
                            <div className={`call-dialogue-avatar ${roleClass}`}>
                              {turn.isRep ? <Headphones size={10} /> : <User size={10} />}
                            </div>
                            <span className="call-dialogue-speaker-name">
                              {turn.speaker}
                            </span>
                            <span className={`call-dialogue-role-tag ${roleClass}`}>
                              {turn.isRep ? "Sales Rep" : "Customer"}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="call-dialogue-text">
                        {turn.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expand / Collapse Control */}
              {hasManyTurns && (
                <div className="call-dialogue-expand-wrapper">
                  <button
                    type="button"
                    className="call-dialogue-expand-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={13} />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} />
                        <span>Show Full Dialogue ({turns.length} messages)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="call-raw-text-view">
              {turns.map((t, idx) => (
                <div key={idx} style={{ marginBottom: "6px" }}>
                  <strong style={{ color: t.isRep ? "#1d4ed8" : "#047857" }}>
                    {t.speaker}:
                  </strong>{" "}
                  {t.text}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : parsed.userNotes ? (
        <div className="call-user-notes-card">
          <Info size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>{parsed.userNotes}</div>
        </div>
      ) : null}

      {/* ── 3. Additional User Notes if distinct from transcript ── */}
      {turns.length > 0 && parsed.userNotes && (
        <div className="call-user-notes-card">
          <Info size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Notes:</strong> {parsed.userNotes}
          </div>
        </div>
      )}
    </div>
  );
}
