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
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 20px' }}>
      
      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <a href="/quotations" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          ← Back to Quotations
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href={`/quotations/${quotation.id}/edit`} style={{ padding: '8px 16px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', borderRadius: '6px', color: '#1d4ed8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ✏️ Edit Quotation
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

      {/* Exact PDF Layout Container */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '36px',
        border: '1px solid #9ca3af',
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
            <div style={{ fontWeight: 'bold' }}># : {quotation.quotationNumber}</div>
            <div>: {new Date(quotation.date).toLocaleDateString('en-GB')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Place Of Supply</strong> : {quotation.placeOfSupply || 'Haryana (06)'}</div>
          </div>
        </div>

        {/* Bill To & Ship To 2-Column Section */}
        <div style={{ border: '1px solid #9ca3af', display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRight: '1px solid #9ca3af' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bill To</div>
            <div style={{ fontWeight: 'bold' }}>{quotation.customer.businessName}</div>
            {quotation.customer.contactPerson && <div>{quotation.customer.contactPerson}</div>}
            <div>{quotation.customer.billingAddress || quotation.customer.city || 'India'}</div>
            {quotation.customer.city && <div>{quotation.customer.city} {quotation.customer.pincode} {quotation.customer.state}</div>}
            <div>India</div>
            <div>{quotation.customer.mobile}</div>
          </div>

          <div style={{ padding: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ship To</div>
            <div>{quotation.shippingAddress || quotation.customer.shippingAddress || quotation.customer.billingAddress || quotation.customer.businessName}</div>
            {quotation.customer.city && <div>{quotation.customer.city}</div>}
            <div>{quotation.customer.pincode} {quotation.customer.state}</div>
            <div>India</div>
          </div>
        </div>

        {/* Calculate if discount was given anywhere */}
        {(() => {
          const totalItemDiscount = quotation.items.reduce((sum, item) => sum + (item.discountPercent || 0), 0);
          const totalAdditionalDiscount = quotation.additionalDiscount || quotation.itemDiscount || 0;
          const hasDiscount = totalItemDiscount > 0 || totalAdditionalDiscount > 0;

          return (
            <>
              {/* Item Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9ca3af', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #9ca3af', backgroundColor: '#f9fafb', fontSize: '11px' }}>
                    <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'left', width: '30px' }}>#</th>
                    <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'left' }}>Item & Description</th>
                    <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'center', width: '70px' }}>HSN/SAC</th>
                    <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px' }}>Qty</th>
                    <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '70px' }}>Rate</th>
                    {hasDiscount && (
                      <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '70px' }}>Discount</th>
                    )}
                    {isInterstate ? (
                      <th colSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', borderBottom: '1px solid #9ca3af', textAlign: 'center' }}>IGST</th>
                    ) : (
                      <>
                        <th colSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', borderBottom: '1px solid #9ca3af', textAlign: 'center' }}>CGST</th>
                        <th colSpan={2} style={{ padding: '6px', borderRight: '1px solid #9ca3af', borderBottom: '1px solid #9ca3af', textAlign: 'center' }}>SGST</th>
                      </>
                    )}
                    <th rowSpan={2} style={{ padding: '6px', textAlign: 'right', width: '90px' }}>Amount</th>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #9ca3af', backgroundColor: '#f9fafb', fontSize: '11px' }}>
                    {isInterstate ? (
                      <>
                        <th style={{ padding: '4px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '45px' }}>%</th>
                        <th style={{ padding: '4px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '65px' }}>Amt</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '4px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '45px' }}>%</th>
                        <th style={{ padding: '4px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px' }}>Amt</th>
                        <th style={{ padding: '4px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '45px' }}>%</th>
                        <th style={{ padding: '4px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px' }}>Amt</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', verticalAlign: 'top' }}>{index + 1}</td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold' }}>{item.product.articleNumber || item.product.name}</div>
                        <div style={{ color: '#4b5563', whiteSpace: 'pre-line', fontSize: '11px', marginTop: '2px' }}>
                          {item.description || item.product.name}
                        </div>
                      </td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'center', verticalAlign: 'top' }}>
                        {item.hsnCode || '6103'}
                      </td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                        <div>{item.quantity.toFixed(2)}</div>
                        <div style={{ color: '#6b7280', fontSize: '10px' }}>{item.unit || 'pcs'}</div>
                      </td>
                      <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                        {fmt(item.rate)}
                      </td>
                      {hasDiscount && (
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                          {item.discountPercent > 0 ? `${item.discountPercent.toFixed(2)}%` : '0.00%'}
                        </td>
                      )}
                      {isInterstate ? (
                        <>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                            {item.gstRate}%
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                            {fmt(item.igst)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                            {(item.gstRate / 2)}%
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                            {fmt(item.cgst ?? ((item.total - (item.total / (1 + (item.gstRate || 0) / 100))) / 2))}
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                            {(item.gstRate / 2)}%
                          </td>
                          <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                            {fmt(item.sgst ?? item.cgst ?? ((item.total - (item.total / (1 + (item.gstRate || 0) / 100))) / 2))}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                        {fmt(item.total / (1 + (item.gstRate || 0) / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}

        {/* Bottom Section: Notes & Terms on Left | Totals & Signature on Right */}
        <div style={{ border: '1px solid #9ca3af', display: 'grid', gridTemplateColumns: '1fr 300px' }}>
          
          {/* Left Column */}
          <div style={{ padding: '12px', borderRight: '1px solid #9ca3af', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Sub Total</span>
                <span style={{ fontWeight: 'bold' }}>{fmt(quotation.taxableAmount || quotation.subtotal)}</span>
              </div>


              {isInterstate ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>IGST {quotation.taxableAmount > 0 && quotation.igst > 0 ? `(${Math.round((quotation.igst / quotation.taxableAmount) * 100)}%)` : ''}</span>
                  <span>{fmt(quotation.igst)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>CGST {quotation.taxableAmount > 0 && quotation.cgst > 0 ? `(${Math.round((quotation.cgst / quotation.taxableAmount) * 100 * 10) / 10}%)` : ''}</span>
                    <span>{fmt(quotation.cgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>SGST {quotation.taxableAmount > 0 && quotation.sgst > 0 ? `(${Math.round((quotation.sgst / quotation.taxableAmount) * 100 * 10) / 10}%)` : ''}</span>
                    <span>{fmt(quotation.sgst)}</span>
                  </div>
                </>
              )}

              {quotation.shippingCharges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Shipping charge</span>
                  <span>{fmt(quotation.shippingCharges)}</span>
                </div>
              )}

              {(() => {
                const totalTax = isInterstate ? quotation.igst : (quotation.cgst + quotation.sgst);
                const calculatedSum = (quotation.taxableAmount || quotation.subtotal) + totalTax + (quotation.shippingCharges || 0);
                const rounding = Math.round((quotation.totalValue - calculatedSum) * 100) / 100;
                return rounding !== 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>Rounding</span>
                    <span>{fmt(rounding)}</span>
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

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          #printable-quote { border: none !important; padding: 0 !important; max-width: 100% !important; }
        }
      `}} />
    </div>
  );
}
