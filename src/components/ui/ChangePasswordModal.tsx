"use client";

import React, { useState, useEffect } from "react";
import { 
  updateUserPassword, 
  getUserCurrentPassword,
  getUserActiveDevices,
  signOutAllUserDevices 
} from "@/app/actions/userActions";
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  User, 
  AlertCircle, 
  Copy, 
  Check, 
  ShieldAlert, 
  Loader2,
  Smartphone,
  Laptop,
  Tablet,
  LogOut,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from "lucide-react";

interface ChangePasswordModalProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onClose: () => void;
}

export default function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Active Devices State
  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [deviceCount, setDeviceCount] = useState<number>(0);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [signingOutNow, setSigningOutNow] = useState(false);

  // Password & Sign-out Option State
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [signOutAllDevices, setSignOutAllDevices] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadExisting() {
      setLoadingExisting(true);
      try {
        const res = await getUserCurrentPassword(user.id);
        if (isMounted) {
          setHasPassword(res?.hasPassword ?? true);
        }
      } catch (e) {
        console.warn("Failed to load password status:", e);
      } finally {
        if (isMounted) setLoadingExisting(false);
      }
    }

    async function loadDevices() {
      setLoadingDevices(true);
      try {
        const res = await getUserActiveDevices(user.id);
        if (isMounted && res.success) {
          setActiveDevices(res.devices || []);
          setDeviceCount(res.count || 0);
        }
      } catch (e) {
        console.warn("Failed to load active devices:", e);
      } finally {
        if (isMounted) setLoadingDevices(false);
      }
    }

    loadExisting();
    loadDevices();
    return () => { isMounted = false; };
  }, [user.id]);



  const handleGeneratePassword = () => {
    const randomChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    const generated = `Espon@${rand}`;
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSignOutAllNow = async () => {
    if (!confirm(`Are you sure you want to immediately sign out all devices currently logged in as "${user.name}"?`)) {
      return;
    }
    setSigningOutNow(true);
    setError("");
    setSuccess("");
    try {
      const res = await signOutAllUserDevices(user.id);
      if (res.success) {
        setSuccess(res.message || "All devices signed out successfully!");
        setDeviceCount(0);
        setActiveDevices([]);
      } else {
        setError(res.error || "Failed to sign out devices");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to sign out devices");
    } finally {
      setSigningOutNow(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.trim().length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const res = await updateUserPassword(user.id, password, signOutAllDevices);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setHasPassword(true);
      setSuccess(res.message || `Password for ${user.name} updated successfully!`);
      if (signOutAllDevices) {
        setDeviceCount(0);
        setActiveDevices([]);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--accent-light, #f0f4ff)',
            borderBottom: '1px solid var(--accent-light, #e0e7ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: '#ffffff', 
                color: 'var(--accent-primary, #4f46e5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid var(--accent-light, #c7d2fe)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <KeyRound size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary, #4f46e5)' }}>
                Change User Password
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#475569' }}>
                View existing credentials or set new login for <strong>{user.name}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.5rem', 
              color: 'var(--accent-primary, #4f46e5)', 
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <CheckCircle2 size={18} /> {success}
            </div>
          )}

          {/* User Account Info Banner */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={18} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target User Account</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{user.email}</div>
            </div>
          </div>

          {/* Active Devices & Sessions Section */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={16} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                  Logged-in Devices
                </span>
                {loadingDevices ? (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={11} className="animate-spin" /> Checking...
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: deviceCount > 0 ? '#ecfdf5' : '#f1f5f9',
                    color: deviceCount > 0 ? '#059669' : '#64748b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {deviceCount > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>}
                    {deviceCount} {deviceCount === 1 ? 'Device' : 'Devices'} Logged In
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {activeDevices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDeviceDetails(!showDeviceDetails)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    {showDeviceDetails ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> View List</>}
                  </button>
                )}

                {deviceCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSignOutAllNow}
                    disabled={signingOutNow}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #fca5a5',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Sign out of all devices immediately"
                  >
                    {signingOutNow ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
                    Sign Out All Now
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Device List */}
            {showDeviceDetails && activeDevices.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                {activeDevices.map((dev, idx) => (
                  <div
                    key={dev.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {dev.deviceType === 'Mobile' ? (
                        <Smartphone size={14} style={{ color: '#059669', flexShrink: 0 }} />
                      ) : dev.deviceType === 'Tablet' ? (
                        <Tablet size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />
                      ) : (
                        <Laptop size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                      )}
                      <div>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {dev.browser} on {dev.os}
                        </span>
                        {dev.ipAddress && (
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', marginLeft: '6px' }}>
                            ({dev.ipAddress})
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {new Date(dev.lastActiveAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(dev.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1. Security Status Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={15} style={{ color: 'var(--accent-primary, #4f46e5)' }} /> Credential Security Status
            </label>

            {loadingExisting ? (
              <div style={{ height: '42px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                <Loader2 size={15} className="animate-spin text-indigo-600" />
                <span>Checking credential status...</span>
              </div>
            ) : (
              <div style={{ 
                padding: '10px 14px', 
                backgroundColor: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={16} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                    {hasPassword ? "One-Way Bcrypt Hashed & Protected" : "No Password Configured"}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  SECURE
                </span>
              </div>
            )}
          </div>

          {/* 2. Set New Password Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                Set New Password
              </label>
              <button 
                type="button" 
                onClick={handleGeneratePassword}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-primary, #4f46e5)', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 4px'
                }}
              >
                <Sparkles size={13} /> Auto-Generate
              </button>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Type or auto-generate password"
                required
                style={{ 
                  width: '100%', 
                  height: '42px',
                  padding: '0 42px 0 14px', 
                  borderRadius: '10px', 
                  border: '1.5px solid #cbd5e1', 
                  fontSize: '0.92rem', 
                  outline: 'none', 
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontFamily: showPassword && password ? 'monospace' : 'inherit',
                  letterSpacing: showPassword && password ? '0.5px' : 'normal',
                  transition: 'border-color 0.2s ease'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? "Hide password text" : "Show password text"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
              💡 Admin can view the password while typing. Share this new password with the user.
            </p>
          </div>

          {/* 3. Sign Out Of All Devices Checkbox Option */}
          <div
            onClick={() => setSignOutAllDevices(!signOutAllDevices)}
            style={{
              padding: '12px 14px',
              backgroundColor: signOutAllDevices ? '#f0fdf4' : '#f8fafc',
              border: signOutAllDevices ? '1.5px solid #86efac' : '1px solid #cbd5e1',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={signOutAllDevices}
              onChange={e => setSignOutAllDevices(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                marginTop: '2px',
                cursor: 'pointer',
                accentColor: '#16a34a'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: signOutAllDevices ? '#15803d' : '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>Sign out of all devices after changing password</span>
                <span style={{ fontSize: '0.68rem', backgroundColor: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  Recommended
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                Forces all computers, phones, and mobile apps currently logged in with this ID to immediately log out and re-authenticate with the new password.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="primary-btn hover-lift"
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent-primary, #4f46e5)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={15} /> {loading ? "Updating Password..." : "Update Password"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
