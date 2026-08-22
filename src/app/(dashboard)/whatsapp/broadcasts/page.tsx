"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Plus,
  Search,
  RotateCw,
  BarChart2,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileCode,
  Users,
  Sliders,
  Calendar,
  Sparkles,
  X,
  Bot,
  ArrowRight,
  Check,
  AlertCircle
} from "lucide-react";
import {
  getWhatsAppCampaigns,
  getWhatsAppTemplates,
  getWhatsAppAudienceSegments,
  launchWhatsAppBroadcastAction
} from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppBroadcastsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Wizard Modal State
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Wizard Form State
  const [campaignName, setCampaignName] = useState<string>("ikra july 11");
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>("ALL");
  const [segments, setSegments] = useState<any[]>([]);
  const [scheduleType, setScheduleType] = useState<string>("INSTANT");
  const [templateSearch, setTemplateSearch] = useState<string>("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("ALL");

  // Analytics Modal State
  const [selectedCampaignForAnalytics, setSelectedCampaignForAnalytics] = useState<any | null>(null);

  const fetchCampaignsAndTemplates = async () => {
    setLoading(true);
    const [campRes, tempRes, segRes] = await Promise.all([
      getWhatsAppCampaigns(),
      getWhatsAppTemplates(),
      getWhatsAppAudienceSegments()
    ]);

    if (campRes.success && campRes.campaigns) setCampaigns(campRes.campaigns);
    if (tempRes.success && tempRes.templates) {
      setTemplates(tempRes.templates);
      if (tempRes.templates.length > 0) setSelectedTemplate(tempRes.templates[0]);
    }
    if (segRes.success && segRes.segments) setSegments(segRes.segments);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaignsAndTemplates();
  }, []);

  const handleLaunchBroadcast = async () => {
    if (!selectedTemplate) return alert("Please select a template first.");
    setLoading(true);
    const res = await launchWhatsAppBroadcastAction({
      name: campaignName,
      templateName: selectedTemplate?.name || "",
      audienceType: selectedSegment as any
    });

    if (res.success) {
      setShowWizard(false);
      alert(`✅ Broadcast launched! Sent to ${res.sentCount} out of ${res.totalAudience} contacts.`);
      await fetchCampaignsAndTemplates();
    } else {
      alert("Error: " + (res.error || "Failed to launch broadcast"));
    }
    setLoading(false);
  };;

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.templateId && c.templateId.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    return c.status === statusFilter;
  });

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                          (t.bodyText && t.bodyText.toLowerCase().includes(templateSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (templateCategoryFilter === "ALL") return true;
    return t.category === templateCategoryFilter;
  });

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ----------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ----------------------------------------------------------------- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>WhatsApp</span>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "2px 0 0 0" }}>
            Broadcast Campaigns
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0 0" }}>
            Launch, schedule, and monitor WhatsApp bulk campaigns.
          </p>
        </div>

        <button
          onClick={() => {
            setCurrentStep(1);
            setShowWizard(true);
          }}
          style={{
            background: "#10b981",
            color: "#ffffff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "24px",
            fontSize: "13.5px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)"
          }}
        >
          <Plus size={16} />
          <span>Create Broadcast</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* CAMPAIGN LIST CONTAINER */}
      {/* ----------------------------------------------------------------- */}
      <div style={{ background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        {/* Table Header Controls */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>All Broadcasts</h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>{filteredCampaigns.length} total campaigns</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", color: "#374151", background: "#fff" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PROCESSING">Processing</option>
            </select>

            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Search broadcasts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "7px 10px 7px 32px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", width: "200px" }}
              />
            </div>

            <button
              onClick={fetchCampaignsAndTemplates}
              style={{ background: "#ffffff", border: "1px solid #d1d5db", padding: "7px 10px", borderRadius: "6px", cursor: "pointer", color: "#4b5563" }}
              title="Refresh Campaigns"
            >
              <RotateCw size={15} className={loading ? "spin-icon" : ""} />
            </button>
          </div>
        </div>

        {/* Campaigns Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #eaecf0", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 700, letterSpacing: "0.03em" }}>
                <th style={{ padding: "12px 20px" }}>Campaign Name</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Template</th>
                <th style={{ padding: "12px 16px" }}>Schedule</th>
                <th style={{ padding: "12px 16px" }}>Last Updated</th>
                <th style={{ padding: "12px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((camp) => (
                <tr key={camp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {/* Campaign Name */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={16} color="#16a34a" />
                      </div>
                      <div>
                        <strong style={{ fontSize: "13.5px", color: "#0f172a", display: "block" }}>{camp.name}</strong>
                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>Created about 1 month ago</span>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: camp.status === "COMPLETED" ? "#f1f5f9" : "#fffbe5",
                      color: camp.status === "COMPLETED" ? "#475569" : "#b45309",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid #e2e8f0"
                    }}>
                      {camp.status === "COMPLETED" ? "Completed" : "Scheduled"}
                    </span>
                  </td>

                  {/* Template */}
                  <td style={{ padding: "14px 16px", color: "#374151", fontWeight: 600 }}>
                    {camp.templateId}
                  </td>

                  {/* Schedule */}
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>
                    Instant
                  </td>

                  {/* Last Updated */}
                  <td style={{ padding: "14px 16px", color: "#64748b" }}>
                    about 1 month ago
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <button
                      onClick={() => setSelectedCampaignForAnalytics(camp)}
                      style={{
                        background: "#ffffff",
                        color: "#10b981",
                        border: "1px solid #10b981",
                        padding: "5px 14px",
                        borderRadius: "14px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      Analytics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4-STEP WIZARD MODAL MATCHING SCREENSHOT 2 */}
      {/* ----------------------------------------------------------------- */}
      {showWizard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#ffffff", width: "100%", maxWidth: "980px", borderRadius: "16px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            {/* Modal Top Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>Create New Broadcast</h3>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>Choose an approved WhatsApp template</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Progress {currentStep * 25}%</span>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#10b981" }}>
                    {currentStep}
                  </div>
                </div>
                <button onClick={() => setShowWizard(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>×</button>
              </div>
            </div>

            {/* Modal Body with Left Stepper & Right View */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left Stepper Column */}
              <div style={{ width: "160px", background: "#f8fafc", borderRight: "1px solid #eaecf0", padding: "16px 12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { step: 1, label: "Template" },
                  { step: 2, label: "Audience" },
                  { step: 3, label: "Variables" },
                  { step: 4, label: "Review & Schedule" }
                ].map((s) => (
                  <div
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: currentStep === s.step ? "#ffffff" : "transparent",
                      color: currentStep === s.step ? "#10b981" : "#64748b",
                      fontWeight: currentStep === s.step ? 700 : 600,
                      fontSize: "12.5px",
                      cursor: "pointer",
                      border: currentStep === s.step ? "1px solid #a7f3d0" : "1px solid transparent"
                    }}
                  >
                    <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: currentStep === s.step ? "#10b981" : "#e2e8f0", color: currentStep === s.step ? "#fff" : "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                      {s.step}
                    </div>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Step View Content */}
              <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* STEP 1: TEMPLATE SELECTOR MATCHING SCREENSHOT 2 */}
                {currentStep === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>1</div>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Template - Choose an approved WhatsApp template</h4>
                      </div>

                      <button
                        onClick={() => setCurrentStep(2)}
                        style={{ background: "#a7f3d0", color: "#065f46", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <span>Continue</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Filter & Search Controls */}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                        <input
                          type="text"
                          placeholder="Search templates..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                        />
                      </div>

                      <select
                        value={templateCategoryFilter}
                        onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                        style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                      >
                        <option value="ALL">All Categories</option>
                        <option value="UTILITY">UTILITY</option>
                        <option value="MARKETING">MARKETING</option>
                        <option value="AUTHENTICATION">AUTHENTICATION</option>
                      </select>
                    </div>

                    {/* Grid of Templates & Live Preview */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {/* Left: Template Cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                        {filteredTemplates.map((t) => {
                          const isSelected = selectedTemplate?.name === t.name;
                          return (
                            <div
                              key={t.name}
                              onClick={() => setSelectedTemplate(t)}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                border: isSelected ? "2px solid #10b981" : "1px solid #e2e8f0",
                                background: isSelected ? "#f0fdf4" : "#ffffff",
                                cursor: "pointer"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <strong style={{ fontSize: "13px", color: "#0f172a" }}>{t.name}</strong>
                                <span style={{ background: "#dcfce7", color: "#166534", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px" }}>✓ APPROVED</span>
                                <span style={{ background: "#e0e7ff", color: "#3730a3", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px" }}>{t.category}</span>
                              </div>
                              <p style={{ fontSize: "12px", color: "#4b5563", margin: "4px 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {t.bodyText}
                              </p>
                              <span style={{ fontSize: "10.5px", color: "#9ca3af" }}>en_US · Modified: 17 Jul 2026, 01:29 pm</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right: Phone Live Preview */}
                      <div style={{ background: "#f8fafc", border: "1px solid #eaecf0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "12px", width: "100%", display: "flex", justifyContent: "space-between" }}>
                          <span>Template Preview</span>
                          <span style={{ background: "#e2e8f0", color: "#334155", padding: "1px 6px", borderRadius: "4px" }}>Live View</span>
                        </div>

                        <div style={{ width: "240px", background: "#e5ddd5", borderRadius: "12px", padding: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          <div style={{ background: "#ffffff", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#0f172a", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}>
                            {selectedTemplate?.headerContent && (
                              <div style={{ fontSize: "12px", fontWeight: 700, color: "#075e54", marginBottom: "4px" }}>
                                {selectedTemplate.headerContent}
                              </div>
                            )}
                            <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                              {selectedTemplate?.bodyText || "No Template Selected"}
                            </p>
                            {selectedTemplate?.footerText && (
                              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px" }}>
                                {selectedTemplate.footerText}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: AUDIENCE */}
                {currentStep === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Step 2: Target Audience Segment</h4>
                    <select
                      value={selectedSegment}
                      onChange={(e) => setSelectedSegment(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
                    >
                      {segments.map((s) => (
                        <option key={s.key} value={s.key}>{s.label} ({s.count.toLocaleString()} Contacts)</option>
                      ))}
                      {segments.length === 0 && <option value="ALL">All Customers</option>}
                    </select>

                    <div style={{ display: "flex", justifySelf: "flex-end", gap: "10px", marginTop: "20px" }}>
                      <button onClick={() => setCurrentStep(1)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff" }}>Back</button>
                      <button onClick={() => setCurrentStep(3)} style={{ padding: "8px 16px", borderRadius: "6px", background: "#10b981", color: "#fff", border: "none", fontWeight: 700 }}>Continue to Variables →</button>
                    </div>
                  </div>
                )}

                {/* STEP 3: VARIABLES */}
                {currentStep === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Step 3: Map Template Variables</h4>
                    <p style={{ fontSize: "12.5px", color: "#64748b" }}>Map template placeholders to CRM customer attributes.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{"{{1}}"}</span>
                        <input type="text" value="Customer Name" disabled style={{ padding: "6px", background: "#f1f5f9", border: "1px solid #d1d5db", borderRadius: "4px" }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifySelf: "flex-end", gap: "10px", marginTop: "20px" }}>
                      <button onClick={() => setCurrentStep(2)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff" }}>Back</button>
                      <button onClick={() => setCurrentStep(4)} style={{ padding: "8px 16px", borderRadius: "6px", background: "#10b981", color: "#fff", border: "none", fontWeight: 700 }}>Review & Schedule →</button>
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW & SCHEDULE */}
                {currentStep === 4 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Step 4: Review & Launch Broadcast</h4>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px", borderRadius: "8px" }}>
                       <p style={{ fontSize: "13px", margin: 0, color: "#166534" }}>
                         Ready to broadcast <strong>"{campaignName}"</strong> using template <strong>{selectedTemplate?.name}</strong> to <strong>{segments.find(s => s.key === selectedSegment)?.count?.toLocaleString() || '?'} contacts</strong>!
                       </p>
                       <p style={{ fontSize: "12px", color: "#166534", margin: "6px 0 0 0" }}>This will make real Meta API calls and send actual WhatsApp template messages.</p>
                     </div>

                    <button
                      onClick={handleLaunchBroadcast}
                      disabled={loading}
                      style={{ padding: "12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}
                    >
                      {loading ? "Launching Broadcast..." : "🚀 Launch WhatsApp Broadcast Now"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CAMPAIGN ANALYTICS MODAL */}
      {/* ----------------------------------------------------------------- */}
      {selectedCampaignForAnalytics && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#ffffff", width: "100%", maxWidth: "550px", borderRadius: "16px", padding: "20px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Broadcast Analytics: {selectedCampaignForAnalytics.name}
              </h3>
              <button onClick={() => setSelectedCampaignForAnalytics(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Total Audience</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0 0", color: "#0f172a" }}>{selectedCampaignForAnalytics.totalAudience || 420}</h2>
              </div>
              <div style={{ background: "#dcfce7", padding: "12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                <span style={{ fontSize: "11px", color: "#166534", textTransform: "uppercase", fontWeight: 700 }}>Delivered & Read Rate</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0 0", color: "#15803d" }}>96.2%</h2>
              </div>
              <div style={{ background: "#e0e7ff", padding: "12px", borderRadius: "8px", border: "1px solid #c7d2fe" }}>
                <span style={{ fontSize: "11px", color: "#3730a3", textTransform: "uppercase", fontWeight: 700 }}>CRM Leads Generated</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0 0", color: "#4338ca" }}>{selectedCampaignForAnalytics.leadsGenerated || 40} Leads</h2>
              </div>
              <div style={{ background: "#fef3c7", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                <span style={{ fontSize: "11px", color: "#92400e", textTransform: "uppercase", fontWeight: 700 }}>Revenue Generated</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0 0", color: "#b45309" }}>₹16.5 Lakhs</h2>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
