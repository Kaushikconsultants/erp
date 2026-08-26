"use client";

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Grid, Settings, Plus, Trash2, Edit2, RotateCcw } from 'lucide-react';

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const DEFAULT_COLORS = ['Black', 'Navy Blue', 'Dark Grey', 'White', 'Royal Blue', 'Maroon', 'Olive Green'];

export interface RatioPreset {
  id?: string;
  name: string;
  distribution: Record<string, number>;
}

const DEFAULT_RATIO_PRESETS: RatioPreset[] = [
  { id: 'p1', name: '1 : 2 : 2 : 1 (6 pcs Set)', distribution: { S: 1, M: 2, L: 2, XL: 1, XXL: 0, '3XL': 0 } },
  { id: 'p2', name: '2 : 4 : 4 : 2 (12 pcs Set)', distribution: { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 } },
  { id: 'p3', name: 'Standard Full Curve (18 pcs)', distribution: { S: 2, M: 4, L: 6, XL: 4, XXL: 2, '3XL': 0 } },
  { id: 'p4', name: 'Big Sizes Focus (12 pcs)', distribution: { S: 0, M: 0, L: 3, XL: 4, XXL: 3, '3XL': 2 } }
];

interface GarmentMatrixModalProps {
  products: any[];
  initialProductId?: string;
  initialRate?: number;
  initialDescription?: string;
  initialGarmentMatrix?: { colors?: string[]; matrix?: Record<string, Record<string, number>> };
  onAddItems: (newItems: any[]) => void;
  onClose: () => void;
}

// Robust parser to extract exact colors and size distributions from description text
function parseMatrixData(
  desc?: string,
  savedMatrixData?: { colors?: string[]; matrix?: Record<string, Record<string, number>> }
): { colors: string[]; matrix: Record<string, Record<string, number>> } {
  // 1. If structured matrix was stored, use it directly
  if (savedMatrixData?.matrix && Object.keys(savedMatrixData.matrix).length > 0) {
    const colors = savedMatrixData.colors && savedMatrixData.colors.length > 0
      ? savedMatrixData.colors
      : Object.keys(savedMatrixData.matrix);
    return { colors, matrix: savedMatrixData.matrix };
  }

  // 2. If no description or no bracket breakdown
  if (!desc || !desc.includes('[')) {
    return {
      colors: ['Black', 'Navy Blue'],
      matrix: {
        'Black': { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 },
        'Navy Blue': { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 }
      }
    };
  }

  // 3. Parse multiline description
  const parsedMatrix: Record<string, Record<string, number>> = {};
  const parsedColors: string[] = [];

  const lines = desc.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const bracketMatch = trimmed.match(/\[(.*?)\]/);
    if (!bracketMatch) continue;

    const sizeStr = bracketMatch[1]; // e.g. "M:1, L:1, XL:1, XXL:1"

    // Extract color name before the bracket or before "(... pcs)"
    let colorName = '';
    const colonBracketIndex = trimmed.indexOf(': [');
    if (colonBracketIndex !== -1) {
      const prefix = trimmed.substring(0, colonBracketIndex).replace(/^[•\-\*\s]+/, '').trim();
      const pcsIndex = prefix.indexOf(' (');
      colorName = pcsIndex !== -1 ? prefix.substring(0, pcsIndex).trim() : prefix.trim();
    }

    if (!colorName) {
      for (const col of DEFAULT_COLORS) {
        if (trimmed.toLowerCase().includes(col.toLowerCase())) {
          colorName = col;
          break;
        }
      }
    }

    if (!colorName || colorName.toLowerCase().includes('breakdown') || colorName.toLowerCase().includes('ratio') || colorName.toLowerCase().includes('set')) {
      colorName = 'Black';
    }

    const sizeDist: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '3XL': 0 };
    const tokens = sizeStr.split(/[,;]+/);
    for (const tok of tokens) {
      const parts = tok.trim().split(':');
      if (parts.length === 2) {
        const sName = parts[0].trim().toUpperCase();
        const sQty = parseInt(parts[1].trim()) || 0;
        if (DEFAULT_SIZES.includes(sName)) {
          sizeDist[sName] = sQty;
        } else if (sName === '3XL') {
          sizeDist['3XL'] = sQty;
        }
      }
    }

    parsedMatrix[colorName] = sizeDist;
    if (!parsedColors.includes(colorName)) {
      parsedColors.push(colorName);
    }
  }

  if (parsedColors.length === 0) {
    return {
      colors: ['Black', 'Navy Blue'],
      matrix: {
        'Black': { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 },
        'Navy Blue': { S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 }
      }
    };
  }

  return { colors: parsedColors, matrix: parsedMatrix };
}

