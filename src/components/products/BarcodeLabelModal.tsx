"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Printer, X, Tag, QrCode, Sliders, Copy, Check, Settings2, Sparkles } from "lucide-react";

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

export default function BarcodeLabelModal({ product, onClose }: BarcodeLabelModalProps) {
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<LabelFormat>("thermal_50x38_2");
  const [printer, setPrinter] = useState<PrinterType>("thermal_roll");
  const [quantityInput, setQuantityInput] = useState<string>("2");
  const [codeType, setCodeType] = useState<"BARCODE" | "QR" | "BOTH">("BARCODE");
  const [copied, setCopied] = useState(false);

  // Custom size states
  const [customWidth, setCustomWidth] = useState<number>(50);
  const [customHeight, setCustomHeight] = useState<number>(38);
  const [customColumns, setCustomColumns] = useState<number>(2);

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
      return { width: 1.2, height: 26, fontSize: 10, qrSize: 45 };
    } else if (h <= 40) {
      return { width: 1.4, height: 36, fontSize: 10, qrSize: 56 };
    } else {
      return { width: 1.8, height: 52, fontSize: 12, qrSize: 75 };
    }
  };

  const barcodeCfg = getBarcodeConfig();

  useEffect(() => {
    // Generate QR Code once for activeCode
    if (activeCode) {
      QRCode.toDataURL(activeCode, {
        width: 150,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("QR Code error:", err));
    }
  }, [activeCode]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const items = Array.from({ length: printCount });

  // Page Media CSS for print
  const rollWidthMm = layout.widthMm * layout.columns + (layout.columns > 1 ? (layout.columns - 1) * 3 : 0);
  const pageMediaCss = printer === "laser_a4" || format === "sheet_a4_24"
    ? `@page { size: A4 portrait; margin: 8mm; }`
    : printer === "pos_80mm"
    ? `@page { size: 80mm auto; margin: 2mm; }`
    : `@page { size: ${rollWidthMm}mm ${layout.heightMm}mm; margin: 0; }`;

  return (
    <>
      {/* 1. ON-SCREEN MODAL (Hidden during print via CSS) */}
      <div className="modal-backdrop no-print">
        <div className="modal-content glass-panel animate-in" style={{ maxWidth: "780px", width: "95%" }}>
          {/* Header */}
          <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)" }}>
                <Tag size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>Barcode & QR Label Generator</h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>Design, size, and print barcode stickers for thermal & sheet printers</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose} style={{ border: "none", background: "rgba(226, 232, 240, 0.6)", borderRadius: "50%", padding: "6px", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          {/* Modal Controls Bar */}
          <div style={{ padding: "16px 20px", background: "rgba(248, 250, 252, 0.95)", borderBottom: "1px solid var(--border-color)", borderTop: "1px solid var(--border-color)" }}>
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
                  {/* Preset Buttons */}
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

            {/* Custom Label Controls Row */}
            {format === "custom" && (
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
                qrDataUrl={qrDataUrl}
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
                Optimized for {printer === "thermal_roll" ? "Thermal Roll Printer" : printer === "laser_a4" ? "Standard A4 Paper Sheet" : printer === "pos_80mm" ? "POS 80mm Receipt Printer" : "PDF Document"}
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
                gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
                gap: "2mm",
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
                  qrDataUrl={qrDataUrl}
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
  qrDataUrl
}: {
  product: ProductLabelData;
  activeCode: string;
  layout: { widthMm: number; heightMm: number };
  codeType: "BARCODE" | "QR" | "BOTH";
  barcodeCfg: { width: number; height: number; fontSize: number; qrSize: number };
  qrDataUrl: string;
}) {
  // Fixed proportional preview size for pixel-perfect card uniformity
  const cardWidthPx = Math.min(Math.max(layout.widthMm * 4.2, 180), 300);
  const cardHeightPx = Math.min(Math.max(layout.heightMm * 3.8, 125), 220);

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#000000",
        padding: "8px 10px",
        borderRadius: "4px",
        border: "1px dashed #64748b",
        boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
        width: `${cardWidthPx}px`,
        height: `${cardHeightPx}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        textAlign: "center",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box"
      }}
    >
      <div>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#333", marginBottom: "1px" }}>
          Heart Of Business
        </div>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#000", lineHeight: "1.1", maxHeight: "2.2em", overflow: "hidden" }}>
          {product.name}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#444", marginTop: "2px" }}>
          {product.category && <span style={{ marginRight: "4px" }}>{product.category}</span>}
          {product.sellingPrice && <span style={{ fontWeight: 700, color: "#000" }}>₹{product.sellingPrice}</span>}
          {product.mrp && product.mrp > (product.sellingPrice || 0) && (
            <span style={{ textDecoration: "line-through", marginLeft: "4px", fontSize: "0.62rem", color: "#777" }}>
              MRP: ₹{product.mrp}
            </span>
          )}
        </div>
      </div>

      {/* Symbology */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: "2px 0", maxWidth: "100%" }}>
        {(codeType === "BARCODE" || codeType === "BOTH") && (
          <div style={{ maxWidth: "100%", overflow: "hidden" }}>
            <BarcodeSvgRenderer code={activeCode} config={barcodeCfg} />
          </div>
        )}
        {(codeType === "QR" || codeType === "BOTH") && qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" style={{ width: `${barcodeCfg.qrSize}px`, height: `${barcodeCfg.qrSize}px` }} />
        )}
      </div>

      <div style={{ fontSize: "0.65rem", color: "#555", fontFamily: "monospace" }}>
        SKU: <strong>{activeCode}</strong>
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
  qrDataUrl
}: {
  product: ProductLabelData;
  activeCode: string;
  layout: { widthMm: number; heightMm: number };
  codeType: "BARCODE" | "QR" | "BOTH";
  barcodeCfg: { width: number; height: number; fontSize: number; qrSize: number };
  qrDataUrl: string;
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
        alignItems: "center",
        justifyContent: "space-between",
        textAlign: "center",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box"
      }}
    >
      <div>
        <div style={{ fontSize: "6pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#000", marginBottom: "1px" }}>
          Heart Of Business
        </div>
        <div style={{ fontSize: "8pt", fontWeight: 700, color: "#000", lineHeight: "1.1", maxHeight: "2.2em", overflow: "hidden" }}>
          {product.name}
        </div>
        <div style={{ fontSize: "7pt", color: "#000", marginTop: "1px" }}>
          {product.category && <span style={{ marginRight: "3px" }}>{product.category}</span>}
          {product.sellingPrice && <span style={{ fontWeight: 700 }}>₹{product.sellingPrice}</span>}
          {product.mrp && product.mrp > (product.sellingPrice || 0) && (
            <span style={{ textDecoration: "line-through", marginLeft: "3px", fontSize: "6pt" }}>
              MRP: ₹{product.mrp}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", margin: "1px 0" }}>
        {(codeType === "BARCODE" || codeType === "BOTH") && (
          <BarcodeSvgRenderer code={activeCode} config={barcodeCfg} />
        )}
        {(codeType === "QR" || codeType === "BOTH") && qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" style={{ width: `${barcodeCfg.qrSize * 0.8}px`, height: `${barcodeCfg.qrSize * 0.8}px` }} />
        )}
      </div>

      <div style={{ fontSize: "6.5pt", color: "#000", fontFamily: "monospace" }}>
        SKU: <strong>{activeCode}</strong>
      </div>
    </div>
  );
}

{/* Pure SVG Barcode Renderer for exact alignment on every card */}
function BarcodeSvgRenderer({
  code,
  config
}: {
  code: string;
  config: { width: number; height: number; fontSize: number };
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: "CODE128",
          lineColor: "#000",
          width: config.width,
          height: config.height,
          displayValue: true,
          fontSize: config.fontSize,
          font: "monospace",
          margin: 2
        });
      } catch (e) {}
    }
  }, [code, config]);

  return <svg ref={svgRef} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }}></svg>;
}
