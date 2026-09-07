"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, MessageSquare, CheckCircle2, User, MapPin, Clock, Calendar, Check, AlertCircle, ArrowUpRight } from "lucide-react";
import { removeFollowUp } from "@/app/actions/callActions";
import LogCallModal from "@/components/ui/LogCallModal";
import { useRouter } from "next/navigation";
import { openPhoneDialer } from "@/lib/dialer";

interface FollowUpDashboardClientProps {
  initialCalls: any[];
  mappedCustomers: { id: string; companyName: string; contactPerson?: string; phone?: string; mobile?: string; city?: string; type?: string }[];
  isAdmin: boolean;
}

export default function FollowUpDashboardClient({
  initialCalls = [],
  mappedCustomers = [],
  isAdmin = false
}: FollowUpDashboardClientProps) {
  const router = useRouter();
  const [calls, setCalls] = useState<any[]>(initialCalls);
  const [activeLogCallTarget, setActiveLogCallTarget] = useState<{
    customerId?: string;
    customerName?: string;
    leadId?: string;
    leadName?: string;
    callId?: string;
  } | null>(null);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quick Mark Done action
  const handleMarkDone = async (callId: string, name: string) => {
    setCompletingId(callId);
    // Optimistic removal
    setCalls(prev => prev.filter(c => c.id !== callId));
    try {
      const res = await removeFollowUp(callId);
      if (res?.success) {
        showToast(`✓ Follow-up for ${name} marked as completed!`);
      } else {
        // Rollback
        setCalls(initialCalls);
        alert(res?.error || "Failed to mark follow-up as done.");
      }
    } catch (err) {
      setCalls(initialCalls);
    } finally {
      setCompletingId(null);
      router.refresh();
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = calls.filter(c => c.followUpDate && new Date(c.followUpDate) < today);
  const dueToday = calls.filter(c => c.followUpDate && new Date(c.followUpDate) >= today && new Date(c.followUpDate) < tomorrow);
  const upcoming = calls.filter(c => c.followUpDate && new Date(c.followUpDate) >= tomorrow);

  const renderCard = (c: any, urgency: "overdue" | "today" | "upcoming") => {
    const isLead = !c.customer && !!c.lead;
    const customerName = c.customer?.businessName || c.lead?.shopName || c.lead?.name || "Unknown";
    const contactPerson = c.customer?.contactPerson || (c.lead?.shopName ? c.lead?.name : "") || "";
    const rawPhone = c.customer?.mobile || c.customer?.phone || c.customer?.whatsappNumber || c.lead?.whatsappNumber || "";
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
    const waPhone = cleanPhone.startsWith("+") ? cleanPhone.slice(1) : cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const location = [c.customer?.city || c.lead?.city, c.customer?.state || c.lead?.state].filter(Boolean).join(", ");

    const dateFormatted = c.followUpDate 
      ? new Date(c.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : "";

    const dateColor = urgency === "overdue" ? "#dc2626" : urgency === "today" ? "#ea580c" : "#2563eb";

    return (
      <div 
        key={c.id} 
        style={{ 
          border: "1px solid #e2e8f0", 
          padding: "14px", 
          borderRadius: "10px", 
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          transition: "all 0.15s ease"
        }}
      >
        {/* Top Header: Customer Name & Date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <div>
            {c.customer ? (
              <Link 
                href={`/customers/${c.customerId}`} 
                style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none", fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                {customerName}
              </Link>
            ) : (
              <Link 
                href={`/leads/${c.leadId}`} 
                style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none", fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {customerName}
                <span style={{ fontSize: "0.68rem", background: "#eef2ff", color: "#4f46e5", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>
                  Lead
                </span>
              </Link>
            )}
          </div>

          <span style={{ 
            fontSize: "0.75rem", 
            color: dateColor, 
            fontWeight: 700, 
            backgroundColor: urgency === "overdue" ? "#fee2e2" : urgency === "today" ? "#ffedd5" : "#eff6ff",
            padding: "2px 8px",
            borderRadius: "6px",
            whiteSpace: "nowrap"
          }}>
            {urgency === "today" ? "Today" : dateFormatted}
          </span>
        </div>

        {/* Contact Details (Person, Phone, WhatsApp, City) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
          {contactPerson && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#334155", fontWeight: 500 }}>
              <User size={13} color="#64748b" />
              <span>{contactPerson}</span>
            </div>
          )}

          {rawPhone && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
              <button 
                type="button"
                onClick={() => openPhoneDialer({
                  phone: cleanPhone,
                  name: leadName || contactPerson || "Customer",
                  customerId: followUp.customerId || undefined,
                  leadId: followUp.leadId || undefined
                })}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", color: "#2563eb", fontWeight: 600, textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                title={`Call ${leadName || contactPerson || 'Customer'}`}
              >
                <Phone size={13} color="#2563eb" />
                <span>{rawPhone}</span>
              </button>

              {waPhone && (
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#166534",
                    backgroundColor: "#dcfce7",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textDecoration: "none"
                  }}
                  title="Open in WhatsApp"
                >
                  <MessageSquare size={11} color="#166534" /> WhatsApp
                </a>
              )}
            </div>
          )}

          {location && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
              <MapPin size={12} color="#94a3b8" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Follow-up Type & Notes */}
        <div style={{ fontSize: "0.8rem", color: "#475569" }}>
          <span style={{ fontWeight: 600, color: "#334155" }}>{c.callType || "Call"}: </span>
          <span>{c.notes || "Scheduled follow-up"}</span>
        </div>

        {/* Assigned Rep & Quick Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #e2e8f0", paddingTop: "8px", marginTop: "2px" }}>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            Rep: <strong style={{ color: "#64748b" }}>{c.employee?.user?.name || "Unassigned"}</strong>
          </span>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {/* Quick Mark Done Button */}
            <button
              type="button"
              onClick={() => handleMarkDone(c.id, customerName)}
              disabled={completingId === c.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #bbf7d0",
                backgroundColor: "#f0fdf4",
                color: "#166534",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title="Mark this follow-up as completed"
            >
              <Check size={12} />
              {completingId === c.id ? "Done..." : "Mark Done"}
            </button>

            {/* Log Call Modal Trigger with Customer Pre-selected */}
            <button
              type="button"
              onClick={() => setActiveLogCallTarget({
                customerId: c.customerId,
                customerName: c.customer?.businessName,
                leadId: c.leadId,
                leadName: c.lead?.name,
                callId: c.id
              })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 9px",
                borderRadius: "6px",
                border: "1px solid #c7d2fe",
                backgroundColor: "#eef2ff",
                color: "#4338ca",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title={`Log call for ${customerName}`}
            >
              <Phone size={11} /> Log Call
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          backgroundColor: "#0f172a",
          color: "#ffffff",
          padding: "12px 18px",
          borderRadius: "8px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          fontSize: "0.85rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          animation: "fadeIn 0.2s ease"
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3-Column Columns View */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Overdue Column */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #fecaca", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ backgroundColor: "#fef2f2", padding: "12px 16px", borderBottom: "1px solid #fecaca", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={16} /> Overdue
            </h3>
            <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
              {overdue.length}
            </span>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "75vh", overflowY: "auto" }}>
            {overdue.map(c => renderCard(c, "overdue"))}
            {overdue.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "24px 0", margin: 0 }}>
                ✓ No overdue follow-ups!
              </p>
            )}
          </div>
        </div>

        {/* Due Today Column */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #fed7aa", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ backgroundColor: "#fff7ed", padding: "12px 16px", borderBottom: "1px solid #fed7aa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: "#9a3412", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={16} /> Due Today
            </h3>
            <span style={{ backgroundColor: "#ffedd5", color: "#9a3412", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
              {dueToday.length}
            </span>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "75vh", overflowY: "auto" }}>
            {dueToday.map(c => renderCard(c, "today"))}
            {dueToday.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "24px 0", margin: 0 }}>
                No follow-ups due today.
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Column */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #bfdbfe", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ backgroundColor: "#eff6ff", padding: "12px 16px", borderBottom: "1px solid #bfdbfe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: "#1e40af", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={16} /> Upcoming
            </h3>
            <span style={{ backgroundColor: "#dbeafe", color: "#1e40af", fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
              {upcoming.length}
            </span>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "75vh", overflowY: "auto" }}>
            {upcoming.map(c => renderCard(c, "upcoming"))}
            {upcoming.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "24px 0", margin: 0 }}>
                No upcoming follow-ups.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Log Call Modal with Pre-Selected Customer Target */}
      {activeLogCallTarget && (
        <LogCallModal
          onClose={() => setActiveLogCallTarget(null)}
          customers={mappedCustomers}
          isAdmin={isAdmin}
          customerId={activeLogCallTarget.customerId}
          customerName={activeLogCallTarget.customerName}
          leadId={activeLogCallTarget.leadId}
          leadName={activeLogCallTarget.leadName}
          onCallLogged={() => {
            if (activeLogCallTarget.callId) {
              setCalls(prev => prev.filter(c => c.id !== activeLogCallTarget.callId));
            }
            showToast(`✓ Call logged for ${activeLogCallTarget.customerName || activeLogCallTarget.leadName || "customer"}!`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
