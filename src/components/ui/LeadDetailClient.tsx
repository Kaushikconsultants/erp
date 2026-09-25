"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddCustomerModal from './AddCustomerModal';
import LogCallModal from './LogCallModal';
import { openPhoneDialer } from '@/lib/dialer';
import { updateLead } from '@/actions/leads';
import { deleteCall } from '@/app/actions/callActions';
import CallTranscriptViewer from '@/components/telecalling/CallTranscriptViewer';
import { 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  UserPlus, 
  ArrowLeft, 
  Edit2, 
  Check, 
  X, 
  Calendar, 
  User, 
  Store, 
  Clock, 
  PhoneOutgoing, 
  PhoneIncoming, 
  Volume2, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import './leadDetail.css';

export default function LeadDetailClient({ lead: initialLead, employees }: { lead: any, employees: any[] }) {
  const router = useRouter();
  const [lead, setLead] = useState<any>(initialLead);
  const [isConverting, setIsConverting] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Inline Lead Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(lead.name || '');
  const [shopValue, setShopValue] = useState(lead.shopName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const initials = (lead.name || "L").slice(0, 2).toUpperCase();

  const handleSaveLeadName = async () => {
    if (!nameValue.trim()) return;
    setIsSavingName(true);
    try {
      const res = await updateLead(lead.id, {
        name: nameValue.trim(),
        shopName: shopValue.trim() || undefined
      });
      if (res && res.success) {
        setLead((prev: any) => ({
          ...prev,
          name: nameValue.trim(),
          shopName: shopValue.trim()
        }));
        setIsEditingName(false);
        setToastMsg("✅ Lead updated successfully!");
        setTimeout(() => setToastMsg(''), 2500);
      } else {
        alert(res?.error || "Failed to update lead name");
      }
    } catch (err: any) {
      alert("Error updating lead: " + (err?.message || "Unknown error"));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteLeadCall = async (callId: string) => {
    if (!window.confirm("Are you sure you want to delete this call record and recording?")) return;
    try {
      const res = await deleteCall(callId);
      if (res && res.success) {
        setLead((prev: any) => ({
          ...prev,
          calls: (prev?.calls || []).filter((c: any) => c.id !== callId)
        }));
        setToastMsg("✅ Call record and recording deleted.");
        setTimeout(() => setToastMsg(''), 2500);
        try {
          router.refresh();
        } catch (e) {}
      } else {
        alert(res?.error || "Failed to delete call record");
      }
    } catch (err: any) {
      alert("Error deleting call: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="lead-detail-wrapper">
      {/* ── TOP NAV BAR ── */}
      <div className="lead-detail-top-nav">
        <button 
          type="button" 
          onClick={() => router.push('/leads')}
          className="lead-detail-back-btn"
        >
          <ArrowLeft size={14} /> Back to Leads
        </button>

        {toastMsg && (
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "6px 12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
            {toastMsg}
          </div>
        )}
      </div>

      {/* ── HERO PROFILE CARD ── */}
      <div className="lead-detail-hero-card">
        <div className="lead-detail-profile-row">
          <div className="lead-detail-avatar">
            {initials}
          </div>

          <div className="lead-detail-title-group">
            {!isEditingName ? (
              <>
                <div className="lead-detail-name-row">
                  <h1 className="lead-detail-name">{lead.name}</h1>
                  <button 
                    type="button"
                    onClick={() => {
                      setNameValue(lead.name);
                      setShopValue(lead.shopName || '');
                      setIsEditingName(true);
                    }}
                    className="lead-detail-edit-name-btn"
                    title="Edit Name & Shop"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
                {lead.shopName && (
                  <div className="lead-detail-shop">
                    🏪 {lead.shopName}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '340px' }}>
                <input 
                  type="text"
                  placeholder="Lead Name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #4f46e5',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                  autoFocus
                />
                <input 
                  type="text"
                  placeholder="Shop / Business Name (Optional)"
                  value={shopValue}
                  onChange={(e) => setShopValue(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={handleSaveLeadName}
                    disabled={isSavingName}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={12} /> {isSavingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="lead-detail-badges-row">
              <span className={`status-badge ${lead.status?.toLowerCase().replace(' ', '-')}`}>
                {lead.status || 'New'}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Assigned: <strong>{lead.assignedSalesperson?.user?.name || 'Unassigned'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 1-Tap Action Buttons Grid */}
        <div className="lead-detail-action-grid">
          {lead.whatsappNumber ? (
            <button
              type="button"
              className="lead-detail-act-btn call"
              onClick={() => openPhoneDialer({
                phone: lead.whatsappNumber,
                name: lead.name,
                leadId: lead.id
              })}
              title="Call Lead"
            >
              <PhoneCall size={14} /> Call
            </button>
          ) : (
            <button type="button" disabled className="lead-detail-act-btn" style={{ opacity: 0.5 }}>
              <PhoneCall size={14} /> No Phone
            </button>
          )}

          {lead.whatsappNumber ? (
            <a
              href={`https://wa.me/${lead.whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="lead-detail-act-btn whatsapp"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={14} /> WhatsApp
            </a>
          ) : (
            <button type="button" disabled className="lead-detail-act-btn" style={{ opacity: 0.5 }}>
              <MessageSquare size={14} /> WhatsApp
            </button>
          )}

          {lead.status !== 'Converted' ? (
            <button
              type="button"
              className="lead-detail-act-btn convert"
              onClick={() => setIsConverting(true)}
              title="Convert Lead to Customer"
            >
              <UserPlus size={14} /> Convert
            </button>
          ) : (
            <div className="lead-detail-act-btn converted">
              ✓ Converted
            </div>
          )}
        </div>
      </div>

      {/* ── STACKED APP VIEW CONTENT (Responsive 1-Col on Mobile, 2-Col on Desktop) ── */}
      <div className="lead-detail-content-layout">
        {/* Left Card: Lead Profile Information */}
        <div className="lead-section-card">
          <div className="lead-section-header">
            <h2 className="lead-section-title">
              <User size={16} color="#4f46e5" /> Lead Information
            </h2>
          </div>

          <div className="lead-info-list">
            <div className="lead-info-row">
              <span className="lead-info-label">
                <Phone size={13} /> Mobile / WhatsApp
              </span>
              <span className="lead-info-value">
                {lead.whatsappNumber || "Not provided"}
              </span>
            </div>

            <div className="lead-info-row">
              <span className="lead-info-label">
                <Store size={13} /> Business / Shop
              </span>
              <span className="lead-info-value">
                {lead.shopName || "Phone Inquiry"}
              </span>
            </div>

            <div className="lead-info-row">
              <span className="lead-info-label">
                <User size={13} /> Assigned Rep
              </span>
              <span className="lead-info-value">
                {lead.assignedSalesperson?.user?.name || "Unassigned"}
              </span>
            </div>

            <div className="lead-info-row">
              <span className="lead-info-label">
                <Calendar size={13} /> Lead Created
              </span>
              <span className="lead-info-value">
                {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Recent Activity & Calls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Recent Calls Card */}
          <div className="lead-section-card">
            <div className="lead-section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="lead-section-title">
                  <PhoneCall size={16} color="#10b981" /> Recent Calls
                </h2>
                <span className="lead-section-counter">
                  {lead.calls?.length || 0}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openPhoneDialer({
                  phone: lead.whatsappNumber,
                  name: lead.name,
                  leadId: lead.id,
                  tab: "POST_CALL"
                })}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  border: "1px solid #c7d2fe",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                + Log Call
              </button>
            </div>

            {(!lead.calls || lead.calls.length === 0) ? (
              <div style={{ textAlign: "center", padding: "24px 10px", color: "#94a3b8" }}>
                <Clock size={28} style={{ margin: "0 auto 6px auto", opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600 }}>No calls recorded yet</p>
                <p style={{ margin: "3px 0 0 0", fontSize: "0.74rem" }}>Tap "Call" or "+ Log Call" above to record customer interactions.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {lead.calls.map((call: any) => {
                  const isOutbound = call.callType?.toUpperCase().includes("OUT");
                  return (
                    <div key={call.id} className="lead-call-card">
                      <div className="lead-call-card-top">
                        <div className="lead-call-type-badge">
                          {isOutbound ? (
                            <PhoneOutgoing size={13} color="#2563eb" />
                          ) : (
                            <PhoneIncoming size={13} color="#10b981" />
                          )}
                          <span>{call.callType} Call</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {call.outcome && (
                            <span className="lead-call-outcome-badge">
                              {call.outcome}
                            </span>
                          )}
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                            {new Date(call.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short"
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLeadCall(call.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center",
                              opacity: 0.8
                            }}
                            title="Delete call & recording"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Call recording audio player if attached */}
                      {call.recordingUrl && (
                        <div style={{ marginTop: "4px" }}>
                          <audio controls src={call.recordingUrl} className="lead-call-audio-player" />
                        </div>
                      )}

                      {/* Notes / Auto Transcript / AI Summary */}
                      {(call.notes || call.summary) && (
                        <CallTranscriptViewer
                          notes={call.notes}
                          summary={call.summary}
                          repName={call.employee?.user?.name || lead.assignedSalesperson?.user?.name || "Ikra"}
                          customerName={lead.name || lead.contactPerson || lead.shopName || "Customer"}
                          callId={call.id}
                          durationSec={call.durationSec}
                          outcome={call.outcome}
                          status={call.status}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Follow-ups Card */}
          <div className="lead-section-card">
            <div className="lead-section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="lead-section-title">
                  <Calendar size={16} color="#d97706" /> Follow-ups & Reminders
                </h2>
                <span className="lead-section-counter">
                  {lead.followUps?.length || 0}
                </span>
              </div>
            </div>

            {(!lead.followUps || lead.followUps.length === 0) ? (
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8", padding: "10px 0" }}>
                No follow-ups scheduled.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lead.followUps.map((fu: any) => {
                  const isDone = fu.status === 'Completed';
                  return (
                    <div key={fu.id} className={`lead-fu-card ${isDone ? 'completed' : ''}`}>
                      <div>
                        <div className="lead-fu-title">{fu.followUpType || "Follow-up"}</div>
                        <div className="lead-fu-date">
                          📅 {new Date(fu.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                      <span 
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: isDone ? "#ecfdf5" : "#fffbeb",
                          color: isDone ? "#059669" : "#d97706",
                          border: `1px solid ${isDone ? '#a7f3d0' : '#fde68a'}`
                        }}
                      >
                        {fu.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {isConverting && (
        <AddCustomerModal 
          onClose={(newCustomer) => {
            setIsConverting(false);
            if (newCustomer) {
              router.push(`/customers/${newCustomer.id}`);
            }
          }} 
          employees={employees.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }))}
          leadToConvert={lead}
        />
      )}

      {isLoggingCall && (
        <LogCallModal 
          onClose={() => setIsLoggingCall(false)}
          leadId={lead.id}
          leadName={lead.name}
          onCallLogged={() => router.refresh()}
        />
      )}
    </div>
  );
}
