"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  Loader2,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  Fingerprint,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
  Play,
  AlertCircle,
  Sparkles,
  Zap,
  Clock,
  Timer
} from 'lucide-react';
import { triggerHaptic } from '@/lib/capacitor';
import './profile.css';

const AUTO_LOCK_OPTIONS = [
  { value: '0', label: 'Immediately (when leaving app)', desc: 'Locks immediately when switching away (preserves in-app calls & voice)' },
  { value: '30', label: '30 Seconds', desc: 'Locks after 30 seconds in background' },
  { value: '60', label: '1 Minute', desc: 'Locks after 1 minute in background' },
  { value: '120', label: '2 Minutes (Recommended)', desc: 'Locks after 2 minutes in background' },
  { value: '300', label: '5 Minutes', desc: 'Locks after 5 minutes in background' },
  { value: '900', label: '15 Minutes', desc: 'Locks after 15 minutes in background' },
  { value: '1800', label: '30 Minutes', desc: 'Locks after 30 minutes in background' }
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // MPIN & Biometric Security State
  const [mpinEnabled, setMpinEnabled] = useState<boolean>(false);
  const [mpinInput, setMpinInput] = useState<string>('');
  const [mpinConfirmInput, setMpinConfirmInput] = useState<string>('');
  const [showMpin, setShowMpin] = useState<boolean>(false);
  const [showConfirmMpin, setShowConfirmMpin] = useState<boolean>(false);
  const [autoLockTimer, setAutoLockTimer] = useState<string>('120');
  const [mpinMsg, setMpinMsg] = useState<string>('');
  const [mpinMsgType, setMpinMsgType] = useState<'success' | 'error' | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Fetch full profile including avatar from API on mount
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        password: '',
      });

      // Load avatar from session or API
      if ((session.user as any).avatarUrl || session.user.image) {
        setAvatarUrl((session.user as any).avatarUrl || session.user.image);
      }

      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setFormData(prev => ({
              ...prev,
              name: data.user.name || prev.name,
              email: data.user.email || prev.email,
            }));
            if (data.user.avatarUrl || data.user.image) {
              setAvatarUrl(data.user.avatarUrl || data.user.image);
            }
          }
        })
        .catch(console.error);
    }

    if (typeof window !== 'undefined') {
      const enabled = localStorage.getItem('app_mpin_enabled') === 'true';
      const savedPin = localStorage.getItem('app_mpin_code') || '';
      const savedTimer = localStorage.getItem('app_mpin_autolock_timer') || '120';
      setMpinEnabled(enabled);
      setMpinInput(savedPin);
      setMpinConfirmInput(savedPin);
      setAutoLockTimer(savedTimer);
    }
  }, [session]);

  const handleToggleMpin = (checked: boolean) => {
    setMpinEnabled(checked);
    setMpinMsg('');
    triggerHaptic('light');

    if (!checked) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_mpin_enabled', 'false');
        localStorage.setItem('app_mpin_autolock_timer', autoLockTimer);
        window.dispatchEvent(new CustomEvent('app-lock-config-updated'));
        setMpinMsgType('success');
        setMpinMsg('App Lock disabled.');
      }
    } else {
      setMpinMsgType('');
      setMpinMsg('');
    }
  };

  const handleSaveMpin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMpinMsg('');
    
    if (mpinEnabled) {
      if (!mpinInput || mpinInput.length !== 4 || isNaN(Number(mpinInput))) {
        setMpinMsgType('error');
        setMpinMsg('Please enter a valid 4-digit numeric MPIN.');
        triggerHaptic('error');
        return;
      }
      
      if (mpinConfirmInput && mpinConfirmInput !== mpinInput) {
        setMpinMsgType('error');
        setMpinMsg('Confirm MPIN does not match your entered MPIN.');
        triggerHaptic('error');
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('app_mpin_enabled', 'true');
        localStorage.setItem('app_mpin_code', mpinInput);
        localStorage.setItem('app_mpin_autolock_timer', autoLockTimer);
        window.dispatchEvent(new CustomEvent('app-lock-config-updated'));
        setMpinMsgType('success');
        const timerLabel = AUTO_LOCK_OPTIONS.find(o => o.value === autoLockTimer)?.label || `${autoLockTimer}s`;
        setMpinMsg(`4-Digit MPIN & Biometrics saved! Auto-Lock set to ${timerLabel}.`);
        triggerHaptic('success');
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_mpin_enabled', 'false');
        localStorage.setItem('app_mpin_autolock_timer', autoLockTimer);
        window.dispatchEvent(new CustomEvent('app-lock-config-updated'));
        setMpinMsgType('success');
        setMpinMsg('App Lock disabled.');
        triggerHaptic('medium');
      }
    }
  };

  const handleTestLock = () => {
    if (!mpinEnabled || !mpinInput || mpinInput.length !== 4) {
      setMpinMsgType('error');
      setMpinMsg('Please enable App Lock and save a valid 4-digit MPIN first.');
      triggerHaptic('error');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('app_mpin_enabled', 'true');
      localStorage.setItem('app_mpin_code', mpinInput);
      triggerHaptic('light');
      window.dispatchEvent(new CustomEvent('test-app-lock'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Image Upload Handler (Compressed Base64 Data URL)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;

        // Resize image to max 500x500 to keep it optimized
        const img = new Image();
        img.src = base64Data;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(optimizedBase64);

          // Save to API
          const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              avatarUrl: optimizedBase64
            }),
          });

          const resData = await res.json();
          setIsUploadingPhoto(false);

          if (!res.ok) {
            throw new Error(resData.error || 'Failed to upload profile picture');
          }

          setSuccessMsg('Profile picture updated successfully!');
          await update({ avatarUrl: optimizedBase64 });
        };
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingPhoto(false);
      setErrorMsg(err.message || 'Failed to process image');
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          avatarUrl: null
        }),
      });

      if (!res.ok) throw new Error('Failed to remove picture');

      setAvatarUrl(null);
      setSuccessMsg('Profile picture removed.');
      await update({ avatarUrl: null });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          avatarUrl: avatarUrl
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccessMsg('Profile details saved successfully!');
      setFormData(prev => ({ ...prev, password: '' }));

      await update({
        name: formData.name,
        email: formData.email,
        avatarUrl: avatarUrl
      });

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return <div className="page-container flex-center" style={{ padding: '60px', textAlign: 'center' }}><Loader2 className="spinner" /></div>;
  }

  const userRole = (session?.user as any)?.role || 'SUPER_ADMIN';

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal identity, login credentials, and account avatar.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column: Profile Form */}
        <div className="glass-panel profile-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <form onSubmit={handleSubmit} className="profile-form">
            <h3 className="section-title">Personal Information</h3>
            
            {successMsg && (
              <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && <div className="alert-error">{errorMsg}</div>}

            <div className="form-group">
              <label htmlFor="profile-name">Full Name *</label>
              <div className="input-with-icon">
                <User size={19} className="input-icon" />
                <input 
                  id="profile-name"
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="Enter your full name"
                  required 
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">Email Address *</label>
              <div className="input-with-icon">
                <Mail size={19} className="input-icon" />
                <input 
                  id="profile-email"
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="name@company.com"
                  required 
                  className="form-input"
                />
              </div>
            </div>

            <h3 className="section-title mt-6">Security & Password</h3>
            <p className="field-hint">Leave blank to keep your existing password unchanged.</p>
            
            <div className="form-group">
              <label htmlFor="profile-password">New Password</label>
              <div className="input-with-icon">
                <Lock size={19} className="input-icon" />
                <input 
                  id="profile-password"
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="Enter at least 6 characters"
                  className="form-input"
                  minLength={6}
                />
              </div>
            </div>

            {/* Redesigned Modern Mobile App Security & MPIN Module */}
            <div className={`security-section-card ${mpinEnabled ? 'active-card' : ''}`}>
              <div className="security-header-row">
                <div className="security-header-left">
                  <div className="security-icon-badge">
                    <Fingerprint size={24} />
                  </div>
                  <div className="security-header-info">
                    <h4 className="security-title">
                      Mobile App Security & MPIN
                    </h4>
                    <p className="security-subtitle">
                      Instant biometric authentication & 4-digit PIN lock when opening or resuming the app.
                    </p>
                  </div>
                </div>

                <div className="switch-control-group">
                  <span className={`security-status-badge ${mpinEnabled ? 'active' : 'inactive'}`}>
                    {mpinEnabled ? '● Active' : 'Disabled'}
                  </span>
                  <label className="switch-toggle" title={mpinEnabled ? 'Disable App Lock' : 'Enable App Lock'}>
                    <input
                      type="checkbox"
                      checked={mpinEnabled}
                      onChange={(e) => handleToggleMpin(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>

              {/* Informative Capability Badges */}
              <div className="security-features-bar">
                <span className={`security-feature-tag ${mpinEnabled ? 'highlight' : ''}`}>
                  <ShieldCheck size={14} /> Biometrics & MPIN
                </span>
                <span className="security-feature-tag">
                  <Smartphone size={14} /> Android & iOS Ready
                </span>
                <span className={`security-feature-tag ${autoLockTimer === '0' ? 'highlight' : ''}`}>
                  <Clock size={14} /> Auto-Lock: {autoLockTimer === '0' ? 'Instant' : AUTO_LOCK_OPTIONS.find(o => o.value === autoLockTimer)?.label || `${autoLockTimer}s`}
                </span>
              </div>

              {/* Status & Feedback Banner */}
              {mpinMsg && (
                <div className={`security-msg-banner ${mpinMsgType === 'error' ? 'error' : 'success'}`}>
                  {mpinMsgType === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{mpinMsg}</span>
                </div>
              )}

              {/* Active MPIN Configuration Panel */}
              {mpinEnabled && (
                <div className="mpin-config-panel">
                  <div className="mpin-inputs-grid">
                    {/* 4-Digit MPIN Field */}
                    <div className="mpin-field-wrapper">
                      <label htmlFor="mpin-input">
                        <span>4-Digit MPIN Code *</span>
                      </label>
                      <div className="mpin-input-container">
                        <KeyRound size={18} className="mpin-icon" />
                        <input
                          id="mpin-input"
                          type={showMpin ? 'text' : 'password'}
                          maxLength={4}
                          value={mpinInput}
                          onChange={(e) => setMpinInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="mpin-styled-input"
                          inputMode="numeric"
                        />
                        <button
                          type="button"
                          className="mpin-eye-btn"
                          onClick={() => setShowMpin(!showMpin)}
                          title={showMpin ? 'Hide MPIN' : 'Show MPIN'}
                        >
                          {showMpin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm 4-Digit MPIN Field */}
                    <div className="mpin-field-wrapper">
                      <label htmlFor="mpin-confirm-input">
                        <span>Confirm 4-Digit MPIN *</span>
                      </label>
                      <div className="mpin-input-container">
                        <ShieldCheck size={18} className="mpin-icon" />
                        <input
                          id="mpin-confirm-input"
                          type={showConfirmMpin ? 'text' : 'password'}
                          maxLength={4}
                          value={mpinConfirmInput}
                          onChange={(e) => setMpinConfirmInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="mpin-styled-input"
                          inputMode="numeric"
                        />
                        <button
                          type="button"
                          className="mpin-eye-btn"
                          onClick={() => setShowConfirmMpin(!showConfirmMpin)}
                          title={showConfirmMpin ? 'Hide PIN' : 'Show PIN'}
                        >
                          {showConfirmMpin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Lock Timer Setting Section */}
                  <div className="autolock-field-wrapper">
                    <label htmlFor="autolock-select">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} style={{ color: '#4f46e5' }} />
                        <span>Auto-Lock Timer (Biometrics & MPIN)</span>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        {autoLockTimer === '0' ? '⚡ Instant Lock on Background' : `⏱️ Locks after ${AUTO_LOCK_OPTIONS.find(o => o.value === autoLockTimer)?.label}`}
                      </span>
                    </label>

                    <div className="autolock-select-container">
                      <select
                        id="autolock-select"
                        value={autoLockTimer}
                        onChange={(e) => {
                          setAutoLockTimer(e.target.value);
                          triggerHaptic('light');
                        }}
                        className="autolock-styled-select"
                      >
                        {AUTO_LOCK_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.value === '0' ? '⚡' : '⏱️'} {opt.label} — {opt.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Selection Pills */}
                    <div className="autolock-quick-pills">
                      {AUTO_LOCK_OPTIONS.map((opt) => {
                        const isSelected = autoLockTimer === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={`autolock-pill-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setAutoLockTimer(opt.value);
                              triggerHaptic('light');
                            }}
                          >
                            {opt.value === '0' ? '⚡ Instant' : opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Security Action Toolbar */}
              <div className="security-actions-bar">
                <button
                  type="button"
                  className="btn-save-security"
                  onClick={() => handleSaveMpin()}
                >
                  <ShieldCheck size={16} />
                  <span>Save App Lock Settings</span>
                </button>

                {mpinEnabled && (
                  <button
                    type="button"
                    className="btn-test-lock"
                    onClick={handleTestLock}
                    title="Test Lock Screen & Biometrics preview"
                  >
                    <Play size={14} fill="#15803d" />
                    <span>Test Lock Screen Now</span>
                  </button>
                )}
              </div>
            </div>

            <div className="form-actions mt-6">
              <button type="submit" className="primary-btn submit-btn" disabled={isLoading} style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                {isLoading ? <Loader2 size={18} className="spinner" /> : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Avatar & Account Summary */}
        <div className="glass-panel profile-summary" style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          {/* Avatar Container with Upload Overlay */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div 
              className="summary-avatar"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                overflow: 'hidden',
                cursor: 'pointer',
                border: '3px solid #e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                position: 'relative'
              }}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={formData.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', color: '#ffffff' }}>
                  <User size={52} />
                </div>
              )}

              {/* Hover / Camera Overlay */}
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0'}
              >
                <Camera size={26} />
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={handleImageFileChange}
              style={{ display: 'none' }} 
            />
          </div>

          {/* Photo Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid #bfdbfe',
                cursor: 'pointer'
              }}
            >
              <Upload size={14} />
              {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isUploadingPhoto}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#fff1f2',
                  color: '#e11d48',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid #fecdd3',
                  cursor: 'pointer'
                }}
                title="Remove photo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <h2 className="summary-name" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            {formData.name || session.user?.name}
          </h2>
          
          <div style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', textTransform: 'uppercase', marginBottom: '16px' }}>
            {userRole}
          </div>

          <div className="summary-details" style={{ width: '100%', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div className="detail-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#059669', fontWeight: 600, justifyContent: 'center' }}>
              <ShieldCheck size={18} />
              <span>Account Active & Secure</span>
            </div>
            <div className="detail-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#64748b', justifyContent: 'center', marginTop: '8px' }}>
              <Mail size={16} />
              <span>{formData.email || session.user?.email}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
