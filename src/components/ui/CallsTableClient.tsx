"use client";

import React, { useState } from 'react';
import { Pencil, Trash2, Eye, Calendar, FileText, PhoneCall, CheckCircle } from 'lucide-react';
import { updateCall, deleteCall } from '@/app/actions/callActions';

interface CallsTableClientProps {
  calls: any[];
  availableOutcomes?: string[];
}

export default function CallsTableClient({ calls, availableOutcomes = ["INTERESTED", "NOT_INTERESTED", "NO_ANSWER", "ORDER_PLACED", "COMPLAINT", "FOLLOW_UP_NEEDED"] }: CallsTableClientProps) {
  const [editingCall, setEditingCall] = useState<any | null>(null);
  const [viewingNotesCall, setViewingNotesCall] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editOutcome, setEditOutcome] = useState("");
  const [editCallType, setEditCallType] = useState("");
  const [editFollowUpDate, setEditFollowUpDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleOpenEdit = (call: any) => {
    setEditingCall(call);
    setEditOutcome(call.outcome || "INTERESTED");
    setEditCallType(call.callType || "OUTBOUND");
    setEditFollowUpDate(call.followUpDate ? new Date(call.followUpDate).toISOString().split('T')[0] : "");
    setEditNotes(call.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCall) return;
    setLoading(true);
    await updateCall(editingCall.id, {
      outcome: editOutcome,
      callType: editCallType,
      followUpDate: editFollowUpDate || null,
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
    const o = outcome.toUpperCase();
    if (o.includes("ORDER") || o.includes("INTERESTED")) return "active";
    if (o.includes("NOT") || o.includes("COMPLAINT")) return "inactive";
    return "";
  };

  return (
    <>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Outcome</th>
              <th>Follow-up Date</th>
              <th>Rep</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {calls.map(call => {
              const isOverdue = call.followUpDate && new Date(call.followUpDate) < new Date();
              const customerName = call.customer?.businessName || call.customer?.contactPerson || 'Unknown';
              return (
                <tr key={call.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(call.createdAt).toLocaleDateString('en-GB')}</td>
                  <td>
                    <strong>{call.customer?.businessName || 'Unknown'}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{call.customer?.contactPerson}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: call.callType === 'INBOUND' ? '#e0e7ff' : '#f1f5f9', color: call.callType === 'INBOUND' ? '#4338ca' : '#475569' }}>
                      {call.callType || 'OUTBOUND'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getOutcomeBadgeClass(call.outcome)}`}>
                      {call.outcome ? call.outcome.replace('_', ' ') : 'N/A'}
                    </span>
                  </td>
                  <td>
                    {call.followUpDate ? (
                      <span style={{ color: isOverdue ? '#dc2626' : '#16a34a', fontWeight: isOverdue ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} /> {new Date(call.followUpDate).toLocaleDateString('en-GB')}
                        {isOverdue && <span style={{ fontSize: '0.68rem', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>Overdue</span>}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Follow-up</span>
                    )}
                  </td>
                  <td>{call.employee?.user?.name || 'Unknown'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => setViewingNotesCall(call)}
                        style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#2563eb', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="View Notes & Details"
                      >
                        <Eye size={13} /> Notes
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleOpenEdit(call)}
                        style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Edit Follow-up & Call Record"
                      >
                        <Pencil size={13} /> Edit
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleDelete(call.id, customerName)}
                        disabled={deletingId === call.id}
                        style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: deletingId === call.id ? 0.5 : 1 }}
                        title="Delete Record"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {calls.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
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
          <div className="modal-content glass-panel animate-in" style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
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
                    <option value="OUTBOUND">Outbound Call</option>
                    <option value="INBOUND">Inbound Call</option>
                    <option value="MEETING">In-Person Meeting</option>
                    <option value="WHATSAPP">WhatsApp Message</option>
                  </select>
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Next Follow-up Date (Optional)
                </label>
                <input 
                  type="date" 
                  value={editFollowUpDate}
                  onChange={e => setEditFollowUpDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                />
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

      {/* VIEW NOTES MODAL */}
      {viewingNotesCall && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="modal-content glass-panel animate-in" style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', backgroundColor: '#1e293b', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Call Notes</h3>
              </div>
              <button onClick={() => setViewingNotesCall(null)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#64748b' }}>Customer:</strong>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  {viewingNotesCall.customer?.businessName || viewingNotesCall.customer?.contactPerson}
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '0.85rem', color: '#64748b' }}>Outcome & Type:</strong>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {viewingNotesCall.callType} — {viewingNotesCall.outcome}
                </div>
              </div>

              {viewingNotesCall.followUpDate && (
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#64748b' }}>Scheduled Follow-up:</strong>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
                    {new Date(viewingNotesCall.followUpDate).toLocaleDateString('en-GB')}
                  </div>
                </div>
              )}

              <div>
                <strong style={{ fontSize: '0.85rem', color: '#64748b' }}>Notes & Discussion:</strong>
                <div style={{ marginTop: '6px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                  {viewingNotesCall.notes || viewingNotesCall.summary || "No notes recorded for this call."}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setViewingNotesCall(null)}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#334155', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
