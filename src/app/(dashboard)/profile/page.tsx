"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import './profile.css';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Pre-fill form when session loads
  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        password: '', // Never pre-fill password
      });
    }
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccessMsg('Profile updated successfully!');
      
      // Clear password field after successful update
      setFormData(prev => ({ ...prev, password: '' }));

      // Force NextAuth session to update its local cache
      await update({
        name: formData.name,
        email: formData.email
      });

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return <div className="page-container flex-center"><Loader2 className="spinner" /></div>;
  }

  const userRole = (session?.user as any)?.role || 'SALES';

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information and security settings.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left Column: Form */}
        <div className="glass-panel profile-card">
          <form onSubmit={handleSubmit} className="profile-form">
            <h3 className="section-title">Personal Information</h3>
            
            {successMsg && <div className="alert-success">{successMsg}</div>}
            {errorMsg && <div className="alert-error">{errorMsg}</div>}

            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  className="form-input"
                />
              </div>
            </div>

            <h3 className="section-title mt-6">Security</h3>
            <p className="field-hint">Leave blank to keep your current password.</p>
            
            <div className="form-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="••••••••"
                  className="form-input"
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-actions mt-6">
              <button type="submit" className="primary-btn submit-btn" disabled={isLoading}>
                {isLoading ? <Loader2 size={18} className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Account Status */}
        <div className="glass-panel profile-summary">
          <div className="summary-avatar">
            <User size={48} />
          </div>
          <h2 className="summary-name">{session.user?.name}</h2>
          <div className={`role-badge role-${userRole.toLowerCase()}`}>{userRole}</div>

          <div className="summary-details mt-6">
            <div className="detail-row">
              <ShieldCheck size={18} className="text-success" />
              <span>Account Active & Secure</span>
            </div>
            <div className="detail-row mt-2 text-muted">
              <Mail size={18} />
              <span>{session.user?.email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
