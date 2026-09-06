"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { User, Mail, Lock, ShieldCheck, Loader2, Camera, Upload, Trash2, CheckCircle2, Fingerprint, Smartphone, KeyRound } from 'lucide-react';
import './profile.css';

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
  const [mpinMsg, setMpinMsg] = useState<string>('');

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
      setMpinEnabled(enabled);
      setMpinInput(savedPin);
    }
  }, [session]);

  const handleSaveMpin = (e: React.FormEvent) => {
    e.preventDefault();
    setMpinMsg('');
    if (mpinEnabled && (!mpinInput || mpinInput.length !== 4 || isNaN(Number(mpinInput)))) {
      setMpinMsg('⚠️ Please enter a valid 4-digit numeric MPIN.');
      return;
    }

    if (typeof window !== 'undefined') {
      if (mpinEnabled) {
        localStorage.setItem('app_mpin_enabled', 'true');
        localStorage.setItem('app_mpin_code', mpinInput);
        setMpinMsg('✅ 4-Digit MPIN & Biometric Lock Enabled!');
      } else {
        localStorage.setItem('app_mpin_enabled', 'false');
        setMpinMsg('🔒 MPIN App Lock Disabled.');
      }
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

            {/* Mobile App 4-Digit MPIN & Biometric Lock Settings Block */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Fingerprint size={20} color="#4f46e5" /> Mobile App Security & MPIN
                </h3>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: mpinEnabled ? '#10b981' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={mpinEnabled}
                    onChange={(e) => setMpinEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                  />
                  <span>{mpinEnabled ? 'Lock Active 🟢' : 'Lock Disabled'}</span>
                </label>
              </div>

              <p className="field-hint" style={{ marginBottom: '12px' }}>
                Enable a 4-Digit MPIN or Fingerprint / Face ID lock whenever opening or resuming the mobile app.
              </p>

              {mpinMsg && (
                <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: mpinMsg.includes('✅') ? '#ecfdf5' : '#fef2f2', color: mpinMsg.includes('✅') ? '#047857' : '#b91c1c', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
                  {mpinMsg}
                </div>
              )}

              {mpinEnabled && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label htmlFor="mpin-input">4-Digit Security MPIN *</label>
                  <div className="input-with-icon">
                    <KeyRound size={19} className="input-icon" />
                    <input
                      id="mpin-input"
                      type="password"
                      maxLength={4}
                      value={mpinInput}
                      onChange={(e) => setMpinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 1234"
                      className="form-input"
                      style={{ letterSpacing: '4px', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveMpin}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={16} />
                <span>Save App Lock Settings</span>
              </button>
            </div>

            <div className="form-actions mt-6">
              <button type="submit" className="primary-btn submit-btn" disabled={isLoading} style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                {isLoading ? <Loader2 size={18} className="spinner" /> : 'Save Changes'}
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
