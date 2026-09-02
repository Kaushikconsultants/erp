"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, RefreshCw, Trash2, Loader2, UserPlus } from 'lucide-react';
import { updateLead, deleteLead } from '@/actions/leads';
import AddCustomerModal from './AddCustomerModal';

export default function LeadTable({ initialLeads, allEmployees }: { initialLeads: any[], allEmployees?: any[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [leadToConvert, setLeadToConvert] = useState<any>(null);

  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [agentFilter, setAgentFilter] = useState("All Agents");

  const filteredLeads = initialLeads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      lead.whatsappNumber.includes(searchTerm) ||
      (lead.shopName && lead.shopName.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === "All Statuses" || lead.status === statusFilter;
    const matchesAgent = agentFilter === "All Agents" || (lead.assignedSalesperson?.user?.name === agentFilter);
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("All Statuses");
    setAgentFilter("All Agents");
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateLead(id, { status: newStatus });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    setIsDeleting(id);
    await deleteLead(id);
    setIsDeleting(null);
  };

  const getStatusBadgeStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'new') return { bg: '#fbbf24', color: '#fff' }; // Yellow
    if (s === 'lost') return { bg: '#ef4444', color: '#fff' }; // Red
    if (s === 'converted') return { bg: '#10b981', color: '#fff' }; // Green
    return { bg: '#3b82f6', color: '#fff' }; // Blue for others
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text"
          placeholder="Search leads by name, shop, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '130px', fontSize: '0.85rem', backgroundColor: '#fff' }}
        >
          <option value="All Statuses">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="In Progress">In Progress</option>
          <option value="Converted">Converted</option>
          <option value="Lost">Lost</option>
        </select>
        <select 
          value={agentFilter} 
          onChange={(e) => setAgentFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '130px', fontSize: '0.85rem', backgroundColor: '#fff' }}
        >
          <option value="All Agents">All Agents</option>
          {allEmployees && allEmployees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
        </select>
        <button 
          onClick={handleReset}
          style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}
        >
          Reset
        </button>
      </div>

      <div className="table-responsive">
        <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', padding: '16px' }}><input type="checkbox" disabled /></th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Name</th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Phone</th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Shop Name</th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Agent</th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>State</th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Status</th>
              <th style={{ fontWeight: 600, color: '#1e293b', textTransform: 'none', fontSize: '0.875rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => {
              const statusStyles = getStatusBadgeStyles(lead.status);
              return (
                <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px' }}><input type="checkbox" /></td>
                  <td style={{ padding: '16px' }}>
                    <Link href={`/leads/${lead.id}`} style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                      {lead.name}
                    </Link>
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>{lead.whatsappNumber}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{lead.shopName || '-'}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{lead.assignedSalesperson?.user?.name || '-'}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>-</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      backgroundColor: statusStyles.bg, 
                      color: statusStyles.color, 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600 
                    }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setLeadToConvert(lead)}
                        style={{ padding: '4px', background: '#fff', color: '#10b981', borderRadius: '4px', border: '1px solid #10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="Convert to Customer"
                      >
                        <UserPlus size={14} />
                      </button>
                      <button 
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        style={{ padding: '4px', background: '#fff', color: '#3b82f6', borderRadius: '4px', border: '1px solid #3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="View/Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(lead.id, lead.name)}
                        disabled={isDeleting === lead.id}
                        style={{ padding: '4px', background: '#fff', color: '#ef4444', borderRadius: '4px', border: '1px solid #ef4444', cursor: isDeleting === lead.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDeleting === lead.id ? 0.6 : 1 }} 
                        title="Delete"
                      >
                        {isDeleting === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {leadToConvert && (
        <AddCustomerModal 
          onClose={(newCustomer) => {
            setLeadToConvert(null);
            if (newCustomer) {
              router.push(`/customers/${newCustomer.id}`);
            }
          }} 
          employees={allEmployees?.map(e => ({ id: e.id, name: e.name })) || []}
          leadToConvert={leadToConvert}
        />
      )}
    </div>
  );
}
