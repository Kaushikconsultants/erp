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
  Play,
  Share2,
  Smartphone,
  Lock,
  X,
  Star,
  Quote,
  Layers,
  FileText,
  Clock,
  Briefcase,
} from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import HeroCanvas3D from "@/components/landing/HeroCanvas3D";
import VoiceAiDemoWidget from "@/components/landing/VoiceAiDemoWidget";
import InteractiveRoiCalculator from "@/components/landing/InteractiveRoiCalculator";
import { PLAN_PRICING } from "@/lib/planConfig";
import { getLivePlanPricing } from "@/app/actions/tenantActions";
import "./landing.css";

export default function LandingPage() {
  const [plans, setPlans] = useState<any>(PLAN_PRICING);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "ANNUALLY">("ANNUALLY");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    getLivePlanPricing()
      .then((res) => {
        if (res) setPlans(res);
      })
      .catch(() => {});
  }, []);

  const getPrice = (planKey: "STARTER" | "GROWTH" | "ENTERPRISE") => {
    const plan = plans[planKey] || PLAN_PRICING[planKey];
    if (billingCycle === "MONTHLY") {
      return {
        amount: plan.monthlyPrice,
        period: "/ month",
        note: "Billed monthly • Cancel anytime",
        totalText: `₹${plan.monthlyPrice.toLocaleString("en-IN")} billed monthly`,
      };
    }
    if (billingCycle === "QUARTERLY") {
      const perMonth = planKey === "STARTER" ? 899 : planKey === "GROWTH" ? 2249 : 5399;
      const regularQuarterly = plan.monthlyPrice * 3;
      const savings = Math.max(0, regularQuarterly - plan.quarterlyPrice);
      return {
        amount: perMonth,
        period: "/ month",
        note: `Billed quarterly (₹${plan.quarterlyPrice.toLocaleString("en-IN")}) • Save ₹${savings.toLocaleString("en-IN")} (10% Off)`,
        totalText: `₹${plan.quarterlyPrice.toLocaleString("en-IN")} billed quarterly`,
      };
    }
    const perMonth = planKey === "STARTER" ? 799 : planKey === "GROWTH" ? 1999 : 4799;
    const regularAnnual = plan.monthlyPrice * 12;
    const savings = Math.max(0, regularAnnual - plan.annualPrice);
    return {
      amount: perMonth,
      period: "/ month",
      note: `Billed annually (₹${plan.annualPrice.toLocaleString("en-IN")}) • Save ₹${savings.toLocaleString("en-IN")} (20% Off)`,
      totalText: `₹${plan.annualPrice.toLocaleString("en-IN")} billed yearly (Save ₹${savings.toLocaleString("en-IN")})`,
    };
  };

  const getQuotaDetails = (planKey: "STARTER" | "GROWTH" | "ENTERPRISE") => {
    if (planKey === "STARTER") {
      return {
        seats: "Up to 3 Users",
        branches: "1 Branch / 1 Warehouse",
        orders: billingCycle === "ANNUALLY" ? "6,000 / yr (500/mo)" : billingCycle === "QUARTERLY" ? "1,500 / qtr (500/mo)" : "500 Orders / mo",
        credits: billingCycle === "ANNUALLY" ? "6,000 Credits / yr" : billingCycle === "QUARTERLY" ? "1,500 Credits / qtr" : "500 Credits / mo",
        perk: billingCycle === "ANNUALLY" ? "🎉 Save ₹2,489 (~2.5 Mo Free)" : billingCycle === "QUARTERLY" ? "⚡ Save ₹298 (10% Off)" : null,
      };
    }
    if (planKey === "GROWTH") {
      return {
        seats: "Up to 10 Users",
        branches: "3 Branches / 2 Warehouses",
        orders: billingCycle === "ANNUALLY" ? "24,000 / yr (2,000/mo)" : billingCycle === "QUARTERLY" ? "6,000 / qtr (2,000/mo)" : "2,000 Orders / mo",
        credits: billingCycle === "ANNUALLY" ? "30,000 Credits + AI Bot" : billingCycle === "QUARTERLY" ? "7,500 Credits + AI Bot" : "2,500 Credits + AI Bot",
        perk: billingCycle === "ANNUALLY" ? "🎉 Save ₹6,000 (~2.5 Mo Free)" : billingCycle === "QUARTERLY" ? "⚡ Save ₹748 (10% Off)" : null,
      };
    }
    return {
      seats: "Unlimited Users",
      branches: "Unlimited Multi-Warehouse",
      orders: "Unlimited Orders",
      credits: billingCycle === "ANNUALLY" ? "120,000 AI Credits / yr" : billingCycle === "QUARTERLY" ? "30,000 AI Credits / qtr" : "10,000 AI Credits / mo",
      perk: billingCycle === "ANNUALLY" ? "🎉 Save ₹14,489 (~2.5 Mo Free)" : billingCycle === "QUARTERLY" ? "⚡ Save ₹1,798 (10% Off)" : null,
    };
  };

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
        "Switching from Tally to Heart of Business saved our sales reps 2 hours every evening. The Voice-to-Order AI lets them take orders on the road without manual typing.",
      author: "Rajesh Khandelwal",
      role: "Managing Director",
      company: "Khandelwal Textiles, Surat",
      stats: "₹18Cr Annual Turnover",
      avatarBg: "#4f46e5",
    },
    {
      quote:
        "The Dynamic UPI QR on invoices reduced our payment collection cycle from 45 days to 14 days. Customers scan and pay directly via PhonePe with zero gateway fees.",
      author: "Amitabh Sharma",
      role: "Operations Head",
      company: "Apex FMCG Distribution, Indore",
      stats: "3,200+ Retail Outlets",
      avatarBg: "#059669",
    },
    {
      quote:
        "The PDC Cheque Vault and Shipmozo courier tracking in one dashboard eliminated our dispatch chaos. We never miss a cheque deposit date now.",
      author: "Vikas Singhania",
      role: "Founder & CEO",
      company: "Singhania Electronics, Delhi",
      stats: "15 Field Reps",
      avatarBg: "#7c3aed",
    },
  ];

  const faqs = [
    {
      q: "Can I migrate my existing data from Tally, Busy, or Marg?",
      a: "Yes! Heart of Business features an automated Data Import Wizard that seamlessly ingests your customers, vendors, product master, and opening balances directly from Excel or CSV files in under 5 minutes.",
    },
    {
      q: "How does the Voice-to-Order AI actually work?",
      a: "Our built-in AI Voice Engine converts natural spoken speech into structured orders. Simply speak customer names, product quantities, and rates. The AI matches items to your product master and creates a draft order ready for 1-click confirmation.",
    },
    {
      q: "Are GST and e-Way bill compliance automated?",
      a: "Yes. Invoices instantly generate compliant GST breakdowns (CGST, SGST, IGST) with HSN codes and include dynamic UPI QR codes. You can also generate delivery challans and track live courier shipments via Shipmozo.",
    },
    {
      q: "Can my field sales team use this on mobile devices?",
      a: "Absolutely. The platform is 100% mobile-responsive and PWA-ready. Sales representatives can take orders, check real-time stock, and record payments on the go from any Android or iOS smartphone.",
    },
    {
      q: "Can I try before purchasing or change plans later?",
      a: "Yes! All plans (Starter, Growth, and Enterprise) come with a full 14-day free trial with zero setup fees or credit card requirements. You can upgrade, downgrade, or switch between Monthly, Quarterly, and Yearly billing cycles anytime with automatic pro-rata adjustments.",
    },
    {
      q: "Is our business data secure and isolated?",
      a: "Yes. Every registered business operates in a secure multi-tenant environment with cryptographic session isolation, bcrypt password hashing, role-based access control, and automated encrypted cloud backups.",
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
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#superpowers" className="landing-nav-link">AI Superpowers</a>
            <a href="#comparison" className="landing-nav-link">Competitor Matrix</a>
            <a href="#roi" className="landing-nav-link">ROI Calculator</a>
            <a href="#pricing" className="landing-nav-link">Pricing</a>
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
              href="/register?plan=GROWTH"
              className="landing-btn-primary"
              style={{ padding: "9px 22px", borderRadius: "9999px", fontSize: "0.875rem" }}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-badge-pill">
          <Sparkles size={14} color="#4f46e5" />
          <span>Next-Gen AI Business Operating System • 2026 Edition</span>
        </div>

        <h1 className="landing-hero-headline">
          The Modern ERP Built for High-Growth{" "}
          <span className="landing-hero-headline-gradient">Wholesale, Distribution & Enterprise.</span>
        </h1>

        <p className="landing-hero-subhead">
          Replace clunky 2000s desktop software with <strong>Heart of Business</strong>. Unify Voice-to-Order AI,
          1-Click GST & e-Way billing, live courier tracking via Shipmozo, and automated cheque collections in one beautiful cloud workspace.
        </p>

        <div className="landing-hero-cta-group">
          <Link href="/register?plan=GROWTH" className="landing-btn-primary">
            Start 14-Day Free Trial <ArrowRight size={18} />
          </Link>
          <a href="#superpowers" className="landing-btn-secondary">
            <Play size={16} fill="#0f172a" /> Try Voice AI Demo
          </a>
        </div>

        {/* 3D Isometric Tilt Stage (Light Theme) */}
        <div className="landing-3d-stage">
          {/* Floating 3D Satellite Cards */}
          <div className="landing-satellite-card satellite-top-left">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
              }}
            >
              <QrCode size={22} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Invoice #INV-2026 Paid</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#059669" }}>₹1,48,500 via Dynamic UPI QR</div>
            </div>
          </div>

          <div className="landing-satellite-card satellite-top-right">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#f0f9ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0284c7",
              }}
            >
              <Truck size={22} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Shipmozo Logistics Sync</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0284c7" }}>Out for Delivery • ETA 2 hrs</div>
            </div>
          </div>

          <div className="landing-satellite-card satellite-bottom-right">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#f5f3ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7c3aed",
              }}
            >
              <Zap size={22} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Voice AI Order Processed</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#7c3aed" }}>50 Boxes Cotton Fabric Confirmed</div>
            </div>
          </div>

          {/* Interactive 3D Tilt Mockup Card (Light Theme) */}
          <div
            ref={cardRef}
            className="landing-3d-tilt-card"
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="landing-dashboard-mockup-inner">
              {/* Mock Dashboard Topbar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "16px",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                  <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                  <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  <span style={{ marginLeft: "10px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                    heartofbusiness.cloud • Enterprise Workspace
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 12px",
                    background: "#eef2ff",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    color: "#4f46e5",
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={12} /> AI Copilot Active
                </div>
              </div>

              {/* Mock Dashboard Metrics Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "left" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>Today&apos;s Invoiced Revenue</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>₹4,92,400</div>
                  <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "4px", fontWeight: 700 }}>↑ +18.4% vs last week</div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "left" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>PDC Cheque Vault</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7" }}>₹12,40,000</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>8 Cheques maturing this week</div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "left" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>Dispatched Shipments</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7c3aed" }}>34 Orders</div>
                  <div style={{ fontSize: "0.75rem", color: "#7c3aed", marginTop: "4px", fontWeight: 700 }}>Live with Shipmozo</div>
                </div>
              </div>

              {/* Mock Recent Activity Feed */}
              <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "left" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#334155", marginBottom: "12px" }}>
                  Live Transaction Feed
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.825rem" }}>
                    <span style={{ color: "#0f172a", fontWeight: 600 }}>Rajesh Trading Co. • Tax Invoice #INV-1092</span>
                    <span style={{ color: "#059669", fontWeight: 800 }}>₹84,200 (Paid via QR)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.825rem" }}>
                    <span style={{ color: "#0f172a", fontWeight: 600 }}>Mahalaxmi Enterprises • Delivery Challan #DC-482</span>
                    <span style={{ color: "#0284c7", fontWeight: 800 }}>Dispatched (AWB: 948271)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Metrics Bar */}
      <section className="landing-metrics-bar">
        <div className="landing-metric-item">
          <div className="landing-metric-val">₹150Cr+</div>
          <div className="landing-metric-label">Monthly Invoiced Volume</div>
        </div>
        <div className="landing-metric-item">
          <div className="landing-metric-val">99.9%</div>
          <div className="landing-metric-label">GST & E-Way Bill Accuracy</div>
        </div>
        <div className="landing-metric-item">
          <div className="landing-metric-val">1,200+</div>
          <div className="landing-metric-label">Wholesalers & Distributors</div>
        </div>
        <div className="landing-metric-item">
          <div className="landing-metric-val">4.2 Hrs</div>
          <div className="landing-metric-label">Saved Daily Per Sales Rep</div>
        </div>
      </section>

      {/* 3D Bento Grid Modules */}
      <section id="superpowers" className="landing-bento-grid">
        <div className="bento-card bento-span-8">
          <div className="bento-card-title">⚡ Voice-Powered ERP AI Engine</div>
          <div className="bento-card-desc">
            Sales reps speak naturally into their phone, and our integrated AI converts spoken audio into valid, SKU-matched
            sales orders in seconds. No keyboard friction, no manual entry mistakes.
          </div>
          <VoiceAiDemoWidget />
        </div>

        <div className="bento-card bento-span-4">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#059669",
              marginBottom: "16px",
            }}
          >
            <QrCode size={24} />
          </div>
          <div className="bento-card-title">Dynamic UPI QR Invoicing</div>
          <div className="bento-card-desc">
            Every invoice includes a dynamic UPI QR code linked directly to your company bank account.
            Parties scan and pay instantly via Google Pay, PhonePe, or Paytm with zero transaction fees.
          </div>
          <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "6px", fontWeight: 600 }}>Zero Gateway Charges</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>Direct Bank Settlement</div>
          </div>
        </div>

        <div className="bento-card bento-span-4">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#f0f9ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0284c7",
              marginBottom: "16px",
            }}
          >
            <CreditCard size={24} />
          </div>
          <div className="bento-card-title">PDC Cheque Vault</div>
          <div className="bento-card-desc">
            Track Post-Dated Cheques with clear maturity timelines, automatic bank deposit reminders, and bounce prevention.
          </div>
        </div>

        <div className="bento-card bento-span-4">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#f5f3ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7c3aed",
              marginBottom: "16px",
            }}
          >
            <Truck size={24} />
          </div>
          <div className="bento-card-title">Shipmozo Logistics Sync</div>
          <div className="bento-card-desc">
            Direct integration with 15+ top courier partners. Generate shipping labels and track delivery statuses directly inside the ERP.
          </div>
        </div>

        <div className="bento-card bento-span-4">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#fffbeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d97706",
              marginBottom: "16px",
            }}
          >
            <Smartphone size={24} />
          </div>
          <div className="bento-card-title">Field Sales & Mobile App</div>
          <div className="bento-card-desc">
            Empower on-ground reps with customer visit logs, live stock availability, and instant PDF quote generation on mobile.
          </div>
        </div>
      </section>

      {/* Competitor Comparison Section */}
      <section id="comparison" className="landing-comparison-section">
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
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
            <Layers size={14} /> Competitive Feature Matrix
          </div>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            How Heart of Business Compares to Similar Softwares
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: "700px", margin: "0 auto" }}>
            See why high-growth B2B distributors are upgrading from legacy desktop accounting tools to our AI-powered operating system.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="landing-comp-table">
            <thead>
              <tr>
                <th>Capability / Feature</th>
                <th style={{ color: "#4f46e5", fontWeight: 800, background: "#eef2ff" }}>Heart of Business ERP</th>
                <th>Tally Prime</th>
                <th>Vyapar</th>
                <th>Zoho Books</th>
                <th>Marg ERP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Cloud & Mobile Access</strong></td>
                <td className="landing-comp-highlight">Any Device (Phone, Tablet, Mac, PC)</td>
                <td>Desktop Only (requires RDP)</td>
                <td>Mobile + PC Sync</td>
                <td>Cloud Only</td>
                <td>Desktop Only</td>
              </tr>
              <tr>
                <td><strong>Voice-to-Order AI Engine</strong></td>
                <td className="landing-comp-highlight">Native AI Voice Copilot</td>
                <td>Not Available</td>
                <td>Not Available</td>
                <td>Not Available</td>
                <td>Not Available</td>
              </tr>
              <tr>
                <td><strong>Dynamic UPI QR on Invoices</strong></td>
                <td className="landing-comp-highlight">Built-in (Zero Gateway Fees)</td>
                <td>Static QR / Third-party plugin</td>
                <td>Static QR Code</td>
                <td>Payment Gateway link (2% fee)</td>
                <td>Third-party add-on</td>
              </tr>
              <tr>
                <td><strong>Integrated Courier Tracking</strong></td>
                <td className="landing-comp-highlight">Direct Shipmozo Live Sync</td>
                <td>Not Available</td>
                <td>Not Available</td>
                <td>Add-on required</td>
                <td>Not Available</td>
              </tr>
              <tr>
                <td><strong>Post-Dated Cheque (PDC) Vault</strong></td>
                <td className="landing-comp-highlight">Automated Maturity & Bounce Alerts</td>
                <td>Basic Ledger Entry</td>
                <td>Basic Reminder</td>
                <td>Manual Entry</td>
                <td>Basic Ledger</td>
              </tr>
              <tr>
                <td><strong>Field Sales Geo-tagged Visits</strong></td>
                <td className="landing-comp-highlight">Built-in Field Attendance & Orders</td>
                <td>Not Available</td>
                <td>Not Available</td>
                <td>Separate Zoho CRM required</td>
                <td>Not Available</td>
              </tr>
              <tr>
                <td><strong>Data Security & Backup</strong></td>
                <td className="landing-comp-highlight">Automated Cloud Backups & Multi-Tenant</td>
                <td>Manual Pen Drive / Disk Crash Risk</td>
                <td>Local / Google Drive</td>
                <td>Cloud Backup</td>
                <td>Local Hard Drive Crash Risk</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer Testimonials / Social Proof */}
      <section style={{ maxWidth: "1200px", margin: "0 auto 120px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 16px",
              borderRadius: "9999px",
              background: "#ecfdf5",
              color: "#059669",
              fontSize: "0.825rem",
              fontWeight: 700,
              marginBottom: "12px",
              border: "1px solid #a7f3d0",
            }}
          >
            <Star size={14} fill="#059669" /> Proven Business Results
          </div>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Loved by Wholesale Leaders Across India
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "24px",
                padding: "32px",
                boxShadow: "0 8px 24px -4px rgba(15, 23, 42, 0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <Quote size={28} color="#cbd5e1" style={{ marginBottom: "14px" }} />
                <p style={{ color: "#334155", fontSize: "0.975rem", lineHeight: 1.65, fontStyle: "italic", marginBottom: "24px" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "18px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: t.avatarBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                  }}
                >
                  {t.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{t.author}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{t.role}, {t.company}</div>
                  <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, marginTop: "2px" }}>{t.stats}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section id="roi" style={{ padding: "0 20px 120px 20px" }}>
        <InteractiveRoiCalculator />
      </section>

      {/* SaaS Pricing Grid */}
      <section id="pricing" style={{ textAlign: "center", marginBottom: "120px" }}>
        <div style={{ marginBottom: "36px" }}>
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
            <Sparkles size={14} /> Transparent, Simple Pricing
          </div>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Invest in Growth, Not Bloatware
          </h2>

          {/* Billing Switcher */}
          <div
            style={{
              display: "inline-flex",
              padding: "4px",
              background: "#e2e8f0",
              borderRadius: "9999px",
              gap: "4px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              style={{
                background: billingCycle === "MONTHLY" ? "#ffffff" : "transparent",
                color: billingCycle === "MONTHLY" ? "#0f172a" : "#64748b",
                border: "none",
                borderRadius: "9999px",
                padding: "8px 20px",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: billingCycle === "MONTHLY" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("QUARTERLY")}
              style={{
                background: billingCycle === "QUARTERLY" ? "#ffffff" : "transparent",
                color: billingCycle === "QUARTERLY" ? "#0f172a" : "#64748b",
                border: "none",
                borderRadius: "9999px",
                padding: "8px 20px",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: billingCycle === "QUARTERLY" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Quarterly <span style={{ color: "#059669", fontSize: "0.75rem", fontWeight: 800 }}>10% OFF</span>
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("ANNUALLY")}
              style={{
                background: billingCycle === "ANNUALLY" ? "#ffffff" : "transparent",
                color: billingCycle === "ANNUALLY" ? "#0f172a" : "#64748b",
                border: "none",
                borderRadius: "9999px",
                padding: "8px 20px",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: billingCycle === "ANNUALLY" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Yearly <span style={{ background: billingCycle === "ANNUALLY" ? "#ede9fe" : "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: "8px", fontSize: "0.74rem", fontWeight: 800 }}>20% OFF • 2.5 Mo Free</span>
            </button>
          </div>
        </div>

        <div className="landing-pricing-grid">
          {/* Starter Plan */}
          <div className="landing-price-card">
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Starter</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "16px", minHeight: "40px" }}>
              Ideal for boutique brands, single-location traders & growing shops.
            </p>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
              ₹{getPrice("STARTER").amount.toLocaleString("en-IN")}
              <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}> {getPrice("STARTER").period}</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, marginBottom: "16px", minHeight: "18px" }}>
              {getPrice("STARTER").note}
            </div>

            {/* Quota Highlights */}
            {(() => {
              const q = getQuotaDetails("STARTER");
              return (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "20px",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.78rem",
                    color: "#475569",
                    fontWeight: 600,
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "7px",
                    minHeight: billingCycle === "MONTHLY" ? "128px" : "166px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>User Seats:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.seats}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>Branches:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.branches}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>Orders:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.orders}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>WhatsApp:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.credits}</strong>
                  </div>
                  {q.perk && (
                    <div style={{ marginTop: "auto", padding: "5px 8px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", color: "#065f46", fontSize: "0.72rem", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>
                      {q.perk}
                    </div>
                  )}
                </div>
              );
            })()}

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "#334155" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> TeleCRM & Sales Leads Pipeline</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Quotations, Proforma & GST Invoicing</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Dynamic UPI QR (0% Gateway Fees)</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Customer & Supplier Ledger Accounts</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Delivery Challans & PDF Exports</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Standard Mobile Web & Cloud Access</li>
            </ul>

            <Link
              href={`/register?plan=STARTER&cycle=${billingCycle}`}
              className="landing-btn-secondary"
              style={{ marginTop: "auto", justifyContent: "center", borderRadius: "12px" }}
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Growth Plan (Popular) */}
          <div className="landing-price-card popular">
            <div className="landing-popular-badge">Most Popular • 2026 Edition</div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Growth</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "16px", minHeight: "40px" }}>
              Complete AI superpowers & operational suite for wholesale & multi-rep teams.
            </p>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#4f46e5", marginBottom: "4px" }}>
              ₹{getPrice("GROWTH").amount.toLocaleString("en-IN")}
              <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}> {getPrice("GROWTH").period}</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, marginBottom: "16px", minHeight: "18px" }}>
              {getPrice("GROWTH").note}
            </div>

            {/* Quota Highlights */}
            {(() => {
              const q = getQuotaDetails("GROWTH");
              return (
                <div
                  style={{
                    background: "#f5f3ff",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "20px",
                    border: "1px solid #ddd6fe",
                    fontSize: "0.78rem",
                    color: "#4f46e5",
                    fontWeight: 600,
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "7px",
                    minHeight: billingCycle === "MONTHLY" ? "128px" : "166px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>User Seats:</span>
                    <strong style={{ color: "#1e1b4b", whiteSpace: "nowrap" }}>{q.seats}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>Branches:</span>
                    <strong style={{ color: "#1e1b4b", whiteSpace: "nowrap" }}>{q.branches}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>Orders:</span>
                    <strong style={{ color: "#1e1b4b", whiteSpace: "nowrap" }}>{q.orders}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>WhatsApp:</span>
                    <strong style={{ color: "#1e1b4b", whiteSpace: "nowrap" }}>{q.credits}</strong>
                  </div>
                  {q.perk && (
                    <div style={{ marginTop: "auto", padding: "5px 8px", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "6px", color: "#4338ca", fontSize: "0.72rem", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>
                      {q.perk}
                    </div>
                  )}
                </div>
              );
            })()}

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "#334155" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> <strong>Everything in Starter, plus:</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> <strong>Voice-to-Order AI Engine (Hindi & English)</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> <strong>Purchases & Multi-Warehouse Stock Transfers</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> <strong>Double-Entry Accounting (P&L, Balance Sheet, Ageing, BRS)</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> <strong>Live GST Portal Direct Filing (GSTR-1, 3B, 2B)</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> <strong>Automated E-Way Bill & Shipmozo Courier Sync</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> PDC Cheque Vault & Maturity Alerts</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#4f46e5" /> Field Sales GPS Tracking & Check-ins</li>
            </ul>

            <Link
              href={`/register?plan=GROWTH&cycle=${billingCycle}`}
              className="landing-btn-primary"
              style={{ marginTop: "auto", justifyContent: "center", borderRadius: "12px" }}
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="landing-price-card">
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Enterprise</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "16px", minHeight: "40px" }}>
              Tailored for large manufacturers, multi-branch corporations & custom setups.
            </p>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
              ₹{getPrice("ENTERPRISE").amount.toLocaleString("en-IN")}
              <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}> {getPrice("ENTERPRISE").period}</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, marginBottom: "16px", minHeight: "18px" }}>
              {getPrice("ENTERPRISE").note}
            </div>

            {/* Quota Highlights */}
            {(() => {
              const q = getQuotaDetails("ENTERPRISE");
              return (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "20px",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.78rem",
                    color: "#475569",
                    fontWeight: 600,
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "7px",
                    minHeight: billingCycle === "MONTHLY" ? "128px" : "166px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>User Seats:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.seats}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>Branches:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.branches}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>Orders:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.orders}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "22px" }}>
                    <span style={{ whiteSpace: "nowrap" }}>WhatsApp:</span>
                    <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{q.credits}</strong>
                  </div>
                  {q.perk && (
                    <div style={{ marginTop: "auto", padding: "5px 8px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", color: "#065f46", fontSize: "0.72rem", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>
                      {q.perk}
                    </div>
                  )}
                </div>
              );
            })()}

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "#334155" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> <strong>Everything in Growth, plus:</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> <strong>Production & Manufacturing Suite (BOM & Work Orders)</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> <strong>Full HRMS & Payroll Suite (Biometric Attendance, Salary Slips)</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> <strong>Dedicated AI ERP Copilot & OCR Invoice Scanner</strong></li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Multi-Tenant Cryptographic Isolation & Audit Trail</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Custom ERP API Access & Webhook Integrations</li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><Check size={16} color="#059669" /> Dedicated Account Manager & 24/7 Priority Support</li>
            </ul>

            <Link
              href={`/register?plan=ENTERPRISE&cycle=${billingCycle}`}
              className="landing-btn-secondary"
              style={{ marginTop: "auto", justifyContent: "center", borderRadius: "12px" }}
            >
              Start 14-Day Free Trial
            </Link>
          </div>
        </div>

        {/* Reassurance & Link to Detailed Pricing Page */}
        <div style={{ maxWidth: "800px", margin: "-80px auto 0 auto", padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap", fontSize: "0.85rem", color: "#475569", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><ShieldCheck size={16} color="#059669" /> 14-Day Full Free Trial</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><CreditCard size={16} color="#0284c7" /> No Credit Card Required</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Zap size={16} color="#7c3aed" /> Instant Workspace Activation</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><CheckCircle2 size={16} color="#e11d48" /> Switch or Cancel Anytime</span>
          </div>
          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
            Need custom module entitlements, add-ons, or custom seat licensing?{" "}
            <Link href="/pricing" style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}>
              Explore Full Module Breakdown & Matrix →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="landing-faq-section">
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            Everything you need to know about migrating and running on Heart of Business.
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
            Ready to Upgrade from 2000s Software to the 2026 Standard?
          </h2>
          <p style={{ color: "#e0e7ff", fontSize: "1.1rem", maxWidth: "640px", margin: "0 auto 32px auto" }}>
            Join over 1,200+ wholesale distributors and manufacturers saving hours every day with Heart of Business. No credit card required.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register?plan=GROWTH" className="landing-btn-primary" style={{ padding: "14px 32px", fontSize: "1rem", background: "#ffffff", color: "#4f46e5" }}>
              Start 14-Day Free Trial <ArrowRight size={18} />
            </Link>
            <Link href="/login" style={{ padding: "14px 28px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", textDecoration: "none", fontWeight: 700 }}>
              Sign In to Workspace
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
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Building2 size={16} color="#0284c7" /> Multi-Tenant Cloud Architecture</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Lock size={16} color="#7c3aed" /> Bcrypt Hash Protected Credentials</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileText size={16} color="#e11d48" /> MCA Compliant Audit Trail</span>
          </div>

          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.825rem" }}>
            © {new Date().getFullYear()} Heart of Business (HOB) ERP. All rights reserved. Built for high-velocity wholesalers, distributors & enterprises.
          </p>
        </div>
      </footer>
    </div>
  );
}
