"use client";

import React, { useState } from 'react';
import { X, Sparkles, Check, Grid } from 'lucide-react';

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

  const [groupAsSingleLine, setGroupAsSingleLine] = useState(true);

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
    if (grandTotalQty === 0) {
      alert("Please enter quantities greater than 0.");
      return;
    }

    const newItems: any[] = [];

    if (groupAsSingleLine) {
      // 1 Compact Master Line Item for the Article
      const colorBreakdowns: string[] = [];

      selectedColors.forEach(color => {
        let colorQty = 0;
        const sizeParts: string[] = [];
        DEFAULT_SIZES.forEach(size => {
          const q = matrix[color]?.[size] || 0;
          if (q > 0) {
            colorQty += q;
            sizeParts.push(`${size}:${q}`);
          }
        });

        if (colorQty > 0) {
          colorBreakdowns.push(`${color} (${colorQty} pcs): [${sizeParts.join(', ')}]`);
        }
      });

      const description = `Ratio Breakdown (${selectedColors.length} Colors • Total ${grandTotalQty} pcs):\n` +
        colorBreakdowns.map(b => `• ${b}`).join('\n');

      newItems.push({
        productId: selectedProduct.id || '',
        productName: `${selectedProduct.name || 'Garment Item'}${selectedProduct.articleNumber ? ` (Art #${selectedProduct.articleNumber})` : ''}`,
        sku: selectedProduct.articleNumber || selectedProduct.sku || 'SKU',
        description,
        hsnCode: selectedProduct.category?.hsnCode || '6109',
        quantity: grandTotalQty,
        rate: rate,
        unitWeight: selectedProduct.weight || 0.25,
        discountType: 'percent',
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 5,
        availableStock: selectedProduct.stockQuantity || 100
      });
    } else {
      // Separate Line Items per Color
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
            description: `Set Breakdown: [${sizeBreakdown.join(', ')}] • Total ${colorTotalQty} pcs`,
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
    }

    onAddItems(newItems);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'var(--font-family, "Inter", -apple-system, sans-serif)'
    }} onClick={onClose}>
      
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header (Matching App Theme) */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              backgroundColor: '#eff6ff', 
              color: '#2563eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Grid size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                Garment Size & Color Matrix (Ratio Ordering)
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Set-wise quantity entry for wholesale size curves
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#94a3b8', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#1e293b'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Selection Row: Product & Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                Select Apparel Product
              </label>
              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(prod => prod.id === e.target.value);
                  if (p?.sellingPrice) setRate(p.sellingPrice);
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#1e293b', backgroundColor: '#ffffff' }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.articleNumber ? `(Art #${p.articleNumber})` : ''} - ₹{p.sellingPrice || 0}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                Unit Rate (₹ / Piece)
              </label>
              <input
                type="number"
                value={rate}
                onChange={e => setRate(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#059669', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          {/* Quick Ratio Presets */}
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
              Standard Ratio Presets:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {RATIO_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                >
                  <Sparkles size={11} /> {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection Pills */}
          <div>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
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
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#2563eb' : '#475569',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSelected && <Check size={11} />} {color}
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
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', width: '100px' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500 }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Size & Color Matrix Table */}
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>Color Way</th>
                  {DEFAULT_SIZES.map(s => (
                    <th key={s} style={{ padding: '9px 8px', minWidth: '50px', fontWeight: 600 }}>Size {s}</th>
                  ))}
                  <th style={{ padding: '9px 12px', textAlign: 'right', minWidth: '80px', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', minWidth: '90px', fontWeight: 600 }}>Amount (₹)</th>
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
                    <tr key={color} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b' }}>
                        {color}
                      </td>
                      {DEFAULT_SIZES.map(s => (
                        <td key={s} style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={matrix[color]?.[s] !== undefined ? matrix[color][s] : 0}
                            onChange={e => handleQtyChange(color, s, e.target.value)}
                            style={{
                              width: '42px',
                              padding: '4px 2px',
                              textAlign: 'center',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 500,
                              fontSize: '0.82rem',
                              backgroundColor: (matrix[color]?.[s] || 0) > 0 ? '#eff6ff' : '#ffffff',
                              color: (matrix[color]?.[s] || 0) > 0 ? '#2563eb' : '#334155'
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                        {rowTotalQty} pcs
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        ₹{rowTotalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Matrix Total Row */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 600, borderTop: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '10px 12px', textTransform: 'uppercase', fontSize: '0.75rem', color: '#475569' }}>
                    Grand Summary:
                  </td>
                  {DEFAULT_SIZES.map(s => {
                    let colQty = 0;
                    selectedColors.forEach(c => {
                      colQty += (matrix[c]?.[s] || 0);
                    });
                    return (
                      <td key={s} style={{ padding: '10px 6px', textAlign: 'center', color: '#1e293b' }}>
                        {colQty}
                      </td>
                    );
                  })}
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#2563eb' }}>
                    {grandTotalQty} pcs
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>
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
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Selected: </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>
                {grandTotalQty} pieces = <span style={{ color: '#059669' }}>₹{grandTotalAmount.toLocaleString('en-IN')}</span>
              </span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={groupAsSingleLine}
                onChange={e => setGroupAsSingleLine(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: groupAsSingleLine ? 600 : 400, color: groupAsSingleLine ? '#2563eb' : '#64748b' }}>
                Group into 1 Line Item (Keeps Quotation Compact on 1 Page)
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
            >
              + Add {grandTotalQty} pcs to Quotation
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
