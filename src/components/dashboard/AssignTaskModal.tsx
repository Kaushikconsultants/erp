"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState } from 'react';
import { ClipboardList, X, Check, Calendar, AlertCircle, Plus, User } from 'lucide-react';
import { createOrAssignTask } from '@/app/actions/taskActions';

interface AssignTaskModalProps {
  salesperson: {
    employeeId: string;
    name: string;
  };
  customers?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AssignTaskModal({
  salesperson,
  customers = [],
  onClose,
  onSuccess
}: AssignTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('High');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a task title' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await createOrAssignTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate,
      assigneeId: salesperson.employeeId,
      customerId: customerId || undefined
    });

    setIsSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Task successfully assigned to ${salesperson.name}!` });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to assign task' });
    }
  };

  const setTaskPreset = (presetTitle: string, presetDesc: string, presetPriority: string) => {
    setTitle(presetTitle);
    setDescription(presetDesc);
    setPriority(presetPriority);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <ClipboardList size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Assign Task to Salesperson
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              Delegate targeted actions directly into <strong style={{ color: '#0f172a' }}>{salesperson.name}</strong>'s daily dashboard.
            </p>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={15} />
          </button>
        </div>

        {statusMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
            border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Quick Task Presets */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
            ⚡ QUICK CLOSING TEMPLATES
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTaskPreset(
                "Urgent Follow-up on Pending Quotation",
                "Contact client to review quotation details and offer 3% prompt clearance rebate.",
                "Urgent"
              )}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 500,
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              🔥 Close Pending Quote
            </button>
            <button
              type="button"
              onClick={() => setTaskPreset(
                "Re-engage Dormant Wholesale Accounts",
                "Call 5 inactive customers with the newly arrived catalog and check restocking requirements.",
                "High"
              )}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 500,
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              📦 Wholesale Outreach
            </button>
            <button
              type="button"
              onClick={() => setTaskPreset(
                "Payment Clearance & Invoicing",
                "Coordinate with client regarding advance confirmation to expedite dispatch.",
                "Medium"
              )}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 500,
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              💳 Payment Clearance
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Task Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Task Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Follow up on ₹35,000 order estimate..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                color: '#0f172a',
                outline: 'none'
              }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Instructions / Guidance (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide specific notes, quotation numbers, or negotiation tactics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#0f172a',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Customer & Priority Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            {/* Customer Link */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Link Customer Account
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8125rem',
                  color: '#334155',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">-- Optional Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: priority === 'Urgent' ? '#dc2626' : priority === 'High' ? '#d97706' : '#2563eb',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="Urgent">🚨 Urgent</option>
                <option value="High">⚡ High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Due Date
            </label>
            <DatePicker
              
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#334155',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <Plus size={15} />
              <span>{isSubmitting ? 'Assigning...' : 'Assign Task'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
