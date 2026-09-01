"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Settings, 
  Plus, 
  Check, 
  Star, 
  Eye, 
  Edit3, 
  Trash2, 
  FileText, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  Download, 
  Printer, 
  Palette, 
  Type, 
  Sliders, 
  QrCode, 
  Landmark, 
  ShieldCheck, 
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Receipt,
  Truck,
  FileMinus,
  CreditCard,
  Building,
  Wallet,
  Layers,
  BookOpen
} from "lucide-react";
import { 
  TemplateConfig, 
  setDefaultCategoryTemplate, 
  saveCategoryTemplate, 
  saveExportFileNameConfig 
} from "@/app/actions/templateActions";
import "@/components/ui/modal.css";

interface CategoryMeta {
  key: string;
  label: string;
  icon: any;
  defaultTitle: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "quotes", label: "Quotes", icon: FileSpreadsheet, defaultTitle: "ESTIMATE / QUOTATION" },
  { key: "sales_orders", label: "Sales Orders", icon: FileText, defaultTitle: "SALES ORDER" },
  { key: "delivery_challans", label: "Delivery Challans", icon: Truck, defaultTitle: "DELIVERY CHALLAN" },
  { key: "invoices", label: "Invoices", icon: Receipt, defaultTitle: "TAX INVOICE" },
  { key: "credit_notes", label: "Credit Notes", icon: FileMinus, defaultTitle: "CREDIT NOTE" },
  { key: "purchase_orders", label: "Purchase Orders", icon: Layers, defaultTitle: "PURCHASE ORDER" },
  { key: "payment_receipts", label: "Payment Receipts", icon: CreditCard, defaultTitle: "PAYMENT RECEIPT" },
  { key: "customer_statements", label: "Customer Statements", icon: BookOpen, defaultTitle: "STATEMENT OF ACCOUNTS" },
  { key: "bills", label: "Bills", icon: FileText, defaultTitle: "PURCHASE BILL" },
  { key: "expenses", label: "Expenses", icon: Wallet, defaultTitle: "EXPENSE VOUCHER" },
  { key: "vendor_credits", label: "Vendor Credits", icon: FileMinus, defaultTitle: "DEBIT NOTE" },
  { key: "vendor_payments", label: "Vendor Payments", icon: CreditCard, defaultTitle: "PAYMENT ADVICE" },
  { key: "vendor_statements", label: "Vendor Statements", icon: BookOpen, defaultTitle: "VENDOR STATEMENT" },
  { key: "journals", label: "Journals", icon: BookOpen, defaultTitle: "JOURNAL VOUCHER" },
  { key: "quantity_adjustments", label: "Quantity Adjustments", icon: Sliders, defaultTitle: "STOCK ADJUSTMENT MEMO" },
];

