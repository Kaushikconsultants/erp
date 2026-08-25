"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Package, Truck, Scale, FileText } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface CartonLabelModalProps {
  order: {
    id: string;
    orderNumber: string;
    customer?: {
      businessName?: string;
      contactPerson?: string;
      mobile?: string;
      shippingAddress?: string;
      billingAddress?: string;
      city?: string;
      state?: string;
      pincode?: string;
      gstNumber?: string;
    } | null;
    items?: Array<{
      quantity: number;
    }>;
    totalAmount?: number;
  };
  companySettings?: {
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    mobile?: string;
    gstin?: string;
  };
  onClose: () => void;
}

export default function CartonLabelModal({ order, companySettings, onClose }: CartonLabelModalProps) {
  const [totalBoxes, setTotalBoxes] = useState<number>(2);
  const [boxWeights, setBoxWeights] = useState<string[]>(['15.5', '18.0']);
  const [transporterName, setTransporterName] = useState<string>('V-Trans / Surface Cargo');
  const [biltyNumber, setBiltyNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('Handle With Care • Garments Cargo');

  const customer = order.customer || {};
  const company = companySettings || {
    companyName: 'ESPON CLOTHING PRIVATE LIMITED',
    address: 'Sco 71A, 2nd Floor, Ashoka Plaza, Delhi Road',
    city: 'Rohtak',
    state: 'Haryana',
    pincode: '124001',
    mobile: '+91 7206066678',
    gstin: '06AAHCE7721Q1Z4'
  };

  const totalPieces = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Sync weights array when box count changes
  const handleBoxCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setTotalBoxes(validCount);
    setBoxWeights(prev => {
      const arr = [...prev];
      while (arr.length < validCount) arr.push('15.0');
      return arr.slice(0, validCount);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
        maxWidth: '860px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>

        {/* Modal Header (Screen Only) */}
        <div className="no-print" style={{
          backgroundColor: '#f8fafc',
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                Dispatch Box & Carton Labels Generator
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Order #{order.orderNumber} • {customer.businessName || 'Customer'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print All {totalBoxes} Labels
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Screen Only) */}
        <div className="no-print" style={{
          padding: '14px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
              Total Cartons / Boxes
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={totalBoxes}
              onChange={e => handleBoxCountChange(parseInt(e.target.value) || 1)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
              Transporter / Courier
            </label>
            <input
              type="text"
              value={transporterName}
              onChange={e => setTransporterName(e.target.value)}
              placeholder="e.g. V-Trans, TCI, Delhivery"
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
              LR / Bilty / Docket No
            </label>
            <input
              type="text"
              value={biltyNumber}
              onChange={e => setBiltyNumber(e.target.value)}
              placeholder="Optional Bilty #"
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
              Handling Instructions
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Scrollable Printable Labels Canvas */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc' }}>
          {Array.from({ length: totalBoxes }).map((_, idx) => {
            const boxNum = idx + 1;
            const currentWeight = boxWeights[idx] || '15.0';

            return (
              <SingleCartonLabel
                key={boxNum}
                boxNumber={boxNum}
                totalBoxes={totalBoxes}
                weight={currentWeight}
                onWeightChange={(w) => {
                  const updated = [...boxWeights];
                  updated[idx] = w;
                  setBoxWeights(updated);
                }}
                orderNumber={order.orderNumber}
                customer={customer}
                company={company}
                transporterName={transporterName}
                biltyNumber={biltyNumber}
                remarks={remarks}
                totalPieces={totalPieces}
              />
            );
          })}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          .carton-label-card { 
            page-break-after: always !important; 
            break-after: page !important;
            border: 2px solid #000 !important; 
            box-shadow: none !important; 
            margin-bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}} />
    </div>
  );
}

interface SingleCartonLabelProps {
  boxNumber: number;
  totalBoxes: number;
  weight: string;
  onWeightChange: (w: string) => void;
  orderNumber: string;
  customer: any;
  company: any;
  transporterName: string;
  biltyNumber: string;
  remarks: string;
  totalPieces: number;
}

function SingleCartonLabel({
  boxNumber,
  totalBoxes,
  weight,
  onWeightChange,
  orderNumber,
  customer,
  company,
  transporterName,
  biltyNumber,
  remarks,
  totalPieces
}: SingleCartonLabelProps) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && orderNumber) {
      try {
        JsBarcode(barcodeRef.current, orderNumber, {
          format: "CODE128",
          width: 1.5,
          height: 34,
          displayValue: true,
          fontSize: 11,
          margin: 0
        });
      } catch (e) {
        console.error("Barcode generation error:", e);
      }
    }
  }, [orderNumber]);

  return (
    <div className="carton-label-card" style={{
      backgroundColor: '#ffffff',
      border: '2px solid #1e293b',
      borderRadius: '8px',
      padding: '16px',
      color: '#0f172a',
      maxWidth: '680px',
      margin: '0 auto',
      width: '100%',
      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
    }}>
      
      {/* Header: Box Indicator & Barcode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Consignment Package</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            BOX {boxNumber} OF {totalBoxes}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <svg ref={barcodeRef}></svg>
        </div>
      </div>

      {/* Grid: TO (Consignee) vs FROM (Shipper) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
        
        {/* TO Details */}
        <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CONSIGNEE (TO):
          </span>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {customer.businessName || 'Customer Company'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '2px', lineHeight: 1.35 }}>
            Attn: {customer.contactPerson || 'Store Manager'}<br />
            {customer.shippingAddress || customer.billingAddress || `${customer.city || 'Rohtak'}, ${customer.state || 'Haryana'}`}<br />
            <strong>Dest City: {customer.city || 'Rohtak'} - {customer.pincode || '124001'} ({customer.state || 'Haryana'})</strong><br />
            Phone: <strong style={{ color: '#0f172a' }}>{customer.mobile || customer.phone || 'N/A'}</strong>
          </div>
        </div>

        {/* FROM Details */}
        <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SHIPPER (FROM):
          </span>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
            {company.companyName || 'ESPON CLOTHING PRIVATE LIMITED'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px', lineHeight: 1.3 }}>
            {company.address || 'Ashoka Plaza, Delhi Road, Rohtak'}<br />
            GSTIN: <strong>{company.gstin || '06AAHCE7721Q1Z4'}</strong><br />
            Helpline: {company.mobile || '+91 7206066678'}
          </div>
        </div>
      </div>

      {/* Cargo Logistics Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px', textAlign: 'center' }}>
        <div style={{ padding: '6px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Transporter</span>
          <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{transporterName || 'Surface Cargo'}</strong>
        </div>

        <div style={{ padding: '6px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Bilty / LR No</span>
          <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{biltyNumber || 'Direct Booking'}</strong>
        </div>

        <div style={{ padding: '6px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Gross Weight</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <input
              type="text"
              value={weight}
              onChange={e => onWeightChange(e.target.value)}
              style={{ width: '42px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, padding: '1px 2px' }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>kg</span>
          </div>
        </div>

        <div style={{ padding: '6px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Total Pcs</span>
          <strong style={{ fontSize: '0.82rem', color: '#059669' }}>{totalPieces > 0 ? `${totalPieces} pcs` : 'Garments'}</strong>
        </div>
      </div>

      {/* Footer: Handling Warnings */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
        <span>⚠️ {remarks}</span>
        <span style={{ fontWeight: 600, color: '#334155' }}>☂️ KEEP DRY • 📦 HANDLE WITH CARE • ⬆️ THIS SIDE UP</span>
      </div>

    </div>
  );
}
