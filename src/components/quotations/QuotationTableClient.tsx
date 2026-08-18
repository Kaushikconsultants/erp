"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Search, Pencil, Trash2 } from 'lucide-react';
import ConvertQuotationBtn from '@/components/quotations/ConvertQuotationBtn';
import EditQuotationModal from '@/components/quotations/EditQuotationModal';
import { deleteQuotation } from '@/app/actions/quotationActions';

export default function QuotationTableClient({ initialQuotations = [] }: { initialQuotations: any[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [quotations, setQuotations] = useState<any[]>(initialQuotations || []);

  const [editingQuotation, setEditingQuotation] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setQuotations(initialQuotations || []);
  }, [initialQuotations]);

  useEffect(() => {
    const s = searchParams?.get('search');
    setSearchTerm(s || '');
  }, [searchParams]);

  const handleDelete = async (id: string, quotationNumber: string) => {
    if (confirm(`Are you sure you want to delete Quotation #${quotationNumber}? This action cannot be undone.`)) {
      setDeletingId(id);
      const res = await deleteQuotation(id);
      setDeletingId(null);
      if (res?.error) {
        alert(`Error deleting quotation: ${res.error}`);
      } else {
        setQuotations(prev => prev.filter(q => q.id !== id));
      }
    }
  };

  const filteredQuotations = (quotations || []).filter(q => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    const qNum = (q.quotationNumber || '').toLowerCase();
    const cName = (q.customer?.businessName || q.customer?.contactPerson || '').toLowerCase();
    const sName = (q.salesperson?.user?.name || '').toLowerCase();
    return qNum.includes(query) || cName.includes(query) || sName.includes(query);
  });

  return (
    <div className="zoho-form-card" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent Quotations</h2>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search Quotes by #, customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }} 
          />
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Quote #</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Customer Name</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Salesperson</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <FileText size={48} color="#cbd5e1" />
                    <div>No quotations found matching your search.</div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredQuotations.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#4f46e5' }}>
                    <Link href={`/quotations/${q.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.9rem' }}>
                    {new Date(q.date).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#1e293b' }}>
                    {q.customer?.businessName || q.customer?.contactPerson || 'Unknown Customer'}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.9rem' }}>
                    {q.salesperson?.user?.name || 'Unassigned'}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                    ₹{(q.totalValue || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: q.status === 'Converted' || q.status === 'Accepted' ? '#dcfce7' : q.status === 'Sent' ? '#e0e7ff' : '#f1f5f9',
                      color: q.status === 'Converted' || q.status === 'Accepted' ? '#166534' : q.status === 'Sent' ? '#3730a3' : '#475569'
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Link href={`/quotations/${q.id}`} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                        View
                      </Link>

                      <Link 
                        href={`/quotations/${q.id}/edit`}
                        style={{ padding: '6px 10px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', borderRadius: '6px', color: '#1d4ed8', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Full Edit Quotation"
                      >
                        <Pencil size={14} /> Edit
                      </Link>

                      <button 
                        onClick={() => handleDelete(q.id, q.quotationNumber)} 
                        disabled={deletingId === q.id}
                        style={{ padding: '6px 10px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: deletingId === q.id ? 0.6 : 1 }}
                        title="Delete Quotation"
                      >
                        <Trash2 size={14} /> {deletingId === q.id ? '...' : 'Delete'}
                      </button>

                      {q.status !== 'Converted' && (
                        <ConvertQuotationBtn quotationId={q.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingQuotation && (
        <EditQuotationModal 
          quotation={editingQuotation} 
          onClose={() => setEditingQuotation(null)} 
        />
      )}
    </div>
  );
}
