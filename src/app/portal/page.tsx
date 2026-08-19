"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getCustomerPortalData, acceptQuotationFromPortal } from "@/app/actions/portalActions";
import { ShoppingBag, FileText, FileCheck, ArrowUpRight, Clock, CheckCircle, Phone, Mail, MapPin, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function PortalDashboardContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") || undefined;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getCustomerPortalData(customerIdParam);
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    }
    load();
  }, [customerIdParam]);

  const handleAcceptQuote = async (id: string) => {
    const res = await acceptQuotationFromPortal(id);
    if (res.success) {
      alert("Quotation approved successfully!");
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading your account dashboard...
      </div>
    );
  }

  if (!data || !data.customer) {
    return (
      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>No Customer Profile Found</h3>
        <p style={{ fontSize: '0.875rem', color: '#b45309' }}>
          Please select a valid customer from your CRM dashboard to preview their client portal.
        </p>
      </div>
    );
  }

  const { customer, orders, invoices, quotations } = data;
  const pendingInvoices = invoices?.filter((i: any) => i.status !== "Paid") || [];
  const activeQuotes = quotations?.filter((q: any) => q.status === "Draft" || q.status === "Sent") || [];
  const totalDues = pendingInvoices.reduce((sum: number, i: any) => sum + (i.amountDue || i.totalAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Lucrative Banner with Full Client Profile Details */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        borderRadius: '24px',
        padding: '32px',
        color: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', backgroundColor: '#6366f1', color: '#ffffff', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {customer.customerType || 'B2B Client Account'}
              </span>
              {customer.gstNumber && (
                <span style={{ fontSize: '0.72rem', fontWeight: '600', padding: '3px 10px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '6px' }}>
                  GSTIN: {customer.gstNumber}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {customer.businessName}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '8px', fontSize: '0.875rem', color: '#c7d2fe' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} style={{ color: '#818cf8' }} /> {customer.contactPerson}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} style={{ color: '#34d399' }} /> {customer.mobile}
              </span>
              {customer.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} style={{ color: '#38bdf8' }} /> {customer.email}
                </span>
              )}
              {customer.city && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} style={{ color: '#fbbf24' }} /> {customer.city}, {customer.state}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <Link 
              href={`/portal/invoices${customerIdParam ? `?customerId=${customerIdParam}` : ''}`} 
              style={{
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#1e1b4b',
                fontWeight: '700',
                fontSize: '0.9rem',
                borderRadius: '12px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              Pay Dues (₹{totalDues.toLocaleString()})
            </Link>

            {customer.assignedSalesperson && (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Account Manager: <strong style={{ color: '#ffffff' }}>{customer.assignedSalesperson.user?.name || customer.assignedSalesperson.employeeId}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingBag size={26} style={{ color: '#4f46e5' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{orders?.length || 0}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={26} style={{ color: '#d97706' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Dues</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d97706', marginTop: '2px' }}>₹{totalDues.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileCheck size={26} style={{ color: '#059669' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Proposals</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#059669', marginTop: '2px' }}>{activeQuotes.length}</div>
          </div>
        </div>

      </div>

      {/* Active Quotations Pending Approval */}
      {activeQuotes.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #c7d2fe', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock style={{ color: '#4f46e5' }} size={20} />
            Quotations Awaiting Your Approval
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeQuotes.map((q: any) => (
              <div key={q.id} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>Quotation #{q.quotationNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Issued on {new Date(q.createdAt).toLocaleDateString()}</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>₹{q.grandTotal?.toLocaleString()}</div>
                  <button
                    onClick={() => handleAcceptQuote(q.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle size={15} /> Accept Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables Row: Orders & Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Recent Orders */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Recent Orders</h3>
            <Link href={`/portal/orders${customerIdParam ? `?customerId=${customerIdParam}` : ''}`} style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          {orders?.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', padding: '16px 0' }}>No recent orders placed.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders?.slice(0, 5).map((o: any) => (
                <div key={o.id} style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>Order #{o.orderNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(o.orderDate).toLocaleDateString()} &bull; ₹{o.totalValue?.toLocaleString()}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '6px' }}>
                    {o.orderStatus || o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Invoices & Dues</h3>
            <Link href={`/portal/invoices${customerIdParam ? `?customerId=${customerIdParam}` : ''}`} style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          {invoices?.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', padding: '16px 0' }}>No invoices generated yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {invoices?.slice(0, 5).map((inv: any) => (
                <div key={inv.id} style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>Invoice #{inv.invoiceNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>₹{(inv.totalAmount || inv.grandTotal)?.toLocaleString()}</div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    backgroundColor: inv.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                    color: inv.status === 'Paid' ? '#15803d' : '#b45309'
                  }}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading portal...</div>}>
      <PortalDashboardContent />
    </Suspense>
  );
}
