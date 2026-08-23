"use client";

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  CreditCard, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight, 
  ExternalLink, 
  Plus, 
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface PlatformAdminClientProps {
  initialData: any;
}

export default function PlatformAdminClient({ initialData }: PlatformAdminClientProps) {
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED'>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');

  const { metrics = {}, organizations = [] } = data;

  const filteredOrgs = organizations.filter((org: any) => {
    const matchesSearch = 
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || org.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex' }}>
              <TrendingUp size={20} />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              Platform Super Admin & SaaS Metrics
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Live revenue analytics, tenant directories, and multi-tenant subscription management.
          </p>
        </div>

        <Link
          href="/pricing"
          target="_blank"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> View Public Pricing Page
        </Link>
      </div>

      {/* Platform Executive Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        
        {/* MRR */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Monthly Recurring Revenue (MRR)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            ₹{metrics.totalMRR?.toLocaleString('en-IN') || "0"}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
            Active Subscription Run Rate
          </div>
        </div>

        {/* ARR */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Annual Run Rate (ARR)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5', marginTop: '6px' }}>
            ₹{metrics.totalARR?.toLocaleString('en-IN') || "0"}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Annualized Recurring Volume
          </div>
        </div>

        {/* Active Tenants */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Paid Tenants
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
            {metrics.activeTenants || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Paid Paying Businesses
          </div>
        </div>

        {/* Free Trials */}
        <div style={{ padding: '18px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            14-Day Free Trials
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>
            {metrics.trialTenants || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Trial Onboardings in Pipeline
          </div>
        </div>

      </div>

      {/* Tenants Table Section */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
        
        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search company, slug, email, city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Paid</option>
              <option value="TRIAL">14-Day Trial</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Plans</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

        </div>

        {/* Directory Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>Company Legal Name</th>
                <th style={{ padding: '10px 12px' }}>Plan & Cycle</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Users</th>
                <th style={{ padding: '10px 12px' }}>Location</th>
                <th style={{ padding: '10px 12px' }}>Created Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Support Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org: any) => (
                <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{org.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {org.email} • slug: {org.slug}
                    </div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#4f46e5' }}>{org.plan}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{org.billingCycle}</div>
                  </td>

                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: org.status === 'ACTIVE' ? '#ecfdf5' : org.status === 'TRIAL' ? '#eff6ff' : '#fff1f2',
                      color: org.status === 'ACTIVE' ? '#059669' : org.status === 'TRIAL' ? '#2563eb' : '#e11d48'
                    }}>
                      {org.status === 'TRIAL' ? '14-DAY TRIAL' : org.status}
                    </span>
                  </td>

                  <td style={{ padding: '12px', color: '#334155' }}>
                    {org.userCount} seats
                  </td>

                  <td style={{ padding: '12px', color: '#475569' }}>
                    {org.city}, {org.state}
                  </td>

                  <td style={{ padding: '12px', color: '#64748b' }}>
                    {new Date(org.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => alert(`Support impersonation mode for ${org.name} enabled.`)}
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.74rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                    >
                      Inspect Tenant
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrgs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No organizations matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