const THEME_COLORS = [
  { label: "Classic Black", value: "#0f172a" },
  { label: "Indigo Royal", value: "#4f46e5" },
  { label: "Ocean Blue", value: "#0284c7" },
  { label: "Emerald Green", value: "#16a34a" },
  { label: "Crimson Rose", value: "#e11d48" },
  { label: "Slate Gray", value: "#475569" },
  { label: "Teal Modern", value: "#0d9488" },
  { label: "Amber Warm", value: "#d97706" },
];

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Record<string, TemplateConfig[]> }) {
  const [activeCategory, setActiveCategory] = useState<string>("invoices");
  const [templatesMap, setTemplatesMap] = useState<Record<string, TemplateConfig[]>>(initialTemplates);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Modals state
  const [editingTemplate, setEditingTemplate] = useState<TemplateConfig | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateConfig | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPattern, setExportPattern] = useState("{{DocumentNumber}}_{{CustomerName}}_{{Date}}");
  
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const currentCategoryMeta = CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[3];
  const currentTemplates = templatesMap[activeCategory] || [];

  const filteredTemplates = currentTemplates.filter(t => {
    if (statusFilter === "Default") return t.isDefault;
    if (statusFilter === "Custom") return t.isCustom;
    return true;
  });

  // Set as Default
  const handleSetDefault = async (templateId: string) => {
    setLoading(true);
    const res = await setDefaultCategoryTemplate(activeCategory, templateId);
    setLoading(false);
    if (res.success) {
      setTemplatesMap(prev => ({
        ...prev,
        [activeCategory]: (prev[activeCategory] || []).map(t => ({
          ...t,
          isDefault: t.id === templateId
        }))
      }));
      showToast(`Default template for ${currentCategoryMeta.label} updated!`);
    } else {
      alert(res.error || "Failed to set default template");
    }
  };

  // Open New Template Wizard
  const handleCreateNew = () => {
    const newTpl: TemplateConfig = {
      id: `${activeCategory}-custom-${Date.now()}`,
      name: `Custom ${currentCategoryMeta.label} Template`,
      category: activeCategory,
      isDefault: false,
      isCustom: true,
      themeColor: "#4f46e5",
      fontFamily: "Inter",
      documentTitle: currentCategoryMeta.defaultTitle,
      logoPosition: "left",
      logoSize: "medium",
      showHsn: true,
      showDiscount: true,
      showTaxBreakdown: true,
      showShippingAddress: true,
      showBankDetails: true,
      showQrCode: true,
      showSignatory: true,
      showTerms: true,
      showNotes: true,
      termsText: "1. Standard terms & conditions apply.\n2. Subject to local jurisdiction.",
      notesText: "Thank you for your business!",
      footerNote: "This is a computer generated document.",
      layoutStyle: "spreadsheet"
    };
    setEditingTemplate(newTpl);
  };

  // Save Template from Editor
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setLoading(true);
    const res = await saveCategoryTemplate(activeCategory, editingTemplate);
    setLoading(false);
    if (res.success && res.template) {
      setTemplatesMap(prev => {
        const list = prev[activeCategory] || [];
        const idx = list.findIndex(t => t.id === res.template.id);
        let updatedList: TemplateConfig[] = [];
        if (idx >= 0) {
          updatedList = list.map(t => t.id === res.template.id ? res.template : t);
        } else {
          updatedList = [...list, res.template];
        }
        if (res.template.isDefault) {
          updatedList = updatedList.map(t => ({ ...t, isDefault: t.id === res.template.id }));
        }
        return { ...prev, [activeCategory]: updatedList };
      });
      setEditingTemplate(null);
      showToast(`Template "${editingTemplate.name}" saved successfully!`);
    } else {
      alert(res.error || "Failed to save template");
    }
  };

  // Save Export File Name
  const handleSaveExportPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await saveExportFileNameConfig(activeCategory, exportPattern);
    setLoading(false);
    if (res.success) {
      setExportModalOpen(false);
      showToast("Export file naming format saved!");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "80vh" }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          fontSize: "0.875rem",
          fontWeight: 600,
          animation: "fadeIn 0.2s ease"
        }}>
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Split Layout: Left Categories Sidebar + Right Templates Pane */}
      <div style={{
        display: "flex",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
        minHeight: "750px"
      }}>
        
        {/* ─── LEFT CATEGORIES SIDEBAR ─── */}
        <div style={{
          width: "240px",
          minWidth: "240px",
          borderRight: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ padding: "20px 20px 14px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
              Templates
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Customize PDF & Print layouts
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.key;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 20px",
                    border: "none",
                    backgroundColor: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#2563eb" : "#334155",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.86rem",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s ease",
                    borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent"
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "#f8fafc";
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Icon size={16} color={isActive ? "#2563eb" : "#64748b"} />
                    <span>{cat.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} color="#2563eb" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT MAIN TEMPLATES CONTENT ─── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 28px", backgroundColor: "#f8fafc" }}>
          
          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>
                {currentCategoryMeta.label} Templates
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Choose the default visual template and formatting for all generated {currentCategoryMeta.label.toLowerCase()}.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Configure Export File Name */}
              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
              >
                <Settings size={15} color="#4f46e5" /> Configure Export File Name
              </button>

              {/* New Template Button */}
              <button
                type="button"
                onClick={handleCreateNew}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(37,99,235,0.3)",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#2563eb"; }}
              >
                <Plus size={16} /> New
              </button>
            </div>
          </div>

          {/* Status Filter Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b" }}>Status :</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#1e293b",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="All">All ({currentTemplates.length})</option>
              <option value="Default">Default Only</option>
              <option value="Custom">Custom Templates</option>
            </select>
          </div>

          {/* ─── TEMPLATE CARDS GALLERY GRID ─── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
            alignItems: "stretch"
          }}>
            {filteredTemplates.map(tpl => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                categoryLabel={currentCategoryMeta.label}
                onSetDefault={() => handleSetDefault(tpl.id)}
                onEdit={() => setEditingTemplate(tpl)}
                onPreview={() => setPreviewTemplate(tpl)}
              />
            ))}

            {/* + NEW TEMPLATE CALLOUT CARD */}
            <div
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: "14px",
                backgroundColor: "#ffffff",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                minHeight: "380px",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px"
              }}>
                <Sparkles size={24} color="#2563eb" />
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                New Template
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5, maxWidth: "230px" }}>
                Click to add a template from our gallery. You can customize the template title, columns, and headers in line item table.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(37,99,235,0.25)"
                }}
              >
                <Plus size={16} /> New
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── MODAL 1: TEMPLATE CUSTOMIZER / LIVE EDITOR ─── */}
      {editingTemplate && (
        <div className="modal-backdrop" onClick={() => setEditingTemplate(null)}>
          <div 
            className="modal-content glass-panel animate-in" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: "1000px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}
          >
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Palette size={18} color="#2563eb" /> Customize {currentCategoryMeta.label} Template
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Live visual editor • Changes apply in real-time to the preview
                </p>
              </div>
              <button className="close-btn" onClick={() => setEditingTemplate(null)}>×</button>
            </div>

            {/* Modal Split Body: Left Controls + Right Live Preview */}
            <form onSubmit={handleSaveTemplate} style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              
              {/* Left Controls (Scrollable) */}
              <div style={{ width: "380px", minWidth: "380px", borderRight: "1px solid #e2e8f0", padding: "20px", overflowY: "auto", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Template Name */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>

                {/* Document Heading */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                    Document Title Header
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.documentTitle}
                    onChange={e => setEditingTemplate({ ...editingTemplate, documentTitle: e.target.value })}
                    placeholder="e.g. TAX INVOICE, ESTIMATE"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
                  />
                </div>

                {/* Color Palette */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Primary Theme Color
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {THEME_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditingTemplate({ ...editingTemplate, themeColor: c.value })}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: c.value,
                          border: editingTemplate.themeColor === c.value ? "3px solid #ffffff" : "2px solid transparent",
                          boxShadow: editingTemplate.themeColor === c.value ? "0 0 0 2px #2563eb" : "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title={c.label}
                      >
                        {editingTemplate.themeColor === c.value && <Check size={14} color="#ffffff" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Style */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                    Layout Style
                  </label>
                  <select
                    value={editingTemplate.layoutStyle}
                    onChange={e => setEditingTemplate({ ...editingTemplate, layoutStyle: e.target.value as any })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
                  >
                    <option value="spreadsheet">Spreadsheet Grid (Tally / Zoho Standard)</option>
                    <option value="standard">Standard Minimalist</option>
                    <option value="classic">Classic GST Boxed Border</option>
                    <option value="modern">Modern Colored Accent</option>
                  </select>
                </div>

                {/* Font Family */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
                    Font Family
                  </label>
                  <select
                    value={editingTemplate.fontFamily}
                    onChange={e => setEditingTemplate({ ...editingTemplate, fontFamily: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
                  >
                    <option value="Inter">Inter (Clean Modern)</option>
                    <option value="Roboto">Roboto (Geometric)</option>
                    <option value="Helvetica">Helvetica / Arial</option>
                    <option value="Times New Roman">Classic Serif</option>
                  </select>
                </div>

                {/* Section Toggles */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                    Fields & Columns Display
                  </div>
                  
                  {[
                    { key: "showHsn", label: "Show HSN / SAC Code Column" },
                    { key: "showDiscount", label: "Show Discount Column & Slab" },
                    { key: "showTaxBreakdown", label: "Show GST Rate & Tax Breakdown" },
                    { key: "showShippingAddress", label: "Show Shipping / Dispatch Address" },
                    { key: "showBankDetails", label: "Show Bank & UPI Payment Details" },
                    { key: "showQrCode", label: "Show Scan-to-Pay UPI QR Code" },
                    { key: "showSignatory", label: "Show Authorized Signatory Box" },
                    { key: "showTerms", label: "Show Terms & Conditions" },
                    { key: "showNotes", label: "Show Customer Notes" },
                  ].map(toggle => (
                    <label 
                      key={toggle.key}
                      style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "#475569", marginBottom: "6px", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={!!(editingTemplate as any)[toggle.key]}
                        onChange={e => setEditingTemplate({ ...editingTemplate, [toggle.key]: e.target.checked })}
                      />
                      <span>{toggle.label}</span>
                    </label>
                  ))}
                </div>

                {/* Default checkbox */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editingTemplate.isDefault}
                      onChange={e => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                    />
                    <span>⭐ Set as Default for {currentCategoryMeta.label}</span>
                  </label>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingTemplate(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" style={{ flex: 1 }} disabled={loading}>
                    {loading ? "Saving..." : "Save Template"}
                  </button>
                </div>
              </div>

              {/* Right Live Preview Area */}
              <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", justifyContent: "center", backgroundColor: "#e2e8f0" }}>
                <div style={{ maxWidth: "560px", width: "100%" }}>
                  <LiveTemplatePreview template={editingTemplate} />
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: FULL PREVIEW MODAL ─── */}
      {previewTemplate && (
        <div className="modal-backdrop" onClick={() => setPreviewTemplate(null)}>
          <div className="modal-content glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  {previewTemplate.name} — Preview
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Category: <strong>{currentCategoryMeta.label}</strong>
                </p>
              </div>
              <button className="close-btn" onClick={() => setPreviewTemplate(null)}>×</button>
            </div>
            
            <div style={{ padding: "16px", backgroundColor: "#f1f5f9", borderRadius: "10px", marginTop: "12px" }}>
              <LiveTemplatePreview template={previewTemplate} />
            </div>

            <div className="modal-footer" style={{ marginTop: "16px", display: "flex", justifyContent: "space-between" }}>
              <div>
                {!previewTemplate.isDefault && (
                  <button
                    type="button"
                    onClick={() => { handleSetDefault(previewTemplate.id); setPreviewTemplate(null); }}
                    style={{ padding: "8px 14px", borderRadius: "7px", backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    ⭐ Set as Default
                  </button>
                )}
              </div>
              <button type="button" className="primary-btn" onClick={() => setPreviewTemplate(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: EXPORT FILE NAME CONFIG MODAL ─── */}
      {exportModalOpen && (
        <div className="modal-backdrop" onClick={() => setExportModalOpen(false)}>
          <div className="modal-content glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Settings size={18} color="#4f46e5" /> Configure Export File Name
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  For {currentCategoryMeta.label} PDF downloads and email attachments
                </p>
              </div>
              <button className="close-btn" onClick={() => setExportModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSaveExportPattern} className="modal-body" style={{ marginTop: "14px" }}>
              <div className="vertical-group">
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
                  File Name Pattern *
                </label>
                <input
                  type="text"
                  required
                  value={exportPattern}
                  onChange={e => setExportPattern(e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.88rem", width: "100%" }}
                />
              </div>

              {/* Available Tags */}
              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                  Available Placeholders (click to insert):
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["{{DocumentNumber}}", "{{CustomerName}}", "{{Date}}", "{{CompanyGSTIN}}"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setExportPattern(prev => `${prev}_${tag}`)}
                      style={{ padding: "3px 8px", borderRadius: "4px", backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div style={{ marginTop: "14px", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                <span style={{ color: "#64748b" }}>Preview: </span>
                <strong style={{ color: "#0f172a" }}>
                  {exportPattern
                    .replace("{{DocumentNumber}}", "INV-2026-00015")
                    .replace("{{CustomerName}}", "SonuGarments")
                    .replace("{{Date}}", "24Aug2026")
                    .replace("{{CompanyGSTIN}}", "06AAHCE7721Q1Z4")}.pdf
                </strong>
              </div>

              <div className="modal-footer" style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn-secondary" onClick={() => setExportModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>Save Setting</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── TEMPLATE CARD SUB-COMPONENT ───
function TemplateCard({
  template,
  categoryLabel,
  onSetDefault,
  onEdit,
  onPreview
}: {
  template: TemplateConfig;
  categoryLabel: string;
  onSetDefault: () => void;
  onEdit: () => void;
  onPreview: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Paper Thumbnail Box */}
      <div
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: template.isDefault ? "2px solid #2563eb" : "1px solid #cbd5e1",
          boxShadow: isHovered ? "0 10px 25px rgba(0,0,0,0.1)" : "0 2px 6px rgba(0,0,0,0.04)",
          padding: "16px",
          height: "360px",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Default Badge */}
        {template.isDefault && (
          <div style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            backgroundColor: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fde68a",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            zIndex: 10
          }}>
            <Star size={11} fill="#d97706" color="#d97706" /> DEFAULT
          </div>
        )}

        {/* Scaled Mini Document Preview */}
        <div style={{ flex: 1, transform: "scale(0.85)", transformOrigin: "top center", pointerEvents: "none" }}>
          <MiniDocumentPreview template={template} />
        </div>

        {/* Hover Action Overlay */}
        {isHovered && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(2px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "20px",
            animation: "fadeIn 0.15s ease",
            zIndex: 20
          }}>
            {!template.isDefault && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onSetDefault(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "7px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
                }}
              >
                <Star size={13} /> Set as Default
              </button>
            )}

            <button
              type="button"
              onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <Edit3 size={13} /> Customize / Edit
            </button>

            <button
              type="button"
              onClick={e => { e.stopPropagation(); onPreview(); }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "7px",
                border: "none",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
        )}
      </div>

      {/* Title Below */}
      <div style={{ textAlign: "center" }}>
        <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>{template.name}</strong>
      </div>
    </div>
  );
}

// ─── MINI PREVIEW (CARD THUMBNAIL) ───
function MiniDocumentPreview({ template }: { template: TemplateConfig }) {
  return (
    <div style={{
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      padding: "16px",
      fontSize: "8px",
      color: "#334155",
      fontFamily: template.fontFamily || "Inter",
      lineHeight: 1.3
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${template.themeColor}`, paddingBottom: "8px", marginBottom: "8px" }}>
        <div>
          <div style={{ width: "22px", height: "22px", borderRadius: "5px", backgroundColor: template.themeColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "10px" }}>
            E
          </div>
          <div style={{ fontWeight: 800, fontSize: "9px", marginTop: "2px", color: "#0f172a" }}>Espon Clothing Pvt Ltd</div>
          <div style={{ color: "#64748b", fontSize: "7px" }}>GSTIN: 06AAHCE7721Q1Z4</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: template.themeColor }}>{template.documentTitle || "TAX INVOICE"}</div>
          <div style={{ fontSize: "7px", color: "#64748b" }}>INV-2026-00015</div>
          <div style={{ fontSize: "7px", color: "#64748b" }}>Date: 24 Aug 2026</div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7px", marginBottom: "8px" }}>
        <div>
          <strong style={{ color: template.themeColor }}>Bill To:</strong>
          <div>Sonu Garments</div>
          <div>Delhi Road, Rohtak</div>
        </div>
        {template.showShippingAddress && (
          <div>
            <strong style={{ color: template.themeColor }}>Ship To:</strong>
            <div>Sonu Garments Warehouse</div>
            <div>Haryana (06)</div>
          </div>
        )}
      </div>

      {/* Mini Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7px", marginBottom: "8px" }}>
        <thead>
          <tr style={{ backgroundColor: template.themeColor, color: "#ffffff" }}>
            <th style={{ padding: "2px 4px", textAlign: "left" }}>Item & Description</th>
            {template.showHsn && <th style={{ padding: "2px 4px" }}>HSN</th>}
            <th style={{ padding: "2px 4px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "2px 4px", textAlign: "right" }}>Rate</th>
            <th style={{ padding: "2px 4px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "2px 4px" }}>Cotton Oversized Tee</td>
            {template.showHsn && <td style={{ padding: "2px 4px", textAlign: "center" }}>6109</td>}
            <td style={{ padding: "2px 4px", textAlign: "right" }}>50</td>
            <td style={{ padding: "2px 4px", textAlign: "right" }}>₹300</td>
            <td style={{ padding: "2px 4px", textAlign: "right" }}>₹15,000</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "2px 4px" }}>Cargo Joggers Track</td>
            {template.showHsn && <td style={{ padding: "2px 4px", textAlign: "center" }}>6203</td>}
            <td style={{ padding: "2px 4px", textAlign: "right" }}>20</td>
            <td style={{ padding: "2px 4px", textAlign: "right" }}>₹500</td>
            <td style={{ padding: "2px 4px", textAlign: "right" }}>₹10,000</td>
          </tr>
        </tbody>
      </table>

      {/* Summary */}
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "7px", marginBottom: "6px" }}>
        <div style={{ width: "90px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Taxable:</span> <strong>₹25,000</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST (12%):</span> <strong>₹3,000</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: "2px", fontWeight: 800, color: template.themeColor }}>
            <span>Total:</span> <span>₹28,000</span>
          </div>
        </div>
      </div>

      {/* Footer / Signature */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "4px", fontSize: "6px", color: "#94a3b8" }}>
        <div>Bank: ICICI Bank • A/C: 016805006415</div>
        {template.showSignatory && <div>Authorized Signatory</div>}
      </div>
    </div>
  );
}

// ─── LIVE FULL VISUAL PREVIEW ───
function LiveTemplatePreview({ template }: { template: TemplateConfig }) {
  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
      padding: "28px",
      fontFamily: template.fontFamily || "Inter",
      color: "#0f172a",
      fontSize: "0.82rem",
      lineHeight: 1.4,
      border: template.layoutStyle === "classic" ? `2px solid ${template.themeColor}` : "1px solid #e2e8f0"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: `2px solid ${template.themeColor}`,
        paddingBottom: "16px",
        marginBottom: "16px"
      }}>
        {/* Company Info */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: template.themeColor,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "16px"
            }}>
              E
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                Espon Clothing Private Limited
              </h3>
              <span style={{ fontSize: "0.74rem", color: "#64748b" }}>GSTIN: 06AAHCE7721Q1Z4 • PAN: AAHCE7721Q</span>
            </div>
          </div>
          <div style={{ fontSize: "0.76rem", color: "#475569", marginTop: "4px" }}>
            Sco 71A, 2nd Floor, Ashoka Plaza, Delhi Road, Rohtak, Haryana (124001)<br />
            Phone: +91 7206066678 • Email: clothingespon@gmail.com
          </div>
        </div>

        {/* Doc Title & Meta */}
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: template.themeColor, letterSpacing: "0.5px" }}>
            {template.documentTitle || "TAX INVOICE"}
          </h2>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
            #INV-2026-00015
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
            Date: <strong>24 Aug 2026</strong><br />
            Due Date: <strong>23 Sep 2026</strong> (Net 30)
          </div>
        </div>
      </div>

      {/* Buyer & Consignee */}
      <div style={{ display: "grid", gridTemplateColumns: template.showShippingAddress ? "1fr 1fr" : "1fr", gap: "16px", marginBottom: "16px", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: template.themeColor, textTransform: "uppercase" }}>
            Billed To (Customer):
          </div>
          <div style={{ fontWeight: 800, fontSize: "0.88rem", marginTop: "2px" }}>Sonu Garments</div>
          <div style={{ fontSize: "0.75rem", color: "#475569" }}>
            Delhi Road Market, Rohtak, Haryana (124001)<br />
            Phone: +91 9812345678 • GSTIN: 06ABCDE1234F1Z5
          </div>
        </div>

        {template.showShippingAddress && (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: template.themeColor, textTransform: "uppercase" }}>
              Shipped To (Delivery Destination):
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", marginTop: "2px" }}>Sonu Garments Main Hub</div>
            <div style={{ fontSize: "0.75rem", color: "#475569" }}>
              Sector 14 Industrial Area, Rohtak, Haryana<br />
              Place of Supply: Haryana (06)
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", marginBottom: "16px" }}>
        <thead>
          <tr style={{ backgroundColor: template.themeColor, color: "#ffffff" }}>
            <th style={{ padding: "8px 10px", textAlign: "left" }}>#</th>
            <th style={{ padding: "8px 10px", textAlign: "left" }}>Item & Description</th>
            {template.showHsn && <th style={{ padding: "8px 10px", textAlign: "center" }}>HSN/SAC</th>}
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate (₹)</th>
            {template.showDiscount && <th style={{ padding: "8px 10px", textAlign: "right" }}>Disc</th>}
            {template.showTaxBreakdown && <th style={{ padding: "8px 10px", textAlign: "right" }}>GST %</th>}
            <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            <td style={{ padding: "8px 10px" }}>1</td>
            <td style={{ padding: "8px 10px" }}>
              <strong>Heavy GSM Graphic T-Shirt</strong>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Bio-washed Cotton • Black / Size L</div>
            </td>
            {template.showHsn && <td style={{ padding: "8px 10px", textAlign: "center" }}>6109</td>}
            <td style={{ padding: "8px 10px", textAlign: "right" }}>50 Pcs</td>
            <td style={{ padding: "8px 10px", textAlign: "right" }}>₹300.00</td>
            {template.showDiscount && <td style={{ padding: "8px 10px", textAlign: "right" }}>0%</td>}
            {template.showTaxBreakdown && <td style={{ padding: "8px 10px", textAlign: "right" }}>12%</td>}
            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹15,000.00</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            <td style={{ padding: "8px 10px" }}>2</td>
            <td style={{ padding: "8px 10px" }}>
              <strong>Urban Relaxed Cargo Track Pants</strong>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Stretch Twill • Olive / Size XL</div>
            </td>
            {template.showHsn && <td style={{ padding: "8px 10px", textAlign: "center" }}>6203</td>}
            <td style={{ padding: "8px 10px", textAlign: "right" }}>20 Pcs</td>
            <td style={{ padding: "8px 10px", textAlign: "right" }}>₹500.00</td>
            {template.showDiscount && <td style={{ padding: "8px 10px", textAlign: "right" }}>5%</td>}
            {template.showTaxBreakdown && <td style={{ padding: "8px 10px", textAlign: "right" }}>12%</td>}
            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹9,500.00</td>
          </tr>
        </tbody>
      </table>

      {/* Summary Box & Bank Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "16px" }}>
        
        {/* Left: Bank / QR */}
        <div>
          {template.showBankDetails && (
            <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem", marginBottom: "8px" }}>
              <div style={{ fontWeight: 700, color: template.themeColor, marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Landmark size={13} /> Bank Payment Details:
              </div>
              <div>Account Name: <strong>ESPON CLOTHING PRIVATE LIMITED.</strong></div>
              <div>Account Number: <strong>016805006415</strong></div>
              <div>Bank & Branch: <strong>ICICI Bank, Rohtak Branch</strong></div>
              <div>IFSC Code: <strong>ICIC0000168</strong> • UPI: <strong>7206066678@OKBIZAXIS</strong></div>
            </div>
          )}

          {template.showTerms && (
            <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>
              <strong>Terms & Conditions:</strong><br />
              {template.termsText || "1. Goods once sold will not be returned. 2. Subject to local jurisdiction."}
            </div>
          )}
        </div>

        {/* Right: Totals Table */}
        <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
            <span style={{ color: "#64748b" }}>Taxable Amount:</span>
            <strong>₹24,500.00</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
            <span style={{ color: "#64748b" }}>CGST (6%):</span>
            <span>₹1,470.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
            <span style={{ color: "#64748b" }}>SGST (6%):</span>
            <span>₹1,470.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 900, borderTop: `2px solid ${template.themeColor}`, paddingTop: "6px", marginTop: "6px", color: template.themeColor }}>
            <span>Grand Total:</span>
            <span>₹27,440.00</span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px", textAlign: "right" }}>
            Amount in words: <em>Twenty Seven Thousand Four Hundred Forty Rupees Only</em>
          </div>
        </div>

      </div>

      {/* Authorized Signatory */}
      {template.showSignatory && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "12px" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            {template.footerNote || "Thank you for doing business with us."}
          </div>
          <div style={{ textAlign: "center", minWidth: "160px" }}>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#0f172a" }}>For Espon Clothing Pvt Ltd</div>
            <div style={{ height: "36px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontStyle: "italic", fontSize: "0.75rem" }}>
              [Digital Signature]
            </div>
            <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "3px", fontSize: "0.72rem", color: "#64748b" }}>
              Authorized Signatory
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
