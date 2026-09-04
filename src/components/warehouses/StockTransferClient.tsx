"use client";

import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Warehouse, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Search, 
  X, 
  Package, 
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { createStockTransfer, receiveStockTransfer } from '@/app/actions/stockTransferActions';

interface StockTransferClientProps {
  initialTransfers: any[];
  warehouses: any[];
  products: any[];
}

export default function StockTransferClient({
  initialTransfers,
  warehouses,
  products
}: StockTransferClientProps) {
  const [transfers, setTransfers] = useState<any[]>(initialTransfers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<any | null>(null);

  // Form states
  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id || '');
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id || warehouses[0]?.id || '');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<{ productId: string; quantitySent: number; unitPrice: number }[]>([
    { productId: products[0]?.id || '', quantitySent: 10, unitPrice: products[0]?.purchasePrice || products[0]?.sellingPrice || 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const addItemRow = () => {
    setTransferItems(prev => [
      ...prev,
      { productId: products[0]?.id || '', quantitySent: 10, unitPrice: products[0]?.purchasePrice || 0 }
    ]);
  };

  const removeItemRow = (idx: number) => {
    setTransferItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setTransferItems(prev => {
      const updated = [...prev];
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        updated[idx] = {
          ...updated[idx],
          productId: value,
          unitPrice: prod?.purchasePrice || prod?.sellingPrice || 0
        };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) {
      alert("Please select distinct source and destination warehouses.");
      return;
    }

    setSaving(true);
    const res = await createStockTransfer({
      fromWarehouseId,
      toWarehouseId,
      transporterName,
      vehicleNumber,
      lrNumber,
      notes,
      items: transferItems
    });
    setSaving(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      window.location.reload();
    } else {
      alert(res.error || "Failed to create transfer");
    }
  };

  const handleReceive = async (transferId: string) => {
    if (!confirm("Confirm receipt of all transferred stock units at the destination warehouse?")) return;
    setReceivingId(transferId);
    const res = await receiveStockTransfer(transferId);
    setReceivingId(null);

    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const num = t.transferNumber.toLowerCase();
      const from = (t.fromWarehouse?.name || '').toLowerCase();
      const to = (t.toWarehouse?.name || '').toLowerCase();
      if (!num.includes(q) && !from.includes(q) && !to.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Inter-Warehouse Stock Transfers
            </h1>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Transfer inventory seamlessly between branches and warehouses with In-Transit tracking and Goods Receipt (GRN).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
          }}
        >
          <Plus size={16} /> New Stock Transfer (STN)
        </button>
      </div>

      {/* FILTER BAR */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {['ALL', 'IN_TRANSIT', 'RECEIVED'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: statusFilter === st ? '#ffffff' : 'transparent',
                  color: statusFilter === st ? '#0f172a' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: statusFilter === st ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {st === 'ALL' ? 'All Transfers' : st === 'IN_TRANSIT' ? 'In-Transit' : 'Received / Completed'}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search transfer#, warehouse..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* TRANSFERS TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Transfer #</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Source Warehouse</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}></th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Destination Warehouse</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Total Qty</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No stock transfers found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(t => {
                  const isInTransit = t.status === 'IN_TRANSIT';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                        {t.transferNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {new Date(t.transferDate).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {t.fromWarehouse?.name || 'Warehouse A'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        <ArrowRight size={16} />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {t.toWarehouse?.name || 'Warehouse B'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                        {t.totalQuantity} units
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isInTransit ? (
                          <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> IN-TRANSIT
                          </span>
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> RECEIVED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setViewingTransfer(t)}
                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.74rem', fontWeight: 600, color: '#475569' }}
                          >
                            View Items
                          </button>
                          {isInTransit && (
                            <button
                              type="button"
                              onClick={() => handleReceive(t.id)}
                              disabled={receivingId === t.id}
                              style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#059669', color: '#fff', fontSize: '0.74rem', fontWeight: 700 }}
                            >
                              {receivingId === t.id ? 'Receiving...' : 'Receive Stock'}
                            </button>
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

      {/* CREATE TRANSFER MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Create Inter-Warehouse Stock Transfer
              </h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Warehouses From & To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Source Warehouse (Stock Out) *</label>
                  <select
                    value={fromWarehouseId}
                    onChange={e => setFromWarehouseId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code || 'Main'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Destination Warehouse (Stock In) *</label>
                  <select
                    value={toWarehouseId}
                    onChange={e => setToWarehouseId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code || 'Branch'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transporter Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Transporter Name</label>
                  <input
                    type="text"
                    placeholder="e.g. V-Trans / Self Van"
                    value={transporterName}
                    onChange={e => setTransporterName(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. HR-12-AB-1234"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>LR / GR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. LR-98124"
                    value={lrNumber}
                    onChange={e => setLrNumber(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Item Rows */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Transfer Item List</label>
                  <button type="button" onClick={addItemRow} style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: 700 }}>+ Add Product</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {transferItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={item.productId}
                        onChange={e => updateItem(idx, 'productId', e.target.value)}
                        style={{ flex: 2, padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantitySent}
                        onChange={e => updateItem(idx, 'quantitySent', parseInt(e.target.value, 10) || 1)}
                        style={{ width: '80px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'center' }}
                      />

                      {transferItems.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(idx)} style={{ color: '#ef4444' }}><X size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 22px', borderRadius: '6px', backgroundColor: '#0284c7', color: '#fff', fontSize: '0.84rem', fontWeight: 700 }}>
                  {saving ? 'Creating...' : 'Dispatch & Create Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW TRANSFER ITEMS MODAL */}
      {viewingTransfer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Transfer #{viewingTransfer.transferNumber}
              </h3>
              <button type="button" onClick={() => setViewingTransfer(null)} style={{ color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.8rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <div>From: <strong>{viewingTransfer.fromWarehouse?.name}</strong></div>
              <div>→</div>
              <div>To: <strong>{viewingTransfer.toWarehouse?.name}</strong></div>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Product</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty Sent</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty Received</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingTransfer.items?.map((it: any) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.product?.name || 'Product'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{it.quantitySent}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: it.quantityReceived > 0 ? '#059669' : '#94a3b8' }}>
                        {it.quantityReceived || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setViewingTransfer(null)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#475569', color: '#fff', fontSize: '0.82rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
