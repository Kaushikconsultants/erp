"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import {
  Printer,
  X,
  Tag,
  QrCode,
  Sliders,
  Copy,
  Check,
  Settings2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Palette,
  Type,
  LayoutGrid,
  Trash2,
  Eye,
  EyeOff,
  Info
} from "lucide-react";

interface ProductLabelData {
  id: string;
  name: string;
  sku?: string | null;
  articleNumber?: string | null;
  category?: string | null;
  mrp?: number | null;
  sellingPrice?: number | null;
}

interface BarcodeLabelModalProps {
  product: ProductLabelData;
  onClose: () => void;
}

export type LabelFormat =
  | "thermal_50x38_2" // 50*38*2 (2-Up Roll)
  | "thermal_50x25" // 50x25 (1-Up)
  | "thermal_50x38_1" // 50x38 (1-Up)
  | "thermal_38x25" // 38x25 (1-Up)
  | "thermal_100x50" // 100x50 (1-Up)
  | "sheet_a4_24" // A4 Grid
  | "custom"; // Custom Size

export type PrinterType =
  | "thermal_roll"
  | "laser_a4"
  | "pos_80mm"
  | "pdf";

export interface CustomizerConfig {
  headerText: string;
  showHeader: boolean;
  logoUrl: string | null;
  logoSize: number;
  showLogo: boolean;
  customTitle: string;
  customSubtext: string;
  customFooter: string;
  showPrice: boolean;
  showMrp: boolean;
  showSku: boolean;
  showCategory: boolean;
  showFooter: boolean;
  fontFamily: string;
  textAlign: "center" | "left" | "right";
  borderStyle: "dashed" | "solid" | "none";
}

