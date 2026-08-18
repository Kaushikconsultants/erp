"use client";

import React, { useState, useEffect } from 'react';
import { updateCompanySettings, getCompanySettings } from '@/app/actions/companyActions';

interface ThemeSettingsModalProps {
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Slate', value: '#475569' },
];

const PRESET_FONTS = ['System Default', 'Inter', 'Roboto', 'Outfit', 'Poppins', 'Open Sans', 'Montserrat', 'Lato', 'Oswald'];

export default function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [buttonRadius, setButtonRadius] = useState('8px');
  const [useBoldText, setUseBoldText] = useState(false);
  
  // We need to pass all existing fields to avoid overwriting them with null
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
    // Append all existing data to preserve it
    Object.keys(existingData).forEach(key => {
      if (existingData[key] !== null && existingData[key] !== undefined) {
        formData.append(key, existingData[key].toString());
      }
    });

    // Override theme settings
    formData.set('themeColor', themeColor);
    formData.set('fontFamily', fontFamily);
    formData.set('buttonRadius', buttonRadius);
    formData.set('useBoldText', useBoldText ? 'true' : 'false');

    const result = await updateCompanySettings(formData);
    
    if (result.success) {
      // Force reload to apply new root CSS variables immediately
      window.location.reload();
    } else {
      setError(result.error || 'Failed to save settings');
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal-content"><p>Loading...</p></div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Appearance & Theme</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Primary Theme Color</label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setThemeColor(c.value)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: c.value,
                    border: themeColor === c.value ? '3px solid #1e293b' : '1px solid #cbd5e1',
                    outline: themeColor === c.value ? '2px solid white' : 'none',
                    outlineOffset: '-2px'
                  }}
                  title={c.name}
                />
              ))}
              <input 
                type="color" 
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px' }}
                title="Custom Color"
              />
            </div>
            <p className="text-muted" style={{ fontSize: '12px' }}>Current: {themeColor}</p>
          </div>

          <div className="form-group">
            <label>Font Family</label>
            <select 
              className="zoho-select-field"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            >
              {PRESET_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="useBoldText" 
              checked={useBoldText}
              onChange={(e) => setUseBoldText(e.target.checked)}
            />
            <label htmlFor="useBoldText" style={{ marginBottom: 0, fontWeight: 'normal' }}>
              Use Bold Typography Globally
            </label>
          </div>

          <div className="form-group">
            <label>Button Shape (Border Radius)</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setButtonRadius('0px')}
                style={{
                  flex: 1, padding: '10px', background: buttonRadius === '0px' ? themeColor : '#f1f5f9',
                  color: buttonRadius === '0px' ? 'white' : 'black',
                  borderRadius: '0px', border: '1px solid #cbd5e1'
                }}
              >Square</button>
              <button
                type="button"
                onClick={() => setButtonRadius('8px')}
                style={{
                  flex: 1, padding: '10px', background: buttonRadius === '8px' ? themeColor : '#f1f5f9',
                  color: buttonRadius === '8px' ? 'white' : 'black',
                  borderRadius: '8px', border: '1px solid #cbd5e1'
                }}
              >Rounded</button>
              <button
                type="button"
                onClick={() => setButtonRadius('9999px')}
                style={{
                  flex: 1, padding: '10px', background: buttonRadius === '9999px' ? themeColor : '#f1f5f9',
                  color: buttonRadius === '9999px' ? 'white' : 'black',
                  borderRadius: '9999px', border: '1px solid #cbd5e1'
                }}
              >Pill</button>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Appearance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
