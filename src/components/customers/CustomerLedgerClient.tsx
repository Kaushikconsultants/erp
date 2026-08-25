"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Printer, 
  Share2, 
  MessageSquare, 
  ArrowLeft, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Building2,
  Phone,
  Mail,
  Receipt
} from 'lucide-react';
import { CustomerLedgerResult } from '@/app/actions/customerLedgerActions';

interface CustomerLedgerClientProps {
  initialData: CustomerLedgerResult;
  customerId: string;
}

export default function CustomerLedgerClient({ initialData, customerId }: CustomerLedgerClientProps) {
  const [startDate, setStartDate] = useState(initialData.startDate || '');
  const [endDate, setEndDate] = useState(initialData.endDate || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initialData);

  const customer = data.customer || {};
  const company = data.companySettings || {};

  const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (customer.whatsappNumber || customer.mobile || '').replace(/[^0-9]/g, '');
    const text = `*ACCOUNT LEDGER STATEMENT / KHATA*\n` +
      `*Company:* ${company.companyName || 'ESPON SPORTS'}\n` +
      `*Customer:* ${customer.businessName} (${customer.contactPerson})\n` +
      `*Period:* ${startDate} to ${endDate}\n\n` +
      `*Opening Balance:* ₹${fmt(data.openingBalance)}\n` +
      `*Total Sales (Debit):* ₹${fmt(data.totalDebit)}\n` +
      `*Total Paid (Credit):* ₹${fmt(data.totalCredit)}\n` +
      `*Net Outstanding Balance:* ₹${fmt(data.closingBalance)}\n\n` +
      `*Bank Details for NEFT/IMPS:*\n` +
      `A/C: ${company.accountNumber || '016805006415'}\n` +
      `IFSC: ${company.ifscCode || 'ICIC0000168'}\n` +
      `UPI ID: ${company.upiId || '7206066678@OKBIZAXIS'}\n\n` +
      `Thank you for your business!`;

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
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>
      
      {/* ─── ACTION TOOLBAR (HIDDEN IN PRINT) ─── */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px', 
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link 
            href={`/customers/${customerId}`} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#475569', 
              textDecoration: 'none', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9'
            }}
          >
            <ArrowLeft size={16} /> Back to Profile
          </Link>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Account Ledger / Khata Statement
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {customer.businessName} • {customer.contactPerson}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} color="#059669" /> Export Excel/CSV
          </button>

          <button
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
              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
            }}
          >
            <MessageSquare size={15} /> Send on WhatsApp
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)'
            }}
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ─── OFFICIAL PRINTABLE LEDGER DOCUMENT ─── */}
      <div id="printable-ledger" style={{ 
        backgroundColor: '#ffffff', 
        padding: '36px', 
        borderRadius: '16px', 
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        color: '#0f172a'
      }}>
        
        {/* Company Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {company.companyName || 'ESPON CLOTHING PRIVATE LIMITED'}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
              {company.address || 'Ashoka Plaza, Delhi Road, Rohtak, Haryana - 124001'}<br />
              GSTIN: <strong>{company.gstin || '06AAECE1234F1Z5'}</strong> • Phone: {company.mobile || '+91 74043 88242'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'inline-block', 
              padding: '6px 14px', 
              borderRadius: '6px', 
              backgroundColor: '#f1f5f9', 
              color: '#0f172a', 
              fontWeight: 800, 
              fontSize: '1rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Statement of Account
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
              Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Customer & Period Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account of:</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {customer.businessName}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
              Attn: {customer.contactPerson}<br />
              {customer.billingAddress || customer.city || 'Rohtak'}<br />
              Mobile: {customer.mobile} {customer.gstNumber ? `• GSTIN: ${customer.gstNumber}` : ''}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Statement Period:</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {startDate} to {endDate}
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current Closing Balance:</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: data.closingBalance > 0 ? '#dc2626' : '#059669' }}>
                ₹{fmt(data.closingBalance)} <span style={{ fontSize: '0.85rem' }}>{data.closingBalance > 0 ? 'Dr (Due)' : 'Cr (Advance/Nil)'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Opening Balance</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>₹{fmt(data.openingBalance)}</span>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
            <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600, display: 'block' }}>Total Sales (Debit)</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1d4ed8' }}>₹{fmt(data.totalDebit)}</span>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4' }}>
            <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, display: 'block' }}>Total Received (Credit)</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>₹{fmt(data.totalCredit)}</span>
          </div>
          <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
            <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 600, display: 'block' }}>Net Balance Due</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#dc2626' }}>₹{fmt(data.closingBalance)}</span>
          </div>
        </div>

        {/* Ledger Transaction Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', borderRadius: '6px 0 0 0' }}>Date</th>
              <th style={{ padding: '10px 12px' }}>Voucher No</th>
              <th style={{ padding: '10px 12px' }}>Particulars / Narration</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Debit (₹)</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credit (₹)</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 700 }}>
              <td style={{ padding: '8px 12px' }}>{startDate}</td>
              <td style={{ padding: '8px 12px' }}>OB</td>
              <td style={{ padding: '8px 12px' }}>Opening Balance b/f</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: data.openingBalance > 0 ? '#dc2626' : '#059669' }}>
                ₹{fmt(data.openingBalance)}
              </td>
            </tr>

            {data.transactions.length > 0 ? (
              data.transactions.map((tx, idx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    {new Date(tx.date).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#3b82f6' }}>
                    {tx.voucherNumber}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div>{tx.particulars}</div>
                    {tx.notes && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Note: {tx.notes}</span>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: tx.debit > 0 ? 700 : 400, color: tx.debit > 0 ? '#1d4ed8' : '#64748b' }}>
                    {tx.debit > 0 ? fmt(tx.debit) : '-'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: tx.credit > 0 ? 700 : 400, color: tx.credit > 0 ? '#15803d' : '#64748b' }}>
                    {tx.credit > 0 ? fmt(tx.credit) : '-'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: tx.balance > 0 ? '#dc2626' : '#059669' }}>
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
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 900, borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
              <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', textTransform: 'uppercase' }}>
                Total Period Movements:
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1d4ed8' }}>
                ₹{fmt(data.totalDebit)}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803d' }}>
                ₹{fmt(data.totalCredit)}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: data.closingBalance > 0 ? '#dc2626' : '#059669', fontSize: '0.95rem' }}>
                ₹{fmt(data.closingBalance)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bank Details & Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid #cbd5e1', paddingTop: '16px', fontSize: '0.8rem', color: '#475569' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Bank Transfer / RTGS Details:</div>
            <div>A/C Name: <strong>{company.bankAccountName || 'ESPON CLOTHING PRIVATE LIMITED'}</strong></div>
            <div>A/c No: <strong>{company.accountNumber || '016805006415'}</strong></div>
            <div>IFSC: <strong>{company.ifscCode || 'ICIC0000168'}</strong> • Branch: {company.branch || 'Rohtak'}</div>
            <div>UPI ID: <strong>{company.upiId || '7206066678@OKBIZAXIS'}</strong></div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>For {company.companyName || 'ESPON CLOTHING PVT LTD'}</div>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', display: 'inline-block', width: '180px', marginLeft: 'auto', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
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
