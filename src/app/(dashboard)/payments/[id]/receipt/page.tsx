import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [payment, companyRes] = await Promise.all([
    prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: {
          include: {
            order: true
          }
        },
        order: true
      }
    }),
    getCompanySettings()
  ]);

  if (!payment) {
    notFound();
  }

  const company = companyRes.settings || {
    companyName: "ESPON CLOTHING PRIVATE LIMITED",
    gstin: "06AAHCE7721Q1Z4",
    address: "Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road",
    city: "Rohtak",
    state: "Haryana",
    pincode: "124001",
    mobile: "7206066678",
    email: "clothingespon@gmail.com"
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px 20px' }}>
      
      {/* Action Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <Link href="/payments" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          ← Back to Payment Collection
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <DownloadPdfButton elementId="printable-receipt" filename={`Receipt-${payment.paymentNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Main Printable Receipt Sheet */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '40px 48px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#111827',
        fontSize: '13px',
        lineHeight: 1.5,
        border: '1px solid #cbd5e1'
      }} id="printable-receipt">

        {/* Company Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '0.02em' }}>
            {company.companyName}
          </h1>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {company.address}, {company.city}, {company.state} - {company.pincode}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            <strong>GSTIN:</strong> {company.gstin} • <strong>Phone:</strong> {company.mobile}
          </div>
          <div style={{ marginTop: '12px', display: 'inline-block', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '4px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
            OFFICIAL PAYMENT RECEIPT VOUCHER
          </div>
        </div>

        {/* Receipt Number & Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 18px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>VOUCHER NUMBER</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#4f46e5' }}>{payment.paymentNumber}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>PAYMENT DATE</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{new Date(payment.paymentDate).toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {/* Payer Details */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Received With Thanks From:
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            {payment.customer?.businessName || payment.payerName}
          </div>
          <div style={{ color: '#475569', marginTop: '4px' }}>
            {payment.customer?.contactPerson ? `Contact: ${payment.customer.contactPerson}` : ''} {payment.customer?.mobile ? `(${payment.customer.mobile})` : ''}
          </div>
          {payment.customer?.gstNumber && (
            <div style={{ color: '#475569', marginTop: '2px' }}>
              <strong style={{ textTransform: 'uppercase' }}>Customer GSTIN:</strong> <span style={{ textTransform: 'uppercase' }}>{payment.customer.gstNumber.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Payment Line Breakdown */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>Particulars / Reference</th>
                <th style={{ padding: '10px 14px' }}>Payment Mode</th>
                <th style={{ padding: '10px 14px' }}>Channel / Bank Account</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount Paid (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                  <div>{payment.paymentType}</div>
                  {payment.invoice && (
                    <div style={{ fontSize: '11px', color: '#2563eb' }}>
                      Settlement towards Invoice: {payment.invoice.invoiceNumber}
                    </div>
                  )}
                  {payment.referenceNumber && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      UTR / Txn Ref: {payment.referenceNumber}
                    </div>
                  )}
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f766e' }}>
                  {payment.paymentMode}
                </td>
                <td style={{ padding: '12px 14px', color: '#475569' }}>
                  {payment.receivingAccount || company.bankAccountName || 'Company Bank A/c'}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, fontSize: '16px', color: '#16a34a' }}>
                  ₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer & Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '28px', marginTop: '20px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '380px' }}>
            <div>* This is a computer generated payment receipt voucher.</div>
            <div>Recorded by: <strong>{payment.recordedBy || 'Accounts Department'}</strong></div>
            {payment.notes && <div style={{ marginTop: '4px' }}>Remarks: {payment.notes}</div>}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
              For {company.companyName}
            </div>
            <div style={{ height: '45px' }}></div>
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px', fontWeight: 700 }}>
              Authorized Signatory
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
