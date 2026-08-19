import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CallScriptingPanel from '@/components/telecalling/CallScriptingPanel';
import CustomerTimeline from '@/components/customers/CustomerTimeline';
import CustomerIntelligencePanel from '@/components/customers/CustomerIntelligencePanel';

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role || 'SALES';

  // Await the params resolution for Next.js app router dynamic segments
  const resolvedParams = await params;
  const customerId = resolvedParams.id;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      assignedSalesperson: {
        include: { user: true }
      },
      orders: {
        orderBy: { createdAt: 'desc' }
      },
      calls: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  const script = await prisma.callScript.findFirst({
    where: { stage: customer?.leadStage || "Contacted" }
  });

  const objections = await prisma.objection.findMany();

  if (!customer) {
    return (
      <div className="page-container">
        <h1>Customer Not Found</h1>
        <Link href="/customers" className="primary-btn">Back to Customers</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{customer.businessName}</h1>
          <p className="page-subtitle">Contact Person: {customer.contactPerson}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={`/portal?customerId=${customer.id}`} target="_blank" className="action-btn text-blue" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: '600' }}>
            🌐 Open Client Portal
          </Link>
          <Link href="/customers" className="action-btn text-blue">← Back to Customers</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Column: Details */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Customer Details</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Phone Number</span>
              <div style={{ fontWeight: '500' }}>{customer.mobile}</div>
            </div>
            
            {customer.email && (
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Email Address</span>
                <div style={{ fontWeight: '500' }}>{customer.email}</div>
              </div>
            )}

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Address</span>
              <div style={{ fontWeight: '500' }}>
                {customer.billingAddress || 'N/A'}<br/>
                {customer.city ? `${customer.city}, ` : ''}{customer.state ? `${customer.state} ` : ''}{customer.pincode ? `- ${customer.pincode}` : ''}
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
              <div>
                <span className={`status-badge ${customer.status === 'Client' || customer.status === 'Active Lead' ? 'active' : 'inactive'}`}>
                  {customer.status}
                </span>
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Assigned Sales Rep</span>
              <div style={{ fontWeight: '500' }}>{customer.assignedSalesperson?.user?.name || 'Unassigned'}</div>
            </div>
            
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Purchase Value</span>
              <div style={{ fontWeight: '500', color: 'var(--success)', fontSize: '1.25rem' }}>₹{customer.totalPurchaseValue.toLocaleString()}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <CustomerIntelligencePanel customerId={customer.id} />
          </div>
        </div>

        {/* Right Column: History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Orders Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Order History ({customer.orders.length})</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Date</th>
                    <th>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map(order => (
                    <tr key={order.id}>
                      <td><strong>{order.orderNumber}</strong></td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td>₹{order.totalValue.toLocaleString()}</td>
                      <td>{order.orderStatus}</td>
                    </tr>
                  ))}
                  {customer.orders.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calls Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Interaction History ({customer.calls.length})</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.calls.map(call => (
                    <tr key={call.id}>
                      <td>{new Date(call.createdAt).toLocaleDateString()}</td>
                      <td>{call.callType}</td>
                      <td>{call.outcome}</td>
                    </tr>
                  ))}
                  {customer.calls.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No interactions logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 360 Customer Timeline */}
          <CustomerTimeline customerId={customer.id} />

          {/* Call Scripting & Objection Handling */}
          {userRole === 'TELECALLER' || userRole === 'TEAM_LEADER' || userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' ? (
             <CallScriptingPanel 
               stage={customer.leadStage || "Contacted"} 
               scriptContent={script?.content || ""} 
               objections={objections} 
             />
          ) : null}

        </div>
      </div>
    </div>
  );
}
