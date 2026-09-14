"use client";

import DatePicker from '@/components/ui/DatePicker';
import React, { useState } from 'react';
import { Pencil, Trash2, Calendar, CheckCircle, Clock, Phone, MessageSquare, PhoneCall, FileText, Sparkles, X } from 'lucide-react';
import { updateCall, deleteCall } from '@/app/actions/callActions';
import PhoneDialerModal from './PhoneDialerModal';

interface CallsTableClientProps {
  calls: any[];
  availableOutcomes?: string[];
  availableCallTypes?: string[];
}

export default function CallsTableClient({ 
  calls, 
  availableOutcomes = [
    "Interested / Follow-up Needed",
    "Order Placed / Deal Closed",
    "Quotation Requested",
    "Price Negotiation / Discount Discussion",
    "No Answer / Busy",
    "Voicemail / Switched Off",
    "Callback Scheduled",
    "Not Interested / Lost",
    "Wrong / Invalid Number",
    "Support / General Inquiry"
  ],
  availableCallTypes = ["OUTBOUND", "INBOUND", "In-person Meeting", "WhatsApp Chat"]
}: CallsTableClientProps) {
  const [editingCall, setEditingCall] = useState<any | null>(null);
  const [viewingTranscriptCall, setViewingTranscriptCall] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialer
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialerPhone, setDialerPhone] = useState("");
  const [dialerName, setDialerName] = useState("");

  // Edit state
  const [editOutcome, setEditOutcome] = useState("");
  const [editCallType, setEditCallType] = useState("");
  const [editDurationSec, setEditDurationSec] = useState<number>(0);
  const [editFollowUpDate, setEditFollowUpDate] = useState("");
  const [editFollowUpHour, setEditFollowUpHour] = useState("10");
  const [editFollowUpMinute, setEditFollowUpMinute] = useState("00");
  const [editFollowUpPeriod, setEditFollowUpPeriod] = useState<"AM" | "PM">("AM");
  const [editNotes, setEditNotes] = useState("");

  const formatDuration = (sec: number | null | undefined) => {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const handleOpenEdit = (call: any) => {
    setEditingCall(call);
    setEditOutcome(call.outcome || "Interested / Follow-up Needed");
    setEditCallType(call.callType || "OUTBOUND");
    setEditDurationSec(call.durationSec || 0);
    if (call.followUpDate) {
      const d = new Date(call.followUpDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setEditFollowUpDate(`${yyyy}-${mm}-${dd}`);
      let h = d.getHours();
      const m = d.getMinutes();
      const period = h >= 12 ? "PM" : "AM";
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      setEditFollowUpHour(String(h12).padStart(2, '0'));
      setEditFollowUpMinute(String(Math.floor(m / 5) * 5).padStart(2, '0'));
      setEditFollowUpPeriod(period);
    } else {
      setEditFollowUpDate("");
      setEditFollowUpHour("10");
      setEditFollowUpMinute("00");
      setEditFollowUpPeriod("AM");
    }
    setEditNotes(call.notes || "");
  };

  const getCompiledEditFollowUp = () => {
    if (!editFollowUpDate) return null;
    let h = parseInt(editFollowUpHour || "10", 10);
    if (editFollowUpPeriod === "PM" && h < 12) h += 12;
    if (editFollowUpPeriod === "AM" && h === 12) h = 0;
    const [year, month, day] = editFollowUpDate.split('-');
    const m = parseInt(editFollowUpMinute || "00", 10);
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), h, m, 0);
    return localDate.toISOString();
  };

  const handleSaveEdit = async () => {
    if (!editingCall) return;
    setLoading(true);
    await updateCall(editingCall.id, {
      outcome: editOutcome,
      callType: editCallType,
      durationSec: editDurationSec,
      followUpDate: getCompiledEditFollowUp(),
      notes: editNotes
    });
    setLoading(false);
    setEditingCall(null);
  };

  const handleDelete = async (callId: string, customerName: string) => {
    if (confirm(`Are you sure you want to delete this call record for ${customerName}? This action cannot be undone.`)) {
      setDeletingId(callId);
      await deleteCall(callId);
      setDeletingId(null);
    }
  };

  const getOutcomeBadgeClass = (outcome: string) => {
    const o = (outcome || "").toUpperCase();
    if (o.includes("ORDER") || o.includes("INTERESTED") || o.includes("CLOSED")) return "active";
    if (o.includes("NOT") || o.includes("COMPLAINT") || o.includes("BUSY") || o.includes("WRONG")) return "inactive";
    return "";
  };

  const openDialer = (phone: string, name: string) => {
    setDialerPhone(phone || "");
    setDialerName(name || "");
    setIsDialerOpen(true);
  };

  const openWhatsApp = (phone: string) => {
    const cleanNum = (phone || "").replace(/\D/g, "");
    if (!cleanNum) return;
    const formatted = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  return (
    <>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer / Lead</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Outcome</th>
              <th>Recording / AI Transcript</th>
              <th>Follow-up Date</th>
              <th>Rep</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {calls.map(call => {
              const isOverdue = call.followUpDate && new Date(call.followUpDate) < new Date();
              const extractedPhone = call.notes?.match(/\[(?:Dialed|Phone): ([^\]]+)\]/)?.[1];
              const customerName = call.customer?.businessName || call.lead?.shopName || call.lead?.name || call.customer?.contactPerson || (extractedPhone ? `Helpline / Direct (${extractedPhone})` : 'Direct Call');
              const phone = call.customer?.mobile || call.customer?.whatsappNumber || call.lead?.whatsappNumber || extractedPhone || '';
              
              return (
                <tr key={call.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(call.createdAt).toLocaleDateString('en-GB')}</td>
                  <td>
                    <strong>{customerName}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {call.customer?.contactPerson || (call.lead ? `Lead • ${call.lead.name || ''}` : extractedPhone ? `Dialed: ${extractedPhone}` : '')}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: call.callType === 'INBOUND' ? '#e0e7ff' : '#f1f5f9', color: call.callType === 'INBOUND' ? '#4338ca' : '#475569' }}>
                      {call.callType || 'OUTBOUND'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: (call.durationSec || 0) > 0 ? '#ecfdf5' : '#f8fafc', color: (call.durationSec || 0) > 0 ? '#047857' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatDuration(call.durationSec)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getOutcomeBadgeClass(call.outcome)}`}>
                      {call.outcome ? call.outcome.replace('_', ' ') : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
                      {call.recordingUrl && (
                        <audio controls src={call.recordingUrl} style={{ height: '30px', width: '100%' }} />
                      )}
                      {(call.summary || call.notes) ? (
                        <span style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.3 }} title={call.summary || call.notes}>
                          {(call.summary || call.notes).slice(0, 60)}{(call.summary || call.notes).length > 60 ? "..." : ""}
                        </span>
                      ) : (
                        !call.recordingUrl && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No recording</span>
                      )}
                      {(call.summary || call.notes?.includes("[Auto-Transcript]")) && (
                        <button
                          type="button"
                          onClick={() => setViewingTranscriptCall(call)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid #c7d2fe",
                            backgroundColor: "#eef2ff",
                            color: "#4338ca",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            width: "fit-content",
                            marginTop: "2px"
                          }}
                        >
                          <FileText size={11} /> View Transcript & AI Summary
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    {call.followUpDate ? (
                      <span style={{ color: isOverdue ? '#dc2626' : '#16a34a', fontWeight: isOverdue ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                        <Calendar size={13} /> {new Date(call.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at {new Date(call.followUpDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                        {isOverdue && <span style={{ fontSize: '0.68rem', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px' }}>Overdue</span>}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Follow-up</span>
                    )}
                  </td>
                  <td>{call.employee?.user?.name || 'Unknown'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openDialer(phone, customerName)}
                          style={{ padding: '5px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Call Contact"
                        >
                          <PhoneCall size={13} />
                        </button>
                      )}
                      {phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(phone)}
                          style={{ padding: '5px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="WhatsApp Message"
                        >
                          <MessageSquare size={13} />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => handleOpenEdit(call)}
                        style={{ padding: '5px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                        title="Edit Follow-up & Call Record"
                      >
                        <Pencil size={13} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleDelete(call.id, customerName)}
                        disabled={deletingId === call.id}
                        style={{ padding: '5px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: deletingId === call.id ? 0.5 : 1 }}
                        title="Delete Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {calls.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No call & follow-up records found. Click "+ Log Call" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT CALL & FOLLOW-UP MODAL */}
      {editingCall && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="modal-content glass-panel animate-in" style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ padding: '16px 20px', backgroundColor: '#4f46e5', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={18} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Edit Call & Follow-Up</h3>
              </div>
              <button onClick={() => setEditingCall(null)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Customer</label>
                <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                  {editingCall.customer?.businessName || editingCall.customer?.contactPerson || 'Customer'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Call Type</label>
                  <select 
                    value={editCallType} 
                    onChange={e => setEditCallType(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                  >
                    {availableCallTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Duration (Seconds)</label>
                  <input
                    type="number"
                    value={editDurationSec}
                    onChange={e => setEditDurationSec(parseInt(e.target.value, 10) || 0)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Outcome</label>
                <select 
                  value={editOutcome} 
                  onChange={e => setEditOutcome(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                >
                  {availableOutcomes.map(o => (
                    <option key={o} value={o}>{o.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Next Follow-up Date (12-Hour Clock)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <DatePicker 
                    value={editFollowUpDate}
                    onChange={e => setEditFollowUpDate(e.target.value)}
                    style={{ flex: '1 1 130px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select
                      value={editFollowUpHour}
                      onChange={e => setEditFollowUpHour(e.target.value)}
                      style={{ padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 600 }}
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>:</span>
                    <select
                      value={editFollowUpMinute}
                      onChange={e => setEditFollowUpMinute(e.target.value)}
                      style={{ padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 600 }}
                    >
                      {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setEditFollowUpPeriod("AM")}
                        style={{
                          padding: '6px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: editFollowUpPeriod === "AM" ? "#4f46e5" : "#f1f5f9",
                          color: editFollowUpPeriod === "AM" ? "#ffffff" : "#475569"
                        }}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFollowUpPeriod("PM")}
                        style={{
                          padding: '6px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: editFollowUpPeriod === "PM" ? "#4f46e5" : "#f1f5f9",
                          color: editFollowUpPeriod === "PM" ? "#ffffff" : "#475569"
                        }}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Call Notes / Discussion Summary</label>
                <textarea 
                  rows={4} 
                  value={editNotes} 
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Enter details of what was discussed..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', backgroundColor: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingCall(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveEdit}
                  disabled={loading}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={16} /> {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Transcript & Summary Modal */}
      {viewingTranscriptCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#4f46e5" /> Call Transcript & Debrief
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(viewingTranscriptCall.createdAt).toLocaleDateString('en-GB')} at {new Date(viewingTranscriptCall.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • Rep: {viewingTranscriptCall.employee?.user?.name || "Agent"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingTranscriptCall(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#64748b',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Badges Info */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: viewingTranscriptCall.callType === 'INBOUND' ? '#e0e7ff' : '#dbeafe', color: viewingTranscriptCall.callType === 'INBOUND' ? '#3730a3' : '#1d4ed8' }}>
                  {viewingTranscriptCall.callType || 'OUTBOUND'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857' }}>
                  ⏱ {formatDuration(viewingTranscriptCall.durationSec)}
                </span>
                <span className={`status-badge ${getOutcomeBadgeClass(viewingTranscriptCall.outcome)}`}>
                  {viewingTranscriptCall.outcome || 'Completed'}
                </span>
              </div>

              {/* Audio recording */}
              {viewingTranscriptCall.recordingUrl && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', display: 'block', marginBottom: '6px' }}>
                    Call Audio Recording
                  </span>
                  <audio controls src={viewingTranscriptCall.recordingUrl} style={{ width: '100%', height: '32px' }} />
                </div>
              )}

              {/* AI Summary */}
              {viewingTranscriptCall.summary && (
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Sparkles size={14} color="#9333ea" />
                    <strong style={{ fontSize: '0.78rem', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      AI Summary
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b0764', lineHeight: 1.5 }}>
                    {viewingTranscriptCall.summary}
                  </p>
                </div>
              )}

              {/* Full Notes / Transcript */}
              {viewingTranscriptCall.notes && (
                <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', color: '#334155' }}>
                    Notes & Dialogue Transcript:
                  </strong>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.5, maxHeight: '250px', overflowY: 'auto' }}>
                    {viewingTranscriptCall.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setViewingTranscriptCall(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialer Modal for 1-tap re-dials */}
      <PhoneDialerModal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
        initialPhone={dialerPhone}
        initialName={dialerName}
      />
    </>
  );
}
