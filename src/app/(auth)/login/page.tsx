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
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Layers,
  Zap
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
              Your 14-day free trial is active. Sign in below using your admin email and password.
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

      {/* Modern Separator */}
      <div className="login-divider">
        <span>NEW TO THE PLATFORM?</span>
      </div>

      {/* Primary Sign Up / Free Trial CTA Card */}
      <div className="signup-cta-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="free-trial-badge">
              <Sparkles size={12} /> 14-Day Free Trial
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>No card required</span>
        </div>

        <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Register Your Business
        </h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
          Set up a dedicated multi-tenant workspace with full ERP, CRM, Invoicing, and live GST tools.
        </p>

        <Link 
          href="/register" 
          className="signup-btn hover-lift"
          onClick={(e) => {
            e.preventDefault();
            router.push("/register");
          }}
          style={{ cursor: 'pointer' }}
        >
          <span>Create Free Account</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Pricing & Overview links */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
        <Link 
          href="/pricing" 
          onClick={(e) => {
            e.preventDefault();
            router.push("/pricing");
          }}
          style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
        >
          View all plans & pricing options <ArrowRight size={12} />
        </Link>
        <Link 
          href="/landing" 
          style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
        >
          ← Back to Product Overview
        </Link>
      </div>

      {/* Trust Badges */}
      <div className="login-footer-badges">
        <div className="trust-badge">
          <ShieldCheck size={14} color="#10b981" />
          <span>GST Compliant</span>
        </div>
        <div className="trust-badge">
          <Zap size={14} color="#6366f1" />
          <span>Instant Setup</span>
        </div>
        <div className="trust-badge">
          <Layers size={14} color="#0284c7" />
          <span>Cloud ERP</span>
        </div>
      </div>
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
