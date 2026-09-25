"use client";

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  FileText, 
  Send, 
  ExternalLink,
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { 
  getEmailSettings, 
  saveEmailSettings 
} from '@/app/actions/emailActions';
import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplate } from '@/lib/emailTemplates';

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    senderName: 'Espon Clothing',
    senderEmail: 'clothingespon@gmail.com',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587'
  });

  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(DEFAULT_EMAIL_TEMPLATES[0]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getEmailSettings();
      if (res.success && res.settings) {
        setFormData({
          senderName: res.settings.senderName || 'Espon Clothing',
          senderEmail: res.settings.senderEmail || 'clothingespon@gmail.com',
          smtpHost: res.settings.smtpHost || 'smtp.gmail.com',
          smtpPort: res.settings.smtpPort || '587'
        });
        if (res.templates) setTemplates(res.templates);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.set(k, v));

    const res = await saveEmailSettings(fd);
    setSaving(false);

    if (res.success) {
      setSuccessMsg("Email integration settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res.error || "Failed to save settings");
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 14px' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mail size={20} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Email Integration & Communication Hub
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
          Configure Gmail, Google Workspace, or custom SMTP accounts to send quotes, payment reminders, and auto-sync with 360° CRM timelines.
        </p>
      </div>

      {/* FEEDBACK BANNERS */}
      {successMsg && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: SENDER & SMTP CONFIG */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Globe size={18} style={{ color: '#0284c7' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Email Provider Credentials
            </h3>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Sender Display Name
              </label>
              <input
                type="text"
                required
                value={formData.senderName}
                onChange={e => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="e.g. Espon Clothing Sales"
                className="form-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Sender Email Address
              </label>
              <input
                type="email"
                required
                value={formData.senderEmail}
                onChange={e => setFormData({ ...formData, senderEmail: e.target.value })}
                placeholder="clothingespon@gmail.com"
                className="form-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  value={formData.smtpHost}
                  onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="form-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Port
                </label>
                <input
                  type="text"
                  value={formData.smtpPort}
                  onChange={e => setFormData({ ...formData, smtpPort: e.target.value })}
                  placeholder="587"
                  className="form-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              color: '#64748b',
              lineHeight: 1.5
            }}>
              🔒 <strong>Mobile WebView Compatible:</strong> In addition to server SMTP delivery, all email composer modals feature instant <code>mailto:</code> deep-linking to launch Gmail, Outlook, or native Android mail clients with 1 tap.
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{saving ? 'Saving...' : 'Save Email Settings'}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: PRE-BUILT EMAIL TEMPLATES */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={18} style={{ color: '#4f46e5' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Standard CRM Email Templates
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {templates.map(tpl => {
              const isSelected = previewTemplate?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setPreviewTemplate(tpl)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                    backgroundColor: isSelected ? '#eef2ff' : '#f8fafc',
                    color: isSelected ? '#4f46e5' : '#1e293b',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={15} />
                    <span>{tpl.name}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Preview</span>
                </button>
              );
            })}
          </div>

          {previewTemplate && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>SUBJECT:</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>{previewTemplate.subject}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>BODY TEMPLATE:</div>
                <div style={{ fontSize: '0.78rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: '200px', overflowY: 'auto' }}>
                  {previewTemplate.body}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
