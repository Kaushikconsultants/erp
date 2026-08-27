"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Printer, 
  MessageSquare, 
  ArrowLeft, 
  FileSpreadsheet
} from 'lucide-react';
import { CustomerLedgerResult } from '@/app/actions/customerLedgerActions';
import DynamicUpiQr from '@/components/common/DynamicUpiQr';

interface CustomerLedgerClientProps {
  initialData: CustomerLedgerResult;
  customerId: string;
}

export default function CustomerLedgerClient({ initialData, customerId }: CustomerLedgerClientProps) {
  const [startDate] = useState(initialData.startDate || '');
  const [endDate] = useState(initialData.endDate || '');
  const [data] = useState(initialData);

  const customer = data.customer || {};
  const company = data.companySettings || {};

  const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (customer.whatsappNumber || customer.mobile || '').replace(/[^0-9]/g, '');
    const text = `*ACCOUNT STATEMENT / KHATA*\n` +
      `*Company:* ${company.companyName || 'Espon Sports'}\n` +
      `*Customer:* ${customer.businessName} (${customer.contactPerson})\n` +
      `*Period:* ${startDate} to ${endDate}\n\n` +
      `*Opening Balance:* ₹${fmt(data.openingBalance)}\n` +
      `*Total Sales (Debit):* ₹${fmt(data.totalDebit)}\n` +
      `*Total Received (Credit):* ₹${fmt(data.totalCredit)}\n` +
      `*Net Outstanding Balance:* ₹${fmt(data.closingBalance)}\n\n` +
      `*Bank Details for Payment:*\n` +
      `A/C: ${company.accountNumber || '016805006415'}\n` +
      `IFSC: ${company.ifscCode || 'ICIC0000168'} (${company.bankAccountName || 'ESPON CLOTHING PVT LTD'})\n` +
      `UPI ID: ${company.upiId || '7206066678@OKBIZAXIS'}\n\n` +
      `Thank you for your valued business!`;

    const url = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    const rows = [
      ["Date", "Voucher Type", "Voucher No", "Particulars", "Debit (Sales)", "Credit (Receipts)", "Balance (Due)"]
    ];

    rows.push([
      startDate,
      "OPENING",
      "-",
      "Opening Balance",
      "-",
      "-",
      data.openingBalance.toFixed(2)
    ]);

    data.transactions.forEach(tx => {
      rows.push([
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type,
        tx.voucherNumber,
        `"${tx.particulars}"`,
        tx.debit > 0 ? tx.debit.toFixed(2) : "-",
        tx.credit > 0 ? tx.credit.toFixed(2) : "-",
        tx.balance.toFixed(2)
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_${customer.businessName.replace(/\s+/g, '_')}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-family, "Inter", -apple-system, sans-serif)' }}>
      
      {/* ─── ACTION TOOLBAR (HIDDEN IN PRINT) ─── */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px', 
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '14px 18px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link 
            href={`/customers/${customerId}`} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#475569', 
              textDecoration: 'none', 
              fontSize: '0.82rem', 
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              transition: 'background-color 0.15s'
            }}
          >
            <ArrowLeft size={14} /> Back to Profile
          </Link>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
              Account Ledger / Khata Statement
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {customer.businessName} • {customer.contactPerson}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <FileSpreadsheet size={15} style={{ color: "var(--accent-primary, #4f46e5)" }} /> Export Excel/CSV
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#25D366',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
            }}
          >
            <MessageSquare size={15} /> Send on WhatsApp
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="primary-btn hover-lift"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--accent-primary, #4f46e5)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ─── OFFICIAL PRINTABLE LEDGER DOCUMENT ─── */}
      <div id="printable-ledger" style={{ 
        backgroundColor: '#ffffff', 
        padding: '32px 36px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        color: '#1e293b'
      }}>
        
        {/* Company Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              {company.companyName || 'ESPON CLOTHING PRIVATE LIMITED'}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
              {company.address || 'Sco 71A, 2nd Floor, Ashoka Plaza, Delhi Road, Rohtak, Haryana - 124001'}<br />
              GSTIN: <span style={{ color: '#0f172a', fontWeight: 600 }}>{company.gstin || '06AAECE1234F1Z5'}</span> • Phone: {company.mobile || '+91 74043 88242'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'inline-block', 
              padding: '4px 12px', 
              borderRadius: '6px', 
              backgroundColor: '#f8fafc', 
              border: '1px solid #e2e8f0',
              color: '#334155', 
              fontWeight: 600, 
              fontSize: '0.85rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Statement of Account
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
              Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Customer & Period Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', backgroundColor: '#f8fafc', padding: '16px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account of:</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
              {customer.businessName}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
              Attn: {customer.contactPerson}<br />
              {customer.billingAddress || customer.city || 'Rohtak'}<br />
              Mobile: {customer.mobile} {customer.gstNumber ? `• GSTIN: ${customer.gstNumber}` : ''}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statement Period:</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
              {startDate} to {endDate}
            </div>
            <div style={{ marginTop: '10px' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Closing Balance:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: data.closingBalance > 0 ? '#dc2626' : '#059669', marginTop: '2px' }}>
                ₹{fmt(data.closingBalance)} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{data.closingBalance > 0 ? 'Dr (Due)' : 'Cr (Advance/Nil)'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, display: 'block' }}>Opening Balance</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#1e293b', marginTop: '2px', display: 'block' }}>₹{fmt(data.openingBalance)}</span>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
            <span style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 500, display: 'block' }}>Total Sales (Debit)</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#1d4ed8', marginTop: '2px', display: 'block' }}>₹{fmt(data.totalDebit)}</span>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4' }}>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 500, display: 'block' }}>Total Received (Credit)</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#15803d', marginTop: '2px', display: 'block' }}>₹{fmt(data.totalCredit)}</span>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
            <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 500, display: 'block' }}>Net Balance Due</span>
            <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#dc2626', marginTop: '2px', display: 'block' }}>₹{fmt(data.closingBalance)}</span>
          </div>
        </div>

        {/* Ledger Transaction Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Voucher No</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Particulars / Narration</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Debit (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Credit (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance Row */}
              <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', fontWeight: 500 }}>
                <td style={{ padding: '9px 12px', color: '#64748b' }}>{startDate}</td>
                <td style={{ padding: '9px 12px', color: '#64748b' }}>OB</td>
                <td style={{ padding: '9px 12px', color: '#475569' }}>Opening Balance b/f</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>-</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>-</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: data.openingBalance > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                  ₹{fmt(data.openingBalance)}
                </td>
              </tr>

              {data.transactions.length > 0 ? (
                data.transactions.map((tx, idx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#475569' }}>
                      {new Date(tx.date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--accent-primary, #4f46e5)' }}>
                      {tx.voucherNumber}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#1e293b' }}>
                      <div>{tx.particulars}</div>
                      {tx.notes && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Note: {tx.notes}</span>}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: tx.debit > 0 ? 600 : 400, color: tx.debit > 0 ? '#1d4ed8' : '#94a3b8' }}>
                      {tx.debit > 0 ? fmt(tx.debit) : '-'}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: tx.credit > 0 ? 600 : 400, color: tx.credit > 0 ? '#15803d' : '#94a3b8' }}>
                      {tx.credit > 0 ? fmt(tx.credit) : '-'}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: tx.balance > 0 ? '#dc2626' : '#059669' }}>
                      ₹{fmt(tx.balance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No transactions recorded during this period.
                  </td>
                </tr>
              )}

              {/* Total Row */}
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 600, borderTop: '1px solid #cbd5e1' }}>
                <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.75rem', color: '#475569' }}>
                  Total Period Movements:
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1d4ed8' }}>
                  ₹{fmt(data.totalDebit)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803d' }}>
                  ₹{fmt(data.totalCredit)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: data.closingBalance > 0 ? '#dc2626' : '#059669', fontSize: '0.88rem' }}>
                  ₹{fmt(data.closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bank Details, Dynamic UPI QR & Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr auto 1fr', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '0.78rem', color: '#64748b', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Bank Transfer / RTGS Details:</div>
            <div>A/C Name: <span style={{ color: '#0f172a', fontWeight: 500 }}>{company.bankAccountName || 'ESPON CLOTHING PRIVATE LIMITED'}</span></div>
            <div>A/c No: <span style={{ color: '#0f172a', fontWeight: 500 }}>{company.accountNumber || '016805006415'}</span></div>
            <div>IFSC: <span style={{ color: '#0f172a', fontWeight: 500 }}>{company.ifscCode || 'ICIC0000168'}</span> • Branch: {company.branch || 'Rohtak'}</div>
            <div>UPI ID: <span style={{ color: '#0f172a', fontWeight: 500 }}>{company.upiId || '7206066678@OKBIZAXIS'}</span></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DynamicUpiQr
              upiId={company.upiId || '7206066678@OKBIZAXIS'}
              payeeName={company.bankAccountName || company.companyName || 'ESPON CLOTHING'}
              amount={data.closingBalance > 0 ? data.closingBalance : 0}
              transactionNote={`Khata ${customer.businessName?.substring(0, 15)}`}
              size={85}
            />
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>For {company.companyName || 'ESPON CLOTHING PVT LTD'}</div>
            <div style={{ height: '36px' }}></div>
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', display: 'inline-block', width: '160px', marginLeft: 'auto', textAlign: 'center', fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>
              Authorized Signatory
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; padding: 0 !important; margin: 0 !important; }
          #printable-ledger { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}} />

    </div>
  );
}
