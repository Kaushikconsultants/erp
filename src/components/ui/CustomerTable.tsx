"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Edit, RefreshCw, Trash2, Sparkles } from 'lucide-react';
import { deleteCustomer } from '@/app/actions/customerActions';
import EditCustomerModal from './EditCustomerModal';
import ReassignCustomerModal from './ReassignCustomerModal';
import AIReorderPredictorModal from '../ai/AIReorderPredictorModal';

interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string | null;
  mobile: string;
  state: string | null;
  status: string;
  createdAt: Date;
  assignedSalesperson: {
    user: {
      name: string;
    };
  } | null;
}

export default function CustomerTable({ initialCustomers, allEmployees = [] }: { initialCustomers: Customer[], allEmployees?: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get('search') || "";
  const [searchTerm, setSearchTerm] = useState(queryParam);

  useEffect(() => {
    const q = searchParams?.get('search');
    if (q !== null && q !== undefined) {
      setSearchTerm(q);
    }
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [stateFilter, setStateFilter] = useState("All States");
  const [agentFilter, setAgentFilter] = useState("All Agents");

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [reassigningCustomer, setReassigningCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      setIsDeleting(id);
      await deleteCustomer(id);
      setIsDeleting(null);
    }
  };

  const filteredCustomers = initialCustomers.filter(customer => {
    const matchesSearch = 
      (customer.businessName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.mobile || "").includes(searchTerm);
    
    const matchesStatus = statusFilter === "All Statuses" || customer.status === statusFilter;
    const matchesState = stateFilter === "All States" || (customer.state && customer.state.toLowerCase() === stateFilter.toLowerCase());
    const matchesAgent = agentFilter === "All Agents" || (customer.assignedSalesperson?.user?.name === agentFilter);

    return matchesSearch && matchesStatus && matchesState && matchesAgent;
  });

  const getStatusBadgeStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'new lead' || s === 'new') return { bg: '#fbbf24', color: '#fff' }; // Yellow
    if (s === 'cold') return { bg: '#ef4444', color: '#fff' }; // Red
    if (s === 'active' || s === 'client') return { bg: '#10b981', color: '#fff' }; // Green
    return { bg: '#94a3b8', color: '#fff' }; // Gray
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("All Statuses");
    setStateFilter("All States");
    setAgentFilter("All Agents");
  };

  // Get unique states for filter
  const uniqueStates = Array.from(new Set(initialCustomers.map(c => c.state).filter(Boolean))) as string[];

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search name or phone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
        <select 
          value={stateFilter} 
          onChange={(e) => setStateFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '130px', fontSize: '0.85rem', backgroundColor: '#fff' }}
        >
          <option value="All States">All States</option>
          {uniqueStates.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '130px', fontSize: '0.85rem', backgroundColor: '#fff' }}
        >
          <option value="All Statuses">All Statuses</option>
          <option value="New Lead">New Lead</option>
          <option value="Cold">Cold</option>
          <option value="Active">Active</option>
          <option value="Client">Client</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select 
          value={agentFilter} 
          onChange={(e) => setAgentFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '130px', fontSize: '0.85rem', backgroundColor: '#fff' }}
        >
          <option value="All Agents">All Agents</option>
          {allEmployees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
        </select>
        <button 
          onClick={handleReset}
          style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => setShowReorderModal(true)}
          style={{
            padding: '9px 16px',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Analyze customer order cycles and predict overdue restocks"
        >
          <Sparkles size={14} color="#2563eb" />
          <span>AI Re-Order Predictor</span>
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
            {filteredCustomers.map(customer => {
              const statusStyles = getStatusBadgeStyles(customer.status);
              return (
                <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px' }}><input type="checkbox" /></td>
                  <td style={{ padding: '16px' }}>
                    <Link href={`/customers/${customer.id}`} style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                      {customer.contactPerson || customer.businessName}
                    </Link>
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>{customer.mobile}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{customer.businessName || '-'}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{customer.assignedSalesperson?.user?.name || '-'}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{customer.state || '-'}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      backgroundColor: statusStyles.bg, 
                      color: statusStyles.color, 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600 
                    }}>
                      {customer.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a 
                        href={`https://wa.me/${customer.mobile?.replace(/\D/g, '').length === 10 ? `91${customer.mobile.replace(/\D/g, '')}` : customer.mobile?.replace(/\D/g, '') || ''}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ padding: '4px', background: '#10b981', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                      <button 
                        onClick={() => setEditingCustomer(customer)}
                        style={{ padding: '4px', background: '#fff', color: '#3b82f6', borderRadius: '4px', border: '1px solid #3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => setReassigningCustomer(customer)}
                        style={{ padding: '4px', background: '#fff', color: '#f59e0b', borderRadius: '4px', border: '1px solid #f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="Reassign"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id, customer.businessName || customer.contactPerson)}
                        disabled={isDeleting === customer.id}
                        style={{ padding: '4px', background: '#fff', color: '#ef4444', borderRadius: '4px', border: '1px solid #ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDeleting === customer.id ? 0.5 : 1 }} 
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No customers found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingCustomer && (
        <EditCustomerModal 
          customer={editingCustomer} 
          employees={allEmployees}
          onClose={() => setEditingCustomer(null)} 
        />
      )}

      {reassigningCustomer && (
        <ReassignCustomerModal
          customerId={reassigningCustomer.id}
          currentAgent={reassigningCustomer.assignedSalesperson?.user?.name || null}
          employees={allEmployees}
          onClose={() => setReassigningCustomer(null)}
        />
      )}

      {showReorderModal && (
        <AIReorderPredictorModal
          onClose={() => setShowReorderModal(false)}
        />
      )}
    </>
  );
}
