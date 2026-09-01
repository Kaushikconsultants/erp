"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useEffect } from 'react';
import { getInventoryHistory } from '@/app/actions/inventoryActions';
import * as XLSX from 'xlsx';
import { FileText, FileSpreadsheet, X, Search, Filter } from 'lucide-react';
import "@/components/ui/modal.css";

interface InventoryReportsModalProps {
  onClose: () => void;
}

export default function InventoryReportsModal({ onClose }: InventoryReportsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    sku: '',
    type: 'ALL'
  });

  const fetchData = async () => {
    setLoading(true);
    const res = await getInventoryHistory(filters);
    if (res.success && res.transactions) {
      setData(res.transactions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadExcel = () => {
    if (data.length === 0) return;
    
    const formattedData = data.map(t => ({
      Date: new Date(t.date).toLocaleString(),
      Product: t.product.name,
      'SKU / Article': t.product.sku || t.product.articleNumber || '-',
      Type: t.type,
      Quantity: t.quantity,
      Reference: t.reference || '-',
      Notes: t.notes || '-',
      Employee: t.employee?.user?.name || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory History");
    XLSX.writeFile(workbook, `Inventory_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadPDF = () => {
    // For PDF, we open a print-friendly window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Inventory History Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; }
            h2 { margin-top: 0; color: #1e293b; }
            .badge-in { color: #16a34a; font-weight: bold; }
            .badge-out { color: #dc2626; font-weight: bold; }
            @media print {
              @page { margin: 1cm; size: landscape; }
            }
          </style>
        </head>
        <body>
          <h2>Inventory History Report</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>SKU/Article</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Ref</th>
                <th>Employee</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleString()}</td>
                  <td>${t.product.name}</td>
                  <td>${t.product.sku || t.product.articleNumber || '-'}</td>
                  <td class="${t.type === 'IN' ? 'badge-in' : 'badge-out'}">${t.type}</td>
                  <td>${t.quantity}</td>
                  <td>${t.reference || '-'}</td>
                  <td>${t.employee?.user?.name || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2>Inventory Reports & History</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '4px' }}>Start Date</label>
              <DatePicker 
                 
                value={filters.startDate} 
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '4px' }}>End Date</label>
              <DatePicker 
                 
                value={filters.endDate} 
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '4px' }}>Type</label>
              <select 
                value={filters.type} 
                onChange={e => setFilters({...filters, type: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Transactions</option>
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
              </select>
            </div>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '4px' }}>SKU Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Search SKU..." 
                  value={filters.sku}
                  onChange={e => setFilters({...filters, sku: e.target.value})}
                  style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <button className="primary-btn" onClick={fetchData} style={{ padding: '8px 16px', display: 'flex', gap: '6px' }}>
              <Filter size={16} /> Filter
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button 
              className="action-btn" 
              onClick={downloadExcel} 
              disabled={data.length === 0}
              style={{ backgroundColor: '#16a34a', color: 'white', display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              <FileSpreadsheet size={16} /> Download Excel
            </button>
            <button 
              className="action-btn" 
              onClick={downloadPDF} 
              disabled={data.length === 0}
              style={{ backgroundColor: '#dc2626', color: 'white', display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              <FileText size={16} /> Print / Save PDF
            </button>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Reference</th>
                  <th>Employee</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No records found.</td></tr>
                ) : (
                  data.map((t, idx) => (
                    <tr key={idx}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleString()}</td>
                      <td>
                        <strong>{t.product.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.product.sku || t.product.articleNumber}</div>
                      </td>
                      <td>
                        <span className={`badge ${t.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} style={{ padding: '4px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                          {t.type}
                        </span>
                      </td>
                      <td>{t.quantity}</td>
                      <td>{t.reference || '-'}</td>
                      <td>{t.employee?.user?.name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
