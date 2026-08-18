"use client";

import React, { useState, useRef, useEffect } from 'react';
import { adjustInventory } from '@/app/actions/inventoryActions';
import { ScanBarcode, Plus, Minus, CheckCircle, AlertCircle } from 'lucide-react';

export default function InventoryScanner() {
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus scanner input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleScan = async (type: "IN" | "OUT") => {
    if (!sku.trim()) {
      setMessage({ type: 'error', text: 'Please scan or enter a SKU.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await adjustInventory(sku.trim(), quantity, type, `Barcode scan: ${type}`);
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result.success && result.product) {
      setMessage({ 
        type: 'success', 
        text: `Success: ${type === 'IN' ? 'Added' : 'Removed'} ${quantity} of ${result.product.name}. New Stock: ${result.product.newStock}`
      });
      setSku(''); // Clear for next scan
      setQuantity(1);
      if (inputRef.current) inputRef.current.focus();
    }
    
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Barcode scanners typically send an Enter keypress after the barcode
    if (e.key === 'Enter') {
      e.preventDefault();
      // Default action could be IN or OUT depending on what mode you want, 
      // but usually we want the user to click the button or we can have a default mode toggle.
      // For now, we just blur to let them click IN/OUT, or default to IN:
      handleScan("IN"); 
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
        <ScanBarcode className="text-indigo-600" /> Fast Inventory Scanner
      </h3>
      
      {message && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '16px', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          fontWeight: 500,
          fontSize: '0.875rem'
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Scan Barcode / Enter SKU
          </label>
          <input
            ref={inputRef}
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ready to scan..."
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>
        
        <div style={{ width: '100px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Qty
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="primary-btn hover-lift"
            onClick={() => handleScan("IN")}
            disabled={loading || !sku.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px' }}
          >
            <Plus size={18} /> Stock In
          </button>
          
          <button 
            className="action-btn hover-lift"
            onClick={() => handleScan("OUT")}
            disabled={loading || !sku.trim()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px',
              border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600
            }}
          >
            <Minus size={18} /> Stock Out
          </button>
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        * Connect a USB/Bluetooth barcode scanner. Scanning automatically adds stock (default behavior).
      </p>
    </div>
  );
}
