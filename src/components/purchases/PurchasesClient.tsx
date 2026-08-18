"use client";
import React, { useState } from "react";
import { createPurchaseOrder } from "@/app/actions/purchaseActions";
import { updatePOStatus } from "@/app/actions/purchaseActions";
import { receiveGRN } from "@/app/actions/purchaseActions";

interface Vendor { id: string; companyName: string; }
interface Product { id: string; name: string; sku: string | null; sellingPrice: number; }

export default function PurchasesClient({ 
  initialOrders, 
  vendors, 
  products 
}: { 
  initialOrders: any[];
  vendors: Vendor[];
  products: Product[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [createOpen, setCreateOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState<string | null>(null);
  const [items, setItems] = useState([{ productId: '', quantity: 1, rate: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedPO = orders.find(o => o.id === grnOpen);

  async function handleCreatePO(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await createPurchaseOrder({
      vendorId: fd.get("vendorId") as string,
      expectedDate: fd.get("expectedDate") as string,
      notes: fd.get("notes") as string,
      items: items.map(it => ({ productId: it.productId, quantity: it.quantity, rate: it.rate }))
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setCreateOpen(false);
    setItems([{ productId: '', quantity: 1, rate: 0 }]);
    // Refresh by reloading
    window.location.reload();
  }

  async function handleGRN(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPO) return;
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    const receivedItems = selectedPO.items.map((item: any) => ({
      itemId: item.id,
      receivedQty: parseInt(fd.get(`qty_${item.id}`) as string || "0", 10)
    })).filter((ri: any) => ri.receivedQty > 0);
    
    const res = await receiveGRN(selectedPO.id, receivedItems);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setGrnOpen(null);
    window.location.reload();
  }

  const statusColor: Record<string, string> = {
    Draft: 'inactive',
    Issued: 'warning',
    'Partially Received': 'warning',
    Received: 'active',
    Cancelled: 'inactive',
  };

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage procurement and goods receipts (GRN).</p>
        </div>
        <button className="primary-btn" onClick={() => setCreateOpen(true)}>+ Create PO</button>
      </div>

      {/* PO Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Expected</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(po => (
                <tr key={po.id}>
                  <td><strong>{po.poNumber}</strong></td>
                  <td>{po.vendor?.companyName}</td>
                  <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                  <td>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</td>
                  <td>{po.items?.length || 0} items</td>
                  <td>₹{po.totalValue.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${statusColor[po.status] || ''}`}>{po.status}</span>
                  </td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    {po.status !== 'Received' && po.status !== 'Cancelled' && (
                      <button
                        className="action-btn text-blue"
                        onClick={() => setGrnOpen(po.id)}
                      >
                        Receive GRN
                      </button>
                    )}
                    {po.status === 'Draft' && (
                      <button
                        className="action-btn text-green"
                        onClick={async () => { await updatePOStatus(po.id, 'Issued'); window.location.reload(); }}
                      >
                        Issue
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No purchase orders found. Click "+ Create PO" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Create Purchase Order</h2>
              <button className="modal-close" onClick={() => setCreateOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePO} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Vendor *</label>
                  <select name="vendorId" className="form-input" required>
                    <option value="">Select vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input name="expectedDate" type="date" className="form-input" />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input name="notes" className="form-input" placeholder="Optional notes" />
                </div>
              </div>

              <h4 style={{ marginTop: '16px', marginBottom: '12px' }}>Order Items</h4>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Product</label>
                    <select
                      className="form-input"
                      value={item.productId}
                      onChange={e => {
                        const p = products.find(pr => pr.id === e.target.value);
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], productId: e.target.value, rate: p?.sellingPrice || 0 };
                        setItems(newItems);
                      }}
                    >
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Qty</label>
                    <input
                      type="number" min="1" className="form-input"
                      value={item.quantity}
                      onChange={e => { const n = [...items]; n[idx].quantity = parseInt(e.target.value); setItems(n); }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Rate (₹)</label>
                    <input
                      type="number" min="0" step="0.01" className="form-input"
                      value={item.rate}
                      onChange={e => { const n = [...items]; n[idx].rate = parseFloat(e.target.value); setItems(n); }}
                    />
                  </div>
                  <button type="button" style={{ height: '38px', padding: '0 12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '20px' }}
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                  >×</button>
                </div>
              ))}
              <button type="button" className="action-btn text-blue" style={{ marginBottom: '16px' }}
                onClick={() => setItems([...items, { productId: '', quantity: 1, rate: 0 }])}>
                + Add Item
              </button>

              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
                <strong>Order Total: ₹{items.reduce((s, i) => s + i.quantity * i.rate, 0).toLocaleString()}</strong>
              </div>

              {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
              <div className="modal-footer">
                <button type="button" className="action-btn" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Creating..." : "Create PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {grnOpen && selectedPO && (
        <div className="modal-overlay" onClick={() => setGrnOpen(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Receive GRN — {selectedPO.poNumber}</h2>
              <button className="modal-close" onClick={() => setGrnOpen(null)}>×</button>
            </div>
            <form onSubmit={handleGRN} className="modal-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Enter the quantity actually received for each item:</p>
              {selectedPO.items.map((item: any) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center', marginBottom: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.product?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ordered: {item.quantity} | Received: {item.receivedQty}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</div>
                    <div style={{ fontWeight: 700 }}>{item.quantity - item.receivedQty}</div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Receive Now</label>
                    <input
                      type="number"
                      name={`qty_${item.id}`}
                      min="0"
                      max={item.quantity - item.receivedQty}
                      defaultValue={item.quantity - item.receivedQty}
                      className="form-input"
                    />
                  </div>
                </div>
              ))}
              {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
              <div className="modal-footer">
                <button type="button" className="action-btn" onClick={() => setGrnOpen(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Processing..." : "Confirm GRN Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
