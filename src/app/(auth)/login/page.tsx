"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2
} from "lucide-react";
import "./login.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const callbackUrl = searchParams.get("callbackUrl") || "/";

      const result = await signIn("credentials", {
        redirect: false,
        email: cleanEmail,
        password,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid email address or password. Please check your credentials.");
        setLoading(false);
      } else if (result?.ok) {
        // Always redirect to relative clean path using current window origin
        const dest = (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) ? callbackUrl : "/";
        window.location.href = dest;
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Sign-in exception:", err);
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-card-inner">
      {/* Brand Header */}
      <div className="login-header">
        <BrandLogo size="lg" showSubtitle={true} />
        <p className="login-tagline">
          Sign in to your organization workspace
        </p>
      </div>

      {/* Registration Success Banner */}
      {isRegistered && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          color: '#065f46',
          fontSize: '0.84rem',
          lineHeight: 1.4,
          animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Workspace created successfully!</strong>
            <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '2px' }}>
              Your enterprise workspace is active. Sign in below using your admin email and password.
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="login-error" style={{ animation: 'shake 0.3s ease' }}>
          {error}
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Work Email Address</label>
          <div className="input-icon-wrapper">
            <Mail size={16} className="input-icon" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@yourcompany.com"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="password">Password</label>
          </div>
          <div className="input-icon-wrapper">
            <Lock size={16} className="input-icon" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="login-btn hover-lift" disabled={loading}>
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" /> Signing In...
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Sign In to Workspace <ArrowRight size={16} />
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <Suspense fallback={<div style={{ padding: '30px', textAlign: 'center' }}>Loading Login...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
