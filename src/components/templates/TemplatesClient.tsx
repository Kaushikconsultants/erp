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
  BookOpen,
  Image as ImageIcon,
  Stamp,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2
} from "lucide-react";
import { 
  TemplateConfig, 
  TemplateCustomField,
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
  { key: "proforma_invoices", label: "Proforma Invoices", icon: Receipt, defaultTitle: "PROFORMA INVOICE" },
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
  { label: "Emerald Green", value: "#059669" },
  { label: "Crimson Rose", value: "#e11d48" },
  { label: "Slate Gray", value: "#475569" },
  { label: "Teal Modern", value: "#0d9488" },
  { label: "Amber Warm", value: "#d97706" },
  { label: "Violet Royal", value: "#7c3aed" },
  { label: "Burgundy", value: "#be123c" },
];

const FONTS = [
  { label: "Inter (Clean Modern)", value: "Inter" },
  { label: "Roboto (Geometric)", value: "Roboto" },
  { label: "Outfit (Brand Editorial)", value: "Outfit" },
  { label: "Poppins (Rounded Tech)", value: "Poppins" },
  { label: "Montserrat (Bold Corporate)", value: "Montserrat" },
  { label: "Space Grotesk (Tech Monospace)", value: "Space Grotesk" },
  { label: "Times New Roman (Classic Serif)", value: "Times New Roman" },
  { label: "Courier New (Typewriter/Thermal)", value: "Courier New" },
];

