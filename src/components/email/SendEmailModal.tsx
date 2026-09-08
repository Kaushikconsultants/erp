"use client";

import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink 
} from 'lucide-react';
import { 
  sendCustomerEmail, 
  DEFAULT_EMAIL_TEMPLATES, 
  EmailTemplate 
} from '@/app/actions/emailActions';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string;
  leadId?: string;
  defaultRecipientEmail?: string;
  contactPerson?: string;
  companyName?: string;
  outstandingBalance?: number | string;
  onEmailSent?: () => void;
}

export default function SendEmailModal({
  isOpen,
  onClose,
  customerId,
  leadId,
  defaultRecipientEmail = '',
  contactPerson = 'Valued Partner',
  companyName = 'Company',
  outstandingBalance = '0',
  onEmailSent
}: SendEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = DEFAULT_EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    // Interpolate variables
    const interpolatedSubject = tpl.subject
      .replace(/{{contactPerson}}/g, contactPerson)
      .replace(/{{companyName}}/g, companyName)
      .replace(/{{quoteNumber}}/g, 'QT-1001')
      .replace(/{{orderNumber}}/g, 'ORD-2024')
      .replace(/{{outstandingBalance}}/g, String(outstandingBalance));

    const interpolatedBody = tpl.body
      .replace(/{{contactPerson}}/g, contactPerson)
      .replace(/{{companyName}}/g, companyName)
      .replace(/{{agentName}}/g, 'Espon Sales Team')
      .replace(/{{quoteNumber}}/g, 'QT-1001')
      .replace(/{{orderNumber}}/g, 'ORD-2024')
      .replace(/{{outstandingBalance}}/g, String(outstandingBalance));

    setSubject(interpolatedSubject);
    setBody(interpolatedBody);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !subject.trim() || !body.trim()) {
      setErrorMsg("Please fill in recipient email, subject, and message body.");
      return;
    }

    setSending(true);
    setErrorMsg(null);

    const res = await sendCustomerEmail({
      customerId,
      leadId,
      recipientEmail,
      subject,
      body,
      templateId: selectedTemplateId || undefined
    });

    setSending(false);

    if (res.success) {
      setSuccessMsg(`Email successfully logged and delivered to ${recipientEmail}`);
      if (onEmailSent) onEmailSent();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setErrorMsg(res.error || "Failed to send email");
    }
  };

  const handleNativeMailto = () => {
    const encSubject = encodeURIComponent(subject);
    const encBody = encodeURIComponent(body);
    window.open(`mailto:${recipientEmail}?subject=${encSubject}&body=${encBody}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100050,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #fafafa, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Email Composer & Timeline Sync
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Sending to {companyName} ({contactPerson})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* FEEDBACK BANNERS */}
        {errorMsg && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODAL FORM */}
        <form onSubmit={handleSend} style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Template Selector Bar */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
              <Sparkles size={15} style={{ color: '#4f46e5' }} />
              <span>Load Template:</span>
            </div>
            <select
              value={selectedTemplateId}
              onChange={e => handleTemplateChange(e.target.value)}
              style={{
                fontSize: '0.8rem',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: 500,
                outline: 'none'
              }}
            >
              <option value="">-- Choose Pre-Built Template --</option>
              {DEFAULT_EMAIL_TEMPLATES.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Recipient Email Address *
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
              className="form-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Subject Line *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject of your message..."
              className="form-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Message Body *
            </label>
            <textarea
              required
              rows={8}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your email message here..."
              className="form-input"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
            marginTop: '8px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={handleNativeMailto}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Open prepared message in Gmail or Outlook app"
            >
              <ExternalLink size={14} /> Open in Email App
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending || !recipientEmail || !subject.trim() || !body.trim()}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: (sending || !recipientEmail || !subject.trim() || !body.trim()) ? 0.7 : 1
                }}
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Logging Email...
                  </>
                ) : (
                  <>
                    <Send size={15} /> Send & Log to Timeline
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
