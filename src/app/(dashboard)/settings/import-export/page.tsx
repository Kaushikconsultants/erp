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
  ShieldCheck
} from 'lucide-react';
import DataImportWizardModal from '@/components/common/DataImportWizardModal';

export default function ImportExportHubPage() {
  const [activeModal, setActiveModal] = useState<'CUSTOMERS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS' | null>(null);

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

      {/* 4 IMPORT CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '36px'
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
