"use client";

import React, { useState, useEffect } from "react";
import { calculateShippingRates } from "@/app/actions/orderActions";
import { ShippingRate, BoxDimension } from "@/lib/shipmozoService";
import { Truck, X, Plus, Trash2, Check, ArrowRight, Package } from "lucide-react";
import "@/components/ui/modal.css";

interface ShippingRateCalculatorProps {
  orderValue: number;
  initialDestinationPincode?: string;
  initialWeight?: number;
  onSelectRate?: (rate: ShippingRate) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function ShippingRateCalculator({ 
  orderValue, 
  initialDestinationPincode = "", 
  initialWeight = 0.5, 
  onSelectRate,
  isModal = false,
  onClose
}: ShippingRateCalculatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<string>("ALL");

  const filteredRates = React.useMemo(() => {
    if (!rates) return [];
    if (selectedPartnerFilter === "ALL") return rates;
    return rates.filter(r => r.partnerName.toLowerCase().includes(selectedPartnerFilter.toLowerCase()));
  }, [rates, selectedPartnerFilter]);

  // Helper to round weight cleanly to max 2 decimal places
  const cleanWeight = (w: number) => Math.round(w * 100) / 100;

  const startingWeight = cleanWeight(initialWeight > 0 ? initialWeight : 35);

  // Form State matching Software Theme
  const [category, setCategory] = useState<"Domestic" | "International">("Domestic");
  const [shipmentType, setShipmentType] = useState<"Forward" | "Reverse">("Forward");
  const [packageType, setPackageType] = useState("NON ESSENTIALS");
  const [originPincode, setOriginPincode] = useState("124001");
  const [destinationPincode, setDestinationPincode] = useState(initialDestinationPincode || "");
  const [paymentMode, setPaymentMode] = useState<"Prepaid" | "COD">("Prepaid");
  const [weight, setWeight] = useState<number>(startingWeight);
  const [invoiceValue, setInvoiceValue] = useState<number>(orderValue > 0 ? Math.round(orderValue) : 25000);
  const [rovType, setRovType] = useState<"Rov Owner" | "Rov Carrier">("Rov Owner");

  // Dimensions Array - Height defaults to match weight!
  const [dimensions, setDimensions] = useState<BoxDimension[]>([
    { id: "1", quantity: 1, length: 100, width: 40, height: Math.round(startingWeight) }
  ]);

  useEffect(() => {
    if (initialDestinationPincode) setDestinationPincode(initialDestinationPincode);
  }, [initialDestinationPincode]);

  useEffect(() => {
    if (initialWeight > 0) {
      const roundedW = cleanWeight(initialWeight);
      setWeight(roundedW);
      // By default keep the height value same as weight
      setDimensions(prev => prev.map((box, idx) => idx === 0 ? { ...box, height: Math.round(roundedW) } : box));
    }
  }, [initialWeight]);

  useEffect(() => {
    if (orderValue > 0) setInvoiceValue(Math.round(orderValue));
  }, [orderValue]);

  const handleWeightChange = (newWeight: number) => {
    const roundedW = cleanWeight(newWeight);
    setWeight(roundedW);
    // Keep height value same as weight by default for primary box
    setDimensions(prev => prev.map((box, idx) => idx === 0 ? { ...box, height: Math.round(roundedW) } : box));
  };

  const handleAddBox = () => {
    setDimensions(prev => [
      ...prev,
      { id: Date.now().toString(), quantity: 1, length: 30, width: 30, height: Math.round(weight) }
    ]);
  };

  const handleRemoveBox = (id: string) => {
    if (dimensions.length === 1) return;
    setDimensions(prev => prev.filter(b => b.id !== id));
  };

  const handleBoxChange = (id: string, field: keyof BoxDimension, val: number) => {
    setDimensions(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const handleCalculate = async () => {
    if (!originPincode.trim() || !destinationPincode.trim()) {
      setError("Origin Pincode and Delivery Area Pincode are required.");
      return;
    }
    
    setLoading(true);
    setError("");
    setRates(null);

    const result = await calculateShippingRates({
      category,
      shipmentType,
      packageType,
      originPincode: originPincode.trim(),
      destinationPincode: destinationPincode.trim(),
      weight: weight > 0 ? weight : 0.5,
      orderValue: invoiceValue,
      paymentMode,
      rovType,
      dimensions
    });

    if ('error' in result && result.error) {
      setError(result.error);
    } else if ('success' in result && result.success && 'rates' in result && result.rates) {
      setRates(result.rates);
    } else {
      setError("Unexpected error calculating rates.");
    }
    
    setLoading(false);
  };

  const content = (
    <div className="rate-calculator-container" style={{ background: '#ffffff', borderRadius: '14px', padding: '24px', color: '#1e293b' }}>
      
      {/* HEADER - Software Theme */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '10px', borderRadius: '10px', display: 'flex', border: '1px solid #c7d2fe' }}>
            <Truck size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#0f172a' }}>Shipping Rates Calculator</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Calculate live domestic & international rates across all active aggregators</span>
          </div>
        </div>
        {isModal && onClose && (
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* DOMESTIC / INTERNATIONAL TABS - Software Theme Indigo */}
      <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '24px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <button 
          type="button"
          onClick={() => setCategory("Domestic")} 
          style={{ 
            padding: '6px 22px', 
            borderRadius: '20px', 
            border: 'none', 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            backgroundColor: category === "Domestic" ? '#4f46e5' : 'transparent',
            color: category === "Domestic" ? '#ffffff' : '#64748b',
            boxShadow: category === "Domestic" ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Domestic
        </button>
        <button 
          type="button"
          onClick={() => setCategory("International")} 
          style={{ 
            padding: '6px 22px', 
            borderRadius: '20px', 
            border: 'none', 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            backgroundColor: category === "International" ? '#4f46e5' : 'transparent',
            color: category === "International" ? '#ffffff' : '#64748b',
            boxShadow: category === "International" ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          International
        </button>
      </div>

      {/* FORM GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        
        {/* Shipment Type */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Shipment Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select 
            value={shipmentType} 
            onChange={e => setShipmentType(e.target.value as any)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="Forward">Forward</option>
            <option value="Reverse">Reverse</option>
          </select>
        </div>

        {/* Package Type */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Package Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select 
            value={packageType} 
            onChange={e => setPackageType(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="NON ESSENTIALS">Heavy Shipment / Standard Parcel</option>
            <option value="ESSENTIALS">Essentials / Documents</option>
          </select>
        </div>

        {/* Origin Pincode */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Origin Pincode <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input 
            type="text" 
            value={originPincode} 
            onChange={e => setOriginPincode(e.target.value)}
            placeholder="124001"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        {/* Delivery Area Pincode */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Delivery Area Pincode <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input 
            type="text" 
            value={destinationPincode} 
            onChange={e => setDestinationPincode(e.target.value)}
            placeholder="e.g. 799003"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        {/* Payment Mode */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Payment Mode <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select 
            value={paymentMode} 
            onChange={e => setPaymentMode(e.target.value as any)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="Prepaid">Prepaid</option>
            <option value="COD">Cash on Delivery (COD)</option>
          </select>
        </div>

        {/* Approximate Weight (Clean 2 Decimals) */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Approximate Weight <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex' }}>
            <input 
              type="number" 
              step="0.01"
              value={weight} 
              onChange={e => handleWeightChange(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: '8px 0 0 8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 600, color: '#4f46e5' }}
            />
            <span style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '10px 14px', borderRadius: '0 8px 8px 0', border: '1px solid #c7d2fe', borderLeft: 'none', fontSize: '0.875rem', fontWeight: 700 }}>
              Kg
            </span>
          </div>
        </div>

        {/* Invoice Value */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Invoice Value <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex' }}>
            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '10px 14px', borderRadius: '8px 0 0 8px', border: '1px solid #cbd5e1', borderRight: 'none', fontSize: '0.875rem', fontWeight: 700 }}>
              ₹
            </span>
            <input 
              type="number" 
              value={invoiceValue} 
              onChange={e => setInvoiceValue(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: '0 8px 8px 0', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Rov Type */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
            Rov Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select 
            value={rovType} 
            onChange={e => setRovType(e.target.value as any)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#fff' }}
          >
            <option value="Rov Owner">Rov Owner</option>
            <option value="Rov Carrier">Rov Carrier</option>
          </select>
        </div>

      </div>

      {/* DIMENSIONS SECTION - Default Height = Weight */}
      <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Dimensions</h4>
          <span style={{ fontSize: '0.75rem', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #c7d2fe', fontWeight: 600 }}>
            Height defaults to Weight ({weight} cm)
          </span>
        </div>
        
        {dimensions.map((box, index) => (
          <div key={box.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '10px' }}>
            <div style={{ flex: '1', minWidth: '90px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Quantity *</label>
              <input 
                type="number" 
                min="1"
                value={box.quantity} 
                onChange={e => handleBoxChange(box.id, 'quantity', parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ flex: '1.5', minWidth: '110px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Length *</label>
              <div style={{ display: 'flex' }}>
                <input 
                  type="number" 
                  value={box.length} 
                  onChange={e => handleBoxChange(box.id, 'length', parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px 0 0 6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
                <span style={{ backgroundColor: '#f1f5f9', padding: '8px 10px', borderRadius: '0 6px 6px 0', border: '1px solid #cbd5e1', borderLeft: 'none', fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>CM</span>
              </div>
            </div>

            <div style={{ flex: '1.5', minWidth: '110px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Width *</label>
              <div style={{ display: 'flex' }}>
                <input 
                  type="number" 
                  value={box.width} 
                  onChange={e => handleBoxChange(box.id, 'width', parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px 0 0 6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
                <span style={{ backgroundColor: '#f1f5f9', padding: '8px 10px', borderRadius: '0 6px 6px 0', border: '1px solid #cbd5e1', borderLeft: 'none', fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>CM</span>
              </div>
            </div>

            <div style={{ flex: '1.5', minWidth: '110px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4f46e5', marginBottom: '4px', display: 'block' }}>Height *</label>
              <div style={{ display: 'flex' }}>
                <input 
                  type="number" 
                  value={box.height} 
                  onChange={e => handleBoxChange(box.id, 'height', parseFloat(e.target.value) || 0)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px 0 0 6px', border: '1px solid #c7d2fe', fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5', backgroundColor: '#fff' }}
                />
                <span style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '8px 10px', borderRadius: '0 6px 6px 0', border: '1px solid #c7d2fe', borderLeft: 'none', fontSize: '0.78rem', fontWeight: 700 }}>CM</span>
              </div>
            </div>

            {index === dimensions.length - 1 ? (
              <button 
                type="button" 
                onClick={handleAddBox}
                style={{ backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                title="Add Another Box"
              >
                <Plus size={18} />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => handleRemoveBox(box.id)}
                style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                title="Remove Box"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* CALCULATE BUTTON - Software Theme Primary Button */}
      <button 
        type="button" 
        onClick={handleCalculate}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '12px', 
          background: 'var(--accent-gradient, linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, var(--accent-primary-hover, #6366f1) 100%))', 
          color: '#ffffff', 
          border: 'none', 
          borderRadius: 'var(--radius-md, 8px)', 
          fontSize: '0.95rem', 
          fontWeight: 600, 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px',
          boxShadow: '0 4px 12px var(--accent-light, rgba(79, 70, 229, 0.25))',
          transition: 'transform 0.15s ease'
        }}
      >
        {loading ? "Calculating Rates..." : "Calculate Rates"}
      </button>

      {error && (
        <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* SHIPPING PARTNERS RESULTS GRID - Software Theme */}
      {rates && (
        <div style={{ marginTop: '28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ width: '44px', height: '44px', backgroundColor: '#eef2ff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: '1px solid #c7d2fe' }}>
              <Package size={22} color="#4f46e5" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Available Shipping Partners ({rates.length})</h3>
          </div>

          {/* PARTNER FILTER PILLS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '20px' }}>
            {[
              { id: 'ALL', label: `All Partners (${rates.length})` },
              { id: 'DELHIVERY', label: 'Delhivery' },
              { id: 'EKART', label: 'Ekart' },
              { id: 'BLUEDART', label: 'BlueDart' },
              { id: 'DTDC', label: 'DTDC' },
              { id: 'SMARTR', label: 'Smartr' },
              { id: 'XPRESSBEES', label: 'Xpressbees' },
              { id: 'AMAZON', label: 'Amazon' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPartnerFilter(p.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '16px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedPartnerFilter === p.id ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                  backgroundColor: selectedPartnerFilter === p.id ? '#4f46e5' : '#ffffff',
                  color: selectedPartnerFilter === p.id ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {filteredRates.map((rate, idx) => (
              <div 
                key={idx}
                style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  position: 'relative',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 8px 16px -2px rgba(79, 70, 229, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                }}
              >
                <div>
                  {/* Partner Header */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.05em', color: '#0f172a' }}>
                      {rate.partnerName}
                    </div>
                  </div>

                  {/* Service Title */}
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '4px' }}>
                    {rate.serviceName}
                  </div>

                  {/* Weight & Days Badges */}
                  <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>
                    <div>(Chg. Weight: <strong>{rate.chargedWeight} Kg</strong>)</div>
                    <div>Estimated Delivery: <strong style={{ color: '#0f172a' }}>{rate.estimatedDeliveryDays} Days</strong></div>
                    <div style={{ marginTop: '4px' }}><span style={{ backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#4f46e5', border: '1px solid #c7d2fe' }}>{rate.zone}</span></div>
                  </div>

                  {/* Price Display */}
                  <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5', marginBottom: '16px' }}>
                    ₹ {rate.charge.toFixed(2)}
                  </div>

                  {/* Cost Breakdown List */}
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '12px', fontSize: '0.78rem', color: '#475569' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Shipping Charges:</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>₹ {rate.breakdown.shippingCharges}</span>
                    </div>

                    {rate.breakdown.firstMileCost !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>First Mile Cost</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹ {rate.breakdown.firstMileCost}</span>
                      </div>
                    )}

                    {rate.breakdown.sdl !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>SDL</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹ {rate.breakdown.sdl}</span>
                      </div>
                    )}

                    {rate.breakdown.rovOwner !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Rov Owner</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹ {rate.breakdown.rovOwner}</span>
                      </div>
                    )}

                    {rate.breakdown.fuelSurcharge !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Fuel Surcharge</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹ {rate.breakdown.fuelSurcharge}</span>
                      </div>
                    )}

                    {rate.breakdown.awbCharges !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>AWB Charges</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>₹ {rate.breakdown.awbCharges}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600, color: '#0f172a' }}>
                      <span>GST (18%)</span>
                      <span>₹ {rate.breakdown.gst}</span>
                    </div>
                  </div>

                  {/* Divisor & Notes */}
                  {rate.divisorInfo && (
                    <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '10px', fontWeight: 600 }}>
                      • {rate.divisorInfo}
                    </div>
                  )}

                  {rate.noteInfo && (
                    <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '4px', fontWeight: 500 }}>
                      • {rate.noteInfo}
                    </div>
                  )}
                </div>

                {/* Apply Button - Software Theme */}
                {onSelectRate && (
                  <button 
                    type="button"
                    onClick={() => onSelectRate(rate)}
                    style={{ 
                      marginTop: '16px',
                      width: '100%', 
                      padding: '10px', 
                      backgroundColor: '#4f46e5', 
                      color: '#ffffff', 
                      border: 'none', 
                      borderRadius: '6px', 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                    }}
                  >
                    Apply Rate to Quotation <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content glass-panel animate-in" style={{ maxWidth: '850px', width: '94%', maxHeight: '90vh', overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
