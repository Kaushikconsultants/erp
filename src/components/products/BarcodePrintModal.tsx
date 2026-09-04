"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Sliders, 
  Check, 
  Settings, 
  Sparkles, 
  Tag,
  Copy,
  Layers
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface BarcodeProductItem {
  id: string;
  name: string;
  sku: string | null;
  articleNumber?: string | null;
  mrp?: number | null;
  sellingPrice: number;
  size?: string | null;
  color?: string | null;
  printQty: number;
}

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: BarcodeProductItem[];
  companyName?: string;
}

type LabelSize = '50x25_single' | '50x25_double' | '38x25_compact' | 'a4_24up';

export default function BarcodePrintModal({
  isOpen,
  onClose,
  products: initialProducts,
  companyName = 'ESPON CLOTHING'
}: BarcodePrintModalProps) {
  const [items, setItems] = useState<BarcodeProductItem[]>(
    initialProducts.map(p => ({ ...p, printQty: p.printQty || 1 }))
  );

  // Layout & Styling Configuration
  const [labelSize, setLabelSize] = useState<LabelSize>('50x25_single');
  const [codeType, setCodeType] = useState<'BARCODE' | 'QR'>('BARCODE');
  const [showCompany, setShowCompany] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showVariant, setShowVariant] = useState(true);
  const [customBrand, setCustomBrand] = useState(companyName);

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate barcodes / QR codes after DOM elements render
    if (!isOpen) return;

    items.forEach((item, idx) => {
      const codeVal = item.sku || item.articleNumber || item.id.slice(0, 10);

      if (codeType === 'BARCODE') {
        const svgElements = document.querySelectorAll(`.barcode-svg-${item.id}`);
        svgElements.forEach(el => {
          try {
            JsBarcode(el, codeVal, {
              format: "CODE128",
              width: labelSize === '38x25_compact' ? 1.2 : 1.4,
              height: labelSize === '38x25_compact' ? 24 : 30,
              displayValue: false,
              margin: 0
            });
          } catch (e) {
            console.error("Barcode generation error:", e);
          }
        });
      } else {
        const canvasElements = document.querySelectorAll(`.qr-canvas-${item.id}`) as NodeListOf<HTMLCanvasElement>;
        canvasElements.forEach(canvas => {
          QRCode.toCanvas(canvas, codeVal, {
            width: labelSize === '38x25_compact' ? 36 : 48,
            margin: 0
          }).catch(e => console.error(e));
        });
      }
    });
  }, [items, labelSize, codeType, isOpen]);

  if (!isOpen) return null;

  const totalLabelsToPrint = items.reduce((sum, item) => sum + (item.printQty || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const updateQty = (id: string, qty: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, printQty: Math.max(1, qty) } : item));
  };

  return (
    <div className="barcode-modal-root" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      {/* PRINT STYLESHEET ENFORCER */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .barcode-print-canvas, .barcode-print-canvas * {
            visibility: visible;
          }
          .barcode-print-canvas {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .barcode-modal-root {
            position: static !important;
            background: none !important;
            backdrop-filter: none !important;
          }
          .barcode-sidebar-controls {
            display: none !important;
          }
          .barcode-modal-container {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            max-height: 100% !important;
            width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>

      <div className="barcode-modal-container" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1100px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #fafafa, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tag size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Thermal Barcode & QR Label Studio
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                Ready to print {totalLabelsToPrint} sticker labels across {items.length} product(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', backgroundColor: '#f1f5f9' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY (2 COLUMNS: CONFIG CONTROLS + LIVE PREVIEW) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT SIDEBAR CONTROLS */}
          <div className="barcode-sidebar-controls" style={{
            width: '340px',
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {/* Label Format */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Label Dimensions & Paper Type
              </label>
              <select
                value={labelSize}
                onChange={e => setLabelSize(e.target.value as LabelSize)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff', outline: 'none', fontWeight: 600 }}
              >
                <option value="50x25_single">50mm x 25mm (Single Column Thermal Roll)</option>
                <option value="50x25_double">50mm x 25mm (2-Up Double Column Roll)</option>
                <option value="38x25_compact">38mm x 25mm (Compact Jewellery/Garment)</option>
                <option value="a4_24up">A4 Sheet (24 Labels - 3x8 Grid)</option>
              </select>
            </div>

            {/* Code Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Symbology
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCodeType('BARCODE')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: `2px solid ${codeType === 'BARCODE' ? '#4f46e5' : '#cbd5e1'}`,
                    backgroundColor: codeType === 'BARCODE' ? '#eef2ff' : '#ffffff',
                    color: codeType === 'BARCODE' ? '#4f46e5' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  Linear Barcode (128)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeType('QR')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: `2px solid ${codeType === 'QR' ? '#4f46e5' : '#cbd5e1'}`,
                    backgroundColor: codeType === 'QR' ? '#eef2ff' : '#ffffff',
                    color: codeType === 'QR' ? '#4f46e5' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  2D QR Code
                </button>
              </div>
            </div>

            {/* Brand Header */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Brand Header Name
              </label>
              <input
                type="text"
                value={customBrand}
                onChange={e => setCustomBrand(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff' }}
              />
            </div>

            {/* Toggles */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Fields to Include on Sticker
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#334155' }}>
                {[
                  { label: 'Company / Brand Header', val: showCompany, set: setShowCompany },
                  { label: 'Product Name', val: showName, set: setShowName },
                  { label: 'SKU / Article Number', val: showSku, set: setShowSku },
                  { label: 'Size & Color Variants', val: showVariant, set: setShowVariant },
                  { label: 'MRP (Maximum Retail Price)', val: showMrp, set: setShowMrp },
                  { label: 'Our Selling / Offer Price', val: showPrice, set: setShowPrice }
                ].map((item, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={e => item.set(e.target.checked)}
                      style={{ accentColor: '#4f46e5' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Product Quantities list */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Print Copies per Product
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {items.map(it => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                      {it.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#64748b' }}>Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={it.printQty}
                        onChange={e => updateQty(it.id, parseInt(e.target.value, 10) || 1)}
                        style={{ width: '50px', padding: '2px 5px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT CANVAS: LIVE PRINT PREVIEW */}
          <div style={{
            flex: 1,
            backgroundColor: '#e2e8f0',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}>
            <div
              ref={printAreaRef}
              className="barcode-print-canvas"
              style={{
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'center',
                width: labelSize === 'a4_24up' ? '210mm' : 'auto',
                minHeight: labelSize === 'a4_24up' ? '297mm' : 'auto'
              }}
            >
              {items.flatMap(item => {
                const copies = [];
                for (let c = 0; c < item.printQty; c++) {
                  copies.push({ ...item, copyIndex: c });
                }
                return copies;
              }).map((item, idx) => {
                const isCompact = labelSize === '38x25_compact';

                return (
                  <div
                    key={`${item.id}-${item.copyIndex}`}
                    style={{
                      width: isCompact ? '38mm' : '50mm',
                      height: '25mm',
                      border: '1px dashed #cbd5e1',
                      padding: '4px 6px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'center',
                      backgroundColor: '#ffffff',
                      fontFamily: 'monospace',
                      pageBreakInside: 'avoid',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Brand Header */}
                    {showCompany && (
                      <div style={{ fontSize: isCompact ? '6.5px' : '7.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000', lineHeight: 1 }}>
                        {customBrand}
                      </div>
                    )}

                    {/* Product Name */}
                    {showName && (
                      <div style={{ fontSize: isCompact ? '6px' : '7px', fontWeight: 700, color: '#111', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                        {item.name}
                      </div>
                    )}

                    {/* Barcode / QR Code Graphic */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1px 0' }}>
                      {codeType === 'BARCODE' ? (
                        <svg className={`barcode-svg-${item.id}`} style={{ display: 'block', maxWidth: '100%' }}></svg>
                      ) : (
                        <canvas className={`qr-canvas-${item.id}`} style={{ display: 'block' }}></canvas>
                      )}
                    </div>

                    {/* SKU / Article & Variants */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: isCompact ? '5.5px' : '6.5px', fontWeight: 600, color: '#222', lineHeight: 1 }}>
                      {showSku && <span>{item.sku || item.articleNumber || item.id.slice(0, 8)}</span>}
                      {showVariant && (item.size || item.color) && (
                        <span>{[item.size, item.color].filter(Boolean).join(' | ')}</span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: isCompact ? '6px' : '7.5px', fontWeight: 800, color: '#000', borderTop: '0.5px solid #ccc', paddingTop: '1px', lineHeight: 1 }}>
                      {showMrp && (
                        <span style={{ color: '#555', textDecoration: item.sellingPrice ? 'line-through' : 'none' }}>
                          MRP: ₹{item.mrp || Math.round(item.sellingPrice * 1.2)}
                        </span>
                      )}
                      {showPrice && (
                        <span style={{ color: '#000', fontWeight: 900 }}>
                          ₹{item.sellingPrice}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Tip: Set printer margins to <strong>None (0mm)</strong> and scale to <strong>100%</strong> in the print dialog.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Printer size={16} /> Print {totalLabelsToPrint} Labels Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
