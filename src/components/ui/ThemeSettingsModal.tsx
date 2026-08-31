"use client";

import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, X, Type, Layout, Bold, ZoomIn, ZoomOut, Minus, Plus } from 'lucide-react';
import { updateCompanySettings, getCompanySettings } from '@/app/actions/companyActions';

interface ThemeSettingsModalProps {
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Emerald Green', value: '#10b981' },
  { name: 'Crimson Red', value: '#ef4444' },
  { name: 'Amber Gold', value: '#f59e0b' },
  { name: 'Violet Purple', value: '#9333ea' },
  { name: 'Slate Gray', value: '#475569' },
];

const PRESET_FONTS = [
  'Inter', 
  'Roboto', 
  'Outfit', 
  'Poppins', 
  'Open Sans', 
  'Montserrat', 
  'Lato', 
  'Oswald',
  'System Default'
];

const FONT_SIZE_PRESETS = [
  { label: 'Compact', size: '14px', num: 14, desc: 'Compact view' },
  { label: 'Small', size: '15px', num: 15, desc: 'Slightly smaller' },
  { label: 'Default', size: '16px', num: 16, desc: 'Standard 100%' },
  { label: 'Large', size: '17px', num: 17, desc: 'Clear & comfortable' },
  { label: 'Extra Large', size: '18px', num: 18, desc: 'Maximum readability' },
];