const WATERMARK_PRESETS = [
  "ORIGINAL FOR RECIPIENT",
  "DUPLICATE FOR TRANSPORTER",
  "TRIPLICATE FOR CONSIGNOR",
  "PAID",
  "DRAFT",
  "CANCELLED",
  "SAMPLE COPY",
  "AUDITED"
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
      termsText: "1. Standard commercial terms apply.\n2. Payment due as per agreed credit period.\n3. Subject to local jurisdiction.",
      notesText: "Thank you for your business!",
      footerNote: "This is a computer generated document.",
      layoutStyle: "default-app",
      borderStyle: "solid",
      headerStyle: "split",
      watermarkText: "",
      watermarkOpacity: 0.1,
      watermarkAngle: -30,
      customFields: [
        { id: "cf-new-1", label: "Place of Supply", value: "State Code (06)" },
        { id: "cf-new-2", label: "Due Date", value: "Immediate" }
      ]
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

  // Custom Field Management
  const handleAddCustomField = () => {
    if (!editingTemplate) return;
    const newField: TemplateCustomField = {
      id: `cf-${Date.now()}`,
      label: "Custom Field",
      value: "Sample Value"
    };
    setEditingTemplate({
      ...editingTemplate,
      customFields: [...(editingTemplate.customFields || []), newField]
    });
  };

  const handleUpdateCustomField = (id: string, field: "label" | "value", val: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      customFields: (editingTemplate.customFields || []).map(cf => 
        cf.id === id ? { ...cf, [field]: val } : cf
      )
    });
  };

  const handleRemoveCustomField = (id: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      customFields: (editingTemplate.customFields || []).filter(cf => cf.id !== id)
    });
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
          width: "250px",
          minWidth: "250px",
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
                <Plus size={16} /> New Template
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

          {/* ─── TEMPLATE CARDS GALLERY GRID (10 UNIQUE TEMPLATES) ─── */}
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
                Create New Style
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5, maxWidth: "230px" }}>
                Customize fonts, theme colors, watermarks, custom lines, and field columns for {currentCategoryMeta.label}.
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
                <Plus size={16} /> New Template
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── MODAL 1: ADVANCED TEMPLATE CUSTOMIZER / LIVE VISUAL EDITOR ─── */}
      {editingTemplate && (
        <div className="modal-backdrop" onClick={() => setEditingTemplate(null)}>
          <div 
            className="template-customizer-dialog animate-in" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: "1360px", 
              width: "96vw", 
              height: "94vh", 
              display: "flex", 
              flexDirection: "column", 
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4)",
              border: "1px solid #cbd5e1",
              padding: "0", 
              overflow: "hidden",
              position: "relative",
              zIndex: 100000,
              boxSizing: "border-box"
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Palette size={20} color="#2563eb" /> Customize {currentCategoryMeta.label} Template
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Select fonts, styles, add custom lines, watermark, and configure all mandatory print fields in real-time.
                </p>
              </div>
              <button className="close-btn" onClick={() => setEditingTemplate(null)}>×</button>
            </div>

            {/* Split Screen Container: Left Controls Form + Right Live Preview */}
            <div style={{ 
              display: "flex", 
              flexDirection: "row", 
              flex: 1, 
              minHeight: 0, 
              width: "100%", 
              overflow: "hidden" 
            }}>
              
              {/* Left Controls (Scrollable Form) */}
              <form 
                onSubmit={handleSaveTemplate}
                style={{ 
                  width: "450px", 
                  minWidth: "450px", 
                  maxWidth: "450px", 
                  borderRight: "1px solid #cbd5e1", 
                  padding: "20px", 
                  overflowY: "auto", 
                  backgroundColor: "#f8fafc", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "18px", 
                  height: "100%", 
                  boxSizing: "border-box",
                  margin: 0
                }}
              >
                
                {/* 1. Template Identity */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={15} color="#2563eb" /> Template Identity
                  </div>
                  
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
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

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
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
                </div>

                {/* 2. Typography & Layout Styles */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Type size={15} color="#4f46e5" /> Typography & Layout Styles
                  </div>

                  {/* Font Family Selector */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Font Family
                    </label>
                    <select
                      value={editingTemplate.fontFamily}
                      onChange={e => setEditingTemplate({ ...editingTemplate, fontFamily: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
                    >
                      {FONTS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Layout Style */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Visual Layout Structure
                    </label>
                    <select
                      value={editingTemplate.layoutStyle}
                      onChange={e => setEditingTemplate({ ...editingTemplate, layoutStyle: e.target.value as any })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
                    >
                      <option value="default-app">Default App Template (Zoho/Standard ERP)</option>
                      <option value="spreadsheet">Spreadsheet Excel Grid</option>
                      <option value="standard">Standard Minimalist</option>
                      <option value="classic">Classic GST Boxed</option>
                      <option value="modern">Modern Minimalist Accent</option>
                      <option value="banner">Bold Colored Brand Banner</option>
                      <option value="thermal">Compact Thermal POS Slip</option>
                      <option value="centered">Elegant Centered Formal</option>
                      <option value="two-tone">Two-Tone Executive</option>
                      <option value="audit">Detailed Multi-Column Audit</option>
                      <option value="tech">Borderless High-Contrast Tech</option>
                    </select>
                  </div>

                  {/* Theme Color Palette */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Primary Accent Theme Color
                    </label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {THEME_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditingTemplate({ ...editingTemplate, themeColor: c.value })}
                          style={{
                            width: "26px",
                            height: "26px",
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
                          {editingTemplate.themeColor === c.value && <Check size={12} color="#ffffff" />}
                        </button>
                      ))}
                      <input
                        type="color"
                        value={editingTemplate.themeColor}
                        onChange={e => setEditingTemplate({ ...editingTemplate, themeColor: e.target.value })}
                        style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #cbd5e1", padding: 0, cursor: "pointer" }}
                        title="Custom Color"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Logo & Watermark Settings */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Stamp size={15} color="#059669" /> Logo & Watermark Settings
                  </div>

                  {/* Logo Position & Size */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                        Logo Position
                      </label>
                      <select
                        value={editingTemplate.logoPosition}
                        onChange={e => setEditingTemplate({ ...editingTemplate, logoPosition: e.target.value as any })}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#fff" }}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="none">Hide Logo</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                        Logo Size
                      </label>
                      <select
                        value={editingTemplate.logoSize}
                        onChange={e => setEditingTemplate({ ...editingTemplate, logoSize: e.target.value as any })}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#fff" }}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>

                  {/* Watermark Text */}
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Watermark Stamp Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ORIGINAL, PAID, DRAFT"
                      value={editingTemplate.watermarkText || ""}
                      onChange={e => setEditingTemplate({ ...editingTemplate, watermarkText: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "0.82rem", boxSizing: "border-box" }}
                    />
                    {/* Watermark Presets */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                      {WATERMARK_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditingTemplate({ ...editingTemplate, watermarkText: preset })}
                          style={{
                            padding: "2px 7px",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: editingTemplate.watermarkText === preset ? "#eff6ff" : "#f8fafc",
                            color: editingTemplate.watermarkText === preset ? "#2563eb" : "#64748b",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Watermark Opacity & Angle */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                        <span>Opacity</span>
                        <span>{Math.round((editingTemplate.watermarkOpacity || 0.1) * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0.04"
                        max="0.35"
                        step="0.02"
                        value={editingTemplate.watermarkOpacity || 0.1}
                        onChange={e => setEditingTemplate({ ...editingTemplate, watermarkOpacity: parseFloat(e.target.value) })}
                        style={{ width: "100%", accentColor: "#059669" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                        <span>Angle</span>
                        <span>{editingTemplate.watermarkAngle || -30}°</span>
                      </label>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="5"
                        value={editingTemplate.watermarkAngle || -30}
                        onChange={e => setEditingTemplate({ ...editingTemplate, watermarkAngle: parseInt(e.target.value) })}
                        style={{ width: "100%", accentColor: "#059669" }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Add New Lines / Custom Key-Value Fields */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sliders size={15} color="#e11d48" /> Custom Header Lines / Fields
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <Plus size={12} /> Add Line
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(editingTemplate.customFields || []).map(cf => (
                      <div key={cf.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="Label (e.g. PO No)"
                          value={cf.label}
                          onChange={e => handleUpdateCustomField(cf.id, "label", e.target.value)}
                          style={{ flex: "1 1 40%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={cf.value}
                          onChange={e => handleUpdateCustomField(cf.id, "value", e.target.value)}
                          style={{ flex: "1 1 50%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(cf.id)}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                          title="Delete line"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {(!editingTemplate.customFields || editingTemplate.customFields.length === 0) && (
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "6px 0" }}>
                        No custom lines added yet. Click &ldquo;Add Line&rdquo; to add custom PO No, Dispatch details, or Salesperson name.
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Field & Column Toggles */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a", marginBottom: "10px" }}>
                    Mandatory Columns & Sections
                  </div>
                  
                  {[
                    { key: "showHsn", label: "Show HSN / SAC Code Column" },
                    { key: "showDiscount", label: "Show Discount Column & Slabs" },
                    { key: "showTaxBreakdown", label: "Show GST Rate & Tax Breakdown" },
                    { key: "showShippingAddress", label: "Show Shipping / Delivery Address" },
                    { key: "showBankDetails", label: "Show Bank & Payment Details" },
                    { key: "showQrCode", label: "Show Scan-to-Pay Dynamic UPI QR" },
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

                {/* 6. Terms & Notes Multi-line Editor */}
                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 800, color: "#0f172a", marginBottom: "10px" }}>
                    Terms, Notes & Footer Text
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Terms & Conditions
                    </label>
                    <textarea
                      rows={3}
                      value={editingTemplate.termsText || ""}
                      onChange={e => setEditingTemplate({ ...editingTemplate, termsText: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Customer Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editingTemplate.notesText || ""}
                      onChange={e => setEditingTemplate({ ...editingTemplate, notesText: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Default checkbox */}
                <div style={{ padding: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editingTemplate.isDefault}
                      onChange={e => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                    />
                    <span>⭐ Set as Default for {currentCategoryMeta.label}</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingTemplate(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" style={{ flex: 1 }} disabled={loading}>
                    {loading ? "Saving..." : "Save Template"}
                  </button>
                </div>

              </form>

              {/* Right Live Preview Area */}
              <div style={{ 
                flex: 1, 
                minWidth: 0, 
                height: "100%", 
                display: "flex", 
                flexDirection: "column", 
                backgroundColor: "#64748b", 
                overflow: "hidden" 
              }}>
                {/* Real-time Preview Toolbar Banner */}
                <div style={{ 
                  padding: "10px 20px", 
                  backgroundColor: "#1e293b", 
                  color: "#ffffff", 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  flexShrink: 0,
                  borderBottom: "1px solid #334155"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.82rem", fontWeight: 700 }}>
                    <Eye size={16} color="#38bdf8" />
                    <span>Real-Time Live Document Preview</span>
                    <span style={{ backgroundColor: "#334155", color: "#94a3b8", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem" }}>
                      {currentCategoryMeta.label}
                    </span>
                    <span style={{ backgroundColor: "#0284c7", color: "#ffffff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem" }}>
                      {editingTemplate.layoutStyle || "default-app"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }}></span>
                    Live Sync Active
                  </div>
                </div>

                {/* Preview Scrollable Canvas */}
                <div style={{ 
                  flex: 1, 
                  overflowY: "auto", 
                  padding: "30px 24px 60px 24px", 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "flex-start",
                  backgroundColor: "#64748b"
                }}>
                  <div style={{ maxWidth: editingTemplate.layoutStyle === "thermal" ? "400px" : "780px", width: "100%" }}>
                    <LiveTemplatePreview template={editingTemplate} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: FULL PREVIEW MODAL ─── */}
      {previewTemplate && (
        <div className="modal-backdrop" onClick={() => setPreviewTemplate(null)}>
          <div className="modal-content glass-panel animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  {previewTemplate.name} — Preview
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Category: <strong>{currentCategoryMeta.label}</strong> • Layout: <strong>{previewTemplate.layoutStyle}</strong>
                </p>
              </div>
              <button className="close-btn" onClick={() => setPreviewTemplate(null)}>×</button>
            </div>
            
            <div style={{ padding: "20px", backgroundColor: "#cbd5e1", borderRadius: "10px", marginTop: "12px" }}>
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
          height: "370px",
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
        <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{template.name}</strong>
      </div>
    </div>
  );
}

// ─── HELPER: CATEGORY MOCK DATA PROVIDER ───
function getCategoryMockData(cat: string, docTitle: string) {
  switch (cat) {
    case "delivery_challans":
      return {
        title: docTitle || "DELIVERY CHALLAN",
        docNum: "DC-2026-00108",
        meta1: "Vehicle: HR-12-AJ-4921",
        meta2: "Transporter: Rohtak Express",
        h1: "Material / Item", h2: "Cartons", h3: "Qty (Pcs)",
        r1: ["Cotton Heavy Graphic Tees", "2 Boxes", "50 pcs"],
        r2: ["Cargo Joggers Track Pants", "1 Box", "20 pcs"],
        summaryLabel: "Total Packages:", summaryVal: "3 Boxes (70 Pcs)",
        extra: "Consignee: Sonu Garments Warehouse, Rohtak (06)"
      };
    case "payment_receipts":
      return {
        title: docTitle || "PAYMENT RECEIPT",
        docNum: "REC-2026-0089",
        meta1: "Mode: UPI / IMPS Transfer",
        meta2: "Against: Inv #INV-2026-0015",
        h1: "Particulars / Description", h2: "Ref / UTR", h3: "Amount Paid",
        r1: ["Payment Received (Sonu Garments)", "UTR428910248819", "₹25,000.00"],
        r2: ["Advance Settlement (Orders)", "REF-918234", "₹3,000.00"],
        summaryLabel: "Total Amount Received:", summaryVal: "₹28,000.00",
        extra: "In Words: Twenty-Eight Thousand Rupees Only"
      };
    case "customer_statements":
    case "vendor_statements":
      return {
        title: docTitle || (cat === "customer_statements" ? "STATEMENT OF ACCOUNTS" : "SUPPLIER PAYABLE LEDGER"),
        docNum: "STMT-2026-AUG",
        meta1: "Opening Balance: ₹0.00",
        meta2: "Period: 01 Aug - 31 Aug 2026",
        h1: "Date & Particulars", h2: "Debit (₹)", h3: "Running Bal",
        r1: ["10 Aug - Invoice #INV-0015", "28,000.00", "28,000.00 Dr"],
        r2: ["18 Aug - Payment #REC-0089", "-20,000.00", "8,000.00 Dr"],
        summaryLabel: "Closing Balance Due:", summaryVal: "₹8,000.00 Dr",
        extra: "Account: Sonu Garments (Client ID: CUST-014)"
      };
    case "credit_notes":
    case "vendor_credits":
      return {
        title: docTitle || (cat === "credit_notes" ? "CREDIT NOTE (SALES RETURN)" : "PURCHASE DEBIT NOTE"),
        docNum: "CN-2026-0012",
        meta1: "Orig Inv: #INV-2026-0015",
        meta2: "Reason: Size Mismatch Return",
        h1: "Returned Item", h2: "Return Qty", h3: "Credit Value",
        r1: ["Cotton Oversized Tee (Size L)", "10 pcs", "₹3,000.00"],
        r2: ["Cargo Joggers (Olive)", "5 pcs", "₹2,500.00"],
        summaryLabel: "Net Credit Amount:", summaryVal: "₹5,500.00",
        extra: "GST Reversal (12%): ₹660.00 Included"
      };
    case "expenses":
      return {
        title: docTitle || "EXPENSE CLAIM VOUCHER",
        docNum: "EXP-2026-0044",
        meta1: "Head: Factory Operations",
        meta2: "Paid via: Corporate Card",
        h1: "Expense Description", h2: "Category", h3: "Claimed (₹)",
        r1: ["Warehouse Packaging Material", "Logistics", "₹8,400.00"],
        r2: ["Courier & Freight Charges", "Shipping", "₹3,250.00"],
        summaryLabel: "Total Approved Expense:", summaryVal: "₹11,650.00",
        extra: "Paid To: Swift Logistic Solutions • Approved by Director"
      };
    case "journals":
      return {
        title: docTitle || "JOURNAL VOUCHER",
        docNum: "JV-2026-0018",
        meta1: "Entry Type: Double-Entry",
        meta2: "Ledger Folio: LF-42",
        h1: "Account Head & Narration", h2: "Dr (₹)", h3: "Cr (₹)",
        r1: ["Sales Return Account (Dr)", "5,500.00", "-"],
        r2: ["To Sonu Garments Debtors (Cr)", "-", "5,500.00"],
        summaryLabel: "Balanced Voucher Total:", summaryVal: "₹5,500.00",
        extra: "Narration: Being credit adjustment on goods return."
      };
    case "quantity_adjustments":
      return {
        title: docTitle || "STOCK ADJUSTMENT NOTE",
        docNum: "QA-2026-0009",
        meta1: "Warehouse: Rohtak Central",
        meta2: "Type: Physical Audit",
        h1: "Article / SKU", h2: "Book / Count", h3: "Variance",
        r1: ["Graphic Tee (BLK-L)", "150 / 160", "+10 pcs (Surplus)"],
        r2: ["Cargo Joggers (OLV-XL)", "80 / 78", "-2 pcs (Damaged)"],
        summaryLabel: "Net Stock Adjustment:", summaryVal: "+8 Units",
        extra: "Action: Audited & approved for inventory balance sync."
      };
    case "purchase_orders":
    case "bills":
      return {
        title: docTitle || (cat === "purchase_orders" ? "PURCHASE ORDER" : "VENDOR PURCHASE BILL"),
        docNum: "PO-2026-0038",
        meta1: "Supplier: Vardhman Textiles Ltd",
        meta2: "Delivery: Sector 14 Rohtak",
        h1: "Raw Material Specification", h2: "Weight", h3: "Amount",
        r1: ["Combed Cotton Single Jersey (180 GSM)", "500 Kg", "₹1,40,000.00"],
        r2: ["Rib Knit Collars (Bio-washed)", "50 Kg", "₹18,000.00"],
        summaryLabel: "Total Payable:", summaryVal: "₹1,58,000.00",
        extra: "Tax: GST (5%) ₹7,900.00 Included"
      };
    case "vendor_payments":
      return {
        title: docTitle || "PAYMENT ADVICE SLIP",
        docNum: "PA-2026-0062",
        meta1: "Beneficiary: Vardhman Textiles",
        meta2: "Mode: RTGS Ref #HDFC41908",
        h1: "Settled Bill No", h2: "Bill Date", h3: "Amount Disbursed",
        r1: ["BILL-2026-0038 (Raw Material)", "14 Aug 2026", "₹1,40,000.00"],
        r2: ["BILL-2026-0039 (Yarn Lots)", "18 Aug 2026", "₹18,000.00"],
        summaryLabel: "Total Remittance:", summaryVal: "₹1,58,000.00",
        extra: "Bank: HDFC Bank A/C ...5678 • Status: Disbursed"
      };
    default: // quotes, sales_orders, invoices
      return {
        title: docTitle || (cat === "quotes" ? "ESTIMATE / QUOTATION" : (cat === "sales_orders" ? "SALES ORDER" : "TAX INVOICE")),
        docNum: cat === "quotes" ? "QT-2026-0042" : (cat === "sales_orders" ? "SO-2026-0078" : "INV-2026-00015"),
        meta1: "Client: Sonu Garments, Rohtak",
        meta2: "Date: 24 Aug 2026",
        h1: "Item & Description", h2: "Qty", h3: "Amount (₹)",
        r1: ["Cotton Oversized Graphic Tee", "50 pcs", "15,000.00"],
        r2: ["Cargo Joggers Track Pants", "20 pcs", "10,000.00"],
        summaryLabel: cat === "quotes" ? "Total Quote Value:" : (cat === "sales_orders" ? "Order Total:" : "Invoice Grand Total:"),
        summaryVal: "₹28,000.00",
        extra: cat === "quotes" ? "Validity: 15 Days • 50% Advance with PO" : (cat === "sales_orders" ? "Delivery: 5-7 Days • Road Transport" : "GSTIN: 06AAHCE7721Q1Z4 • Net 30 Days")
      };
  }
}

// ─── MINI PREVIEW (CARD THUMBNAIL) ───
function MiniDocumentPreview({ template }: { template: TemplateConfig }) {
  const cat = template.category || "invoices";
  const theme = template.themeColor || "#2563eb";
  const font = template.fontFamily || "Inter";
  const style = template.layoutStyle || "default-app";
  const d = getCategoryMockData(cat, template.documentTitle);

  const watermarkText = template.watermarkText;
  const watermarkOpacity = template.watermarkOpacity || 0.1;
  const watermarkAngle = template.watermarkAngle || -30;

  return (
    <div style={{
      backgroundColor: "#ffffff",
      border: style === "classic" ? "2px solid #334155" : (style === "spreadsheet" ? "1.5px solid #64748b" : "1px solid #d1d5db"),
      borderRadius: style === "thermal" ? "0" : (style === "centered" ? "8px" : "4px"),
      padding: "10px",
      fontSize: "7px",
      color: "#0f172a",
      fontFamily: font,
      lineHeight: 1.3,
      position: "relative",
      overflow: "hidden",
      height: "100%",
      boxSizing: "border-box"
    }}>
      {/* Dynamic Watermark */}
      {watermarkText && (
        <div style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${watermarkAngle}deg)`,
          fontSize: "26px",
          fontWeight: 900,
          color: theme,
          opacity: watermarkOpacity,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          letterSpacing: "2px",
          zIndex: 0
        }}>
          {watermarkText}
        </div>
      )}

      {/* ── STYLE 1: DEFAULT APP TEMPLATE (ZOHO / STANDARD ERP) ── */}
      {style === "default-app" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "3px", backgroundColor: theme, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "9px" }}>
                H
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "8px", color: "#0f172a" }}>Heart of Business</div>
                <div style={{ fontSize: "6px", color: "#64748b" }}>GSTIN: 06AAHCE7721Q1Z4</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 900, color: theme, letterSpacing: "0.3px" }}>{d.title}</div>
              <div style={{ fontSize: "6.5px", fontWeight: 700, color: "#334155" }}>{d.docNum}</div>
            </div>
          </div>

          <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", display: "flex", marginBottom: "6px", fontSize: "6.5px", backgroundColor: "#f8fafc" }}>
            <div style={{ flex: 1, padding: "3px 6px", borderRight: "1px solid #cbd5e1" }}>
              <div><strong>Bill To:</strong> Sonu Garments, Rohtak</div>
              <div><strong>Date:</strong> 24 Aug 2026</div>
            </div>
            <div style={{ flex: 1, padding: "3px 6px" }}>
              <div><strong>Terms:</strong> Due on Receipt</div>
              {template.customFields && template.customFields.length > 0 && (
                <div><strong>{template.customFields[0].label}:</strong> {template.customFields[0].value}</div>
              )}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "6.5px", marginBottom: "6px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                <th style={{ padding: "3px" }}>#</th>
                <th style={{ padding: "3px" }}>Item</th>
                <th style={{ padding: "3px", textAlign: "right" }}>Qty</th>
                <th style={{ padding: "3px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: "2px 3px" }}>1</td><td style={{ padding: "2px 3px" }}>{d.r1[0]}</td><td style={{ padding: "2px 3px", textAlign: "right" }}>{d.r1[1]}</td><td style={{ padding: "2px 3px", textAlign: "right" }}>{d.r1[2]}</td></tr>
              <tr><td style={{ padding: "2px 3px" }}>2</td><td style={{ padding: "2px 3px" }}>{d.r2[0]}</td><td style={{ padding: "2px 3px", textAlign: "right" }}>{d.r2[1]}</td><td style={{ padding: "2px 3px", textAlign: "right" }}>{d.r2[2]}</td></tr>
            </tbody>
          </table>

          <div style={{ borderTop: "1.5px solid #cbd5e1", paddingTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "7px", fontWeight: 800 }}>
            <span style={{ color: "#64748b" }}>Total:</span>
            <span style={{ color: theme, fontSize: "8.5px" }}>{d.summaryVal}</span>
          </div>
        </div>
      )}

      {/* ── STYLE 2: SPREADSHEET / EXCEL GRID ── */}
      {style === "spreadsheet" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: theme, color: "#fff", padding: "3px 6px", borderRadius: "2px", marginBottom: "5px", fontWeight: 700 }}>
            <span>📊 {d.title}</span>
            <span>{d.docNum}</span>
          </div>
          <div style={{ border: "1px solid #cbd5e1", padding: "3px", marginBottom: "4px", fontSize: "6.5px" }}>
            <div>{d.meta1} | {d.meta2}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "6px" }}>
            <thead>
              <tr style={{ backgroundColor: "#e2e8f0" }}>
                <th style={{ border: "1px solid #94a3b8", padding: "2px" }}>{d.h1}</th>
                <th style={{ border: "1px solid #94a3b8", padding: "2px" }}>{d.h2}</th>
                <th style={{ border: "1px solid #94a3b8", padding: "2px" }}>{d.h3}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{d.r1[0]}</td><td style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{d.r1[1]}</td><td style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{d.r1[2]}</td></tr>
              <tr><td style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{d.r2[0]}</td><td style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{d.r2[1]}</td><td style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{d.r2[2]}</td></tr>
            </tbody>
          </table>
          <div style={{ textAlign: "right", marginTop: "4px", fontWeight: 800, color: theme }}>
            {d.summaryLabel} {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 3: BOLD BRAND BANNER ── */}
      {style === "banner" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ backgroundColor: theme, color: "#fff", padding: "6px 8px", margin: "-10px -10px 6px -10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "9px" }}>{d.title}</span>
            <span style={{ fontSize: "7px", opacity: 0.9 }}>{d.docNum}</span>
          </div>
          <div style={{ fontSize: "6.5px", marginBottom: "4px", color: "#475569" }}>{d.meta1}</div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "4px", marginBottom: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6.5px", fontWeight: 700 }}>
              <span>{d.r1[0]}</span><span>{d.r1[2]}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6.5px", fontWeight: 700 }}>
              <span>{d.r2[0]}</span><span>{d.r2[2]}</span>
            </div>
          </div>
          <div style={{ backgroundColor: "#f8fafc", padding: "4px", borderRadius: "3px", textAlign: "right", fontWeight: 800, color: theme }}>
            {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 4: COMPACT THERMAL POS SLIP ── */}
      {style === "thermal" && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 1, fontFamily: "Courier New, monospace" }}>
          <div style={{ fontWeight: 900, fontSize: "8.5px", borderBottom: "1px dashed #000", paddingBottom: "3px" }}>
            *** {d.title} ***
          </div>
          <div style={{ fontSize: "6px", margin: "3px 0" }}>{d.docNum} • 24-AUG-2026</div>
          <div style={{ borderBottom: "1px dashed #000", paddingBottom: "3px", textAlign: "left", fontSize: "6px" }}>
            <div>{d.r1[0]} x {d.r1[1]} = {d.r1[2]}</div>
            <div>{d.r2[0]} x {d.r2[1]} = {d.r2[2]}</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: "8px", marginTop: "4px" }}>
            TOTAL: {d.summaryVal}
          </div>
          <div style={{ fontSize: "5.5px", color: "#64748b", marginTop: "3px" }}>*** THANK YOU ***</div>
        </div>
      )}

      {/* ── STYLE 5: CLASSIC GST BOXED (TALLY STYLE) ── */}
      {style === "classic" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", borderBottom: "1px solid #334155", paddingBottom: "3px", marginBottom: "4px" }}>
            <div style={{ fontWeight: 900, fontSize: "8.5px", color: theme }}>{d.title}</div>
            <div style={{ fontSize: "5.5px", color: "#64748b" }}>Original for Recipient</div>
          </div>
          <div style={{ border: "1px solid #94a3b8", display: "flex", fontSize: "6px", marginBottom: "4px" }}>
            <div style={{ flex: 1, padding: "2px", borderRight: "1px solid #94a3b8" }}>Doc: {d.docNum}</div>
            <div style={{ flex: 1, padding: "2px" }}>Date: 24-Aug-2026</div>
          </div>
          <div style={{ fontSize: "6.5px", borderBottom: "1px solid #94a3b8", paddingBottom: "3px" }}>
            <div>{d.r1[0]} ({d.r1[1]}) - {d.r1[2]}</div>
            <div>{d.r2[0]} ({d.r2[1]}) - {d.r2[2]}</div>
          </div>
          <div style={{ textAlign: "right", fontWeight: 800, marginTop: "4px", fontSize: "7.5px", color: theme }}>
            Grand Total: {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 6: MODERN MINIMALIST ACCENT ── */}
      {style === "modern" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ borderLeft: `3px solid ${theme}`, paddingLeft: "6px", marginBottom: "6px" }}>
            <div style={{ fontSize: "9px", fontWeight: 800, color: theme }}>{d.title}</div>
            <div style={{ fontSize: "6px", color: "#64748b" }}>{d.docNum} • 24 Aug 2026</div>
          </div>
          <div style={{ fontSize: "6.5px", color: "#334155", marginBottom: "4px" }}>
            <div>{d.meta1}</div>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "4px", fontSize: "6.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r1[0]}</span><strong>{d.r1[2]}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r2[0]}</span><strong>{d.r2[2]}</strong></div>
          </div>
          <div style={{ marginTop: "6px", textAlign: "right", color: theme, fontWeight: 900, fontSize: "8px" }}>
            {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 7: ELEGANT CENTERED FORMAL ── */}
      {style === "centered" && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: theme, color: "#fff", margin: "0 auto 2px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: 800 }}>
            H
          </div>
          <div style={{ fontWeight: 800, fontSize: "8px", color: "#0f172a" }}>Heart of Business</div>
          <div style={{ fontSize: "7.5px", fontWeight: 900, color: theme, borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "2px 0", margin: "3px 0" }}>
            {d.title}
          </div>
          <div style={{ fontSize: "6px", color: "#64748b", marginBottom: "4px" }}>{d.docNum}</div>
          <div style={{ textAlign: "left", fontSize: "6.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r1[0]}</span><span>{d.r1[2]}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r2[0]}</span><span>{d.r2[2]}</span></div>
          </div>
          <div style={{ marginTop: "4px", borderTop: "1px solid #e2e8f0", paddingTop: "3px", fontWeight: 800, color: theme }}>
            {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 8: TWO-TONE EXECUTIVE ── */}
      {style === "two-tone" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${theme}`, paddingBottom: "4px", marginBottom: "4px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "8px", color: "#0f172a" }}>Heart of Business</div>
              <div style={{ fontSize: "5.5px", color: "#64748b" }}>{d.meta1}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, fontSize: "9px", color: theme }}>{d.title}</div>
              <div style={{ fontSize: "6px", color: "#334155" }}>{d.docNum}</div>
            </div>
          </div>
          <div style={{ fontSize: "6.5px", marginBottom: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r1[0]}</span><span>{d.r1[2]}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r2[0]}</span><span>{d.r2[2]}</span></div>
          </div>
          <div style={{ backgroundColor: "#f1f5f9", padding: "3px 6px", borderRadius: "3px", textAlign: "right", fontWeight: 800, color: theme }}>
            Total: {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 9: DETAILED MULTI-COLUMN AUDIT ── */}
      {style === "audit" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #475569", paddingBottom: "2px", marginBottom: "3px", fontWeight: 800, fontSize: "7.5px" }}>
            <span>AUDIT VOUCHER: {d.title}</span>
            <span>{d.docNum}</span>
          </div>
          <div style={{ fontSize: "5.5px", color: "#64748b", marginBottom: "3px" }}>HSN/SAC: 61091000 • GST Slab: 12% • Audited</div>
          <table style={{ width: "100%", fontSize: "6px", borderCollapse: "collapse" }}>
            <tr style={{ backgroundColor: "#f8fafc" }}><th>Particulars</th><th style={{ textAlign: "right" }}>Dr (₹)</th></tr>
            <tr><td>{d.r1[0]}</td><td style={{ textAlign: "right" }}>{d.r1[2]}</td></tr>
            <tr><td>{d.r2[0]}</td><td style={{ textAlign: "right" }}>{d.r2[2]}</td></tr>
          </table>
          <div style={{ borderTop: "1px solid #475569", marginTop: "3px", textAlign: "right", fontWeight: 800, fontSize: "7.5px" }}>
            Balanced: {d.summaryVal}
          </div>
        </div>
      )}

      {/* ── STYLE 10: BORDERLESS TECH ── */}
      {style === "tech" && (
        <div style={{ position: "relative", zIndex: 1, fontFamily: "Space Grotesk, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <div>
              <span style={{ fontSize: "9px", fontWeight: 900, color: theme, letterSpacing: "-0.5px" }}>// {d.title}</span>
            </div>
            <span style={{ fontSize: "6.5px", color: "#64748b", fontWeight: 700 }}>#{d.docNum}</span>
          </div>
          <div style={{ fontSize: "6px", color: "#334155", marginBottom: "4px" }}>
            <div>&gt; {d.meta1}</div>
          </div>
          <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "4px", fontSize: "6.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r1[0]}</span><span>{d.r1[2]}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{d.r2[0]}</span><span>{d.r2[2]}</span></div>
          </div>
          <div style={{ marginTop: "6px", textAlign: "right", fontWeight: 900, color: theme, fontSize: "8.5px" }}>
            {d.summaryVal}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── LIVE FULL-PAGE TEMPLATE PREVIEW (FOR MODAL) ───
function LiveTemplatePreview({ template }: { template: TemplateConfig }) {
  const cat = template.category || "invoices";
  const theme = template.themeColor || "#2563eb";
  const font = template.fontFamily || "Inter";
  const style = template.layoutStyle || "default-app";
  const d = getCategoryMockData(cat, template.documentTitle);

  const watermarkText = template.watermarkText;
  const watermarkOpacity = template.watermarkOpacity || 0.1;
  const watermarkAngle = template.watermarkAngle || -30;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: style === "thermal" ? "0" : (style === "spreadsheet" ? "4px" : "8px"),
        border: style === "classic" 
          ? "2px solid #0f172a" 
          : (style === "spreadsheet" 
            ? "2px solid #107c41" 
            : (style === "thermal" ? "1px dashed #334155" : "1px solid #cbd5e1")),
        boxShadow: "0 15px 35px rgba(0,0,0,0.18)",
        padding: style === "thermal" ? "20px" : (style === "banner" ? "0 0 36px 0" : "32px 36px"),
        fontFamily: style === "thermal" ? "Courier New, monospace" : font,
        color: "#0f172a",
        position: "relative",
        overflow: "hidden",
        minHeight: "550px",
        fontSize: style === "thermal" ? "11px" : "12px",
        lineHeight: 1.45,
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* Dynamic Watermark Stamp */}
      {watermarkText && (
        <div style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${watermarkAngle}deg)`,
          fontSize: style === "thermal" ? "32px" : "52px",
          fontWeight: 900,
          color: theme,
          opacity: watermarkOpacity,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          letterSpacing: "4px",
          zIndex: 0,
          userSelect: "none"
        }}>
          {watermarkText}
        </div>
      )}

      {/* ─── SPREADSHEET FORMULA BAR HEADER (WHEN SPREADSHEET STYLE) ─── */}
      {style === "spreadsheet" && (
        <div style={{ backgroundColor: "#107c41", color: "#ffffff", padding: "6px 14px", display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", fontWeight: 700, borderBottom: "2px solid #0b5a2f" }}>
          <span style={{ fontStyle: "italic", opacity: 0.9 }}>fx</span>
          <span style={{ backgroundColor: "#ffffff", color: "#107c41", padding: "2px 8px", borderRadius: "3px", flex: 1, fontFamily: "monospace", fontSize: "10.5px" }}>
            =DOCUMENT(&ldquo;{cat}&rdquo;, &ldquo;{d.docNum}&rdquo;, {d.summaryVal})
          </span>
          <span style={{ backgroundColor: "#0b5a2f", padding: "2px 8px", borderRadius: "3px", fontSize: "10px" }}>Sheet 1 (Active)</span>
        </div>
      )}

      {/* ─── BANNER FULL-WIDTH HEADER (WHEN BANNER STYLE) ─── */}
      {style === "banner" && (
        <div style={{ backgroundColor: theme, color: "#ffffff", padding: "24px 36px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {template.logoPosition !== "none" && (
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                color: theme,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "18px"
              }}>
                H
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px" }}>Heart of Business ERP</div>
              <div style={{ fontSize: "11px", opacity: 0.85 }}>Sector 14, Rohtak, Haryana 124001 • GSTIN: 06AAHCE7721Q1Z4</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#ffffff", letterSpacing: "0.5px" }}>
              {d.title}
            </h1>
            <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>
              {d.docNum}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, padding: style === "banner" ? "0 36px" : 0 }}>
        
        {/* Normal Header Block (For non-banner styles) */}
        {style !== "banner" && (
          <div style={{
            display: "flex",
            justifyContent: template.logoPosition === "center" ? "center" : "space-between",
            alignItems: "flex-start",
            borderBottom: style === "classic" ? "2px solid #0f172a" : (style === "modern" ? "none" : "2px solid #e2e8f0"),
            borderLeft: style === "modern" ? `5px solid ${theme}` : "none",
            paddingLeft: style === "modern" ? "14px" : 0,
            paddingBottom: "16px",
            marginBottom: "16px",
            flexDirection: template.logoPosition === "center" ? "column" : "row"
          }}>
            {/* Logo & Company info */}
            {template.logoPosition !== "none" && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{
                  width: template.logoSize === "large" ? "52px" : (template.logoSize === "small" ? "32px" : "42px"),
                  height: template.logoSize === "large" ? "52px" : (template.logoSize === "small" ? "32px" : "42px"),
                  borderRadius: style === "centered" ? "50%" : "8px",
                  backgroundColor: theme,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: template.logoSize === "large" ? "20px" : "16px"
                }}>
                  H
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>Heart of Business ERP</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Industrial Area, Sector 14, Rohtak, Haryana 124001</div>
                  <div style={{ fontSize: "11px", color: "#334155", fontWeight: 600 }}>GSTIN: 06AAHCE7721Q1Z4</div>
                </div>
              </div>
            )}

            {/* Document Title & Reference */}
            <div style={{ textAlign: template.logoPosition === "center" ? "center" : "right", marginTop: template.logoPosition === "center" ? "12px" : 0 }}>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: theme, letterSpacing: "0.5px" }}>
                {d.title}
              </h1>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                {d.docNum}
              </div>
              {style === "classic" && (
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, marginTop: "2px" }}>
                  (ORIGINAL FOR RECIPIENT)
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2-Column Meta & Custom Lines Box */}
        <div style={{
          border: style === "spreadsheet" 
            ? "1px solid #107c41" 
            : (style === "classic" ? "1px solid #0f172a" : "1px solid #cbd5e1"),
          borderRadius: style === "spreadsheet" || style === "classic" ? "0" : "6px",
          display: "flex",
          marginBottom: "16px",
          fontSize: "11px",
          backgroundColor: style === "spreadsheet" ? "#f0fdf4" : "#f8fafc"
        }}>
          <div style={{ flex: 1, padding: "10px 14px", borderRight: style === "classic" ? "1px solid #0f172a" : "1px solid #cbd5e1" }}>
            <div><strong>Party Details:</strong> Sonu Garments, Rohtak</div>
            <div><strong>Date:</strong> 24 Aug 2026</div>
            {template.showShippingAddress && (
              <div style={{ marginTop: "4px", color: "#475569" }}>
                <strong>Shipping Address:</strong> Warehouse #4, Gohana Road, Rohtak
              </div>
            )}
          </div>
          <div style={{ flex: 1, padding: "10px 14px" }}>
            <div><strong>Document Ref:</strong> {d.docNum}</div>
            <div><strong>Status:</strong> Confirmed</div>
            {/* Custom Lines Rendered Dynamically */}
            {(template.customFields || []).map(cf => (
              <div key={cf.id} style={{ marginTop: "2px" }}>
                <strong>{cf.label}:</strong> {cf.value}
              </div>
            ))}
          </div>
        </div>

        {/* Items Table */}
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse", 
          fontSize: "11.5px", 
          marginBottom: "16px",
          border: style === "spreadsheet" 
            ? "1px solid #107c41" 
            : (style === "classic" ? "1px solid #0f172a" : "none")
        }}>
          <thead>
            {/* Excel Column Coordinates (A, B, C, D...) */}
            {style === "spreadsheet" && (
              <tr style={{ backgroundColor: "#e2e8f0", color: "#64748b", fontSize: "10px", textAlign: "center" }}>
                <th style={{ border: "1px solid #cbd5e1", padding: "2px", width: "24px" }}></th>
                <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>A</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>B</th>
                {template.showHsn && <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>C</th>}
                <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{template.showHsn ? "D" : "C"}</th>
                <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{template.showHsn ? "E" : "D"}</th>
                {template.showDiscount && <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{template.showHsn ? "F" : "E"}</th>}
                <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>{template.showHsn ? (template.showDiscount ? "G" : "F") : (template.showDiscount ? "F" : "E")}</th>
              </tr>
            )}
            <tr style={{ 
              backgroundColor: style === "spreadsheet" ? "#dcfce7" : (style === "classic" ? "#f1f5f9" : "#f1f5f9"), 
              borderTop: style === "classic" ? "1px solid #0f172a" : "1.5px solid #cbd5e1", 
              borderBottom: style === "classic" ? "1px solid #0f172a" : "1.5px solid #cbd5e1", 
              textAlign: "left" 
            }}>
              {style === "spreadsheet" && <th style={{ border: "1px solid #cbd5e1", padding: "8px 6px", textAlign: "center", width: "24px", color: "#64748b" }}>#</th>}
              <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>#</th>
              <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>Item & Description</th>
              {template.showHsn && <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>HSN/SAC</th>}
              <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>Qty</th>
              <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>Rate (₹)</th>
              {template.showDiscount && <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>Disc</th>}
              <th style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: style === "classic" ? "1px solid #0f172a" : "1px solid #f1f5f9" }}>
              {style === "spreadsheet" && <td style={{ border: "1px solid #cbd5e1", padding: "8px 6px", textAlign: "center", backgroundColor: "#f8fafc", color: "#64748b", fontWeight: 700 }}>1</td>}
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>1</td>
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>{d.r1[0]}</td>
              {template.showHsn && <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>61091000</td>}
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>50 pcs</td>
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>300.00</td>
              {template.showDiscount && <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>0%</td>}
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>15,000.00</td>
            </tr>
            <tr style={{ borderBottom: style === "classic" ? "1px solid #0f172a" : "1px solid #f1f5f9" }}>
              {style === "spreadsheet" && <td style={{ border: "1px solid #cbd5e1", padding: "8px 6px", textAlign: "center", backgroundColor: "#f8fafc", color: "#64748b", fontWeight: 700 }}>2</td>}
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>2</td>
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>{d.r2[0]}</td>
              {template.showHsn && <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px" }}>62034200</td>}
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>20 pcs</td>
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>500.00</td>
              {template.showDiscount && <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>0%</td>}
              <td style={{ border: style === "spreadsheet" ? "1px solid #cbd5e1" : (style === "classic" ? "1px solid #0f172a" : "none"), padding: "8px 10px", textAlign: "right" }}>10,000.00</td>
            </tr>
          </tbody>
        </table>

        {/* GST Breakdown Section */}
        {template.showTaxBreakdown && (
          <div style={{ 
            backgroundColor: style === "spreadsheet" ? "#f0fdf4" : "#f8fafc", 
            border: style === "spreadsheet" ? "1px solid #107c41" : "1px solid #e2e8f0", 
            borderRadius: style === "spreadsheet" || style === "classic" ? "0" : "6px", 
            padding: "8px 12px", 
            marginBottom: "14px", 
            fontSize: "11px", 
            display: "flex", 
            justifyContent: "space-between" 
          }}>
            <span>CGST (6%): ₹1,500.00 • SGST (6%): ₹1,500.00</span>
            <span style={{ fontWeight: 700 }}>Total Tax: ₹3,000.00</span>
          </div>
        )}

        {/* Totals & Dynamic QR Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
          {/* Left: Bank Details & UPI QR */}
          <div>
            {template.showBankDetails && (
              <div style={{ fontSize: "10.5px", color: "#475569" }}>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "2px" }}>Bank & Payment Details:</div>
                <div>Bank: HDFC Bank Ltd • A/C: 50200049281948</div>
                <div>IFSC: HDFC0001824 • Branch: Sector 14 Rohtak</div>
              </div>
            )}
            {template.showQrCode && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "8px", padding: "6px 10px", background: "#f1f5f9", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                <QrCode size={26} color={theme} />
                <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#334155" }}>Scan to Pay via UPI</span>
              </div>
            )}
          </div>

          {/* Right: Grand Total */}
          <div style={{ 
            textAlign: "right",
            backgroundColor: style === "spreadsheet" ? "#f0fdf4" : (style === "modern" ? `${theme}10` : "transparent"),
            padding: style === "spreadsheet" || style === "modern" ? "10px 14px" : "0",
            border: style === "spreadsheet" ? "1px solid #107c41" : (style === "modern" ? `1px solid ${theme}30` : "none"),
            borderRadius: "6px"
          }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Sub Total: ₹25,000.00</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>GST (12%): ₹3,000.00</div>
            <div style={{ fontSize: "18px", fontWeight: 900, color: theme, marginTop: "4px" }}>
              Total: {d.summaryVal}
            </div>
          </div>
        </div>

        {/* Terms & Signatory Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
          <div style={{ maxWidth: "65%" }}>
            {template.showTerms && template.termsText && (
              <div style={{ fontSize: "9.5px", color: "#64748b", marginBottom: "6px" }}>
                <strong>Terms & Conditions:</strong>
                <pre style={{ margin: "2px 0 0", fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{template.termsText}</pre>
              </div>
            )}
            {template.showNotes && template.notesText && (
              <div style={{ fontSize: "9.5px", color: "#334155" }}>
                <strong>Note:</strong> {template.notesText}
              </div>
            )}
          </div>

          {template.showSignatory && (
            <div style={{ textAlign: "center", borderTop: "1px solid #94a3b8", width: "140px", paddingTop: "6px", marginTop: "24px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#0f172a" }}>Authorized Signatory</div>
              <div style={{ fontSize: "8.5px", color: "#64748b" }}>Heart of Business ERP</div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        {template.footerNote && (
          <div style={{ textAlign: "center", fontSize: "9px", color: "#94a3b8", marginTop: "14px", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
            {template.footerNote}
          </div>
        )}
      </div>
    </div>
  );
}
