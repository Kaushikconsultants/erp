"use client";

import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Printer, X, Tag, QrCode, Sliders, Copy, Check } from "lucide-react";

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

export default function BarcodeLabelModal({ product, onClose }: BarcodeLabelModalProps) {
  const [format, setFormat] = useState<"thermal_small" | "thermal_large" | "sheet">("thermal_small");
  const [printCount, setPrintCount] = useState<number>(1);
  const [codeType, setCodeType] = useState<"BARCODE" | "QR" | "BOTH">("BARCODE");
  const [copied, setCopied] = useState(false);

  const barcodeRef = useRef<SVGSVGElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const activeCode = product.sku || product.articleNumber || product.id;

  useEffect(() => {
    // Generate Code 128 SVG Barcode
    if (barcodeRef.current && activeCode) {
      try {
        JsBarcode(barcodeRef.current, activeCode, {
          format: "CODE128",
          lineColor: "#000",
          width: format === "thermal_small" ? 1.5 : 2,
          height: format === "thermal_small" ? 40 : 55,
          displayValue: true,
          fontSize: 12,
          font: "monospace",
          margin: 4
        });
      } catch (e) {
        console.error("Barcode generation failed:", e);
      }
    }

    // Generate QR Code
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
  }, [activeCode, format, codeType]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const items = Array.from({ length: Math.min(Math.max(printCount, 1), 100) });

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: "680px", width: "95%" }}>
        {/* Header */}
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Tag className="text-indigo-600" size={22} />
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Barcode & QR Label Generator</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Controls */}
        <div style={{ padding: "16px 20px", background: "rgba(248, 250, 252, 0.8)", borderBottom: "1px solid var(--border-color)", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
          {/* Format Picker */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
              Label Format
            </label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as any)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff" }}
            >
              <option value="thermal_small">Thermal 50x25mm (Standard Tag)</option>
              <option value="thermal_large">Thermal 100x50mm (Box Sticker)</option>
              <option value="sheet">A4 Sticker Sheet Grid</option>
            </select>
          </div>

          {/* Code Type */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
              Symbol Type
            </label>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setCodeType("BARCODE")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
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
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid #cbd5e1",
                  background: codeType === "QR" ? "#4f46e5" : "#fff",
                  color: codeType === "QR" ? "#fff" : "#334155"
                }}
              >
                2D QR Code
              </button>
              <button
                type="button"
                onClick={() => setCodeType("BOTH")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
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

          {/* Print Copies */}
          <div style={{ width: "90px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={printCount}
              onChange={e => setPrintCount(parseInt(e.target.value) || 1)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>

          {/* Quick Copy SKU */}
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={handleCopyCode}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "0.8rem",
                color: "#475569",
                cursor: "pointer"
              }}
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy SKU"}
            </button>
          </div>
        </div>

        {/* Live Preview Area */}
        <div
          style={{
            padding: "24px",
            background: "#e2e8f0",
            maxHeight: "360px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "center"
          }}
          className="printable-label-container"
        >
          {items.map((_, idx) => (
            <div
              key={idx}
              className="barcode-label-card"
              style={{
                background: "#ffffff",
                color: "#000000",
                padding: format === "thermal_small" ? "10px 14px" : "16px 20px",
                borderRadius: "6px",
                border: "1px dashed #94a3b8",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                width: format === "thermal_small" ? "240px" : format === "thermal_large" ? "320px" : "210px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <div style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#333", marginBottom: "2px" }}>
                Heart Of Business
              </div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#000", marginBottom: "2px", lineHeight: "1.2" }}>
                {product.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#555", marginBottom: "6px" }}>
                {product.category && <span style={{ marginRight: "6px" }}>{product.category}</span>}
                {product.sellingPrice && <span style={{ fontWeight: 700, color: "#000" }}>₹{product.sellingPrice}</span>}
                {product.mrp && product.mrp > (product.sellingPrice || 0) && (
                  <span style={{ textDecoration: "line-through", marginLeft: "4px", fontSize: "0.68rem", color: "#888" }}>
                    MRP: ₹{product.mrp}
                  </span>
                )}
              </div>

              {/* Code display */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", margin: "4px 0" }}>
                {(codeType === "BARCODE" || codeType === "BOTH") && (
                  <div>
                    <svg ref={idx === 0 ? barcodeRef : undefined} className="barcode-svg" style={{ maxWidth: "100%" }}></svg>
                    {idx > 0 && <BarcodeDuplicateRenderer code={activeCode} height={format === "thermal_small" ? 40 : 55} />}
                  </div>
                )}
                {(codeType === "QR" || codeType === "BOTH") && qrDataUrl && (
                  <img src={qrDataUrl} alt="QR Code" style={{ width: format === "thermal_small" ? "65px" : "80px", height: format === "thermal_small" ? "65px" : "80px" }} />
                )}
              </div>

              <div style={{ fontSize: "0.68rem", color: "#666", marginTop: "2px", fontFamily: "monospace" }}>
                SKU: <strong>{activeCode}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Ready to print on thermal sticker roll or A4 label sheet.
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="primary-btn hover-lift" onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Printer size={16} /> Print {printCount} {printCount === 1 ? "Label" : "Labels"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-label-container,
          .printable-label-container * {
            visibility: visible;
          }
          .printable-label-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 12px !important;
          }
          .barcode-label-card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function BarcodeDuplicateRenderer({ code, height = 40 }: { code: string; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: "CODE128",
          lineColor: "#000",
          width: 1.5,
          height: height,
          displayValue: true,
          fontSize: 12,
          font: "monospace",
          margin: 4
        });
      } catch (e) {}
    }
  }, [code, height]);

  return <svg ref={svgRef} style={{ maxWidth: "100%" }}></svg>;
}
