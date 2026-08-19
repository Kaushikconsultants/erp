"use client";

import React, { useState } from "react";
import { updateUserPassword } from "@/app/actions/userActions";
import { KeyRound, Eye, EyeOff, Sparkles, CheckCircle2, Lock } from "lucide-react";
import "./modal.css";

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
    if (!password || password.length < 4) {
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
      setSuccess(`Password for ${user.name} has been updated successfully!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="modal-backdrop" style={{ overflowY: 'auto', padding: '20px 10px', zIndex: 10000 }}>
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '460px', width: '100%' }}>
        
        <div className="modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Change User Password</h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Set or reset login password for <strong>{user.name}</strong>
              </p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <CheckCircle2 size={18} /> {success}
            </div>
          )}

          <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
            User Account: <strong>{user.email}</strong>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem', margin: 0 }}>
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
                  gap: '4px'
                }}
              >
                <Sparkles size={13} /> Auto-Generate
              </button>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter new password (min 4 chars)"
                required
                style={{ 
                  width: '100%', 
                  padding: '10px 40px 10px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.9rem', 
                  outline: 'none', 
                  backgroundColor: '#ffffff',
                  fontFamily: showPassword ? 'monospace' : 'inherit',
                  letterSpacing: showPassword ? '0.5px' : 'normal'
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
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Admin can view the password while typing. Share this new password with the user.
            </p>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: '#d97706', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={15} /> {loading ? "Updating..." : "Update Password"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
