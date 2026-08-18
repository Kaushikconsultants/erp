import React from 'react';
import { getVendors } from '@/app/actions/vendorActions';
import AddVendorButton from '@/components/vendors/AddVendorButton';
import { Building2, Phone, Mail, Package, IndianRupee } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  const res = await getVendors();
  const vendors = res.success ? res.vendors : [];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">Manage suppliers and purchase partners.</p>
        </div>
        <AddVendorButton />
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Vendors</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{vendors.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Active Vendors</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
            {vendors.filter((v: any) => v.status === 'Active').length}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total POs Raised</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
            {vendors.reduce((sum: number, v: any) => sum + v.purchaseOrders.length, 0)}
          </div>
        </div>
      </div>

      {/* Vendor Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {vendors.map((vendor: any) => {
          const totalPOValue = vendor.purchaseOrders.reduce((sum: number, po: any) => sum + po.totalValue, 0);
          return (
            <div key={vendor.id} className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} style={{ color: 'var(--primary)' }} />
                    {vendor.companyName}
                  </h3>
                  {vendor.contactPerson && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{vendor.contactPerson}</div>
                  )}
                </div>
                <span className={`status-badge ${vendor.status === 'Active' ? 'active' : 'inactive'}`}>
                  {vendor.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {vendor.mobile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <Phone size={13} /> {vendor.mobile}
                  </div>
                )}
                {vendor.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <Mail size={13} /> {vendor.email}
                  </div>
                )}
                {vendor.gstNumber && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <strong>GSTIN:</strong> {vendor.gstNumber}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purchase Orders</div>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Package size={13} /> {vendor.purchaseOrders.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Value</div>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IndianRupee size={13} /> {totalPOValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {vendor.paymentTerms && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Payment Terms:</strong> {vendor.paymentTerms}
                </div>
              )}
            </div>
          );
        })}

        {vendors.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            No vendors found. Click "+ Add Vendor" to add your first supplier.
          </div>
        )}
      </div>
    </div>
  );
}
