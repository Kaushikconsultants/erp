"use client";
import React, { useEffect, useState } from 'react';
import { getDispatchPipelineOrders, updateOrderStatus, updateDispatchDetails } from '@/app/actions/orderActions';
import { Truck, Package, Printer, FileText, CheckCircle2, Eye, PackageCheck, ScanBarcode, ScrollText, MapPin } from 'lucide-react';
import OrderPackingScannerModal from '@/components/scanner/OrderPackingScannerModal';
import CartonLabelModal from '@/components/dispatches/CartonLabelModal';
import '@/components/dispatches/dispatches.css';

export default function DispatchesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMobileStage, setActiveMobileStage] = useState<'new' | 'packing' | 'packed' | 'dispatched'>('new');
  const [awbModal, setAwbModal] = useState<string | null>(null); // orderId
  const [packingModalOrderId, setPackingModalOrderId] = useState<string | null>(null);
  const [cartonModalOrder, setCartonModalOrder] = useState<any | null>(null);
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

  const renderCard = (order: any, actionRender: React.ReactNode, stageClass = 'stage-new') => (
    <div key={order.id} className={`dispatch-card ${stageClass}`}>
      <div className="dispatch-card-header">
        <div>
          <div className="dispatch-order-number">{order.orderNumber}</div>
          <div className="dispatch-card-customer">{order.customer?.businessName || 'Direct Customer'}</div>
        </div>
        <div className="dispatch-inv-badge">
          {order.invoices && order.invoices.length > 0 ? order.invoices[0].invoiceNumber : 'Invoice Pending'}
        </div>
      </div>
      
      <div className="dispatch-card-location">
        <MapPin size={13} />
        <span>{order.customer?.city || 'City'}, {order.customer?.state || 'State'} - {order.customer?.pincode || 'ZIP'}</span>
      </div>

      <div className="dispatch-card-actions">
        {actionRender}
      </div>
    </div>
  );

  return (
    <div className="page-container dispatch-container">
      {/* Top Page Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.45rem', fontWeight: 700 }}>
            <Truck size={24} className="text-indigo-600" /> Dispatch Pipeline
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Manage order fulfillment, packaging, E-Way bills, and dispatches.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href="/eway-bills"
            className="action-btn outline-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', backgroundColor: '#f0fdfa', borderColor: '#5eead4', color: '#0f766e', fontWeight: 600, fontSize: '0.82rem', padding: '8px 14px', borderRadius: '8px' }}
          >
            <ScrollText size={15} /> E-Way Bills
          </a>
          <button 
            className="action-btn outline-primary" 
            onClick={loadOrders}
            style={{ fontSize: '0.82rem', padding: '8px 14px', borderRadius: '8px', fontWeight: 600 }}
          >
            Refresh Board
          </button>
        </div>
      </div>

      {/* Stage Tabs for Mobile Devices (<= 768px) */}
      <div className="dispatch-mobile-tabs">
        <button
          type="button"
          onClick={() => setActiveMobileStage('new')}
          className={`dispatch-tab-pill ${activeMobileStage === 'new' ? 'active' : ''}`}
        >
          <FileText size={14} />
          <span>1. New Orders</span>
          <span className="dispatch-count-badge">{newOrders.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileStage('packing')}
          className={`dispatch-tab-pill ${activeMobileStage === 'packing' ? 'active' : ''}`}
        >
          <Package size={14} />
          <span>2. Packing</span>
          <span className="dispatch-count-badge">{packingOrders.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileStage('packed')}
          className={`dispatch-tab-pill ${activeMobileStage === 'packed' ? 'active' : ''}`}
        >
          <Truck size={14} />
          <span>3. Ready to Ship</span>
          <span className="dispatch-count-badge">{packedOrders.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileStage('dispatched')}
          className={`dispatch-tab-pill ${activeMobileStage === 'dispatched' ? 'active' : ''}`}
        >
          <CheckCircle2 size={14} />
          <span>4. Dispatched</span>
          <span className="dispatch-count-badge">{dispatchedOrders.length}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Mobile Feed (Single Stage view for <= 768px) */}
          <div className="dispatch-mobile-feed">
            {activeMobileStage === 'new' && (
              <>
                {newOrders.map(order => renderCard(order, (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <a
                      href={`/orders/${order.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dispatch-btn-outline"
                    >
                      <Eye size={15} /> View Invoice
                    </a>
                    <button 
                      onClick={() => handlePrintAndPack(order.id)}
                      className="dispatch-btn-primary"
                    >
                      <Printer size={15} /> Print & Pack
                    </button>
                  </div>
                ), 'stage-new'))}
                {newOrders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                    <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>No new orders waiting to be packed</p>
                  </div>
                )}
              </>
            )}

            {activeMobileStage === 'packing' && (
              <>
                {packingOrders.map(order => renderCard(order, (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <button 
                      onClick={() => setPackingModalOrderId(order.id)}
                      className="dispatch-btn-primary"
                    >
                      <PackageCheck size={16} /> Scan & Pack Items
                    </button>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => setCartonModalOrder(order)}
                        className="dispatch-btn-sub"
                        style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                      >
                        🏷️ Box Labels
                      </button>
                      <button 
                        onClick={() => handleMarkPacked(order.id)}
                        className="dispatch-btn-sub"
                        style={{ flex: 1, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669' }}
                      >
                        <CheckCircle2 size={13} color="#10b981" /> Packed
                      </button>
                    </div>
                  </div>
                ), 'stage-packing'))}
                {packingOrders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                    <Package size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>No orders currently being packed</p>
                  </div>
                )}
              </>
            )}

            {activeMobileStage === 'packed' && (
              <>
                {packedOrders.map(order => renderCard(order, (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <button 
                      onClick={() => setCartonModalOrder(order)}
                      className="dispatch-btn-sub"
                      style={{ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', height: '36px' }}
                    >
                      🏷️ Print Box Labels
                    </button>
                    <button 
                      onClick={() => setAwbModal(order.id)}
                      className="dispatch-btn-primary"
                      style={{ background: '#3b82f6' }}
                    >
                      + Assign AWB
                    </button>
                  </div>
                ), 'stage-packed'))}
                {packedOrders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                    <Truck size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>No packed orders waiting for shipment</p>
                  </div>
                )}
              </>
            )}

            {activeMobileStage === 'dispatched' && (
              <>
                {dispatchedOrders.map(order => renderCard(order, (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                    <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                      {order.awbNumber} ({order.courierName})
                    </div>
                    <button 
                      onClick={() => setCartonModalOrder(order)}
                      className="dispatch-btn-sub"
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', height: '34px' }}
                    >
                      🏷️ Box Labels
                    </button>
                  </div>
                ), 'stage-dispatched'))}
                {dispatchedOrders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                    <CheckCircle2 size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>No dispatched orders</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop 4-Column Kanban Board (> 768px) */}
          <div className="dispatch-desktop-board">
            
            {/* STAGE 1: NEW / PRINTING */}
            <div className="dispatch-board-column">
              <div className="dispatch-column-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} /> 1. New Orders
                </span>
                <span className="dispatch-count-badge">{newOrders.length}</span>
              </div>
              {newOrders.map(order => renderCard(order, 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <a
                    href={`/orders/${order.id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dispatch-btn-outline"
                  >
                    <Eye size={15} /> View Invoice
                  </a>
                  <button 
                    onClick={() => handlePrintAndPack(order.id)}
                    className="dispatch-btn-primary"
                  >
                    <Printer size={15} /> Print & Pack
                  </button>
                </div>
              , 'stage-new'))}
              {newOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '12px 0' }}>No new orders</p>}
            </div>

            {/* STAGE 2: PACKING */}
            <div className="dispatch-board-column">
              <div className="dispatch-column-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={16} /> 2. Packing
                </span>
                <span className="dispatch-count-badge">{packingOrders.length}</span>
              </div>
              {packingOrders.map(order => renderCard(order, 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button 
                    onClick={() => setPackingModalOrderId(order.id)}
                    className="dispatch-btn-primary" 
                  >
                    <PackageCheck size={16} /> Scan & Pack Items
                  </button>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => setCartonModalOrder(order)}
                      className="dispatch-btn-sub"
                      style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                    >
                      🏷️ Box Labels
                    </button>
                    <button 
                      onClick={() => handleMarkPacked(order.id)}
                      className="dispatch-btn-sub"
                      style={{ flex: 1, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669' }}
                    >
                      <CheckCircle2 size={13} color="#10b981" /> Packed
                    </button>
                  </div>
                </div>
              , 'stage-packing'))}
              {packingOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '12px 0' }}>No orders in packing</p>}
            </div>

            {/* STAGE 3: READY FOR DISPATCH */}
            <div className="dispatch-board-column">
              <div className="dispatch-column-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={16} /> 3. Ready to Ship
                </span>
                <span className="dispatch-count-badge">{packedOrders.length}</span>
              </div>
              {packedOrders.map(order => renderCard(order, 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <button 
                    onClick={() => setCartonModalOrder(order)}
                    className="dispatch-btn-sub"
                    style={{ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '6px 10px', height: '36px' }}
                  >
                    🏷️ Print Box Labels
                  </button>
                  <button 
                    onClick={() => setAwbModal(order.id)}
                    className="dispatch-btn-primary" 
                    style={{ width: '100%', background: '#3b82f6' }}
                  >
                    + Assign AWB
                  </button>
                </div>
              , 'stage-packed'))}
              {packedOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '12px 0' }}>No orders ready</p>}
            </div>

            {/* STAGE 4: DISPATCHED */}
            <div className="dispatch-board-column">
              <div className="dispatch-column-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> 4. Dispatched
                </span>
                <span className="dispatch-count-badge">{dispatchedOrders.length}</span>
              </div>
              {dispatchedOrders.map(order => renderCard(order, 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                  <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                    {order.awbNumber} ({order.courierName})
                  </div>
                  <button 
                    onClick={() => setCartonModalOrder(order)}
                    className="dispatch-btn-sub"
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', height: '34px' }}
                  >
                    🏷️ Box Labels
                  </button>
                </div>
              , 'stage-dispatched'))}
              {dispatchedOrders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '12px 0' }}>No dispatched orders</p>}
            </div>

          </div>
        </>
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
                  placeholder="e.g. Bluedart, Delhivery, V-Trans" 
                />
              </div>
              <div className="vertical-group" style={{ marginTop: '12px' }}>
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

      {/* CARTON LABEL MODAL */}
      {cartonModalOrder && (
        <CartonLabelModal
          order={cartonModalOrder}
          onClose={() => setCartonModalOrder(null)}
        />
      )}
    </div>
  );
}
