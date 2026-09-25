import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import { numberToWordsINR } from '@/lib/gstUtils';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    companyName: "Espon Clothing Private Limited",
    address: "Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road",
    city: "Rohtak",
    state: "Haryana",
    pincode: "124001",
    country: "India",
    gstin: "06AAHCE7721Q1Z4",
    mobile: "7206066678",
    email: "clothingespon@gmail.com",
    website: "www.espon.in",
    logoUrl: "",
    bankAccountName: "ESPON CLOTHING PRIVATE LIMITED.",
    accountNumber: "016805006415",
    ifscCode: "ICIC0000168",
    branch: "Rohtak",
    upiId: "7206066678@OKBIZAXIS",
    signatoryName: "Tinkal",
    signatoryDesignation: "Authorized Signatory"
  };

  const isInterstate = creditNote.igst > 0 ||
    (company.state?.trim().toLowerCase() !== (creditNote.customer.state || company.state)?.trim().toLowerCase());

  const fmt = (val?: number | null) =>
    (val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStateCode = (state?: string | null, gstin?: string | null): string => {
    if (gstin && gstin.length >= 2 && !isNaN(Number(gstin.slice(0, 2)))) {
      return gstin.slice(0, 2);
    }
    const s = (state || '').toLowerCase().trim();
    const map: Record<string, string> = {
      'jammu & kashmir': '01', 'jammu and kashmir': '01', 'himachal pradesh': '02', 'punjab': '03',
      'chandigarh': '04', 'uttarakhand': '05', 'haryana': '06', 'delhi': '07', 'rajasthan': '08',
      'uttar pradesh': '09', 'bihar': '10', 'sikkim': '11', 'arunachal pradesh': '12', 'nagaland': '13',
      'manipur': '14', 'mizoram': '15', 'tripura': '16', 'meghalaya': '17', 'assam': '18',
      'west bengal': '19', 'jharkhand': '20', 'odisha': '21', 'chhattisgarh': '22', 'madhya pradesh': '23',
      'gujarat': '24', 'daman & diu': '25', 'dadra & nagar haveli': '26', 'maharashtra': '27',
      'karnataka': '29', 'goa': '30', 'lakshadweep': '31', 'kerala': '32', 'tamil nadu': '33',
      'puducherry': '34', 'andaman & nicobar islands': '35', 'telangana': '36', 'andhra pradesh': '37', 'ladakh': '38'
    };
    return map[s] || '06';
  };

  const formatPlaceOfSupply = (state?: string | null, gstin?: string | null): string => {
    const targetState = state || 'Haryana';
    const code = getStateCode(targetState, gstin);
    const cleanState = targetState.replace(/\(\d+\)/g, '').trim();
    return `${cleanState} (${code})`;
  };

  const totalUnits = creditNote.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const effectiveTaxBase = creditNote.subtotal || 0;
  const effectiveTaxRate = creditNote.items[0]?.gstRate || 12;

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px 12px 100px 12px' }}>
      {/* Top Floating Control Bar */}
      <div style={{ maxWidth: '820px', margin: '0 auto 14px auto' }} className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <Link href="/credit-notes" style={{ color: '#e11d48', textDecoration: 'none', fontWeight: 600, fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Credit Notes
          </Link>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            Status: <strong style={{ color: creditNote.status === 'ADJUSTED' ? '#059669' : creditNote.status === 'OPEN' ? '#d97706' : '#dc2626' }}>{creditNote.status}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: '6px' }}>
          {creditNote.invoice && (
            <Link
              href={`/invoices/${creditNote.invoice.id}`}
              style={{
                padding: '7px 12px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                color: '#475569',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap'
              }}
            >
              Original Invoice #{creditNote.invoice.invoiceNumber}
            </Link>
          )}
          <DownloadPdfButton elementId="printable-credit-note" filename={`${creditNote.creditNoteNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Touch-Scrollable Document Wrapper */}
      <div style={{ maxWidth: '820px', margin: '0 auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            padding: '28px 32px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            color: '#111827',
            fontSize: '10.5px',
            lineHeight: '1.4'
          }}
          id="printable-credit-note"
        >
          {/* 1. Header Row (Company Info on Left, Document Title on Right) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" style={{ width: '64px', height: '68px', objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <svg width="60" height="66" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <path d="M50 4 C24 4 10 10 10 32 C10 68 34 94 50 106 C66 94 90 68 90 32 C90 10 76 4 50 4 Z" stroke="#000000" strokeWidth="5" fill="#ffffff" />
                  <text x="50" y="32" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="13" fill="#000000" letterSpacing="1">ESPON</text>
                  <path d="M48 44 C41 44 36 50 36 60 C36 74 46 80 58 76 C65 74 68 68 68 68 M40 56 C44 56 60 55 60 48 C60 42 52 44 48 44" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M50 78 C44 84 42 90 48 94 C53 96 62 88 64 80" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                </svg>
              )}

              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '2px' }}>{company.companyName}</div>
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.35' }}>{company.address}</div>
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.35' }}>{company.city}- {company.state} {company.pincode}</div>
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.35' }}>{company.country || 'India'}</div>
                <div style={{ fontSize: '10px', color: '#111827', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>GSTIN {company.gstin ? company.gstin.toUpperCase() : ''}</div>
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.35' }}>{company.mobile}</div>
                <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.35' }}>{company.email}</div>
                {company.website && <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.35' }}>{company.website}</div>}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '0.5px', color: '#e11d48', lineHeight: '1.1' }}>
                CREDIT NOTE
              </h1>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                (GST Sales Return &amp; Adjustment)
              </div>
            </div>
          </div>

          {/* 2. Meta Details Box (Zoho 2-Column Key-Value Box) */}
          <div style={{ border: '1px solid #d1d5db', display: 'flex', marginBottom: '12px', fontSize: '10.5px' }}>
            <div style={{ flex: '1 1 50%', borderRight: '1px solid #d1d5db', padding: '7px 12px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#374151', padding: '1.5px 0', width: '105px' }}>Credit Note No.</td>
                    <td style={{ color: '#111827', padding: '1.5px 0', width: '12px' }}>:</td>
                    <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{creditNote.creditNoteNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#374151', padding: '1.5px 0' }}>Credit Note Date</td>
                    <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                    <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{new Date(creditNote.creditNoteDate).toLocaleDateString('en-GB')}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#374151', padding: '1.5px 0' }}>Reason</td>
                    <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                    <td style={{ color: '#e11d48', fontWeight: 700, padding: '1.5px 0' }}>{creditNote.reason}</td>
                  </tr>
                  {creditNote.invoice && (
                    <tr>
                      <td style={{ color: '#374151', padding: '1.5px 0' }}>Against Invoice</td>
                      <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                      <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>#{creditNote.invoice.invoiceNumber}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ flex: '1 1 50%', padding: '7px 12px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '105px', color: '#374151', padding: '1.5px 0' }}>Place Of Supply</td>
                    <td style={{ color: '#111827', padding: '1.5px 0', width: '12px' }}>:</td>
                    <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>
                      {formatPlaceOfSupply(creditNote.customer.state, creditNote.customer.gstNumber)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#374151', padding: '1.5px 0' }}>Stock Status</td>
                    <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                    <td style={{ color: creditNote.restockReturnedGoods ? '#16a34a' : '#64748b', fontWeight: 700, padding: '1.5px 0' }}>
                      {creditNote.restockReturnedGoods ? '✓ Restocked into Warehouse' : 'Financial Adjustment Only'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#374151', padding: '1.5px 0' }}>Open Balance</td>
                    <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                    <td style={{ color: creditNote.balanceAmount > 0 ? '#d97706' : '#16a34a', fontWeight: 700, padding: '1.5px 0' }}>
                      ₹{fmt(creditNote.balanceAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Address Box (Bill To / Reference 2-Column Box) */}
          <div style={{ border: '1px solid #d1d5db', display: 'flex', marginBottom: '14px', fontSize: '10px' }}>
            <div style={{ flex: '1 1 50%', borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '4px 12px', borderBottom: '1px solid #d1d5db', fontWeight: 700, color: '#111827', fontSize: '10px' }}>
                Credit Issued To (Buyer)
              </div>
              <div style={{ padding: '8px 12px', lineHeight: '1.4', flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '11px', color: '#111827', marginBottom: '2px' }}>{creditNote.customer.businessName}</div>
                {creditNote.customer.contactPerson && (
                  <div style={{ color: '#374151' }}>Attn: {creditNote.customer.contactPerson}</div>
                )}
                {creditNote.customer.billingAddress && (
                  <div style={{ color: '#374151' }}>{creditNote.customer.billingAddress}</div>
                )}
                {creditNote.customer.city && (
                  <div style={{ color: '#374151' }}>{creditNote.customer.city} {creditNote.customer.pincode ? `- ${creditNote.customer.pincode}` : ''} {creditNote.customer.state}</div>
                )}
                <div style={{ color: '#374151' }}>India</div>
                {creditNote.customer.mobile && (
                  <div style={{ color: '#374151', marginTop: '2px' }}>{creditNote.customer.mobile.startsWith('+') ? creditNote.customer.mobile : `+91-${creditNote.customer.mobile}`}</div>
                )}
                {creditNote.customer.gstNumber && (
                  <div style={{ color: '#111827', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>GSTIN {creditNote.customer.gstNumber.toUpperCase()}</div>
                )}
              </div>
            </div>

            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '4px 12px', borderBottom: '1px solid #d1d5db', fontWeight: 700, color: '#111827', fontSize: '10px' }}>
                Original Transaction Reference
              </div>
              <div style={{ padding: '8px 12px', lineHeight: '1.4', flex: 1 }}>
                {creditNote.invoice ? (
                  <>
                    <div><strong>Original Invoice:</strong> #{creditNote.invoice.invoiceNumber}</div>
                    <div style={{ color: '#4b5563', marginTop: '2px' }}>Invoice Date: {new Date(creditNote.invoice.invoiceDate).toLocaleDateString('en-GB')}</div>
                    <div style={{ color: '#4b5563' }}>Invoice Total: ₹{fmt(creditNote.invoice.totalAmount)}</div>
                  </>
                ) : (
                  <div style={{ color: '#64748b' }}>Direct Credit Adjustment (No linked invoice)</div>
                )}
                {creditNote.notes && (
                  <div style={{ marginTop: '6px', color: '#4b5563', fontStyle: 'italic' }}>
                    Note: {creditNote.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Items Table (Zoho 2-Tier Nested Table) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#111827', fontWeight: 700, fontSize: '10px' }}>
                <th rowSpan={2} style={{ padding: '8px 4px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'center', width: '28px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>#</th>
                <th rowSpan={2} style={{ padding: '8px 8px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'left', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Item &amp; Description</th>
                <th rowSpan={2} style={{ padding: '8px 4px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'center', width: '58px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>HSN/SAC</th>
                <th rowSpan={2} style={{ padding: '8px 6px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'right', width: '54px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Qty</th>
                <th rowSpan={2} style={{ padding: '8px 6px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'right', width: '62px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Rate</th>
                {isInterstate ? (
                  <th colSpan={2} style={{ padding: '6px 6px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'center', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>IGST</th>
                ) : (
                  <>
                    <th colSpan={2} style={{ padding: '6px 6px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'center', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>CGST</th>
                    <th colSpan={2} style={{ padding: '6px 6px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'center', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>SGST</th>
                  </>
                )}
                <th rowSpan={2} style={{ padding: '8px 8px', border: '1px solid #cbd5e1', borderTop: '2px solid #94a3b8', textAlign: 'right', width: '80px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Amount</th>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc', color: '#111827', fontWeight: 700, fontSize: '9.5px' }}>
                {isInterstate ? (
                  <>
                    <th style={{ padding: '4px 4px', border: '1px solid #cbd5e1', textAlign: 'right', width: '38px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>%</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right', width: '58px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Amt</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '4px 4px', border: '1px solid #cbd5e1', textAlign: 'right', width: '36px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>%</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right', width: '52px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Amt</th>
                    <th style={{ padding: '4px 4px', border: '1px solid #cbd5e1', textAlign: 'right', width: '36px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>%</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'right', width: '52px', verticalAlign: 'middle', lineHeight: '1.3', boxSizing: 'border-box' }}>Amt</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {creditNote.items.map((item, index) => {
                const gst = (item.gstRate || 0) / 100;
                const taxable = item.taxableAmount || (item.rate * item.quantity);
                const igstVal = item.igst || (isInterstate ? taxable * gst : 0);
                const halfGstVal = item.cgst || (!isInterstate ? taxable * (gst / 2) : 0);

                return (
                  <tr key={item.id}>
                    <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'center', verticalAlign: 'top', color: '#4b5563' }}>{index + 1}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#111827' }}>
                        {item.product?.name || item.description}
                      </div>
                      {item.sku && (
                        <div style={{ color: '#6b7280', fontSize: '9px' }}>SKU: {item.sku}</div>
                      )}
                      {item.description && item.description !== item.product?.name && (
                        <div style={{ color: '#4b5563', fontSize: '9.5px', marginTop: '1px' }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'center', verticalAlign: 'top', color: '#4b5563' }}>
                      {item.hsnCode || '6109'}
                    </td>
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.quantity.toFixed(2)}</div>
                      <div style={{ color: '#6b7280', fontSize: '9px' }}>{item.unit || 'pcs'}</div>
                    </td>
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(item.rate)}
                    </td>
                    {isInterstate ? (
                      <>
                        <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          {item.gstRate}%
                        </td>
                        <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(igstVal)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          {item.gstRate / 2}%
                        </td>
                        <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(halfGstVal)}
                        </td>
                        <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          {item.gstRate / 2}%
                        </td>
                        <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(item.sgst || halfGstVal)}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
                      {fmt(taxable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 5. Lower Box (Connected directly under table) */}
          <div style={{ border: '1px solid #d1d5db', borderTop: 'none', display: 'flex', backgroundColor: '#ffffff' }}>
            {/* Left Column (58%) */}
            <div style={{ flex: '1 1 58%', borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '10px', color: '#111827', fontWeight: 600 }}>
                  Items in Total {totalUnits.toFixed(2)}
                </div>

                <div style={{ padding: '7px 12px' }}>
                  <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 500 }}>Total Credit In Words</div>
                  <div style={{ fontStyle: 'italic', fontWeight: 700, color: '#111827', fontSize: '10.5px', marginTop: '2px', lineHeight: '1.35' }}>
                    {numberToWordsINR(creditNote.totalAmount)}
                  </div>
                </div>

                <div style={{ padding: '6px 12px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>Terms &amp; Conditions</div>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '9px', color: '#4b5563', lineHeight: '1.4' }}>
                    {creditNote.termsConditions || `1. This credit note confirms the adjustment of amount/goods as detailed above.\n2. Can be set off against outstanding balances or future purchase invoices.\n3. Subject to Haryana Jurisdiction.`}
                  </div>
                </div>
              </div>

              <div style={{ padding: '8px 12px 10px 12px', fontSize: '9.5px', color: '#1f2937', lineHeight: '1.45', borderTop: '1px dashed #e5e7eb' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', color: '#111827' }}>Refund / Adjustment Account -</div>
                <div>A/C Name - {company.bankAccountName || 'ESPON CLOTHING PRIVATE LIMITED.'}</div>
                <div>A/c No. - <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{company.accountNumber || '016805006415'}</span></div>
                <div>IFSC code - <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{company.ifscCode || 'ICIC0000168'}</span></div>
                <div>Branch - {company.branch || 'Rohtak.'}</div>
              </div>
            </div>

            {/* Right Column (42%) */}
            <div style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ padding: '6px 12px', fontSize: '10.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                  <span style={{ color: '#374151' }}>Sub Total</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(creditNote.subtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                  <span style={{ color: '#374151' }}>Total Taxable Amount</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(effectiveTaxBase)}</span>
                </div>

                {isInterstate ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                    <span style={{ color: '#374151' }}>IGST ({effectiveTaxRate}%)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(creditNote.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                      <span style={{ color: '#374151' }}>CGST ({effectiveTaxRate / 2}%)</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(creditNote.cgst)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                      <span style={{ color: '#374151' }}>SGST ({effectiveTaxRate / 2}%)</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(creditNote.sgst)}</span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 4px 0', borderTop: '1px solid #111827', marginTop: '6px', fontWeight: 800, fontSize: '12px', color: '#e11d48' }}>
                  <span>Total Credit Issued</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{fmt(creditNote.totalAmount)}</span>
                </div>
              </div>

              {/* Authorized Signatory */}
              <div style={{ padding: '8px 12px 12px 12px', textAlign: 'center', borderTop: '1px dashed #e5e7eb' }}>
                <div style={{ height: '36px' }}></div>
                <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '4px', fontSize: '10px', fontWeight: 700, color: '#111827' }}>
                  Authorized Signatory
                </div>
                <div style={{ fontSize: '9px', color: '#6b7280' }}>For {company.companyName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
