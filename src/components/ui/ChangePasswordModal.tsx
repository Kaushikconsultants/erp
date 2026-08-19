"use client";

import React, { useState } from "react";
import { updateUserPassword } from "@/app/actions/userActions";
import { KeyRound, Eye, EyeOff, Sparkles, CheckCircle2, Lock, User, AlertCircle } from "lucide-react";

interface ChangePasswordModalProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  onClose: () => void;
}

export default function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.trim().length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const res = await updateUserPassword(user.id, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(`Password for ${user.name} updated successfully!`);
      setTimeout(() => {
        onClose();
      }, 1400);
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
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '18px 20px',
            backgroundColor: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: '#fef3c7', 
                color: '#d97706', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid #fde68a'
              }}
            >
              <KeyRound size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
                Change User Password
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                Set new login credentials for <strong>{user.name}</strong>
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
              color: '#b45309', 
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
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
            <User size={18} style={{ color: '#64748b' }} />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target User Account</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{user.email}</div>
            </div>
          </div>

          {/* Password Input Block */}
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
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
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
