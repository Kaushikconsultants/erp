import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import { numberToWordsINR } from '@/lib/gstUtils';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';
import ConvertQuotationBtn from '@/components/quotations/ConvertQuotationBtn';
import ConvertToInvoiceBtn from '@/components/quotations/ConvertToInvoiceBtn';
import SendQuotationWhatsAppBtn from '@/components/quotations/SendQuotationWhatsAppBtn';
import EditTokenActionBtn from '@/components/quotations/EditTokenActionBtn';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) notFound();

  const orgId = await getTenantOrgId();
  const { id } = await params;

  const [quotation, companyRes] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        salesperson: { include: { user: true } },
        items: { include: { product: true } }
      }
    }),
    getCompanySettings()
  ]);

  if (!quotation) {
    notFound();
  }

  if (quotation.organizationId && quotation.organizationId !== orgId) {
    notFound();
  }

  if (!quotation.organizationId && orgId) {
    await prisma.quotation.update({
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
    upiId: "7206066678@OKBIZAXIS"
  };

  const isInterstate = quotation.isInterstate;

  // Format currency helpers
  const fmt = (val?: number | null) => (val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px 12px 100px 12px' }}>
      
      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 14px auto' }} className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <a href="/quotations" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Quotations
          </a>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            Status: <strong style={{ color: quotation.status === 'Converted' ? '#059669' : quotation.status === 'Confirmed' ? '#2563eb' : '#d97706' }}>{quotation.status}</strong>
          </span>
        </div>

        {/* Scrollable Action Buttons on Mobile */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }} className="quote-action-bar">
          <a href={`/quotations/${quotation.id}/edit`} style={{ padding: '7px 12px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', borderRadius: '6px', color: '#1d4ed8', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ✏️ Edit
          </a>
          {quotation.status === 'Confirmed' && (
            <>
              <EditTokenActionBtn
                quotationId={quotation.id}
                quotationNumber={quotation.quotationNumber}
                customerName={quotation.customer?.businessName || quotation.customer?.contactPerson}
                totalValue={Number(quotation.totalValue || 0)}
                receivedAmount={Number(quotation.receivedAmount || 0)}
                discountSlab={quotation.discountSlab || '1-15'}
              />
              <ConvertToInvoiceBtn quotationId={quotation.id} />
            </>
          )}
          {quotation.status !== 'Converted' && quotation.status !== 'Confirmed' && (
            <ConvertQuotationBtn quotationId={quotation.id} />
          )}
          <SendQuotationWhatsAppBtn 
            quotationId={quotation.id} 
            customerPhone={quotation.customer?.mobile} 
            quotationNumber={quotation.quotationNumber} 
          />
          <DownloadPdfButton elementId="printable-quote" filename={`${quotation.quotationNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="mobile-scroll-hint no-print" style={{ maxWidth: '900px', margin: '0 auto 8px auto' }}>
        <div style={{ backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>👉 Swipe quotation sideways to view all GST & rate columns</span>
          <span>↔</span>
        </div>
      </div>

      {/* Touch-Scrollable Document Wrapper */}
      <div style={{ maxWidth: '900px', margin: '0 auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)' }} className="quote-doc-scroll-wrap">
        <div style={{
          width: '820px',
          minWidth: '820px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          padding: '36px',
          border: '1px solid #9ca3af',
          boxSizing: 'border-box',
          fontFamily: "var(--font-inter), 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#0f172a',
          fontSize: '12px',
          lineHeight: '1.4'
        }} id="printable-quote">

        {/* Company Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Espon Logo Badge / Custom Company Logo */}
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: '70px',
                height: '70px',
                border: '2px solid #000',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '10px'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>ESPON</span>
              </div>
            )}

            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{company.companyName}</h2>
              <p style={{ margin: '0 0 2px 0' }}>{company.address}</p>
              <p style={{ margin: '0 0 2px 0' }}>{company.city}- {company.state} {company.pincode}</p>
              <p style={{ margin: '0 0 2px 0' }}>{company.country}</p>
              <p style={{ margin: '0 0 2px 0' }}>GSTIN {company.gstin}</p>
              <p style={{ margin: '0 0 2px 0' }}>{company.mobile}</p>
              <p style={{ margin: '0 0 2px 0' }}>{company.email}</p>
              <p style={{ margin: '0' }}>{company.website}</p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'normal', margin: 0, letterSpacing: '1px' }}>QUOTE</h1>
          </div>
        </div>

        {/* Quote Metadata Bar */}
        <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>Quote # : {quotation.quotationNumber}</div>
            <div>Quote Date : {new Date(quotation.date).toLocaleDateString('en-GB')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Place Of Supply</strong> : {quotation.placeOfSupply || 'Haryana (06)'}</div>
          </div>
        </div>

        {/* Bill To & Ship To 2-Column Section */}
        <div style={{ border: '1px solid #9ca3af', display: 'flex', marginBottom: '16px' }}>
          <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #9ca3af', minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bill To</div>
            <div style={{ fontWeight: 'bold' }}>{quotation.customer.businessName}</div>
            {quotation.customer.contactPerson && <div>{quotation.customer.contactPerson}</div>}
            <div>{quotation.customer.billingAddress || quotation.customer.city || 'India'}</div>
            {quotation.customer.city && <div>{quotation.customer.city} {quotation.customer.pincode} {quotation.customer.state}</div>}
            <div>India</div>
            <div>{quotation.customer.mobile}</div>
          </div>

          <div style={{ flex: 1, padding: '10px', minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ship To</div>
            <div>{quotation.shippingAddress || quotation.customer.shippingAddress || quotation.customer.billingAddress || quotation.customer.businessName}</div>
            {quotation.customer.city && <div>{quotation.customer.city}</div>}
            <div>{quotation.customer.pincode} {quotation.customer.state}</div>
            <div>India</div>
          </div>
        </div>

        {/* Calculate if discount was given anywhere */}
        {(() => {
          const hasItemDiscount = quotation.items.some(item => (item.discountPercent || 0) > 0 || (item.discountAmount || 0) > 0);

          return (
            <>
              {/* Item Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9ca3af', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #9ca3af', backgroundColor: '#f9fafb', fontSize: '11px', height: '30px' }}>
                    <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'left', width: '30px', verticalAlign: 'middle' }}>#</th>
                    <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'left', verticalAlign: 'middle' }}>Item & Description</th>
                    <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'center', width: '70px', verticalAlign: 'middle' }}>HSN/SAC</th>
                    <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px', verticalAlign: 'middle' }}>Qty</th>
                    <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '70px', verticalAlign: 'middle' }}>Rate</th>
                    {hasItemDiscount && (
                      <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '65px', verticalAlign: 'middle' }}>Discount</th>
                    )}
                    {isInterstate ? (
                      <>
                        <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '45px', verticalAlign: 'middle' }}>IGST %</th>
                        <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '65px', verticalAlign: 'middle' }}>IGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '45px', verticalAlign: 'middle' }}>CGST %</th>
                        <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px', verticalAlign: 'middle' }}>CGST Amt</th>
                        <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '45px', verticalAlign: 'middle' }}>SGST %</th>
                        <th style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px', verticalAlign: 'middle' }}>SGST Amt</th>
                      </>
                    )}
                    <th style={{ padding: '8px 6px', textAlign: 'right', width: '90px', verticalAlign: 'middle' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', verticalAlign: 'top' }}>{index + 1}</td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11.5px', color: '#0f172a' }}>{item.product.articleNumber || item.product.name}</div>
                        <div style={{ color: '#334155', whiteSpace: 'pre-line', fontSize: '10.5px', marginTop: '3px', lineHeight: '1.45' }}>
                          {item.description || item.product.name}
                        </div>
                      </td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'center', verticalAlign: 'top' }}>
                        {item.hsnCode || '6103'}
                      </td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div>{item.quantity.toFixed(2)}</div>
                        <div style={{ color: '#6b7280', fontSize: '10px' }}>{item.unit || 'pcs'}</div>
                      </td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {fmt(item.rate)}
                      </td>
                      {hasItemDiscount && (
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          {item.discountPercent > 0 ? `${item.discountPercent.toFixed(2)}%` : item.discountAmount > 0 ? `₹${fmt(item.discountAmount)}` : '0.00%'}
                        </td>
                      )}
                      {isInterstate ? (
                        <>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {item.gstRate}%
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {fmt(item.igst)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {(item.gstRate / 2)}%
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {fmt(item.cgst ?? ((item.total - (item.total / (1 + (item.gstRate || 0) / 100))) / 2))}
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {(item.gstRate / 2)}%
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {fmt(item.sgst ?? item.cgst ?? ((item.total - (item.total / (1 + (item.gstRate || 0) / 100))) / 2))}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {fmt(item.taxableAmount ?? (item.total / (1 + (item.gstRate || 0) / 100)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}

        {/* Bottom Section: Notes & Terms on Left | Totals & Signature on Right */}
        <div style={{ border: '1px solid #9ca3af', display: 'flex' }}>
          
          {/* Left Column */}
          <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #9ca3af', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Total In Words</div>
              <div style={{ fontStyle: 'italic', fontWeight: 'bold', marginBottom: '16px' }}>
                {numberToWordsINR(quotation.totalValue)}
              </div>

              {quotation.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Notes</div>
                  <div>{quotation.notes}</div>
                </div>
              )}

              {quotation.termsConditions && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Terms & Conditions</div>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#374151' }}>
                    {quotation.termsConditions}
                  </div>
                </div>
              )}
            </div>

            {/* Bank Details */}
            <div style={{ fontSize: '11px', marginTop: '16px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bank Details -</div>
              <div>A/C Name - {company.bankAccountName || 'ESPON CLOTHING PRIVATE LIMITED.'}</div>
              <div>A/c No. - {company.accountNumber || '016805006415'}</div>
              <div>IFSC code - {company.ifscCode || 'ICIC0000168'}</div>
              <div>Branch - {company.branch || 'Rohtak'}</div>
              <div>UPI ID - {company.upiId || '7206066678@OKBIZAXIS'}</div>
            </div>
          </div>

          {/* Right Column: Financial Totals */}
          <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Sub Total</span>
                <span style={{ fontWeight: 'bold' }}>{fmt(quotation.subtotal || quotation.taxableAmount)}</span>
              </div>

              {quotation.itemDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#64748b' }}>
                  <span>Item Discount</span>
                  <span>(-) {fmt(quotation.itemDiscount)}</span>
                </div>
              )}

              {quotation.additionalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#dc2626' }}>
                  <span style={{ fontWeight: 500 }}>Additional Discount</span>
                  <span style={{ fontWeight: 600 }}>(-) {fmt(quotation.additionalDiscount)}</span>
                </div>
              )}

              {(quotation.additionalDiscount > 0 || quotation.itemDiscount > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #cbd5e1', color: '#334155', fontWeight: 600, fontSize: '11.5px' }}>
                  <span>Taxable Amount</span>
                  <span>{fmt(quotation.taxableAmount || (quotation.subtotal - (quotation.itemDiscount || 0) - (quotation.additionalDiscount || 0)))}</span>
                </div>
              )}

              {(() => {
                const effectiveTaxBase = quotation.taxableAmount > 0 
                  ? quotation.taxableAmount 
                  : (quotation.subtotal - (quotation.itemDiscount || 0) - (quotation.additionalDiscount || 0));

                return isInterstate ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>IGST {effectiveTaxBase > 0 && quotation.igst > 0 ? `(${Math.round((quotation.igst / effectiveTaxBase) * 100)}%)` : ''}</span>
                    <span>{fmt(quotation.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>CGST {effectiveTaxBase > 0 && quotation.cgst > 0 ? `(${Math.round((quotation.cgst / effectiveTaxBase) * 100 * 10) / 10}%)` : ''}</span>
                      <span>{fmt(quotation.cgst)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span>SGST {effectiveTaxBase > 0 && quotation.sgst > 0 ? `(${Math.round((quotation.sgst / effectiveTaxBase) * 100 * 10) / 10}%)` : ''}</span>
                      <span>{fmt(quotation.sgst)}</span>
                    </div>
                  </>
                );
              })()}

              {quotation.shippingCharges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Shipping charge</span>
                  <span>{fmt(quotation.shippingCharges)}</span>
                </div>
              )}

              {(() => {
                const totalTax = isInterstate ? quotation.igst : (quotation.cgst + quotation.sgst);
                const baseTaxable = quotation.taxableAmount || (quotation.subtotal - (quotation.additionalDiscount || 0) - (quotation.itemDiscount || 0));
                const calculatedSum = baseTaxable + totalTax + (quotation.shippingCharges || 0);
                const rounding = Math.round((quotation.totalValue - calculatedSum) * 100) / 100;
                return rounding !== 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Rounding</span>
                    <span>{rounding > 0 ? `+${fmt(rounding)}` : fmt(rounding)}</span>
                  </div>
                ) : null;
              })()}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', padding: '6px 0', marginTop: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                <span>Total</span>
                <span>₹{fmt(quotation.totalValue)}</span>
              </div>

              {quotation.receivedAmount > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                    <span>Payment Received</span>
                    <span>(-) ₹{fmt(quotation.receivedAmount)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', borderBottom: '1px solid #000', padding: '6px 0', marginTop: '2px', fontWeight: 'bold', fontSize: '13px', color: Math.max(0, quotation.totalValue - quotation.receivedAmount) === 0 ? '#059669' : '#dc2626' }}>
                    <span>Balance Due</span>
                    <span>₹{fmt(Math.max(0, quotation.totalValue - quotation.receivedAmount))}</span>
                  </div>
                </>
              )}
            </div>

            {/* Authorized Signature Box */}
            <div style={{ padding: '16px 12px 12px 12px', textAlign: 'center', borderTop: '1px solid #9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: '110px' }}>
              {company.signatoryUrl ? (
                <img 
                  src={company.signatoryUrl} 
                  alt="Signature" 
                  style={{ height: '46px', maxWidth: '160px', objectFit: 'contain', marginBottom: '6px' }} 
                />
              ) : (
                <div style={{ height: '36px' }}></div>
              )}
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '11px', fontWeight: 'bold', width: '100%' }}>
                {company.signatoryName ? `${company.signatoryName} (${company.signatoryDesignation || 'Authorized Signatory'})` : 'Authorized Signature'}
              </div>
            </div>
          </div>

        </div>

      </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .mobile-scroll-hint {
          display: none;
        }
        @media (max-width: 860px) {
          .mobile-scroll-hint {
            display: block !important;
          }
          .quote-doc-scroll-wrap {
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            margin-bottom: 24px;
          }
          .quote-action-bar::-webkit-scrollbar {
            height: 4px;
          }
          .quote-action-bar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 4px;
          }
        }
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          .quote-doc-scroll-wrap { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; }
          #printable-quote { border: none !important; padding: 0 !important; max-width: 100% !important; width: 100% !important; min-width: 100% !important; }
        }
      `}} />
    </div>
  );
}
