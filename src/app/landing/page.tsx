"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Building2,
  TrendingUp,
  Receipt,
  Truck,
  Users,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  Check,
  ChevronDown,
  Layers,
  FileText,
  Clock,
  Briefcase,
  Store,
  Factory,
  MessageSquare,
  Lock,
  Globe
} from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import HeroCanvas3D from "@/components/landing/HeroCanvas3D";
import VoiceAiDemoWidget from "@/components/landing/VoiceAiDemoWidget";
import "./landing.css";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 3D Perspective Tilt on Mouse Movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 6;
    const rotateY = (x / (rect.width / 2)) * 6;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s ease-out",
    });
  };

  const testimonials = [
    {
      quote:
        "The voice AI engine and automated order processing saved our field sales team hours every single day. Multi-company switching lets us manage all sister firms effortlessly.",
      author: "Rahul Gupta",
      role: "Managing Director",
      company: "R3 EXPORTS",
      stats: "Multi-Location Enterprise",
      avatarBg: "#4f46e5",
    },
    {
      quote:
        "The dynamic UPI QR on invoices reduced our payment collection cycle from 45 days to 14 days. Customers scan and pay directly via PhonePe with zero gateway fees.",
      author: "Amitabh Sharma",
      role: "Operations Head",
      company: "Apex Distribution",
      stats: "3,200+ Retail Outlets",
      avatarBg: "#059669",
    },
    {
      quote:
        "The PDC Cheque Vault and Shipmozo courier tracking in one dashboard eliminated our dispatch chaos. We never miss a cheque deposit date now.",
      author: "Vikas Singhania",
      role: "Founder & CEO",
      company: "Singhania Electronics",
      stats: "15 Field Reps",
      avatarBg: "#7c3aed",
    },
  ];

  const faqs = [
    {
      q: "Can I manage multiple companies and sister entities in one account?",
      a: "Yes! You can create, list, and switch between multiple companies and sister organizations directly from the top navigation bar with 1 click, with complete ledger and GST isolation.",
    },
    {
      q: "Can I migrate my existing data from Tally, Busy, or Excel?",
      a: "Yes! R3 EXPORTS features an automated Universal Data Import Wizard that seamlessly ingests your customers, vendors, product master, and opening balances directly from Excel or CSV files in seconds.",
    },
    {
      q: "How does the Voice-to-Order AI work?",
      a: "Our built-in AI Voice Engine converts spoken natural language into structured orders. Simply speak customer names, product quantities, and rates. The AI matches items to your product catalog and drafts the order instantly.",
    },
    {
      q: "Are GST and e-Way bill compliance automated?",
      a: "Yes. Invoices instantly generate compliant GST breakdowns (CGST, SGST, IGST) with HSN codes and dynamic UPI QR codes. You can also generate delivery challans, credit/debit notes, and track live courier shipments via Shipmozo.",
    },
    {
      q: "Can my team use this on mobile devices?",
      a: "Absolutely. The platform is 100% mobile-responsive and PWA/Capacitor-ready. Sales representatives and warehouse staff can take orders, verify stock, and record payments directly from any Android or iOS device.",
    },
    {
      q: "Is our business data secure and backed up?",
      a: "Yes. Every workspace operates with cryptographic session isolation, bcrypt password hashing, granular role-based permissions (RBAC), and 1-click full JSON/Excel backups.",
    },
  ];

  const modulesList = [
    {
      title: "TeleCRM & Sales Pipeline",
      desc: "Leads, call logs, call reminders, follow-up scheduling, and Kanban sales pipelines.",
      icon: <Users size={22} color="#8b5cf6" />,
      color: "#f5f3ff",
    },
    {
      title: "Quotations & B2B Invoicing",
      desc: "Quotations, Proforma Invoices, Tax Invoices, Delivery Challans, Credit & Debit Notes.",
      icon: <Receipt size={22} color="#2563eb" />,
      color: "#eff6ff",
    },
    {
      title: "Purchases & Multi-Warehouse",
      desc: "Vendor management, Purchase Orders, Goods Receipt (GRN), Bills, and Stock Transfers.",
      icon: <Truck size={22} color="#059669" />,
      color: "#ecfdf5",
    },
    {
      title: "Double-Entry Accounting",
      desc: "Chart of Accounts, Journal Entries, P&L, Balance Sheet, Ageing (0-90D), BRS & PDC Vault.",
      icon: <Building2 size={22} color="#d97706" />,
      color: "#fffbeb",
    },
    {
      title: "Production & Manufacturing",
      desc: "Bill of Materials (BOM), Work Orders, production runs, and workshop progress tracking.",
      icon: <Factory size={22} color="#7c3aed" />,
      color: "#f5f3ff",
    },
    {
      title: "HRMS, Attendance & Payroll",
      desc: "Biometric attendance, staff leaves, salary slips, hiring portal, and expense approvals.",
      icon: <Briefcase size={22} color="#db2777" />,
      color: "#fdf2f8",
    },
    {
      title: "Live GST Portal & E-Way Bills",
      desc: "Direct GSTN Portal filing (GSTR-1, 3B, 2B ITC) and automated 1-click E-Way Bill generation.",
      icon: <ShieldCheck size={22} color="#0284c7" />,
      color: "#e0f2fe",
    },
    {
      title: "WhatsApp AI & Automation",
      desc: "Automated invoice PDFs, payment reminders, order status, and customer campaigns.",
      icon: <MessageSquare size={22} color="#10b981" />,
      color: "#ecfdf5",
    },
    {
      title: "AI ERP Copilot & OCR Scanner",
      desc: "Intelligent voice assistant, OCR invoice scanner, and predictive deadstock advisor.",
      icon: <Sparkles size={22} color="#6366f1" />,
      color: "#eef2ff",
    },
  ];

  return (
    <div className="landing-body-wrapper">
      {/* Background Lighting & Interactive 3D Canvas */}
      <div className="landing-ambient-light" />
      <div className="landing-grid-overlay" />
      <HeroCanvas3D />

      {/* Floating Frosted Glass Navbar */}
      <header className="landing-navbar-outer">
        <div className="landing-navbar-inner">
          <Link href="/landing" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <BrandLogo size="sm" showSubtitle={true} />
          </Link>

          <nav className="landing-nav-links">
            <a href="#modules" className="landing-nav-link">ERP Modules</a>
            <a href="#superpowers" className="landing-nav-link">AI Copilot</a>
            <a href="#multicompany" className="landing-nav-link">Multi-Company</a>
            <a href="#testimonials" className="landing-nav-link">Testimonials</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/login"
              style={{
                padding: "8px 18px",
                borderRadius: "9999px",
                color: "#334155",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="landing-btn-primary"
              style={{ padding: "9px 22px", borderRadius: "9999px", fontSize: "0.875rem" }}
            >
              Create Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-badge-pill">
          <Sparkles size={14} color="#4f46e5" />
          <span>Next-Gen Enterprise Business Operating System</span>
        </div>

        <h1 className="landing-hero-title">
          The All-in-One ERP Platform Built for Modern Enterprises
        </h1>

        <p className="landing-hero-subtitle">
          Seamlessly manage multiple companies, sales pipelines, multi-warehouse inventory, double-entry accounting, factory manufacturing, and automated GST compliance in one unified cloud system.
        </p>

        {/* Action Buttons */}
        <div className="landing-hero-actions">
          <Link href="/login" className="landing-btn-primary" style={{ padding: "14px 32px", fontSize: "1rem" }}>
            <span>Sign In to Workspace</span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/register" className="landing-btn-secondary" style={{ padding: "14px 28px", fontSize: "1rem" }}>
            <span>Register Business</span>
          </Link>
        </div>

        {/* Live Metrics Showcase */}
        <div className="landing-metrics-strip">
          <div className="landing-metric-item">
            <span className="landing-metric-value">100%</span>
            <span className="landing-metric-label">Full Module Access</span>
          </div>
          <div className="landing-metric-divider" />
          <div className="landing-metric-item">
            <span className="landing-metric-value">Multi-Entity</span>
            <span className="landing-metric-label">Sister Company Hub</span>
          </div>
          <div className="landing-metric-divider" />
          <div className="landing-metric-item">
            <span className="landing-metric-value">Real-Time</span>
            <span className="landing-metric-label">GST & Ledger Sync</span>
          </div>
          <div className="landing-metric-divider" />
          <div className="landing-metric-item">
            <span className="landing-metric-value">Unlimited</span>
            <span className="landing-metric-label">Users & Branches</span>
          </div>
        </div>
      </section>

      {/* Live Voice AI Widget Demo */}
      <section id="superpowers" style={{ padding: "0 20px 80px 20px" }}>
        <VoiceAiDemoWidget />
      </section>

      {/* Core ERP Modules Grid */}
      <section id="modules" style={{ padding: "40px 20px 100px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 16px",
              borderRadius: "9999px",
              background: "#eef2ff",
              color: "#4f46e5",
              fontSize: "0.825rem",
              fontWeight: 700,
              marginBottom: "12px",
              border: "1px solid rgba(79, 70, 229, 0.2)",
            }}
          >
            <Layers size={14} /> Full Enterprise Suite
          </div>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Complete Modular Architecture
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
            Everything your business operations require, unlocked and connected out of the box.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {modulesList.map((m, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: m.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {m.icon}
              </div>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                {m.title}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-Company & Multi-Branch Showcase */}
      <section id="multicompany" style={{ padding: "0 20px 100px 20px", maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            borderRadius: "24px",
            padding: "48px 40px",
            color: "#ffffff",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "36px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "9999px",
                backgroundColor: "rgba(255,255,255,0.15)",
                fontSize: "0.78rem",
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              <Building2 size={14} /> Multi-Entity Management
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 16px 0", lineHeight: 1.2 }}>
              Run Multiple Sister Companies Seamlessly
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#c7d2fe", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              Have multiple trading firms, manufacturing units, or retail branches? Switch between companies instantly from the topbar while maintaining distinct books, GST returns, warehouses, and role-based permissions.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link
                href="/login"
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  color: "#312e81",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                }}
              >
                Access Dashboard
              </Link>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
              <Building2 size={20} color="#a5b4fc" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>R3 EXPORTS</div>
                <div style={{ fontSize: "0.75rem", color: "#c7d2fe" }}>Active Entity • Apparel & Garments</div>
              </div>
              <CheckCircle2 size={18} color="#4ade80" style={{ marginLeft: "auto" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
              <Store size={20} color="#a5b4fc" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>R3 TexFab Sister Unit</div>
                <div style={{ fontSize: "0.75rem", color: "#c7d2fe" }}>Manufacturing & Weaving Hub</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Globe size={20} color="#a5b4fc" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Delhi & Surat Distribution</div>
                <div style={{ fontSize: "0.75rem", color: "#c7d2fe" }}>Multi-Branch Logistics Hubs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: "0 20px 100px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Trusted by High-Velocity Businesses
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            Real teams scaling wholesale, manufacturing, and distribution operations.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "20px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.6, fontStyle: "italic" }}>
                "{t.quote}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    backgroundColor: t.avatarBg,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {t.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>{t.author}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{t.role}, {t.company}</div>
                  <div style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 700 }}>{t.stats}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="landing-faq-section">
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            Everything you need to know about navigating and managing your ERP workspace.
          </p>
        </div>

        <div>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="landing-faq-item">
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: isOpen ? "#4f46e5" : "#64748b",
                    }}
                  />
                </button>
                {isOpen && <div className="landing-faq-answer">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing CTA Banner */}
      <section style={{ padding: "0 20px" }}>
        <div className="landing-closing-cta">
          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", marginBottom: "16px", letterSpacing: "-0.03em" }}>
            Ready to Take Command of Your Entire Enterprise?
          </h2>
          <p style={{ color: "#e0e7ff", fontSize: "1.1rem", maxWidth: "640px", margin: "0 auto 32px auto" }}>
            Full access to CRM, Invoicing, Inventory, Manufacturing, GST, and WhatsApp AI automation in one powerful workspace.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" className="landing-btn-primary" style={{ padding: "14px 32px", fontSize: "1rem", background: "#ffffff", color: "#4f46e5" }}>
              <span>Launch Workspace</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/register" style={{ padding: "14px 28px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", textDecoration: "none", fontWeight: 700 }}>
              Register Business
            </Link>
          </div>
        </div>
      </section>

      {/* Enterprise Trust Footer */}
      <footer className="landing-footer">
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <BrandLogo size="md" showSubtitle={true} />

          <div style={{ display: "flex", justifyContent: "center", gap: "28px", flexWrap: "wrap", color: "#475569", fontSize: "0.85rem", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><ShieldCheck size={16} color="#059669" /> 256-Bit SSL Encryption</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Building2 size={16} color="#0284c7" /> Multi-Company Architecture</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Lock size={16} color="#7c3aed" /> Bcrypt Hash Protected</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileText size={16} color="#e11d48" /> MCA Compliant Audit Trail</span>
          </div>

          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.825rem" }}>
            © {new Date().getFullYear()} R3 EXPORTS Enterprise ERP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
