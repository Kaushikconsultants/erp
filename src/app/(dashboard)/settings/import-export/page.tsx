"use client";

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Users, 
  Building2, 
  Package, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Receipt,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import DataImportWizardModal from '@/components/common/DataImportWizardModal';
import { 
  exportTallySalesInvoices, 
  exportTallyCustomerMasters, 
  exportTallyPurchaseBills, 
  exportTallyJournalVouchers 
} from '@/app/actions/tallyExportActions';

export default function ImportExportHubPage() {
  const [activeModal, setActiveModal] = useState<'CUSTOMERS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS' | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type: 'SALES' | 'CUSTOMERS' | 'PURCHASES' | 'JOURNALS') => {
    setExportLoading(type);
    setExportMessage(null);
    try {
      if (type === 'SALES') {
        const res = await exportTallySalesInvoices();
        if (res.success && res.csvContent) {
          downloadCsv(res.csvContent, res.filename || 'Tally_Sales_Invoices.csv');
          setExportMessage({ text: `Exported ${res.totalInvoices} sales invoices for Tally Prime / Busy!`, type: 'success' });
        } else {
          setExportMessage({ text: res.error || 'Failed to export sales invoices', type: 'error' });
        }
      } else if (type === 'CUSTOMERS') {
        const res = await exportTallyCustomerMasters();
        if (res.success && res.csvContent) {
          downloadCsv(res.csvContent, res.filename || 'Tally_Customer_Masters.csv');
          setExportMessage({ text: `Exported ${res.totalCount} customer ledgers (Sundry Debtors) for Tally!`, type: 'success' });
        } else {
          setExportMessage({ text: res.error || 'Failed to export customer masters', type: 'error' });
        }
      } else if (type === 'PURCHASES') {
        const res = await exportTallyPurchaseBills();
        if (res.success && res.csvContent) {
          downloadCsv(res.csvContent, res.filename || 'Tally_Purchase_Bills.csv');
          setExportMessage({ text: `Exported ${res.totalCount} purchase bills for Tally!`, type: 'success' });
        } else {
          setExportMessage({ text: res.error || 'Failed to export purchase bills', type: 'error' });
        }
      } else if (type === 'JOURNALS') {
        const res = await exportTallyJournalVouchers();
        if (res.success && res.csvContent) {
          downloadCsv(res.csvContent, res.filename || 'Tally_Journal_Vouchers.csv');
          setExportMessage({ text: `Exported ${res.totalCount} journal entries for Tally!`, type: 'success' });
        } else {
          setExportMessage({ text: res.error || 'Failed to export journal vouchers', type: 'error' });
        }
      }
    } catch (err: any) {
      setExportMessage({ text: err.message || 'Error occurred while exporting', type: 'error' });
    } finally {
      setExportLoading(null);
    }
  };

  const exportCards = [
    {
      type: 'SALES' as const,
      title: 'Sales Invoices',
      subtitle: 'Tally Sales Vouchers',
      desc: 'Party names, GSTIN, HSN codes, quantity, rate, CGST, SGST, IGST breakdown, and invoice totals.',
      icon: Receipt,
      color: '#2563eb',
      bgColor: '#eff6ff',
      formatLabel: 'CSV • Tally Prime / Busy'
    },
    {
      type: 'CUSTOMERS' as const,
      title: 'Customer Masters',
      subtitle: 'Sundry Debtors Ledgers',
      desc: 'Party ledger accounts, billing addresses, state codes, GST numbers, PAN, and opening balances.',
      icon: Users,
      color: '#4f46e5',
      bgColor: '#eef2ff',
      formatLabel: 'CSV • Tally Prime Masters'
    },
    {
      type: 'PURCHASES' as const,
      title: 'Purchase Bills',
      subtitle: 'Tally Purchase Vouchers',
      desc: 'Vendor bills, supplier invoice references, HSN, taxable values, input GST, and payment status.',
      icon: Building2,
      color: '#059669',
      bgColor: '#ecfdf5',
      formatLabel: 'CSV • Tally Prime Purchases'
    },
    {
      type: 'JOURNALS' as const,
      title: 'Journal Entries',
      subtitle: 'Double-Entry Vouchers',
      desc: 'Financial ledger adjustments, debit/credit legs, voucher references, and audit narrations.',
      icon: BookOpen,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      formatLabel: 'CSV • Tally Prime Journals'
    }
  ];

  const importCards = [
    {
      type: 'CUSTOMERS' as const,
      title: 'Customer Master',
      desc: 'Import B2B buyers, GST numbers, contact details, opening credit balances, and credit limits.',
      icon: Users,
      color: '#4f46e5',
      bgColor: '#eef2ff',
      countLabel: 'Parties & Buyers'
    },
    {
      type: 'PRODUCTS' as const,
      title: 'Products & Inventory',
      desc: 'Import item catalog, SKUs, HSN codes, purchase rates, selling rates, MRP, and opening stock quantities.',
      icon: Package,
      color: '#059669',
      bgColor: '#ecfdf5',
      countLabel: 'SKUs & Variants'
    },
    {
      type: 'VENDORS' as const,
      title: 'Vendors & Suppliers',
      desc: 'Import raw material suppliers, vendor GSTINs, payment terms, and opening credit balances.',
      icon: Building2,
      color: '#2563eb',
      bgColor: '#eff6ff',
      countLabel: 'Suppliers'
    },
    {
      type: 'LEDGERS' as const,
      title: 'Chart of Accounts & Ledgers',
      desc: 'Import Tally/Busy double-entry ledger accounts with account groups and opening Dr/Cr balances.',
      icon: BookOpen,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      countLabel: 'Ledger Accounts'
    }
  ];

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#e0e7ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileSpreadsheet size={20} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Universal Data Import & Migration Hub
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
          Seamlessly migrate your data from Tally Prime, Busy Accounting, Vyapar, myBillBook, or custom Excel spreadsheets.
        </p>
      </div>

      {/* EXPORT MESSAGE BANNER */}
      {exportMessage && (
        <div style={{
          marginBottom: '24px',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: exportMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${exportMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: exportMessage.type === 'success' ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {exportMessage.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            ) : (
              <AlertCircle size={18} style={{ color: '#dc2626' }} />
            )}
            <span>{exportMessage.text}</span>
          </div>
          <button
            onClick={() => setExportMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── SECTION 1: 1-CLICK TALLY PRIME & BUSY EXPORT CENTER ─── */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={20} style={{ color: '#2563eb' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                1-Click Export to Tally Prime & Busy ERP
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe'
              }}>
                Tally Prime 4.0+ Ready
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Export accounting vouchers, ledgers, and party masters formatted directly for your CA / Accountant with zero double-entry.
            </p>
          </div>
        </div>

        {/* 4 EXPORT CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px'
        }}>
          {exportCards.map(card => {
            const Icon = card.icon;
            const isLoading = exportLoading === card.type;
            return (
              <div
                key={card.type}
                className="glass-panel hover-lift"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: card.bgColor,
                      color: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={22} />
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#64748b',
                      backgroundColor: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {card.formatLabel}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    {card.title}
                  </h3>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: card.color, marginBottom: '8px' }}>
                    {card.subtitle}
                  </div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                    {card.desc}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={Boolean(exportLoading)}
                    onClick={() => handleExport(card.type)}
                    style={{
                      width: '100%',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      backgroundColor: card.color,
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: exportLoading ? 'not-allowed' : 'pointer',
                      opacity: exportLoading && !isLoading ? 0.7 : 1,
                      border: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Exporting...
                      </>
                    ) : (
                      <>
                        <Download size={16} /> Export for Tally
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 2: UNIVERSAL DATA IMPORT & MIGRATION HUB ─── */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} style={{ color: '#4f46e5' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Import Data into Heart of Business
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            Bulk import your existing parties, inventory, vendors, and chart of accounts from spreadsheets or other software.
          </p>
        </div>

        {/* 4 IMPORT CARDS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px'
        }}>
          {importCards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.type}
                className="glass-panel hover-lift"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: card.bgColor,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    {card.title}
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    {card.desc}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(card.type)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      backgroundColor: card.color,
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Upload size={16} /> Import {card.title.split(' ')[0]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MIGRATION GUIDE BOX */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={20} style={{ color: '#4f46e5' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            Step-by-Step Migration Guide from Existing Software
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Tally & Busy */}
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              Migrating from Tally Prime / BusyWin
            </h4>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
              <li>In Tally: Open <strong>Display More Reports → List of Accounts</strong> and press <code>Alt + E</code> to export masters to Excel.</li>
              <li>In Busy: Go to <strong>Administration → Data Export/Import → Export Masters</strong>.</li>
              <li>Upload the exported Excel/CSV directly using the matching import card above.</li>
              <li>Our auto-mapping engine will automatically match party names, GSTINs, and opening balances.</li>
            </ol>
          </div>

          {/* Vyapar / myBillBook */}
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              Migrating from Vyapar / myBillBook / Zoho
            </h4>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
              <li>In your current billing app: Go to <strong>Settings → Backup & Export → Export Items & Parties to Excel</strong>.</li>
              <li>Select <strong>Customers Master</strong> or <strong>Products & Inventory</strong> above.</li>
              <li>Review the real-time preview table for any invalid GST numbers or duplicate SKUs.</li>
              <li>Click <strong>Import Valid Records</strong> to complete the instant onboarding!</li>
            </ol>
          </div>

          {/* Importing to Tally */}
          <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontWeight: 700, color: '#1e40af' }}>
              Importing into Tally Prime (for CAs / Accountants)
            </h4>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.6 }}>
              <li>Click <strong>Export for Tally</strong> on any voucher or ledger card above.</li>
              <li>In Tally Prime (v4.0+), press <code>Alt + O</code> (Import menu).</li>
              <li>Select <strong>Transactions</strong> (for Invoices / Bills) or <strong>Masters</strong> (for Parties).</li>
              <li>Select the downloaded CSV file. Tally will automatically parse and record all transactions!</li>
            </ol>
          </div>
        </div>

        {/* Data Safety Note */}
        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.8rem',
          color: '#166534'
        }}>
          <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span>
            <strong>Data Privacy & Security Guaranteed:</strong> All imports are processed within your isolated company workspace (`organizationId`) with strict duplicate filtering and rollback safeguards.
          </span>
        </div>
      </div>

      {/* IMPORT WIZARD MODAL */}
      {activeModal && (
        <DataImportWizardModal
          isOpen={Boolean(activeModal)}
          onClose={() => setActiveModal(null)}
          defaultEntityType={activeModal}
        />
      )}
    </div>
  );
}