export default function BarcodeLabelModal({ product, onClose }: BarcodeLabelModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"format" | "designer">("format");

  // Format & Printer States
  const [format, setFormat] = useState<LabelFormat>("thermal_50x38_2");
  const [printer, setPrinter] = useState<PrinterType>("thermal_roll");
  const [quantityInput, setQuantityInput] = useState<string>("2");
  const [codeType, setCodeType] = useState<"BARCODE" | "QR" | "BOTH">("BARCODE");
  const [copied, setCopied] = useState(false);

  // Custom size states
  const [customWidth, setCustomWidth] = useState<number>(50);
  const [customHeight, setCustomHeight] = useState<number>(38);
  const [customColumns, setCustomColumns] = useState<number>(2);

  // Fully Customizable Label Designer States
  const [headerText, setHeaderText] = useState<string>("HEART OF BUSINESS");
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(24);
  const [showLogo, setShowLogo] = useState<boolean>(false);

  const [customTitle, setCustomTitle] = useState<string>(product.name);
  const [customSubtext, setCustomSubtext] = useState<string>(product.category || "");
  const [customFooter, setCustomFooter] = useState<string>("Made in India");
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showMrp, setShowMrp] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [showCategory, setShowCategory] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(false);

  const [fontFamily, setFontFamily] = useState<string>("'Inter', sans-serif");
  const [textAlign, setTextAlign] = useState<"center" | "left" | "right">("center");
  const [borderStyle, setBorderStyle] = useState<"dashed" | "solid" | "none">("dashed");

  // High Resolution Symbology Image Data URLs
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCode = product.sku || product.articleNumber || product.id;
  const printCount = Math.min(100, Math.max(1, parseInt(quantityInput) || 1));

  // Determine layout dimensions
  const getLayoutConfig = () => {
    switch (format) {
      case "thermal_50x38_2":
        return { widthMm: 50, heightMm: 38, columns: 2, name: "50x38mm (2-Up Roll - 50*38*2)" };
      case "thermal_50x25":
        return { widthMm: 50, heightMm: 25, columns: 1, name: "50x25mm (Standard 1-Up Tag)" };
      case "thermal_50x38_1":
        return { widthMm: 50, heightMm: 38, columns: 1, name: "50x38mm (Single 1-Up Roll)" };
      case "thermal_38x25":
        return { widthMm: 38, heightMm: 25, columns: 1, name: "38x25mm (Jewelry / Small Tag)" };
      case "thermal_100x50":
        return { widthMm: 100, heightMm: 50, columns: 1, name: "100x50mm (Shipping / Box Tag)" };
      case "sheet_a4_24":
        return { widthMm: 63, heightMm: 33, columns: 3, name: "A4 Sticker Sheet (3x8 - 24 Labels)" };
      case "custom":
        return {
          widthMm: Math.max(15, customWidth || 50),
          heightMm: Math.max(15, customHeight || 38),
          columns: Math.max(1, Math.min(4, customColumns || 1)),
          name: `Custom ${customWidth || 50}x${customHeight || 38}mm (${customColumns || 1}-Up)`
        };
      default:
        return { widthMm: 50, heightMm: 38, columns: 2, name: "50x38mm (2-Up Roll)" };
    }
  };

  const layout = getLayoutConfig();

  // Calculate barcode rendering dimensions
  const getBarcodeConfig = () => {
    const h = layout.heightMm;
    if (h <= 25) {
      return { width: 1.3, height: 26, fontSize: 10, qrSize: 42 };
    } else if (h <= 40) {
      return { width: 1.5, height: 38, fontSize: 11, qrSize: 54 };
    } else {
      return { width: 2.0, height: 54, fontSize: 12, qrSize: 72 };
    }
  };

  const barcodeCfg = getBarcodeConfig();

  // Generate PNG Data URL for Barcode & QR (Guarantees zero collapse in physical printing)
  useEffect(() => {
    if (!activeCode) return;

    // Generate High-Res Barcode PNG
    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, activeCode, {
        format: "CODE128",
        lineColor: "#000000",
        background: "#ffffff",
        width: barcodeCfg.width * 1.6,
        height: barcodeCfg.height * 1.3,
        displayValue: true,
        fontSize: barcodeCfg.fontSize * 1.2,
        font: "monospace",
        margin: 4
      });
      setBarcodeDataUrl(canvas.toDataURL("image/png"));
    } catch (e) {
      console.error("Barcode generation failed:", e);
    }

    // Generate High-Res QR Code PNG
    QRCode.toDataURL(activeCode, {
      width: 180,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("QR Code error:", err));
  }, [activeCode, barcodeCfg.width, barcodeCfg.height, barcodeCfg.fontSize]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
          setShowLogo(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const customizerConfig: CustomizerConfig = {
    headerText,
    showHeader,
    logoUrl,
    logoSize,
    showLogo,
    customTitle,
    customSubtext,
    customFooter,
    showPrice,
    showMrp,
    showSku,
    showCategory,
    showFooter,
    fontFamily,
    textAlign,
    borderStyle
  };

  const items = Array.from({ length: printCount });

  // Page Media CSS for print
  const rollWidthMm = layout.widthMm * layout.columns + (layout.columns > 1 ? (layout.columns - 1) * 3 : 0);
  const pageMediaCss = printer === "laser_a4" || format === "sheet_a4_24"
    ? `@page { size: A4 portrait; margin: 6mm; }`
    : printer === "pos_80mm"
    ? `@page { size: 80mm auto; margin: 2mm; }`
    : `@page { size: ${rollWidthMm}mm ${layout.heightMm}mm; margin: 0; }`;

  return (
    <>
      {/* 1. ON-SCREEN MODAL */}
      <div className="modal-backdrop no-print">
        <div className="modal-content glass-panel animate-in" style={{ maxWidth: "820px", width: "95%" }}>
          {/* Header */}
          <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)" }}>
                <Tag size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>Barcode & QR Label Generator Studio</h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>Design, customize branding, size, and print barcode stickers</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose} style={{ border: "none", background: "rgba(226, 232, 240, 0.6)", borderRadius: "50%", padding: "6px", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          {/* Mode Tabs Navigation */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "4px 20px 0 20px", gap: "8px", borderBottom: "1px solid #cbd5e1" }}>
            <button
              type="button"
              onClick={() => setActiveTab("format")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderTopLeftRadius: "6px",
                borderTopRightRadius: "6px",
                fontSize: "0.83rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid #cbd5e1",
                borderBottom: activeTab === "format" ? "2px solid #4f46e5" : "none",
                background: activeTab === "format" ? "#ffffff" : "transparent",
                color: activeTab === "format" ? "#4f46e5" : "#64748b"
              }}
            >
              <LayoutGrid size={15} /> 1. Format & Printer Settings
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("designer")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderTopLeftRadius: "6px",
                borderTopRightRadius: "6px",
                fontSize: "0.83rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid #cbd5e1",
                borderBottom: activeTab === "designer" ? "2px solid #4f46e5" : "none",
                background: activeTab === "designer" ? "#ffffff" : "transparent",
                color: activeTab === "designer" ? "#4f46e5" : "#64748b"
              }}
            >
              <Palette size={15} /> 2. Customize Branding & Layout ✨
            </button>
          </div>

          {/* Modal Controls Bar */}
          <div style={{ padding: "16px 20px", background: "rgba(248, 250, 252, 0.95)", borderBottom: "1px solid var(--border-color)" }}>
            {activeTab === "format" ? (
              /* TAB 1: FORMAT & PRINTER SETTINGS */
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", alignItems: "end" }}>
                  {/* Label Size / Format */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Label Size / Format
                    </label>
                    <select
                      value={format}
                      onChange={e => setFormat(e.target.value as LabelFormat)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff", fontWeight: 500, color: "#1e293b" }}
                    >
                      <option value="thermal_50x38_2">Thermal 50x38mm (2-Up Roll / 50*38*2)</option>
                      <option value="thermal_50x25">Thermal 50x25mm (Standard 1-Up Tag)</option>
                      <option value="thermal_50x38_1">Thermal 50x38mm (Single 1-Up Roll)</option>
                      <option value="thermal_38x25">Thermal 38x25mm (Jewelry / Small Tag)</option>
                      <option value="thermal_100x50">Thermal 100x50mm (Box / Shipping Sticker)</option>
                      <option value="sheet_a4_24">A4 Sticker Sheet (3x8 - 24 Labels Grid)</option>
                      <option value="custom">✨ Custom Size Label...</option>
                    </select>
                  </div>

                  {/* Target Printer Selection */}
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      <Printer size={13} className="text-indigo-600" /> Target Printer
                    </label>
                    <select
                      value={printer}
                      onChange={e => setPrinter(e.target.value as PrinterType)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff", fontWeight: 500, color: "#1e293b" }}
                    >
                      <option value="thermal_roll">Thermal Sticker Printer (TSC, Zebra, TVS, Xprinter)</option>
                      <option value="laser_a4">Standard Laser / Inkjet (A4 / Letter Paper)</option>
                      <option value="pos_80mm">POS Thermal Receipt Printer (80mm)</option>
                      <option value="pdf">Save as Vector PDF / Virtual Printer</option>
                    </select>
                  </div>

                  {/* Symbol Type Selector */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Symbol Type
                    </label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setCodeType("BARCODE")}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px solid #cbd5e1",
                          background: codeType === "BARCODE" ? "#4f46e5" : "#fff",
                          color: codeType === "BARCODE" ? "#fff" : "#334155"
                        }}
                      >
                        1D Barcode
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeType("QR")}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px solid #cbd5e1",
                          background: codeType === "QR" ? "#4f46e5" : "#fff",
                          color: codeType === "QR" ? "#fff" : "#334155"
                        }}
                      >
                        2D QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeType("BOTH")}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px solid #cbd5e1",
                          background: codeType === "BOTH" ? "#4f46e5" : "#fff",
                          color: codeType === "BOTH" ? "#fff" : "#334155"
                        }}
                      >
                        Both
                      </button>
                    </div>
                  </div>

                  {/* Quantity Picker */}
                  <div style={{ minWidth: "180px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Quantity (Stickers)
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={quantityInput}
                        onChange={e => setQuantityInput(e.target.value)}
                        onBlur={() => {
                          if (!quantityInput || parseInt(quantityInput) < 1) setQuantityInput("1");
                        }}
                        placeholder="Enter quantity"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 600 }}
                      />
                      <div style={{ display: "flex", gap: "3px" }}>
                        {[1, 2, 4, 10, 20, 50].map(q => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setQuantityInput(String(q))}
                            style={{
                              flex: 1,
                              padding: "2px 0",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              border: "1px solid #cbd5e1",
                              background: printCount === q ? "#4f46e5" : "#f1f5f9",
                              color: printCount === q ? "#fff" : "#475569",
                              cursor: "pointer"
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Printer Type Advice Banner */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#e0f2fe", padding: "6px 12px", borderRadius: "6px", border: "1px solid #bae6fd", fontSize: "0.75rem", color: "#0369a1" }}>
                  <Info size={14} className="shrink-0 text-sky-600" />
                  <span>
                    <strong>Printing on standard Inkjet / Laser (HP, Epson, Canon)?</strong> Set Target Printer to <strong>"Standard Laser / Inkjet (A4)"</strong> for full A4 page sticker layout.
                  </span>
                </div>
              </div>
            ) : (
              /* TAB 2: FULL LABEL DESIGNER & CUSTOMIZER */
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                  {/* Logo Upload Section */}
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "4px" }}>
                        <ImageIcon size={14} className="text-indigo-600" /> Custom Logo / Image
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLogo(!showLogo)}
                        style={{ border: "none", background: "none", color: showLogo ? "#4f46e5" : "#94a3b8", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}
                      >
                        {showLogo ? <Eye size={13} /> : <EyeOff size={13} />} {showLogo ? "Shown" : "Hidden"}
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px dashed #6366f1"
                        }}
                      >
                        <Upload size={14} /> Upload Logo
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                      </label>

                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoUrl(null);
                            setShowLogo(false);
                          }}
                          style={{ border: "none", background: "#fee2e2", color: "#991b1b", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                          title="Remove logo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {showLogo && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Logo Height:</span>
                        <input
                          type="range"
                          min="14"
                          max="60"
                          value={logoSize}
                          onChange={e => setLogoSize(parseInt(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>{logoSize}px</span>
                      </div>
                    )}
                  </div>

                  {/* Header / Brand Text */}
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                        Header / Company Text
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHeader(!showHeader)}
                        style={{ border: "none", background: "none", color: showHeader ? "#4f46e5" : "#94a3b8", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}
                      >
                        {showHeader ? <Eye size={13} /> : <EyeOff size={13} />} {showHeader ? "Shown" : "Hidden"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      placeholder="e.g. HEART OF BUSINESS"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontWeight: 600 }}
                    />
                  </div>

                  {/* Editable Product Title & Subtext */}
                  <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Product Title & Subtext
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder="Product Name"
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.8rem", marginBottom: "4px" }}
                    />
                    <input
                      type="text"
                      value={customSubtext}
                      onChange={e => setCustomSubtext(e.target.value)}
                      placeholder="Subtext / Category / Size (Optional)"
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                    />
                  </div>
                </div>

                {/* Additional Custom Line & Styling Controls */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "#edf2f7", padding: "10px 12px", borderRadius: "8px" }}>
                  {/* Custom Footer Line */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                        Custom Extra Line / Footer Note
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowFooter(!showFooter)}
                        style={{ border: "none", background: "none", color: showFooter ? "#4f46e5" : "#94a3b8", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}
                      >
                        {showFooter ? <Eye size={12} /> : <EyeOff size={12} />} {showFooter ? "Shown" : "Hidden"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customFooter}
                      onChange={e => setCustomFooter(e.target.value)}
                      placeholder="e.g. Made in India, Non-Returnable"
                      style={{ width: "100%", padding: "5px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                    />
                  </div>

                  {/* Element Display Toggles */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Visible Elements
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} /> Price
                      </label>
                      <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={showMrp} onChange={e => setShowMrp(e.target.checked)} /> MRP
                      </label>
                      <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={showSku} onChange={e => setShowSku(e.target.checked)} /> SKU Code
                      </label>
                    </div>
                  </div>

                  {/* Typography & Alignment */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Font & Alignment
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <select
                        value={fontFamily}
                        onChange={e => setFontFamily(e.target.value)}
                        style={{ flex: 1, padding: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                      >
                        <option value="'Inter', sans-serif">Sans-Serif (Standard)</option>
                        <option value="'Roboto', sans-serif">Roboto Clean</option>
                        <option value="monospace">Monospace Code</option>
                        <option value="'Georgia', serif">Serif Classic</option>
                        <option value="'Impact', sans-serif">Bold Industrial</option>
                      </select>

                      <select
                        value={textAlign}
                        onChange={e => setTextAlign(e.target.value as any)}
                        style={{ padding: "5px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                      >
                        <option value="center">Center</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Label Controls Row (Visible when Custom Size is chosen) */}
            {format === "custom" && activeTab === "format" && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "#e0e7ff",
                  borderRadius: "8px",
                  border: "1px solid #c7d2fe",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3730a3", fontSize: "0.8rem", fontWeight: 700 }}>
                  <Settings2 size={16} /> Custom Dimensions:
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#312e81", fontWeight: 600 }}>Width (mm):</span>
                  <input
                    type="number"
                    min="15"
                    max="200"
                    value={customWidth}
                    onChange={e => setCustomWidth(parseInt(e.target.value) || 50)}
                    style={{ width: "70px", padding: "4px 8px", borderRadius: "5px", border: "1px solid #a5b4fc", fontSize: "0.82rem", background: "#fff" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#312e81", fontWeight: 600 }}>Height (mm):</span>
                  <input
                    type="number"
                    min="15"
                    max="200"
                    value={customHeight}
                    onChange={e => setCustomHeight(parseInt(e.target.value) || 38)}
                    style={{ width: "70px", padding: "4px 8px", borderRadius: "5px", border: "1px solid #a5b4fc", fontSize: "0.82rem", background: "#fff" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#312e81", fontWeight: 600 }}>Layout Across:</span>
                  <select
                    value={customColumns}
                    onChange={e => setCustomColumns(parseInt(e.target.value) || 1)}
                    style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid #a5b4fc", fontSize: "0.82rem", background: "#fff" }}
                  >
                    <option value={1}>1-Up (Single Label)</option>
                    <option value={2}>2-Up (2 Side-by-Side)</option>
                    <option value={3}>3-Up (3 Side-by-Side)</option>
                    <option value={4}>4-Up (4 Side-by-Side)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* On-Screen Live Preview Title */}
          <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#cbd5e1" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={14} className="text-indigo-600" /> Previewing: <span style={{ color: "#1e293b" }}>{layout.name}</span>
            </div>
            <button
              onClick={handleCopyCode}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "5px",
                border: "1px solid #94a3b8",
                background: "#fff",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer"
              }}
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              {copied ? "Copied SKU" : `Copy SKU (${activeCode})`}
            </button>
          </div>

          {/* On-Screen Live Preview Area */}
          <div
            style={{
              padding: "20px 16px",
              background: "#94a3b8",
              maxHeight: "360px",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: layout.columns > 1 ? `repeat(${layout.columns}, minmax(0, max-content))` : "repeat(auto-fit, minmax(200px, max-content))",
              gap: "12px",
              justifyContent: "center"
            }}
          >
            {items.map((_, idx) => (
              <LabelCardPreview
                key={idx}
                product={product}
                activeCode={activeCode}
                layout={layout}
                codeType={codeType}
                barcodeCfg={barcodeCfg}
                barcodeDataUrl={barcodeDataUrl}
                qrDataUrl={qrDataUrl}
                customizer={customizerConfig}
              />
            ))}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Printing {printCount} {printCount === 1 ? "Label" : "Labels"} ({layout.name})
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Target: {printer === "thermal_roll" ? "Thermal Roll Printer" : printer === "laser_a4" ? "Standard A4 Paper Sheet" : printer === "pos_80mm" ? "POS 80mm Receipt Printer" : "PDF Document"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="primary-btn hover-lift"
                onClick={handlePrint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  padding: "8px 18px",
                  fontWeight: 600
                }}
              >
                <Printer size={16} /> Print {printCount} {printCount === 1 ? "Label" : "Labels"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED PRINT CONTAINER PORTAL (Rendered directly in document.body) */}
      {mounted &&
        createPortal(
          <div className="only-for-printer" id="printable-barcode-root">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: printer === "laser_a4" || format === "sheet_a4_24"
                  ? "repeat(auto-fill, minmax(55mm, 1fr))"
                  : `repeat(${layout.columns}, 1fr)`,
                gap: "3mm",
                width: "100%"
              }}
            >
              {items.map((_, idx) => (
                <LabelCardPrint
                  key={idx}
                  product={product}
                  activeCode={activeCode}
                  layout={layout}
                  codeType={codeType}
                  barcodeCfg={barcodeCfg}
                  barcodeDataUrl={barcodeDataUrl}
                  qrDataUrl={qrDataUrl}
                  customizer={customizerConfig}
                />
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* 3. ROCK-SOLID PRINT MEDIA STYLES */}
      <style jsx global>{`
        ${pageMediaCss}

        @media screen {
          .only-for-printer,
          #printable-barcode-root {
            display: none !important;
          }
        }

        @media print {
          /* Hide EVERYTHING under body except the portal root #printable-barcode-root */
          body > *:not(#printable-barcode-root) {
            display: none !important;
          }

          /* Show ONLY the portal root #printable-barcode-root */
          #printable-barcode-root,
          .only-for-printer {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 9999999 !important;
          }

          .label-card-print-box {
            border: 1px solid #000000 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </>
  );
}

{/* Uniform Card Renderer for On-Screen Preview */}
function LabelCardPreview({
  product,
  activeCode,
  layout,
  codeType,
  barcodeCfg,
  barcodeDataUrl,
  qrDataUrl,
  customizer
}: {
  product: ProductLabelData;
  activeCode: string;
  layout: { widthMm: number; heightMm: number };
  codeType: "BARCODE" | "QR" | "BOTH";
  barcodeCfg: { width: number; height: number; fontSize: number; qrSize: number };
  barcodeDataUrl: string;
  qrDataUrl: string;
  customizer: CustomizerConfig;
}) {
  const cardWidthPx = Math.min(Math.max(layout.widthMm * 4.2, 180), 300);
  const cardHeightPx = Math.min(Math.max(layout.heightMm * 3.8, 125), 220);

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#000000",
        padding: "8px 10px",
        borderRadius: "4px",
        border: customizer.borderStyle === "none" ? "none" : `1px ${customizer.borderStyle} #64748b`,
        boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
        width: `${cardWidthPx}px`,
        height: `${cardHeightPx}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: customizer.textAlign === "left" ? "flex-start" : customizer.textAlign === "right" ? "flex-end" : "center",
        justifyContent: "space-between",
        textAlign: customizer.textAlign,
        fontFamily: customizer.fontFamily,
        boxSizing: "border-box"
      }}
    >
      <div style={{ width: "100%" }}>
        {/* Custom Logo */}
        {customizer.showLogo && customizer.logoUrl && (
          <div style={{ marginBottom: "2px" }}>
            <img src={customizer.logoUrl} alt="Logo" style={{ height: `${customizer.logoSize}px`, objectFit: "contain", margin: customizer.textAlign === "center" ? "0 auto" : "0" }} />
          </div>
        )}

        {/* Custom Header / Brand */}
        {customizer.showHeader && customizer.headerText && (
          <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#333", marginBottom: "1px" }}>
            {customizer.headerText}
          </div>
        )}

        {/* Custom Product Title */}
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#000", lineHeight: "1.1", maxHeight: "2.2em", overflow: "hidden" }}>
          {customizer.customTitle || product.name}
        </div>

        {/* Subtext & Price */}
        <div style={{ fontSize: "0.7rem", color: "#444", marginTop: "2px" }}>
          {customizer.customSubtext && <span style={{ marginRight: "4px" }}>{customizer.customSubtext}</span>}
          {customizer.showPrice && product.sellingPrice && <span style={{ fontWeight: 700, color: "#000" }}>₹{product.sellingPrice}</span>}
          {customizer.showMrp && product.mrp && product.mrp > (product.sellingPrice || 0) && (
            <span style={{ textDecoration: "line-through", marginLeft: "4px", fontSize: "0.62rem", color: "#777" }}>
              MRP: ₹{product.mrp}
            </span>
          )}
        </div>
      </div>

      {/* Symbology PNG Image */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: customizer.textAlign === "left" ? "flex-start" : customizer.textAlign === "right" ? "flex-end" : "center", gap: "6px", margin: "2px 0", maxWidth: "100%" }}>
        {(codeType === "BARCODE" || codeType === "BOTH") && barcodeDataUrl && (
          <img
            src={barcodeDataUrl}
            alt="Barcode"
            style={{
              height: `${barcodeCfg.height + 14}px`,
              maxWidth: "100%",
              objectFit: "contain",
              display: "block",
              margin: "0 auto"
            }}
          />
        )}
        {(codeType === "QR" || codeType === "BOTH") && qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" style={{ width: `${barcodeCfg.qrSize}px`, height: `${barcodeCfg.qrSize}px` }} />
        )}
      </div>

      {/* Footer Details */}
      <div style={{ width: "100%" }}>
        {customizer.showSku && (
          <div style={{ fontSize: "0.65rem", color: "#555", fontFamily: "monospace" }}>
            SKU: <strong>{activeCode}</strong>
          </div>
        )}
        {customizer.showFooter && customizer.customFooter && (
          <div style={{ fontSize: "0.6rem", color: "#666", marginTop: "1px", fontWeight: 600 }}>
            {customizer.customFooter}
          </div>
        )}
      </div>
    </div>
  );
}

{/* Uniform Card Renderer for Physical Printing */}
function LabelCardPrint({
  product,
  activeCode,
  layout,
  codeType,
  barcodeCfg,
  barcodeDataUrl,
  qrDataUrl,
  customizer
}: {
  product: ProductLabelData;
  activeCode: string;
  layout: { widthMm: number; heightMm: number };
  codeType: "BARCODE" | "QR" | "BOTH";
  barcodeCfg: { width: number; height: number; fontSize: number; qrSize: number };
  barcodeDataUrl: string;
  qrDataUrl: string;
  customizer: CustomizerConfig;
}) {
  return (
    <div
      className="label-card-print-box"
      style={{
        width: "100%",
        height: `${layout.heightMm}mm`,
        padding: "2mm 3mm",
        display: "flex",
        flexDirection: "column",
        alignItems: customizer.textAlign === "left" ? "flex-start" : customizer.textAlign === "right" ? "flex-end" : "center",
        justifyContent: "space-between",
        textAlign: customizer.textAlign,
        fontFamily: customizer.fontFamily,
        boxSizing: "border-box"
      }}
    >
      <div style={{ width: "100%" }}>
        {/* Custom Logo */}
        {customizer.showLogo && customizer.logoUrl && (
          <div style={{ marginBottom: "1px" }}>
            <img src={customizer.logoUrl} alt="Logo" style={{ height: `${customizer.logoSize * 0.75}px`, objectFit: "contain", margin: customizer.textAlign === "center" ? "0 auto" : "0" }} />
          </div>
        )}

        {/* Custom Header */}
        {customizer.showHeader && customizer.headerText && (
          <div style={{ fontSize: "6.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#000", marginBottom: "1px" }}>
            {customizer.headerText}
          </div>
        )}

        {/* Custom Title */}
        <div style={{ fontSize: "8.5pt", fontWeight: 700, color: "#000", lineHeight: "1.1", maxHeight: "2.2em", overflow: "hidden" }}>
          {customizer.customTitle || product.name}
        </div>

        {/* Subtext & Price */}
        <div style={{ fontSize: "7.5pt", color: "#000", marginTop: "1px" }}>
          {customizer.customSubtext && <span style={{ marginRight: "3px" }}>{customizer.customSubtext}</span>}
          {customizer.showPrice && product.sellingPrice && <span style={{ fontWeight: 700 }}>₹{product.sellingPrice}</span>}
          {customizer.showMrp && product.mrp && product.mrp > (product.sellingPrice || 0) && (
            <span style={{ textDecoration: "line-through", marginLeft: "3px", fontSize: "6.5pt" }}>
              MRP: ₹{product.mrp}
            </span>
          )}
        </div>
      </div>

      {/* Symbology PNG Image */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: customizer.textAlign === "left" ? "flex-start" : customizer.textAlign === "right" ? "flex-end" : "center", gap: "4px", margin: "1px 0", width: "100%" }}>
        {(codeType === "BARCODE" || codeType === "BOTH") && barcodeDataUrl && (
          <img
            src={barcodeDataUrl}
            alt="Barcode"
            style={{
              height: `${barcodeCfg.height + 12}px`,
              maxWidth: "100%",
              objectFit: "contain",
              display: "block",
              margin: "0 auto"
            }}
          />
        )}
        {(codeType === "QR" || codeType === "BOTH") && qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" style={{ width: `${barcodeCfg.qrSize * 0.8}px`, height: `${barcodeCfg.qrSize * 0.8}px` }} />
        )}
      </div>

      <div style={{ width: "100%" }}>
        {customizer.showSku && (
          <div style={{ fontSize: "6.5pt", color: "#000", fontFamily: "monospace" }}>
            SKU: <strong>{activeCode}</strong>
          </div>
        )}
        {customizer.showFooter && customizer.customFooter && (
          <div style={{ fontSize: "5.5pt", color: "#000", marginTop: "1px", fontWeight: 600 }}>
            {customizer.customFooter}
          </div>
        )}
      </div>
    </div>
  );
}
