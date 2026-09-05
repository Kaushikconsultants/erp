"use client";

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Database, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  HardDrive,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportFullCompanyData } from '@/app/actions/backupActions';

export default function CompanyBackupPage() {
  const [loading, setLoading] = useState(false);
  const [lastBackupSummary, setLastBackupSummary] = useState<any | null>(null);

  const handleDownloadBackup = async (format: 'JSON' | 'EXCEL') => {
    setLoading(true);
    const res = await exportFullCompanyData();
    setLoading(false);

    if (!res.success || !res.data) {
      alert(res.error || "Failed to generate company backup.");
      return;
    }

    setLastBackupSummary(res.summary);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'JSON') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `company_backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      // Multi-sheet Excel workbook
      const wb = XLSX.utils.book_new();

      if (res.data.masters.customers?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.masters.customers), "Customers");
      }
      if (res.data.masters.products?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.masters.products), "Products");
      }
      if (res.data.masters.vendors?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.masters.vendors), "Vendors");
      }
      if (res.data.masters.ledgers?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.masters.ledgers), "Chart_of_Accounts");
      }
      if (res.data.transactions.invoices?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.transactions.invoices), "Invoices");
      }
      if (res.data.transactions.orders?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.transactions.orders), "Sales_Orders");
      }
      if (res.data.transactions.bills?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.data.transactions.bills), "Vendor_Bills");
      }

      XLSX.writeFile(wb, `company_full_backup_${timestamp}.xlsx`);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardDrive size={20} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Company Data Backup & Export
          </h1>
        </div>
        <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Download a complete offline copy of your entire company dataset for compliance, auditing, and peace of mind.
        </p>
      </div>

      {/* BACKUP TRIGGER HERO CARD */}
      <div className="glass-panel" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '28px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
              ✓ LIVE CLOUD DATASET
            </span>
            <h3 style={{ margin: '10px 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              1-Click Full Workspace Backup
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', maxWidth: '580px', lineHeight: 1.5 }}>
              Generates a full snapshot containing Customers, Products, Vendors, Orders, Invoices, Bills, Journal Entries, Double-Entry Ledgers, Attendance, and Stock Transfers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleDownloadBackup('EXCEL')}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
              }}
            >
              <FileSpreadsheet size={16} />
              {loading ? 'Exporting...' : 'Download Excel (.xlsx)'}
            </button>

            <button
              type="button"
              onClick={() => handleDownloadBackup('JSON')}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Database size={16} />
              {loading ? 'Exporting...' : 'Download JSON Archive'}
            </button>
          </div>
        </div>

        {/* SUMMARY STATS AFTER DOWNLOAD */}
        {lastBackupSummary && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> Snapshot Successfully Downloaded at {new Date(lastBackupSummary.timestamp).toLocaleTimeString().toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                <div style={{ color: '#64748b' }}>Customers</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{lastBackupSummary.customerCount}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                <div style={{ color: '#64748b' }}>Products</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{lastBackupSummary.productCount}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                <div style={{ color: '#64748b' }}>Invoices</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{lastBackupSummary.invoiceCount}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.76rem' }}>
                <div style={{ color: '#64748b' }}>Ledger Accounts</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{lastBackupSummary.ledgerCount}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COMPLIANCE & SECURITY GUARANTEE BOX */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <ShieldCheck size={28} style={{ color: '#4f46e5', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
            Data Portability & Indian DPDP Act Compliance
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
            Your business data belongs 100% to you. All financial logs, customer ledgers, and transactions can be extracted at any time without vendor lock-in. Backups are generated in standardized formats directly compatible with Excel, Tally, and custom ERP pipelines.
          </p>
        </div>
      </div>
    </div>
  );
}
