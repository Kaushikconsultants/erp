import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import { generateHsnSummary, numberToWordsINR } from '@/lib/gstUtils';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canUserAccessSection } from '@/lib/authPermissions';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'credit_notes');
  if (!hasAccess) redirect('/');

  const { id } = await params;

  const [creditNote, companyRes] = await Promise.all([
    prisma.creditNote.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true,
        order: {
          include: {
            salesperson: { include: { user: true } }
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    }),
    getCompanySettings()
  ]);

  const orgId = await getTenantOrgId();

  if (!creditNote) {
    notFound();
  }

  if (creditNote.organizationId && creditNote.organizationId !== orgId) {
    notFound();
  }

  if (!creditNote.organizationId && orgId) {
    await prisma.creditNote.update({
      where: { id },
      data: { organizationId: orgId }
    }).catch(() => {});
  }

  const company = companyRes.settings || {
    companyName: "ESPON CLOTHING PRIVATE LIMITED",
    gstin: "06AAHCE7721Q1Z4",
    pan: "AAHCE7721Q",
    address: "123 Industrial Area, Sector 4",
    city: "Rohtak",
    state: "Haryana",
    pincode: "124001",
    email: "clothingespon@gmail.com",
    mobile: "7206066678",
    website: "www.espon.in",
    logoUrl: "",
    bankAccountName: "ESPON CLOTHING PRIVATE LIMITED.",
    accountNumber: "016805006415",
    ifscCode: "ICIC0000168",
    branch: "Rohtak",
    signatoryName: "Ashish Goyal",
    signatoryDesignation: "Authorized Signatory"
  };

  const isInterstate = creditNote.igst > 0 ||
    (company.state?.trim().toLowerCase() !== (creditNote.customer.state || company.state)?.trim().toLowerCase());

  // Calculate HSN Summary
  const hsnSummary = generateHsnSummary(
    creditNote.items.map(item => ({
      hsnCode: item.hsnCode || item.sku || "6109",
      rate: item.rate,
      quantity: item.quantity,
      gstRate: item.gstRate || 12
    })),
    isInterstate
  );

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px 20px' }}>
      
      {/* Top Floating Control Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <Link href="/credit-notes" style={{ color: '#e11d48', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          ← Back to Credit Notes
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <DownloadPdfButton elementId="printable-credit-note" filename={`${creditNote.creditNoteNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Main GST Credit Note Sheet */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '48px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#111827',
        fontSize: '13px',
        lineHeight: 1.5
      }} id="printable-credit-note">

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e11d48', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {company.logoUrl && (
              <img src={company.logoUrl} alt={company.companyName} style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
            )}
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#111827', letterSpacing: '-0.02em' }}>
                {company.companyName}
              </h1>
              <div style={{ color: '#4b5563', fontSize: '12px' }}>
                {company.address}, {company.city}, {company.state} - {company.pincode}
              </div>
              <div style={{ color: '#4b5563', fontSize: '12px', marginTop: '2px' }}>
                <strong>GSTIN:</strong> {company.gstin} | <strong>PAN:</strong> {company.pan}
              </div>
              <div style={{ color: '#4b5563', fontSize: '12px' }}>
                <strong>Email:</strong> {company.email} | <strong>Phone:</strong> {company.mobile}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#e11d48', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>
              CREDIT NOTE
            </h2>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
              {creditNote.creditNoteNumber}
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
              <strong>Date:</strong> {new Date(creditNote.creditNoteDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>
              <strong>Reason:</strong> <span style={{ color: '#e11d48', fontWeight: 700 }}>{creditNote.reason}</span>
            </div>
            {creditNote.invoice && (
              <div style={{ color: '#4b5563', fontSize: '12px', marginTop: '4px', backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                Against Invoice: <strong>{creditNote.invoice.invoiceNumber}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Bill To Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>
              Credit Issued To (Buyer)
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
              {creditNote.customer.businessName || creditNote.customer.contactPerson}
            </div>
            <div style={{ color: '#4b5563', marginTop: '4px', whiteSpace: 'pre-line' }}>
              {creditNote.customer.billingAddress || `${creditNote.customer.city || ''}, ${creditNote.customer.state || ''} - ${creditNote.customer.pincode || ''}`}
            </div>
            <div style={{ marginTop: '6px', color: '#4b5563' }}>
              <strong>GSTIN / UIN:</strong> {creditNote.customer.gstNumber || 'Unregistered'}
            </div>
            <div style={{ color: '#4b5563' }}>
              <strong>Contact:</strong> {creditNote.customer.mobile || '-'}
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Transaction Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Place of Supply:</span>
              <strong>{creditNote.customer.state || company.state}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Supply Type:</span>
              <strong>{isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Stock Status:</span>
              <strong style={{ color: creditNote.restockReturnedGoods ? '#16a34a' : '#64748b' }}>
                {creditNote.restockReturnedGoods ? '✓ Restocked into Warehouse' : 'Financial Adjustment Only'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Credit Note Status:</span>
              <strong style={{ color: '#e11d48' }}>{creditNote.status}</strong>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', width: '30px' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Item & Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', width: '70px' }}>HSN</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: '60px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: '80px' }}>Rate (₹)</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: '70px' }}>GST %</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', width: '90px' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {creditNote.items.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{index + 1}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{item.description}</div>
                  {item.sku && <div style={{ fontSize: '11px', color: '#6b7280' }}>SKU: {item.sku}</div>}
                </td>
                <td style={{ padding: '10px 12px', color: '#4b5563' }}>{item.hsnCode || '6109'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{item.quantity} {item.unit || 'pcs'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563' }}>₹{item.rate.toFixed(2)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563' }}>{item.gstRate}%</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                  ₹{(item.quantity * item.rate).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Calculation & Tax Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          
          {/* Amount in words */}
          <div style={{ width: '55%' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
              Total Credit Amount In Words
            </div>
            <div style={{ fontWeight: 600, color: '#111827', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {numberToWordsINR(creditNote.totalAmount)}
            </div>

            {creditNote.notes && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Notes & Remarks
                </div>
                <div style={{ color: '#4b5563', fontSize: '12px' }}>{creditNote.notes}</div>
              </div>
            )}
          </div>

          {/* Subtotals & Taxes */}
          <div style={{ width: '40%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#4b5563' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>₹{creditNote.subtotal.toFixed(2)}</span>
            </div>

            {!isInterstate ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#4b5563' }}>
                  <span>CGST:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>₹{creditNote.cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#4b5563' }}>
                  <span>SGST:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>₹{creditNote.sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#4b5563' }}>
                <span>IGST:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>₹{creditNote.igst.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #e11d48', borderBottom: '2px solid #e11d48', marginTop: '6px', fontSize: '15px' }}>
              <span style={{ fontWeight: 800, color: '#e11d48' }}>Total Credit Issued:</span>
              <span style={{ fontWeight: 900, color: '#e11d48' }}>₹{creditNote.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* GST HSN Summary Table */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            GST HSN / SAC Summary
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>HSN/SAC</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Taxable Value (₹)</th>
                {!isInterstate ? (
                  <>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>CGST (₹)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>SGST (₹)</th>
                  </>
                ) : (
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>IGST (₹)</th>
                )}
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummary.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{row.hsnCode}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{row.taxableValue.toFixed(2)}</td>
                  {!isInterstate ? (
                    <>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{row.cgstAmount.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{row.sgstAmount.toFixed(2)}</td>
                    </>
                  ) : (
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{row.igstAmount.toFixed(2)}</td>
                  )}
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{row.totalTax.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer & Signature Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', maxWidth: '360px' }}>
            <strong>Terms & Conditions:</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              {creditNote.termsConditions || "This credit note confirms the adjustment of amount/goods as detailed above and can be set off against outstanding or future invoices."}
            </p>
          </div>

          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ height: '40px' }}></div>
            <div style={{ borderTop: '1px solid #111827', paddingTop: '6px', fontWeight: 700, fontSize: '12px' }}>
              {company.signatoryName || 'Authorized Signatory'}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              For {company.companyName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
