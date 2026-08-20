"use client";

import React, { useState, useEffect } from "react";
import {
  FileCode,
  Plus,
  Search,
  RotateCw,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  Send
} from "lucide-react";
import { getWhatsAppTemplates, saveWhatsAppTemplateAction } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Template Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>("");
  const [category, setCategory] = useState<string>("MARKETING");
  const [headerType, setHeaderType] = useState<string>("TEXT");
  const [headerContent, setHeaderContent] = useState<string>("Special Festive Offer");
  const [bodyText, setBodyText] = useState<string>("Hi {{customer_name}},\n\nGet exclusive wholesale apparel discounts up to 15% on your order today!");
  const [footerText, setFooterText] = useState<string>("Espon Clothing Wholesale");
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const res = await getWhatsAppTemplates();
    if (res.success && res.templates) {
      setTemplates(res.templates);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName) return alert("Template name is required.");
    setSaving(true);
    const res = await saveWhatsAppTemplateAction({
      name: templateName,
      category,
      headerType,
      headerContent,
      bodyText,
      footerText,
      buttons: [{ type: "QUICK_REPLY", text: "Contact Sales" }]
    });

    if (res.success) {
      setShowCreateModal(false);
      setToastMsg("✓ Meta WhatsApp Template submitted for Meta Cloud approval!");
      setTimeout(() => setToastMsg(null), 4000);
      await fetchTemplates();
    } else {
      alert(res.error || "Failed to create template");
    }
    setSaving(false);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.bodyText && t.bodyText.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>WhatsApp</span>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "2px 0 0 0" }}>
            Meta Message Templates
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0 0" }}>
            Create, manage, and sync Meta HSM WhatsApp message templates for broadcast & automated triggers.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchTemplates}
            style={{
              background: "#ffffff",
              border: "1px solid #d1d5db",
              padding: "9px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <RotateCw size={14} className={loading ? "spin-icon" : ""} />
            <span>Sync from Meta</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              padding: "9px 18px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Plus size={16} />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600 }}>
          {toastMsg}
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{ background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
          >
            <option value="ALL">All Categories</option>
            <option value="UTILITY">UTILITY</option>
            <option value="MARKETING">MARKETING</option>
            <option value="AUTHENTICATION">AUTHENTICATION</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending Approval</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* TEMPLATE GRID LIST */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {filteredTemplates.map((t) => (
          <div key={t.name} style={{ background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{t.name}</strong>
                <span style={{ background: t.status === "APPROVED" ? "#dcfce7" : "#fffbe5", color: t.status === "APPROVED" ? "#166534" : "#b45309", fontSize: "10.5px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>
                  ● {t.status}
                </span>
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <span style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px" }}>{t.category}</span>
                <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px" }}>{t.language || "en_US"}</span>
              </div>

              {t.headerContent && (
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#075e54", marginBottom: "4px" }}>
                  {t.headerContent}
                </div>
              )}

              <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 10px 0", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                {t.bodyText}
              </p>

              {t.footerText && (
                <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>
                  {t.footerText}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#9ca3af" }}>
              <span>Verified Meta HSM Template</span>
              <span style={{ color: "#10b981", fontWeight: 700 }}>Ready to Broadcast →</span>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE TEMPLATE MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#ffffff", width: "100%", maxWidth: "540px", borderRadius: "16px", padding: "20px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Create New Meta WhatsApp Template
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>×</button>
            </div>

            <form onSubmit={handleCreateTemplate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Template Name (Lowercase)</label>
                <input
                  type="text"
                  placeholder="e.g. festive_wholesale_offer"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}>
                    <option value="MARKETING">MARKETING</option>
                    <option value="UTILITY">UTILITY</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Header Type</label>
                  <select value={headerType} onChange={(e) => setHeaderType(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}>
                    <option value="TEXT">TEXT</option>
                    <option value="IMAGE">IMAGE</option>
                    <option value="NONE">NONE</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Header Text</label>
                <input
                  type="text"
                  value={headerContent}
                  onChange={(e) => setHeaderContent(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Body Text (Use {"{{1}}"}, {"{{2}}"} for variables)</label>
                <textarea
                  rows={4}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", resize: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "4px" }}>Footer Text</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{ marginTop: "10px", padding: "10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                {saving ? "Submitting to Meta..." : "Submit Template for Meta Approval"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
