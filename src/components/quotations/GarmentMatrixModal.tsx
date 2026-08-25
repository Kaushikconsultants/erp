"use client";

import React, { useState } from 'react';
import { Package, X, Plus, Sparkles, Check, Grid, Calculator } from 'lucide-react';

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const DEFAULT_COLORS = ['Black', 'Navy Blue', 'Dark Grey', 'White', 'Royal Blue', 'Maroon', 'Olive Green'];

const RATIO_PRESETS = [
  { name: '1 : 2 : 2 : 1 (6 pcs Set)', distribution: { S: 1, M: 2, L: 2, XL: 1, XXL: 0, '3XL': 0 } },
  { name: '2 : 4 : 4 : 2 (12 pcs Set)', distribution: { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 } },
  { name: 'Standard Full Curve (18 pcs)', distribution: { S: 2, M: 4, L: 6, XL: 4, XXL: 2, '3XL': 0 } },
  { name: 'Big Sizes Focus (12 pcs)', distribution: { S: 0, M: 0, L: 3, XL: 4, XXL: 3, '3XL': 2 } }
];

interface GarmentMatrixModalProps {
  products: any[];
  onAddItems: (newItems: any[]) => void;
  onClose: () => void;
}

export default function GarmentMatrixModal({ products, onAddItems, onClose }: GarmentMatrixModalProps) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedColors, setSelectedColors] = useState<string[]>(['Black', 'Navy Blue']);
  const [newColorInput, setNewColorInput] = useState('');
  
  // Matrix quantities: { [color]: { [size]: number } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({
    'Black': { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 },
    'Navy Blue': { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 }
  });

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0] || {};
  const [rate, setRate] = useState<number>(selectedProduct?.sellingPrice || 250);

  // Update matrix quantity
  const handleQtyChange = (color: string, size: string, value: string) => {
    const qty = parseInt(value) || 0;
    setMatrix(prev => ({
      ...prev,
      [color]: {
        ...(prev[color] || {}),
        [size]: Math.max(0, qty)
      }
    }));
  };

  // Apply Ratio Preset to all selected colors
  const handleApplyPreset = (preset: typeof RATIO_PRESETS[0]) => {
    const updated: Record<string, Record<string, number>> = {};
    selectedColors.forEach(col => {
      updated[col] = { ...preset.distribution };
    });
    setMatrix(updated);
  };

  // Toggle or add color
  const handleToggleColor = (color: string) => {
    if (selectedColors.includes(color)) {
      if (selectedColors.length > 1) {
        setSelectedColors(selectedColors.filter(c => c !== color));
      }
    } else {
      setSelectedColors([...selectedColors, color]);
      if (!matrix[color]) {
        setMatrix(prev => ({
          ...prev,
          [color]: { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 }
        }));
      }
    }
  };

  const handleAddCustomColor = () => {
    if (newColorInput.trim() && !selectedColors.includes(newColorInput.trim())) {
      const col = newColorInput.trim();
      setSelectedColors([...selectedColors, col]);
      setMatrix(prev => ({
        ...prev,
        [col]: { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 }
      }));
      setNewColorInput('');
    }
  };

  // Calculate totals
  let grandTotalQty = 0;
  selectedColors.forEach(color => {
    DEFAULT_SIZES.forEach(size => {
      grandTotalQty += (matrix[color]?.[size] || 0);
    });
  });

  const grandTotalAmount = grandTotalQty * rate;

  // Generate Quotation Line Items
  const handleConfirmAdd = () => {
    const newItems: any[] = [];

    selectedColors.forEach(color => {
      let colorTotalQty = 0;
      const sizeBreakdown: string[] = [];

      DEFAULT_SIZES.forEach(size => {
        const q = matrix[color]?.[size] || 0;
        if (q > 0) {
          colorTotalQty += q;
          sizeBreakdown.push(`${size}:${q}`);
        }
      });

      if (colorTotalQty > 0) {
        newItems.push({
          productId: selectedProduct.id || '',
          productName: `${selectedProduct.name || 'Garment Item'} - ${color}`,
          sku: `${selectedProduct.sku || 'SKU'}-${color.substring(0, 3).toUpperCase()}`,
          description: `Ratio Set Breakdown: [${sizeBreakdown.join(', ')}] • Total ${colorTotalQty} pcs`,
          hsnCode: selectedProduct.category?.hsnCode || '6109',
          quantity: colorTotalQty,
          rate: rate,
          unitWeight: selectedProduct.weight || 0.25,
          discountType: 'percent',
          discountPercent: 0,
          discountAmount: 0,
          gstRate: 5,
          availableStock: selectedProduct.stockQuantity || 100
        });
      }
    });

    if (newItems.length === 0) {
      alert("Please enter quantities greater than 0.");
      return;
    }

    onAddItems(newItems);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Grid size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                Garment Size & Color Matrix (Ratio Ordering)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Fast wholesale set-wise entry for sizes and colors
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Selection Row: Product & Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Apparel Product
              </label>
              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(prod => prod.id === e.target.value);
                  if (p?.sellingPrice) setRate(p.sellingPrice);
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.articleNumber ? `(Art #${p.articleNumber})` : ''} - ₹{p.sellingPrice || 0}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Unit Rate (₹ / Piece)
              </label>
              <input
                type="number"
                value={rate}
                onChange={e => setRate(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, color: '#059669' }}
              />
            </div>
          </div>

          {/* Quick Ratio Presets */}
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
              ⚡ Quick Standard Ratio Presets:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {RATIO_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} /> {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection Pills */}
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
              Available Color Ways:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {DEFAULT_COLORS.map(color => {
                const isSelected = selectedColors.includes(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleToggleColor(color)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#1d4ed8' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSelected && <Check size={12} />} {color}
                  </button>
                );
              })}

              {/* Add Custom Color Input */}
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="+ Custom Color"
                  value={newColorInput}
                  onChange={e => setNewColorInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCustomColor(); }}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', width: '110px' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Size & Color Matrix Table */}
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'center' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Color Way</th>
                  {DEFAULT_SIZES.map(s => (
                    <th key={s} style={{ padding: '10px 12px', minWidth: '60px' }}>Size {s}</th>
                  ))}
                  <th style={{ padding: '10px 14px', textAlign: 'right', minWidth: '90px' }}>Total (Pcs)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', minWidth: '100px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {selectedColors.map((color, idx) => {
                  let rowTotalQty = 0;
                  DEFAULT_SIZES.forEach(s => {
                    rowTotalQty += (matrix[color]?.[s] || 0);
                  });
                  const rowTotalAmount = rowTotalQty * rate;

                  return (
                    <tr key={color} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {color}
                      </td>
                      {DEFAULT_SIZES.map(s => (
                        <td key={s} style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={matrix[color]?.[s] !== undefined ? matrix[color][s] : 0}
                            onChange={e => handleQtyChange(color, s, e.target.value)}
                            style={{
                              width: '50px',
                              padding: '6px 4px',
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              backgroundColor: (matrix[color]?.[s] || 0) > 0 ? '#eff6ff' : '#ffffff',
                              color: (matrix[color]?.[s] || 0) > 0 ? '#1d4ed8' : '#0f172a'
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                        {rowTotalQty} pcs
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{rowTotalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Matrix Total Row */}
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 900, borderTop: '2px solid #0f172a' }}>
                  <td style={{ padding: '12px 14px', textTransform: 'uppercase' }}>
                    Grand Summary:
                  </td>
                  {DEFAULT_SIZES.map(s => {
                    let colQty = 0;
                    selectedColors.forEach(c => {
                      colQty += (matrix[c]?.[s] || 0);
                    });
                    return (
                      <td key={s} style={{ padding: '12px 8px', textAlign: 'center', color: '#1e293b' }}>
                        {colQty}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#1d4ed8', fontSize: '1rem' }}>
                    {grandTotalQty} pcs
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669', fontSize: '1.05rem' }}>
                    ₹{grandTotalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Selected:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              {grandTotalQty} pieces = <span style={{ color: '#059669' }}>₹{grandTotalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
              }}
            >
              + Add {grandTotalQty} pcs to Quotation
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