export default function GarmentMatrixModal({ 
  products, 
  initialProductId,
  initialRate,
  initialDescription,
  initialGarmentMatrix,
  onAddItems, 
  onClose 
}: GarmentMatrixModalProps) {
  const isEditing = Boolean(initialProductId || initialDescription || initialGarmentMatrix);

  const [selectedProductId, setSelectedProductId] = useState(
    initialProductId && products.some(p => p.id === initialProductId)
      ? initialProductId
      : (products[0]?.id || '')
  );

  // Initialize colors and matrix from parsed description or saved matrix
  const parsedData = React.useMemo(() => {
    return parseMatrixData(initialDescription, initialGarmentMatrix);
  }, [initialDescription, initialGarmentMatrix]);

  const [selectedColors, setSelectedColors] = useState<string[]>(parsedData.colors);
  const [newColorInput, setNewColorInput] = useState('');

  // Ratio Presets State (Persisted in localStorage)
  const [presets, setPresets] = useState<RatioPreset[]>(DEFAULT_RATIO_PRESETS);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null);
  
  // Preset Editor Form State
  const [presetFormName, setPresetFormName] = useState('');
  const [presetFormDistribution, setPresetFormDistribution] = useState<Record<string, number>>({
    S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('garment_ratio_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading ratio presets from storage:", e);
    }
  }, []);

  const savePresetsToStorage = (newPresets: RatioPreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem('garment_ratio_presets', JSON.stringify(newPresets));
    } catch (e) {}
  };

  // Matrix quantities: { [color]: { [size]: number } }
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>(parsedData.matrix);

  const [groupAsSingleLine, setGroupAsSingleLine] = useState(true);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0] || {};
  const [rate, setRate] = useState<number>(
    (initialRate !== undefined && initialRate > 0)
      ? initialRate
      : (selectedProduct?.sellingPrice || 250)
  );

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
  const handleApplyPreset = (preset: RatioPreset) => {
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

  // Preset Editor handlers
  const handleStartAddPreset = () => {
    setEditingPresetIndex(-1);
    setPresetFormName('');
    setPresetFormDistribution({ S: 0, M: 2, L: 4, XL: 4, XXL: 2, '3XL': 0 });
  };

  const handleStartEditPreset = (index: number) => {
    setEditingPresetIndex(index);
    const p = presets[index];
    setPresetFormName(p.name);
    setPresetFormDistribution({ ...p.distribution });
  };

  const handleSavePresetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetFormName.trim()) {
      alert("Please enter a preset name.");
      return;
    }

    let updated: RatioPreset[];
    if (editingPresetIndex === -1) {
      // Add new
      updated = [...presets, {
        id: `custom_${Date.now()}`,
        name: presetFormName.trim(),
        distribution: { ...presetFormDistribution }
      }];
    } else if (editingPresetIndex !== null) {
      // Update existing
      updated = [...presets];
      updated[editingPresetIndex] = {
        ...updated[editingPresetIndex],
        name: presetFormName.trim(),
        distribution: { ...presetFormDistribution }
      };
    } else {
      return;
    }

    savePresetsToStorage(updated);
    setEditingPresetIndex(null);
  };

  const handleDeletePreset = (index: number) => {
    if (!confirm(`Delete preset "${presets[index].name}"?`)) return;
    const updated = presets.filter((_, i) => i !== index);
    savePresetsToStorage(updated);
    if (editingPresetIndex === index) setEditingPresetIndex(null);
  };

  const handleResetDefaultPresets = () => {
    if (!confirm("Reset all ratio presets to default factory curves?")) return;
    savePresetsToStorage(DEFAULT_RATIO_PRESETS);
    setEditingPresetIndex(null);
  };

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
        availableStock: selectedProduct.stockQuantity || 100,
        garmentMatrix: { colors: selectedColors, matrix }
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
            availableStock: selectedProduct.stockQuantity || 100,
            garmentMatrix: { colors: [color], matrix: { [color]: matrix[color] } }
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
        maxWidth: '840px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* Quick Ratio Presets Toolbar */}
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Standard Ratio Presets:
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPresetManager(!showPresetManager);
                  setEditingPresetIndex(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: showPresetManager ? '#e0e7ff' : '#ffffff',
                  color: showPresetManager ? '#4338ca' : '#475569',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Settings size={12} /> {showPresetManager ? 'Close Preset Manager' : 'Edit / Manage Presets'}
              </button>
            </div>

            {/* Presets Pills Row */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {presets.map((preset, idx) => (
                <button
                  key={preset.id || idx}
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

            {/* ─── INLINE PRESET MANAGER PANEL ─── */}
            {showPresetManager && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
                    Custom Ratio Presets Library
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleStartAddPreset}
                      style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '0.72rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                      <Plus size={12} /> Add New Preset
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDefaultPresets}
                      style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}
                      title="Reset presets to factory defaults"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  </div>
                </div>

                {/* Preset List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {presets.map((preset, idx) => {
                    const totalPcs = Object.values(preset.distribution).reduce((a, b) => a + b, 0);
                    const breakdown = DEFAULT_SIZES.map(s => `${s}:${preset.distribution[s] || 0}`).join(' ');

                    return (
                      <div
                        key={preset.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#1e293b' }}>{preset.name}</strong>
                          <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.7rem' }}>
                            ({breakdown} • {totalPcs} pcs)
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditPreset(idx)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px' }}
                            title="Edit preset"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                            title="Delete preset"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Edit / Add Preset Form */}
                {editingPresetIndex !== null && (
                  <form onSubmit={handleSavePresetForm} style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #c7d2fe', marginTop: '6px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4338ca', marginBottom: '8px' }}>
                      {editingPresetIndex === -1 ? 'Add New Ratio Preset' : 'Edit Ratio Preset'}
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
                        Preset Name (e.g., 2 : 4 : 4 : 2 (12 pcs Set))
                      </label>
                      <input
                        type="text"
                        required
                        value={presetFormName}
                        onChange={e => setPresetFormName(e.target.value)}
                        placeholder="e.g. 1 : 2 : 2 : 1 (6 pcs Set)"
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '10px' }}>
                      {DEFAULT_SIZES.map(size => (
                        <div key={size}>
                          <label style={{ display: 'block', fontSize: '0.68rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {size}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={presetFormDistribution[size] || 0}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setPresetFormDistribution(prev => ({ ...prev, [size]: val }));
                            }}
                            style={{ width: '100%', padding: '4px 2px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                        Total Set Qty: {Object.values(presetFormDistribution).reduce((a, b) => a + b, 0)} pcs
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEditingPresetIndex(null)}
                          style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{ padding: '3px 10px', borderRadius: '4px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Save Preset
                        </button>
                      </div>
                    </div>
                  </form>
                )}

              </div>
            )}
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
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    {color}
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                <input
                  type="text"
                  placeholder="+ Custom Color"
                  value={newColorInput}
                  onChange={e => setNewColorInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomColor(); } }}
                  style={{ width: '105px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Input Grid Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'center', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Color Way</th>
                  {DEFAULT_SIZES.map(s => (
                    <th key={s} style={{ padding: '10px 6px', fontWeight: 600, minWidth: '55px' }}>
                      Size {s}
                    </th>
                  ))}
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {selectedColors.map((color, idx) => {
                  let rowTotalQty = 0;
                  DEFAULT_SIZES.forEach(s => {
                    rowTotalQty += (matrix[color]?.[s] || 0);
                  });
                  const rowAmount = rowTotalQty * rate;

                  return (
                    <tr key={color} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#1e293b' }}>
                        {color}
                      </td>
                      {DEFAULT_SIZES.map(size => {
                        const val = matrix[color]?.[size] ?? 0;
                        return (
                          <td key={size} style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={val === 0 ? '' : val}
                              placeholder="0"
                              onChange={e => handleQtyChange(color, size, e.target.value)}
                              style={{
                                width: '48px',
                                padding: '5px 4px',
                                textAlign: 'center',
                                borderRadius: '6px',
                                border: val > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                backgroundColor: val > 0 ? '#eff6ff' : '#ffffff',
                                color: val > 0 ? '#1d4ed8' : '#64748b',
                                fontSize: '0.85rem',
                                fontWeight: val > 0 ? 600 : 400
                              }}
                            />
                          </td>
                        );
                      })}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: rowTotalQty > 0 ? '#2563eb' : '#94a3b8' }}>
                        {rowTotalQty} pcs
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: rowAmount > 0 ? '#059669' : '#94a3b8' }}>
                        ₹{rowAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Summary Row */}
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 600, fontSize: '0.78rem' }}>
                  <td style={{ padding: '10px 14px', color: '#475569', textTransform: 'uppercase' }}>
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
              {isEditing ? `✓ Update Item Ratio (${grandTotalQty} pcs)` : `+ Add ${grandTotalQty} pcs to Quotation`}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
