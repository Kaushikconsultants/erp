"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ScrollText, 
  Plus, 
  Search, 
  ChevronDown, 
  Printer, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  FileText, 
  X, 
  Clock, 
  MapPin, 
  Calendar,
  FileSpreadsheet,
  Edit3
} from 'lucide-react';
import { generateEWayBill, cancelEWayBill, updateEWayBillPartB } from '@/app/actions/ewayBillActions';
import * as XLSX from 'xlsx';

interface EWayBillsClientProps {
  initialEWayBills: any[];
  orders: any[];
  customers: any[];
  companySettings: any;
}

export default function EWayBillsClient({
  initialEWayBills,
  orders,
  customers,
  companySettings
}: EWayBillsClientProps) {
  const [ewayBills, setEwayBills] = useState<any[]>(initialEWayBills);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterMode, setFilterMode] = useState('All');

  // Generate Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected Order / Document
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [docType, setDocType] = useState('Tax Invoice');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);

  // Consignor & Consignee
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [fromGstin, setFromGstin] = useState(companySettings?.gstin || '06AAHCE7721Q1Z4');
  const [fromTradeName, setFromTradeName] = useState(companySettings?.companyName || 'ESPON CLOTHING PRIVATE LIMITED');
  const [fromAddress, setFromAddress] = useState(companySettings?.address || '123 Industrial Area, Sector 4');
  const [fromPlace, setFromPlace] = useState(companySettings?.city || 'Rohtak');
  const [fromPincode, setFromPincode] = useState(companySettings?.pincode || '124001');
  const [fromState, setFromState] = useState(companySettings?.state || 'Haryana');

  const [toGstin, setToGstin] = useState('');
  const [toTradeName, setToTradeName] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [toPlace, setToPlace] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [toState, setToState] = useState('');

  // Financial values
  const [taxableAmount, setTaxableAmount] = useState('0');
  const [cgstAmount, setCgstAmount] = useState('0');
  const [sgstAmount, setSgstAmount] = useState('0');
  const [igstAmount, setIgstAmount] = useState('0');
  const [totalValue, setTotalValue] = useState('0');
  const [mainHsnCode, setMainHsnCode] = useState('6109');

  // Part B (Transporter & Vehicle)
  const [transporterId, setTransporterId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transportMode, setTransportMode] = useState('Road');
  const [approxDistanceKm, setApproxDistanceKm] = useState('150');
  const [vehicleType, setVehicleType] = useState('Regular');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [docNoOrLorryReceipt, setDocNoOrLorryReceipt] = useState('');

  // Update Part-B Modal State
  const [updatePartBModal, setUpdatePartBModal] = useState<any | null>(null);
  const [partBVehicle, setPartBVehicle] = useState('');
  const [partBTransporter, setPartBTransporter] = useState('');
  const [partBLR, setPartBLR] = useState('');
  const [partBReason, setPartBReason] = useState('Vehicle Breakdown / Transfer');

  // When order selected, auto-populate all Part-A and Goods info
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setDocNumber(order.invoices?.[0]?.invoiceNumber || order.orderNumber);
      setDocDate(new Date(order.orderDate).toISOString().split('T')[0]);
      
      const cust = order.customer;
      if (cust) {
        setSelectedCustomerId(cust.id);
        setToGstin(cust.gstNumber || cust.gstin || '');
        setToTradeName(cust.businessName || cust.contactPerson || '');
        setToAddress(cust.shippingAddress || cust.billingAddress || `${cust.city || ''}, ${cust.state || ''}`);
        setToPlace(cust.city || '');
        setToPincode(cust.pincode || '');
        setToState(cust.state || '');
      }

      setTaxableAmount(String(order.subtotal || order.totalValue || 0));
      setCgstAmount(String(order.cgst || 0));
      setSgstAmount(String(order.sgst || 0));
      setIgstAmount(String(order.igst || 0));
      setTotalValue(String(order.totalValue || 0));

      if (order.items && order.items.length > 0) {
        setMainHsnCode(order.items[0].hsnCode || order.items[0].product?.articleNumber || '6109');
      }

      if (order.awbNumber) setVehicleNumber(order.awbNumber);
      if (order.courierName) setTransporterName(order.courierName);
    }
  };

  // Filtered List
  const filtered = useMemo(() => {
    return ewayBills.filter(ewb => {
      const matchStatus = filterStatus === 'All' || ewb.status === filterStatus;
      const matchMode = filterMode === 'All' || ewb.transportMode === filterMode;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        ewb.ewbNumber.toLowerCase().includes(q) ||
        ewb.docNumber.toLowerCase().includes(q) ||
        (ewb.vehicleNumber || '').toLowerCase().includes(q) ||
        (ewb.toTradeName || '').toLowerCase().includes(q) ||
        (ewb.customer?.businessName || '').toLowerCase().includes(q);

      return matchStatus && matchMode && matchSearch;
    });
  }, [ewayBills, search, filterStatus, filterMode]);

  // Metrics
  const activeCount = ewayBills.filter(e => e.status === 'GENERATED' || e.status === 'ACTIVE').length;
  const totalConsignmentValue = ewayBills.filter(e => e.status !== 'CANCELLED').reduce((acc, e) => acc + (e.totalInvoiceValue || 0), 0);
  const roadCount = ewayBills.filter(e => e.transportMode === 'Road' && e.status !== 'CANCELLED').length;

  // Handle Generate Submit
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      setError('Document Number is required.');
      return;
    }
    if (!toTradeName.trim()) {
      setError('Consignee Trade Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await generateEWayBill({
      orderId: selectedOrderId || undefined,
      customerId: selectedCustomerId || undefined,
      docType,
      docNumber,
      docDate,
      fromGstin,
      fromTradeName,
      fromAddress,
      fromPlace,
      fromPincode,
      fromState,
      toGstin,
      toTradeName,
      toAddress,
      toPlace,
      toPincode,
      toState,
      totalTaxableAmount: parseFloat(taxableAmount) || 0,
      cgstAmount: parseFloat(cgstAmount) || 0,
      sgstAmount: parseFloat(sgstAmount) || 0,
      igstAmount: parseFloat(igstAmount) || 0,
      totalInvoiceValue: parseFloat(totalValue) || 0,
      mainHsnCode,
      transporterId,
      transporterName,
      transportMode,
      approxDistanceKm: parseInt(approxDistanceKm, 10) || 100,
      vehicleType,
      vehicleNumber,
      docNoOrLorryReceipt
    });

    setLoading(false);

    if (res.success && res.ewayBill) {
      setEwayBills([res.ewayBill, ...ewayBills]);
      setShowGenerateModal(false);
      // Reset form
      setSelectedOrderId('');
      setDocNumber('');
      setVehicleNumber('');
    } else {
      setError(res.error || 'Failed to generate E-Way Bill');
    }
  };

  // Handle Update Part B Submit
  const handleUpdatePartBSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatePartBModal || !partBVehicle.trim()) return;

    setLoading(true);
    const res = await updateEWayBillPartB(updatePartBModal.id, {
      vehicleNumber: partBVehicle,
      transporterName: partBTransporter,
      docNoOrLorryReceipt: partBLR,
      reason: partBReason
    });
    setLoading(false);

    if (res.success) {
      setEwayBills(ewayBills.map(ewb => ewb.id === updatePartBModal.id ? { ...ewb, vehicleNumber: partBVehicle.toUpperCase(), status: 'ACTIVE' } : ewb));
      setUpdatePartBModal(null);
    } else {
      alert(res.error || 'Failed to update Part B');
    }
  };

  // Cancel E-Way Bill
  const handleCancel = async (id: string, ewbNumber: string) => {
    const reason = prompt(`Enter reason for cancelling E-Way Bill #${ewbNumber}:`, 'Order Cancelled / Wrong Entry');
    if (reason === null) return;

    const res = await cancelEWayBill(id, reason);
    if (res.success) {
      setEwayBills(ewayBills.map(e => e.id === id ? { ...e, status: 'CANCELLED' } : e));
    } else {
      alert(res.error || 'Failed to cancel E-Way Bill');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filtered.map(e => ({
      'E-Way Bill #': e.ewbNumber,
      'EWB Date': new Date(e.ewbDate).toLocaleString(),
      'Valid Until': e.validUntil ? new Date(e.validUntil).toLocaleString() : '-',
      'Doc Type': e.docType,
      'Doc Number': e.docNumber,
      'Consignee': e.toTradeName,
      'Destination State': e.toState,
      'Distance (KM)': e.approxDistanceKm,
      'Transport Mode': e.transportMode,
      'Vehicle Number': e.vehicleNumber || '-',
      'Transporter': e.transporterName || '-',
      'Consignment Value (₹)': e.totalInvoiceValue,
      'Status': e.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EWay Bills");
    XLSX.writeFile(wb, `EWay_Bills_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      {/* ─── KPI METRICS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #0d9488' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Active E-Way Bills
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f766e', marginTop: '6px' }}>
            {activeCount} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>active</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            In-transit and valid consignments
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #4f46e5' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Consignment Value
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4338ca', marginTop: '6px' }}>
            ₹{totalConsignmentValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across {ewayBills.length} generated waybills
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Road Shipments
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>
            {roadCount} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>trucks</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Vehicle & Part-B assigned
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR & CONTROLS ─── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '360px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search EWB #, Doc #, Vehicle, Consignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ position: 'relative', width: '150px' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 30px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                appearance: 'none',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="GENERATED">Generated</option>
              <option value="ACTIVE">Active (In-Transit)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Transport Mode */}
          <div style={{ position: 'relative', width: '150px' }}>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 30px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                appearance: 'none',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            >
              <option value="All">All Modes</option>
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Ship">Ship</option>
            </select>
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {(search || filterStatus !== 'All' || filterMode !== 'All') && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('All'); setFilterMode('All'); }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExportExcel}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#166534',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0d9488',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(13, 148, 136, 0.25)'
            }}
          >
            <Plus size={16} /> Generate E-Way Bill
          </button>
        </div>
      </div>

      {/* ─── DATA TABLE ─── */}
      <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>E-Way Bill #</th>
                <th style={{ padding: '12px 16px' }}>Doc Ref</th>
                <th style={{ padding: '12px 16px' }}>Consignee (To)</th>
                <th style={{ padding: '12px 16px' }}>Route & Distance</th>
                <th style={{ padding: '12px 16px' }}>Vehicle / Mode</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Value</th>
                <th style={{ padding: '12px 16px' }}>Validity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <ScrollText size={36} style={{ margin: '0 auto 10px auto', color: '#cbd5e1' }} />
                    <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No E-Way Bills Found</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Generate an electronic waybill for order dispatches and consignment movement.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(ewb => {
                  const isValid = ewb.validUntil && new Date(ewb.validUntil) > new Date();
                  return (
                    <tr key={ewb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0d9488' }}>
                        <Link href={`/eway-bills/${ewb.id}`} style={{ color: '#0d9488', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {ewb.ewbNumber} <ExternalLink size={12} />
                        </Link>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {new Date(ewb.ewbDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{ewb.docNumber}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ewb.docType}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        <div>{ewb.toTradeName || ewb.customer?.businessName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          📍 {ewb.toPlace || ewb.customer?.city || '-'}, {ewb.toState || ewb.customer?.state || '-'} ({ewb.toPincode || '-'})
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        <div style={{ fontWeight: 600 }}>{ewb.fromState || 'HQ'} → {ewb.toState || 'Dest'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>~{ewb.approxDistanceKm} km</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Truck size={14} color="#0d9488" />
                          {ewb.vehicleNumber || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending Vehicle</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {ewb.transporterName || ewb.transportMode}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                        ₹{ewb.totalInvoiceValue?.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {ewb.validUntil ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: isValid ? '#dcfce7' : '#fee2e2',
                            color: isValid ? '#166534' : '#991b1b'
                          }}>
                            {isValid ? `Valid till ${new Date(ewb.validUntil).toLocaleDateString()}` : 'Expired'}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: ewb.status === 'GENERATED' || ewb.status === 'ACTIVE' ? '#ccfbf1' : '#fee2e2',
                          color: ewb.status === 'GENERATED' || ewb.status === 'ACTIVE' ? '#0f766e' : '#991b1b'
                        }}>
                          {ewb.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Link
                            href={`/eway-bills/${ewb.id}`}
                            title="Print Official E-Way Slip"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Printer size={14} />
                          </Link>

                          {ewb.status !== 'CANCELLED' && (
                            <>
                              <button
                                onClick={() => {
                                  setUpdatePartBModal(ewb);
                                  setPartBVehicle(ewb.vehicleNumber || '');
                                  setPartBTransporter(ewb.transporterName || '');
                                  setPartBLR(ewb.docNoOrLorryReceipt || '');
                                }}
                                title="Update Vehicle / Part-B"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#e0e7ff',
                                  color: '#4338ca',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => handleCancel(ewb.id, ewb.ewbNumber)}
                                title="Cancel E-Way Bill"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── GENERATE E-WAY BILL MODAL ─── */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                  <ScrollText size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Generate Electronic Way Bill (E-Way Bill)
                </h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form id="generate-ewb-form" onSubmit={handleGenerateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Section 0: Quick Auto-Fill from Order */}
                <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', padding: '12px 16px', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>
                    ⚡ Auto-Fill from Active Order (Optional)
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #5eead4', fontSize: '0.85rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Choose an active order to auto-populate customer & values...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} - {o.customer.businessName || o.customer.contactPerson} (₹{o.totalValue?.toLocaleString()} • {o.orderStatus})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section 1: Document & Supply Type */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                    1. Document & Supply Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Document Type *
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      >
                        <option value="Tax Invoice">Tax Invoice</option>
                        <option value="Bill of Supply">Bill of Supply</option>
                        <option value="Delivery Challan">Delivery Challan</option>
                        <option value="Credit Note">Credit Note</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Document Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. INV-1004"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Document Date
                      </label>
                      <input
                        type="date"
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Main HSN Code
                      </label>
                      <input
                        type="text"
                        placeholder="6109"
                        value={mainHsnCode}
                        onChange={(e) => setMainHsnCode(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Consignor (From) & Consignee (To) */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                    2. Part A: Consignor & Consignee Details
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Consignor (From) */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e', marginBottom: '8px' }}>
                        FROM (Consignor):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Consignor Trade Name"
                          value={fromTradeName}
                          onChange={(e) => setFromTradeName(e.target.value)}
                          required
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Consignor GSTIN"
                          value={fromGstin}
                          onChange={(e) => setFromGstin(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={fromAddress}
                          onChange={(e) => setFromAddress(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Place / City"
                            value={fromPlace}
                            onChange={(e) => setFromPlace(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Pincode"
                            value={fromPincode}
                            onChange={(e) => setFromPincode(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Consignee (To) */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '8px' }}>
                        TO (Consignee):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Consignee Business Name *"
                          value={toTradeName}
                          onChange={(e) => setToTradeName(e.target.value)}
                          required
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Consignee GSTIN (or URP)"
                          value={toGstin}
                          onChange={(e) => setToGstin(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Delivery Address"
                          value={toAddress}
                          onChange={(e) => setToAddress(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="City / Destination"
                            value={toPlace}
                            onChange={(e) => setToPlace(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Pincode"
                            value={toPincode}
                            onChange={(e) => setToPincode(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Values & Taxes */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                    3. Consignment Values (₹)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                        Taxable Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={taxableAmount}
                        onChange={(e) => setTaxableAmount(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                        CGST
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cgstAmount}
                        onChange={(e) => setCgstAmount(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                        SGST
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sgstAmount}
                        onChange={(e) => setSgstAmount(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                        IGST
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={igstAmount}
                        onChange={(e) => setIgstAmount(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', marginBottom: '2px' }}>
                        Total Invoice Value *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalValue}
                        onChange={(e) => setTotalValue(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #0d9488', fontSize: '0.85rem', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Part B (Transporter & Vehicle Details) */}
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e40af' }}>
                    4. Part B: Transportation & Vehicle Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                        Transport Mode
                      </label>
                      <select
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                      >
                        <option value="Road">Road</option>
                        <option value="Rail">Rail</option>
                        <option value="Air">Air</option>
                        <option value="Ship">Ship</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                        Approx Distance (KM) *
                      </label>
                      <input
                        type="number"
                        value={approxDistanceKm}
                        onChange={(e) => setApproxDistanceKm(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Validity: {Math.max(1, Math.ceil((parseInt(approxDistanceKm, 10) || 100) / 200))} days
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                        Vehicle Number (e.g. DL-01-AB-1234)
                      </label>
                      <input
                        type="text"
                        placeholder="HR-12-AB-1234"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                        Transporter Name / Courier
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VRL Logistics / Delhivery"
                        value={transporterName}
                        onChange={(e) => setTransporterName(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                        LR / GR / Docket Number
                      </label>
                      <input
                        type="text"
                        placeholder="Docket / Tracking #"
                        value={docNoOrLorryReceipt}
                        onChange={(e) => setDocNoOrLorryReceipt(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="generate-ewb-form"
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer'
                }}
              >
                {loading ? 'Generating...' : 'Confirm & Generate E-Way Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── UPDATE PART-B VEHICLE MODAL ─── */}
      {updatePartBModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Update Part-B Vehicle Details
              </h3>
              <button onClick={() => setUpdatePartBModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#64748b' }}>
              E-Way Bill: <strong style={{ color: '#0d9488' }}>{updatePartBModal.ewbNumber}</strong> ({updatePartBModal.docNumber})
            </p>

            <form onSubmit={handleUpdatePartBSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  New Vehicle Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-01-AB-5678"
                  value={partBVehicle}
                  onChange={(e) => setPartBVehicle(e.target.value.toUpperCase())}
                  required
                  autoFocus
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Transporter Name
                </label>
                <input
                  type="text"
                  value={partBTransporter}
                  onChange={(e) => setPartBTransporter(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  LR / GR / Docket Number
                </label>
                <input
                  type="text"
                  value={partBLR}
                  onChange={(e) => setPartBLR(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Reason for Part-B Update
                </label>
                <select
                  value={partBReason}
                  onChange={(e) => setPartBReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="Vehicle Breakdown / Transshipment">Vehicle Breakdown / Transshipment</option>
                  <option value="First Time Movement">First Time Movement</option>
                  <option value="Transfer to Other Transporter">Transfer to Other Transporter</option>
                  <option value="Multi-Vehicle Movement">Multi-Vehicle Movement</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUpdatePartBModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4338ca',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer'
                  }}
                >
                  {loading ? 'Updating...' : 'Save Part-B Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
