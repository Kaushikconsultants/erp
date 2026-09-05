"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  Search,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Delete,
  Sparkles,
  UserPlus,
  PlusCircle,
  Building,
  FileText,
  Loader2
} from "lucide-react";
import { logCall, getCustomersForCallModal } from "@/app/actions/callActions";
import { createLead } from "@/app/actions/leadActions";

interface PhoneDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialName?: string;
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
  "No Answer / Busy",
  "Voicemail / Switched Off",
  "Not Interested",
  "Callback Scheduled"
];

export default function PhoneDialerModal({
  isOpen,
  onClose,
  initialPhone = "",
  initialName = ""
}: PhoneDialerModalProps) {
  const [phoneDigits, setPhoneDigits] = useState<string>(initialPhone);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [hasDialed, setHasDialed] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCreatingLead, setIsCreatingLead] = useState<boolean>(false);
  const [showNewLeadForm, setShowNewLeadForm] = useState<boolean>(false);

  // Post-Call Maintenance State
  const [callType, setCallType] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [outcome, setOutcome] = useState<string>(DEFAULT_OUTCOMES[0]);
  const [notes, setNotes] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [newLeadName, setNewLeadName] = useState<string>("");
  const [newLeadShop, setNewLeadShop] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setPhoneDigits(initialPhone);
      setHasDialed(false);
      setNotes("");
      setFeedbackMsg("");
      setShowNewLeadForm(false);

      // Load contacts for matching
      getCustomersForCallModal().then(res => {
        if (res.success && res.customers) {
          setContacts(res.customers);
          if (initialPhone) {
            const match = res.customers.find((c: any) =>
              c.phone && c.phone.replace(/\D/g, '').includes(initialPhone.replace(/\D/g, ''))
            );
            if (match) setSelectedContact(match);
          }
        }
      });
    }
  }, [isOpen, initialPhone]);

  // Match contact on phone digit changes
  useEffect(() => {
    if (!phoneDigits) {
      setSelectedContact(null);
      return;
    }
    const cleanNum = phoneDigits.replace(/\D/g, '');
    if (cleanNum.length >= 3) {
      const match = contacts.find(c => {
        const cPhone = (c.phone || '').replace(/\D/g, '');
        const cName = (c.contactPerson || c.companyName || '').toLowerCase();
        return (cPhone && cPhone.includes(cleanNum)) || cName.includes(phoneDigits.toLowerCase());
      });
      if (match) {
        setSelectedContact(match);
      } else {
        setSelectedContact(null);
      }
    }
  }, [phoneDigits, contacts]);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    setPhoneDigits(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneDigits(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneDigits("");
    setSelectedContact(null);
  };

  const handleSelectMatchedContact = (contact: any) => {
    setSelectedContact(contact);
    if (contact.phone) {
      setPhoneDigits(contact.phone);
    }
  };

  // Initiate Native Mobile Phone Call
  const handleInitiateCall = () => {
    const cleanNum = phoneDigits.replace(/\D/g, '');
    if (!cleanNum) {
      alert("Please enter a valid phone number to call.");
      return;
    }

    // Trigger Native Android/iOS Phone Dialer
    window.location.href = `tel:${cleanNum}`;

    // Switch view to Post-Call Maintenance Drawer
    setHasDialed(true);
    setFeedbackMsg("📞 Call initiated! Maintain notes & lead status below:");
  };

  // Initiate WhatsApp Message
  const handleInitiateWhatsApp = () => {
    const cleanNum = phoneDigits.replace(/\D/g, '');
    if (!cleanNum) return;
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  // Save Call Record & Maintain Lead Status
  const handleSaveCallRecord = async () => {
    if (!selectedContact && !showNewLeadForm && !newLeadName) {
      // Prompt to quickly create a lead if unmapped
      setShowNewLeadForm(true);
      return;
    }

    setIsSaving(true);
    setFeedbackMsg("");

    try {
      let activeLeadId = selectedContact?.type === "Lead" ? selectedContact.id : null;
      let activeCustomerId = selectedContact?.type === "Customer" ? selectedContact.id : null;

      // If user typed a new lead name for an unsaved contact
      if (showNewLeadForm && (newLeadName || newLeadShop)) {
        setIsCreatingLead(true);
        const leadRes = await createLead({
          name: newLeadName || "New Phone Lead",
          shopName: newLeadShop || "Phone Inquiry",
          whatsappNumber: phoneDigits,
          status: "NEW",
          notes: `Created from Phone Dialer call (${outcome})`
        });
        setIsCreatingLead(false);
        if (leadRes.success && leadRes.lead) {
          activeLeadId = leadRes.lead.id;
        }
      }

      const formData = new FormData();
      if (activeCustomerId) formData.append("customerId", activeCustomerId);
      if (activeLeadId) formData.append("leadId", activeLeadId);
      formData.append("type", callType);
      formData.append("outcome", outcome);
      formData.append("notes", notes);
      if (followUpDate) formData.append("followUpDate", followUpDate);

      const res = await logCall(formData);
      setIsSaving(false);

      if (res.success) {
        setFeedbackMsg("✅ Call & Lead Logged Successfully!");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        alert(res.error || "Failed to log call record.");
      }
    } catch (err: any) {
      console.error("Dialer save error:", err);
      setIsSaving(false);
      alert("Error saving call record.");
    }
  };

  // Filter contacts dropdown
  const filteredContacts = contacts.filter(c => {
    if (!phoneDigits) return false;
    const q = phoneDigits.toLowerCase();
    const cPhone = (c.phone || '').replace(/\D/g, '');
    const cName = (c.contactPerson || '').toLowerCase();
    const cComp = (c.companyName || '').toLowerCase();
    return cPhone.includes(q.replace(/\D/g, '')) || cName.includes(q) || cComp.includes(q);
  }).slice(0, 5);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
          overflowY: "auto",
          animation: "slideUpDialer 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle & Title */}
        <div style={{ padding: "14px 20px 10px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                Phone Dialer & CRM Tracker
              </h3>
              <span style={{ fontSize: "0.74rem", color: "#64748b" }}>Direct Calls & Instant Lead Management</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", color: "#64748b", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div style={{ padding: "10px 18px", backgroundColor: "#ecfdf5", color: "#047857", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #a7f3d0" }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Selected / Matched Contact Banner */}
        <div style={{ padding: "12px 20px", backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          {selectedContact ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#ffffff", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: selectedContact.type === "Customer" ? "#dbeafe" : "#fef3c7", color: selectedContact.type === "Customer" ? "#1d4ed8" : "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                  {selectedContact.companyName?.charAt(0) || "C"}
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{selectedContact.companyName}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{selectedContact.contactPerson} • <span style={{ fontWeight: 600, color: selectedContact.type === "Customer" ? "#2563eb" : "#d97706" }}>{selectedContact.type}</span></div>
                </div>
              </div>
              <button onClick={() => setSelectedContact(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: "0.78rem", color: "#64748b", textAlign: "center" }}>
              {phoneDigits.length >= 3 ? "Unsaved Contact • Enter details below after calling" : "Type phone number or select a customer/lead below"}
            </div>
          )}
        </div>

        {/* Number Input Display */}
        <div style={{ padding: "14px 20px 8px 20px", textAlign: "center", position: "relative" }}>
          <input
            type="text"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value)}
            placeholder="Enter Phone Number..."
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#0f172a",
              border: "none",
              outline: "none",
              background: "transparent",
              letterSpacing: "1px"
            }}
          />
          {phoneDigits && (
            <div style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "6px" }}>
              <button onClick={handleBackspace} style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#475569" }} title="Backspace">
                <Delete size={18} />
              </button>
              <button onClick={handleClear} style={{ background: "#fee2e2", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", color: "#dc2626" }} title="Clear All">
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Auto-Complete Contacts Dropdown Results */}
        {filteredContacts.length > 0 && !selectedContact && (
          <div style={{ padding: "0 20px 10px 20px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Matching Directory Contacts</div>
            <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #cbd5e1", overflow: "hidden" }}>
              {filteredContacts.map((c: any) => (
                <div
                  key={c.id + c.type}
                  onClick={() => handleSelectMatchedContact(c)}
                  style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{c.companyName}</div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{c.contactPerson} ({c.phone})</div>
                  </div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "6px", backgroundColor: c.type === "Customer" ? "#e0e7ff" : "#fef3c7", color: c.type === "Customer" ? "#3730a3" : "#92400e" }}>
                    {c.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SECTION A: NUMERIC TOUCH DIALPAD ─── */}
        {!hasDialed && (
          <div style={{ padding: "10px 30px 16px 30px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 18px", justifyContent: "center" }}>
              {DIALPAD_KEYS.map((item) => (
                <button
                  key={item.digit}
                  onClick={() => handleDigitClick(item.digit)}
                  style={{
                    height: "56px",
                    borderRadius: "50%",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#e0e7ff";
                    (e.currentTarget as HTMLElement).style.borderColor = "#818cf8";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc";
                    (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                  }}
                >
                  <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{item.digit}</span>
                  {item.sub && <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", marginTop: "1px" }}>{item.sub}</span>}
                </button>
              ))}
            </div>

            {/* CALL & WHATSAPP ACTION BUTTONS */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "16px" }}>
              {/* WhatsApp Button */}
              <button
                onClick={handleInitiateWhatsApp}
                title="Send WhatsApp Message"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#25d366",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 211, 102, 0.35)"
                }}
              >
                <MessageSquare size={20} />
              </button>

              {/* MAIN GREEN NATIVE CALL BUTTON */}
              <button
                onClick={handleInitiateCall}
                title="Call via Mobile Phone"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.4)",
                  transition: "transform 0.15s ease"
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Phone size={26} />
              </button>
            </div>
          </div>
        )}

        {/* ─── SECTION B: POST-CALL LEAD & CALL MAINTENANCE FORM ─── */}
        {hasDialed && (
          <div style={{ padding: "16px 20px", borderTop: "2px solid #e0e7ff", backgroundColor: "#fafafa" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} color="#4f46e5" /> Maintain Lead & Call Notes
              </h4>
              <button onClick={() => setHasDialed(false)} style={{ fontSize: "0.75rem", color: "#4f46e5", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Show Keypad
              </button>
            </div>

            {/* Call Direction Type */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Call Type</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setCallType("OUTBOUND")}
                  style={{ flex: 1, padding: "7px", borderRadius: "8px", border: callType === "OUTBOUND" ? "2px solid #4f46e5" : "1px solid #cbd5e1", backgroundColor: callType === "OUTBOUND" ? "#eef2ff" : "#ffffff", color: callType === "OUTBOUND" ? "#4f46e5" : "#64748b", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                >
                  Outbound Call
                </button>
                <button
                  type="button"
                  onClick={() => setCallType("INBOUND")}
                  style={{ flex: 1, padding: "7px", borderRadius: "8px", border: callType === "INBOUND" ? "2px solid #059669" : "1px solid #cbd5e1", backgroundColor: callType === "INBOUND" ? "#ecfdf5" : "#ffffff", color: callType === "INBOUND" ? "#059669" : "#64748b", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                >
                  Inbound Call
                </button>
              </div>
            </div>

            {/* Outcome Selection */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Call Outcome / Status</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#ffffff", color: "#0f172a", fontWeight: 600 }}
              >
                {DEFAULT_OUTCOMES.map((oc, i) => (
                  <option key={i} value={oc}>{oc}</option>
                ))}
              </select>
            </div>

            {/* Quick Discussion Notes */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Call Discussion Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Discussed pricing, stock availability, requested sample catalog..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none" }}
              />
            </div>

            {/* Schedule Follow-up Date */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                <Calendar size={13} color="#4f46e5" /> Schedule Follow-up Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#ffffff", color: "#0f172a" }}
              />
            </div>

            {/* Save Unsaved Contact as New Lead */}
            {(!selectedContact || showNewLeadForm) && (
              <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "10px", border: "1px solid #fde68a", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <UserPlus size={15} /> Save as New Lead in CRM
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

            {/* Save & Log Button */}
            <button
              onClick={handleSaveCallRecord}
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)"
              }}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>{isSaving ? "Saving Call Record & Lead..." : "Save Call & Update Lead"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