export default function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('16px');
  const [buttonRadius, setButtonRadius] = useState('8px');
  const [useBoldText, setUseBoldText] = useState(false);
  
  const [existingData, setExistingData] = useState<any>({});

  useEffect(() => {
    async function load() {
      const res = await getCompanySettings();
      if (res.success && res.settings) {
        setExistingData(res.settings);
        if (res.settings.themeColor) setThemeColor(res.settings.themeColor);
        if (res.settings.fontFamily) setFontFamily(res.settings.fontFamily);
        if (res.settings.fontSize) setFontSize(res.settings.fontSize);
        if (res.settings.buttonRadius) setButtonRadius(res.settings.buttonRadius);
        if (res.settings.useBoldText !== undefined) setUseBoldText(res.settings.useBoldText);
      }
      setLoading(false);
    }
    load();
  }, []);

  const currentSizeNum = parseInt(fontSize) || 16;

  const handleSizeChange = (val: number) => {
    const clamped = Math.max(12, Math.min(22, val));
    setFontSize(`${clamped}px`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    Object.keys(existingData).forEach(key => {
      if (existingData[key] !== null && existingData[key] !== undefined) {
        formData.append(key, existingData[key].toString());
      }
    });

    formData.set('themeColor', themeColor);
    formData.set('fontFamily', fontFamily);
    formData.set('fontSize', fontSize);
    formData.set('buttonRadius', buttonRadius);
    formData.set('useBoldText', useBoldText ? 'true' : 'false');

    const result = await updateCompanySettings(formData);
    
    if (result.success) {
      window.location.reload();
    } else {
      setError(result.error || 'Failed to save appearance settings');
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '24px 36px', borderRadius: '16px', color: '#0f172a', fontWeight: 600 }}>
        Loading theme settings...
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '560px',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>

        {/* ELEGANT MODAL HEADER */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: `${themeColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Palette size={22} color={themeColor} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Appearance & Software Theme
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Customize primary accent color, typography, font size, bold weight & button shapes globally
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', fontSize: '1.25rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSave} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          {/* LIVE PREVIEW BOX */}
          <div style={{
            padding: '16px 18px',
            borderRadius: '14px',
            backgroundColor: '#f8fafc',
            border: `2px solid ${themeColor}33`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: themeColor, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={14} /> Real-time Live Preview
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  Font: {fontFamily}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: themeColor, backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  Size: {fontSize}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: `${(currentSizeNum / 16) * 1.0}rem`, fontWeight: useBoldText ? 800 : 600, color: '#0f172a' }}>
                  Heart of Business CRM
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: `${(currentSizeNum / 16) * 0.8}rem`, color: '#64748b', fontWeight: useBoldText ? 700 : 400 }}>
                  This text scales in real-time to preview full application font size.
                </p>
              </div>

              <button
                type="button"
                disabled
                style={{
                  padding: '7px 14px',
                  backgroundColor: themeColor,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: buttonRadius,
                  fontWeight: useBoldText ? 700 : 500,
                  fontSize: `${(currentSizeNum / 16) * 0.8}rem`,
                  boxShadow: `0 3px 8px ${themeColor}40`,
                  whiteSpace: 'nowrap',
                  cursor: 'default',
                  opacity: 1
                }}
              >
                Sample Button
              </button>
            </div>
          </div>

          {/* 1. PRIMARY THEME COLOR SELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Select Primary Theme Color
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {PRESET_COLORS.map(c => {
                const isSelected = themeColor.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setThemeColor(c.value)}
                    style={{
                      padding: '7px 8px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${c.value}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? `${c.value}15` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: c.value, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.76rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? c.value : '#334155' }}>
                      {c.name}
                    </span>
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <div style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="color" 
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.76rem', fontWeight: 500, color: '#64748b' }}>
                  Custom
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748b' }}>
              Current Hex Code: <strong style={{ color: themeColor, fontFamily: 'monospace' }}>{themeColor}</strong>
            </p>
          </div>

          {/* 2. FONT FAMILY SELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Software Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                fontWeight: 500,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            >
              {PRESET_FONTS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* 3. APPLICATION FONT SIZE (GLOBAL SCALE) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                3. Application Font Size (Global Scale)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleSizeChange(currentSizeNum - 1)}
                  disabled={currentSizeNum <= 12}
                  style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentSizeNum <= 12 ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: themeColor, minWidth: '40px', textAlign: 'center' }}>
                  {currentSizeNum}px
                </span>
                <button
                  type="button"
                  onClick={() => handleSizeChange(currentSizeNum + 1)}
                  disabled={currentSizeNum >= 22}
                  style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentSizeNum >= 22 ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Presets Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {FONT_SIZE_PRESETS.map(preset => {
                const isSelected = currentSizeNum === preset.num;
                return (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => setFontSize(preset.size)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${themeColor}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? `${themeColor}12` : '#ffffff',
                      color: isSelected ? themeColor : '#334155',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', fontWeight: isSelected ? 700 : 500 }}>
                      {preset.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: isSelected ? themeColor : '#94a3b8', marginTop: '1px' }}>
                      {preset.size}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>12px (Smallest)</span>
              <input
                type="range"
                min="12"
                max="22"
                step="1"
                value={currentSizeNum}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: themeColor, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>22px (Largest)</span>
            </div>
          </div>

          {/* 4. GLOBAL BOLD TYPOGRAPHY TOGGLE */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: useBoldText ? '#f0fdf4' : '#f8fafc',
            border: useBoldText ? '2px solid #16a34a' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }} onClick={() => setUseBoldText(!useBoldText)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: useBoldText ? '#dcfce7' : '#e2e8f0' }}>
                <Bold size={16} color={useBoldText ? '#16a34a' : '#64748b'} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: useBoldText ? '#15803d' : '#0f172a' }}>
                  Use Bold Typography Globally
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Enforces bold font weight across all headers, cards, tables, and inputs software-wide.
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={useBoldText}
              onChange={(e) => setUseBoldText(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
            />
          </div>

          {/* 5. BUTTON SHAPE (BORDER RADIUS) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              5. Button Shape (Border Radius)
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: '0px', label: 'Square' },
                { id: '8px', label: 'Rounded (Standard)' },
                { id: '9999px', label: 'Pill' }
              ].map(shape => {
                const isSelected = buttonRadius === shape.id;
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => setButtonRadius(shape.id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: isSelected ? themeColor : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      borderRadius: shape.id,
                      border: isSelected ? 'none' : '1px solid #cbd5e1',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {shape.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 500,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                borderRadius: buttonRadius,
                backgroundColor: themeColor,
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: `0 3px 8px ${themeColor}40`
              }}
            >
              {saving ? 'Saving...' : 'Save & Apply Theme'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
