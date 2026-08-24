import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { 
  ShoppingBag, 
  FileText, 
  Truck, 
  ArrowLeft, 
  Building, 
  User, 
  MapPin, 
  CheckCircle2, 
  Clock,
  CreditCard,
  Package,
  Calendar,
  Hash,
  Phone,
  Mail,
  ShieldCheck
} from 'lucide-react';
import GenerateInvoiceButton from '@/components/invoices/GenerateInvoiceButton';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      salesperson: { include: { user: true } },
      items: { include: { product: true } }
    }
  });

  if (!order) {
    notFound();
  }

  // Check for existing invoice
  const existingInvoice = await prisma.invoice.findFirst({ where: { orderId: id } });

  const subtotal = order.subtotal || order.items.reduce((acc, item) => acc + (item.rate * item.quantity), 0);
  const taxTotal = order.tax || (order.cgst + order.sgst + order.igst);

  const getFulfillmentBadgeClass = (status: string) => {
    switch (status) {
      case 'Delivered': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'Dispatched': return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'Packed': return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      default: return { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' }; // Processing
    }
  };

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'Partially Paid': return { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
      case 'Credit': return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };
      default: return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }; // Unpaid
    }
  };

  const fulfillStyle = getFulfillmentBadgeClass(order.orderStatus);
  const paymentStyle = getPaymentBadgeClass(order.paymentStatus);

  return (
    <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Top Navigation & Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          href="/orders" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.875rem', 
            color: 'var(--accent-primary)', 
            fontWeight: 600, 
            marginBottom: '12px',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Back to Orders
        </Link>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={28} style={{ color: 'var(--accent-primary)' }} /> Order {order.orderNumber}
              </h1>
              <span style={{ 
                backgroundColor: fulfillStyle.bg, 
                color: fulfillStyle.color, 
                border: `1px solid ${fulfillStyle.border}`,
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '0.8rem', 
                fontWeight: 700 
              }}>
                {order.orderStatus}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} /> Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>


            <Link 
              href={`/orders/${order.id}/invoice`} 
              target="_blank" 
              className="primary-btn hover-lift"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              <FileText size={16} /> View GST Invoice
            </Link>
            {order.orderStatus === 'Dispatched' && (
              <Link 
                href="/dispatches" 
                className="hover-lift"
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  backgroundColor: '#0284c7', 
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none'
                }}
              >
                <Truck size={16} /> Track Dispatch
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }} className="zoho-form-grid-2">
        
        {/* Left Column - Main Info & Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Overview KPI Cards */}
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Order Overview
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Fulfillment
                </span>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700,
                  backgroundColor: fulfillStyle.bg,
                  color: fulfillStyle.color
                }}>
                  {order.orderStatus}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Payment
                </span>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 700,
                  backgroundColor: paymentStyle.bg,
                  color: paymentStyle.color
                }}>
                  {order.paymentStatus}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Place of Supply
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {order.placeOfSupply || order.customer.state || 'N/A'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Tax Type
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {order.isInterstate ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)'}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: 'var(--accent-primary)' }} /> Itemized Products ({order.items.length})
              </h3>
            </div>

            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Product</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>HSN</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Rate (₹)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>GST %</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{item.product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          SKU: <span style={{ fontFamily: 'monospace' }}>{item.product.articleNumber}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>
                        {item.hsnCode || item.product.articleNumber || '6109'}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{item.quantity}</td>
                      <td style={{ padding: '14px', textAlign: 'right', color: '#334155' }}>₹{item.rate.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '14px', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>{item.gstRate || 12}%</td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{item.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Box */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                  <span>Subtotal (Taxable):</span>
                  <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                
                {order.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#16a34a' }}>
                    <span>Discount:</span>
                    <span style={{ fontWeight: 600 }}>-₹{order.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {order.isInterstate ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                    <span>IGST:</span>
                    <span style={{ fontWeight: 600 }}>₹{order.igst.toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                      <span>CGST:</span>
                      <span style={{ fontWeight: 600 }}>₹{order.cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                      <span>SGST:</span>
                      <span style={{ fontWeight: 600 }}>₹{order.sgst.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '1.1rem', 
                  fontWeight: 800, 
                  color: 'var(--accent-primary)', 
                  borderTop: '2px solid #e2e8f0', 
                  paddingTop: '12px',
                  marginTop: '4px' 
                }}>
                  <span>Total Amount:</span>
                  <span>₹{order.totalValue.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: '#16a34a', marginTop: '6px' }}>
                  <span>Payment / Token Received:</span>
                  <span>₹{order.paymentReceived.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: order.outstandingAmount > 0 ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
                  <span>Balance Outstanding:</span>
                  <span>₹{order.outstandingAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Sidebar - Customer & Sales Rep Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Information Card */}
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Building size={18} style={{ color: 'var(--accent-primary)' }} /> Customer Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                  Business Name
                </span>
                <Link 
                  href={`/customers/${order.customer.id}`} 
                  style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  {order.customer.businessName}
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                    Contact Person
                  </span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {order.customer.contactPerson || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                    Mobile
                  </span>
                  <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} style={{ color: '#64748b' }} /> {order.customer.mobile}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                  GSTIN Number
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#0f172a', display: 'inline-block', marginTop: '2px' }}>
                  {order.customer.gstNumber || 'Unregistered'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                  Billing Address
                </span>
                <span style={{ color: '#475569', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '2px' }}>
                  <MapPin size={16} style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
                  {order.customer.billingAddress || `${order.customer.city || ''}, ${order.customer.state || ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Sales Representative Card */}
          <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <User size={18} style={{ color: 'var(--accent-primary)' }} /> Sales Representative
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                backgroundColor: '#e0e7ff', 
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>
                {order.salesperson?.user?.name ? order.salesperson.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                  {order.salesperson?.user?.name || 'Unassigned'}
                </div>
                {order.salesperson?.user?.email && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Mail size={12} /> {order.salesperson.user.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dispatch Info Card (If AWB exists) */}
          {order.awbNumber && (
            <div className="glass-panel" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)', 
              border: '1px solid #bae6fd', 
              borderRadius: '12px' 
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Truck size={18} style={{ color: '#0284c7' }} /> Shipping Details
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px border #e0f2fe', paddingBottom: '6px' }}>
                  <span style={{ color: '#0369a1', fontWeight: 600 }}>Courier:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.courierName || 'Standard Logistics'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px border #e0f2fe', paddingBottom: '6px' }}>
                  <span style={{ color: '#0369a1', fontWeight: 600 }}>AWB Tracking:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                    {order.awbNumber}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#0369a1', fontWeight: 600 }}>Tracking Status:</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{order.shippingStatus || 'In Transit'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

