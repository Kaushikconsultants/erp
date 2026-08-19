"use client";

import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, X, Type, Layout, Bold } from 'lucide-react';
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

export default function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [fontFamily, setFontFamily] = useState('Inter');
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
        if (res.settings.buttonRadius) setButtonRadius(res.settings.buttonRadius);
        if (res.settings.useBoldText !== undefined) setUseBoldText(res.settings.useBoldText);
      }
      setLoading(false);
    }
    load();
  }, []);

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
        maxWidth: '540px',
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
          padding: '20px 24px',
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
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', fontFamily: 'inherit' }}>
                Appearance & Software Theme
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Customize primary accent color, typography, bold weight & button shapes globally
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
        <form onSubmit={handleSave} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          {/* LIVE PREVIEW BOX */}
          <div style={{
            padding: '16px 20px',
            borderRadius: '14px',
            backgroundColor: '#f8fafc',
            border: `2px solid ${themeColor}33`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: themeColor, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={14} /> Real-time Live Theme Preview
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: useBoldText ? 700 : 500, color: '#64748b', backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                Font: {fontFamily}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: useBoldText ? 800 : 700, color: '#0f172a' }}>
                  Heart of Business CRM
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: useBoldText ? 700 : 400 }}>
                  This is how text, buttons and active elements will look globally across the software.
                </p>
              </div>

              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  backgroundColor: themeColor,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: buttonRadius,
                  fontWeight: useBoldText ? 800 : 600,
                  fontSize: '0.8rem',
                  boxShadow: `0 3px 8px ${themeColor}40`
                }}
              >
                Sample Button
              </button>
            </div>
          </div>

          {/* 1. PRIMARY THEME COLOR SELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Select Primary Theme Color
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
              {PRESET_COLORS.map(c => {
                const isSelected = themeColor.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setThemeColor(c.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${c.value}` : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? `${c.value}15` : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: c.value, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? c.value : '#334155' }}>
                      {c.name}
                    </span>
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <div style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="color" 
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  style={{ width: '22px', height: '22px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                  Custom
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
              Current Hex Code: <strong style={{ color: themeColor, fontFamily: 'monospace' }}>{themeColor}</strong>
            </p>
          </div>

          {/* 2. FONT FAMILY SELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Software Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
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

          {/* 3. GLOBAL BOLD TYPOGRAPHY TOGGLE */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: useBoldText ? '#f0fdf4' : '#f8fafc',
            border: useBoldText ? '2px solid #16a34a' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }} onClick={() => setUseBoldText(!useBoldText)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: useBoldText ? '#dcfce7' : '#e2e8f0' }}>
                <Bold size={18} color={useBoldText ? '#16a34a' : '#64748b'} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: useBoldText ? '#15803d' : '#0f172a' }}>
                  Use Bold Typography Globally
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Enforces bold 700 font weight across all headers, cards, tables, inputs & text software-wide.
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={useBoldText}
              onChange={(e) => setUseBoldText(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
            />
          </div>

          {/* 4. BUTTON SHAPE (BORDER RADIUS) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              4. Button Shape (Border Radius)
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
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
                      padding: '10px',
                      backgroundColor: isSelected ? themeColor : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      borderRadius: shape.id,
                      border: isSelected ? 'none' : '1px solid #cbd5e1',
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '0.82rem',
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 22px',
                borderRadius: buttonRadius,
                backgroundColor: themeColor,
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
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
