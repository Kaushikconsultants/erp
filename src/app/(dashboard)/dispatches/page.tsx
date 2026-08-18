"use client";
import React, { useEffect, useState } from 'react';
import { getDispatchPipelineOrders, updateOrderStatus, updateDispatchDetails } from '@/app/actions/orderActions';
import { Truck, Package, Printer, FileText, CheckCircle2, Eye, PackageCheck, ScanBarcode } from 'lucide-react';
import OrderPackingScannerModal from '@/components/scanner/OrderPackingScannerModal';

export default function DispatchesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [awbModal, setAwbModal] = useState<string | null>(null); // orderId
  const [packingModalOrderId, setPackingModalOrderId] = useState<string | null>(null);
  const [awbInput, setAwbInput] = useState('');
  const [courierInput, setCourierInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    const res = await getDispatchPipelineOrders();
    if (res.success) {
      setOrders(res.orders || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handlePrintAndPack = async (orderId: string) => {
    // Open order invoice in new tab to print
    window.open(`/orders/${orderId}/invoice`, '_blank');
    
    // Update order status to Packing
    await updateOrderStatus(orderId, 'Packing');
    loadOrders();
  };

  const handleMarkPacked = async (orderId: string) => {
    await updateOrderStatus(orderId, 'Packed');
    loadOrders();
  };

  const handleAssignAWB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awbModal) return;
    setSaving(true);
    await updateDispatchDetails(awbModal, awbInput, courierInput);
    setAwbModal(null);
    setAwbInput('');
    setCourierInput('');
    setSaving(false);
    loadOrders();
  };

  const newOrders = orders.filter(o => o.orderStatus === 'Processing');
  const packingOrders = orders.filter(o => o.orderStatus === 'Packing');
  const packedOrders = orders.filter(o => o.orderStatus === 'Packed');
  const dispatchedOrders = orders.filter(o => o.orderStatus === 'Dispatched');

  const renderCard = (order: any, actionRender: React.ReactNode) => (
    <div key={order.id} className="glass-panel" style={{ padding: '16px', marginBottom: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{order.orderNumber}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{order.customer.businessName}</div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
          {order.invoices && order.invoices.length > 0 ? order.invoices[0].invoiceNumber : 'Invoice Pending'}
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        📍 {order.customer.city || 'City'}, {order.customer.state || 'State'} - {order.customer.pincode || 'ZIP'}
      </div>
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        {actionRender}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title"><Truck className="inline-block mr-2" /> Dispatch Pipeline</h1>
          <p className="page-subtitle">Manage order fulfillment from invoice to dispatch.</p>
        </div>
        <button className="action-btn outline-primary" onClick={loadOrders}>
          Refresh Board
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', alignItems: 'start', overflowX: 'auto', paddingBottom: '20px' }}>
          
          {/* STAGE 1: NEW / PRINTING */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', minWidth: '280px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#475569' }}>
              <FileText size={16} /> 1. New Orders ({newOrders.length})
            </h3>
            {newOrders.map(order => renderCard(order, 
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <a
                  href={`/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1.5px solid #4f46e5',
                    color: '#4f46e5',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Eye size={15} /> View Invoice
                </a>
                <button 
                  onClick={() => handlePrintAndPack(order.id)}
                  className="action-btn primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, background: '#4f46e5', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                >
                  <Printer size={15} /> Print & Pack
                </button>
              </div>
            ))}
            {newOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>No new orders</p>}
          </div>

          {/* STAGE 2: PACKING */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', minWidth: '280px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#475569' }}>
              <Package size={16} /> 2. Packing ({packingOrders.length})
            </h3>
            {packingOrders.map(order => renderCard(order, 
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <button 
                  onClick={() => setPackingModalOrderId(order.id)}
                  className="action-btn primary hover-lift" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <PackageCheck size={16} /> Scan & Pack Items
                </button>
                <button 
                  onClick={() => handleMarkPacked(order.id)}
                  className="action-btn secondary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.8rem' }}
                >
                  <CheckCircle2 size={15} color="#10b981" /> Quick Mark Packed
                </button>
              </div>
            ))}
            {packingOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>No orders in packing</p>}
          </div>

          {/* STAGE 3: READY FOR DISPATCH */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', minWidth: '280px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#475569' }}>
              <Truck size={16} /> 3. Ready to Ship ({packedOrders.length})
            </h3>
            {packedOrders.map(order => renderCard(order, 
              <button 
                onClick={() => setAwbModal(order.id)}
                className="action-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', background: '#3b82f6', color: '#fff' }}>
                + Assign AWB
              </button>
            ))}
            {packedOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>No orders ready</p>}
          </div>

          {/* STAGE 4: DISPATCHED */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', minWidth: '280px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#475569' }}>
              <CheckCircle2 size={16} /> 4. Dispatched ({dispatchedOrders.length})
            </h3>
            {dispatchedOrders.map(order => renderCard(order, 
              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                {order.awbNumber} ({order.courierName})
              </div>
            ))}
            {dispatchedOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>No dispatched orders</p>}
          </div>

        </div>
      )}

      {/* AWB MODAL */}
      {awbModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Assign AWB</h2>
              <button className="close-btn" onClick={() => setAwbModal(null)}>×</button>
            </div>
            <form onSubmit={handleAssignAWB} className="modal-body">
              <div className="vertical-group">
                <label>Courier Name</label>
                <input 
                  type="text" 
                  required 
                  value={courierInput}
                  onChange={e => setCourierInput(e.target.value)}
                  placeholder="e.g. BlueDart, Delhivery" 
                />
              </div>
              <div className="vertical-group">
                <label>AWB Tracking Number</label>
                <input 
                  type="text" 
                  required 
                  value={awbInput}
                  onChange={e => setAwbInput(e.target.value)}
                  placeholder="Enter tracking number" 
                />
              </div>
              <div className="modal-footer" style={{ padding: 0, background: 'none', border: 'none', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setAwbModal(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Dispatch Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACKING SCANNER MODAL */}
      {packingModalOrderId && (
        <OrderPackingScannerModal
          orderId={packingModalOrderId}
          onClose={() => setPackingModalOrderId(null)}
          onSuccess={() => {
            setPackingModalOrderId(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}
