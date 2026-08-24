import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import { numberToWordsINR } from '@/lib/gstUtils';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [order, companyRes] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        salesperson: { include: { user: true } },
        items: { include: { product: true } }
      }
    }),
    getCompanySettings()
  ]);

  if (!order) notFound();

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

  const isInterstate = order.isInterstate;
  const fmt = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Totals
  const totalIgst = order.igst || 0;
  const totalCgst = order.cgst || 0;
  const totalSgst = order.sgst || 0;
  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = order.totalValue || 0;
  const taxableAmount = Math.max(0, grandTotal - totalTax);
  const receivedAmount = order.paymentReceived || 0;
  const balanceDue = Math.max(0, grandTotal - receivedAmount);

  // Check if order has a discount (order-level, not per-item — OrderItem has no discountPercent)
  const hasDiscount = order.discount > 0;

  return (
    <div style={{ backgroundColor: '#e5e7eb', minHeight: '100vh', padding: '40px 20px' }}>

      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <a href={`/orders/${order.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          ← Back to Order
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <DownloadPdfButton elementId="printable-invoice" filename={`INV-${order.orderNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Invoice Sheet — same layout as quotation */}
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
      }} id="printable-invoice">

        {/* Company Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: '70px', height: '70px', border: '2px solid #000', borderRadius: '8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '10px'
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
            <h1 style={{ fontSize: '28px', fontWeight: 'normal', margin: 0, letterSpacing: '1px' }}>TAX INVOICE</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>(Original for Recipient)</p>
          </div>
        </div>

        {/* Invoice Metadata Bar */}
        <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold' }}># : {order.orderNumber}</div>
            <div>: {new Date(order.createdAt).toLocaleDateString('en-GB')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Place Of Supply</strong> : {order.placeOfSupply || order.customer.state || company.state}</div>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div style={{ border: '1px solid #9ca3af', display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRight: '1px solid #9ca3af' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bill To</div>
            <div style={{ fontWeight: 'bold' }}>{order.customer.businessName}</div>
            {order.customer.contactPerson && <div>{order.customer.contactPerson}</div>}
            <div>{order.customer.billingAddress || order.customer.city || 'India'}</div>
            {order.customer.city && <div>{order.customer.city} {order.customer.pincode} {order.customer.state}</div>}
            <div>India</div>
            <div>{order.customer.mobile}</div>
            {order.customer.gstNumber && <div style={{ marginTop: '4px' }}>GSTIN: {order.customer.gstNumber}</div>}
          </div>

          <div style={{ padding: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ship To</div>
            <div>{order.customer.shippingAddress || order.customer.billingAddress || order.customer.businessName}</div>
            {order.customer.city && <div>{order.customer.city}</div>}
            <div>{order.customer.pincode} {order.customer.state}</div>
            <div>India</div>
          </div>
        </div>

        {/* Item Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9ca3af', marginBottom: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #9ca3af', backgroundColor: '#f9fafb', fontSize: '11px' }}>
              <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'left', width: '30px' }}>#</th>
              <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'left' }}>Item & Description</th>
              <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'center', width: '70px' }}>HSN/SAC</th>
              <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px' }}>Qty</th>
              <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '70px' }}>Rate</th>
              {hasDiscount && (
                <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '70px' }}>Discount</th>
              )}
              {isInterstate ? (
                <>
                  <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '50px' }}>IGST %</th>
                  <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px' }}>Amt</th>
                </>
              ) : (
                <>
                  <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '50px' }}>CGST %</th>
                  <th style={{ padding: '6px', borderRight: '1px solid #9ca3af', textAlign: 'right', width: '60px' }}>Amt</th>
                </>
              )}
              <th style={{ padding: '6px', textAlign: 'right', width: '90px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', verticalAlign: 'top' }}>{index + 1}</td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.product.articleNumber || item.product.name}</div>
                  <div style={{ color: '#4b5563', fontSize: '11px', marginTop: '2px' }}>{item.product.name}</div>
                </td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'center', verticalAlign: 'top' }}>
                  {item.hsnCode || item.product.hsnCode || '6103'}
                </td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                  <div>{item.quantity.toFixed(2)}</div>
                  <div style={{ color: '#6b7280', fontSize: '10px' }}>pcs</div>
                </td>
                <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                  {fmt(item.rate)}
                </td>
                {hasDiscount && (
                  <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                    —
                  </td>
                )}
                {isInterstate ? (
                  <>
                    <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                      {item.gstRate || 0}%
                    </td>
                    <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                      {fmt(item.igst || 0)}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                      {(item.gstRate || 0) / 2}%
                    </td>
                    <td style={{ padding: '8px 6px', borderRight: '1px solid #9ca3af', textAlign: 'right', verticalAlign: 'top' }}>
                      {fmt(item.cgst || 0)}
                    </td>
                  </>
                )}
                <td style={{ padding: '8px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                  {fmt(item.total || (item.rate * item.quantity))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bottom Section: Notes & Bank on Left | Totals & Signature on Right */}
        <div style={{ border: '1px solid #9ca3af', display: 'grid', gridTemplateColumns: '1fr 300px' }}>

          {/* Left Column */}
          <div style={{ padding: '12px', borderRight: '1px solid #9ca3af', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Total In Words</div>
              <div style={{ fontStyle: 'italic', fontWeight: 'bold', marginBottom: '16px' }}>
                {numberToWordsINR(balanceDue > 0 ? balanceDue : grandTotal)}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Terms & Conditions</div>
                <div style={{ fontSize: '11px', color: '#374151' }}>
                  1. Goods once sold cannot be taken back or exchanged.{'\n'}
                  2. All disputes subject to local jurisdiction only.{'\n'}
                  3. E. & O.E.
                </div>
              </div>
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
                <span style={{ fontWeight: 'bold' }}>{fmt(taxableAmount)}</span>
              </div>

              {isInterstate ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>IGST {taxableAmount > 0 && totalIgst > 0 ? `(${Math.round((totalIgst / taxableAmount) * 100)}%)` : ''}</span>
                  <span>{fmt(totalIgst)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>CGST {taxableAmount > 0 && totalCgst > 0 ? `(${Math.round((totalCgst / taxableAmount) * 100 * 10) / 10}%)` : ''}</span>
                    <span>{fmt(totalCgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>SGST {taxableAmount > 0 && totalSgst > 0 ? `(${Math.round((totalSgst / taxableAmount) * 100 * 10) / 10}%)` : ''}</span>
                    <span>{fmt(totalSgst)}</span>
                  </div>
                </>
              )}

              {receivedAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#dc2626' }}>
                  <span>Received</span>
                  <span>(-) {fmt(receivedAmount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', marginTop: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                <span>Total</span>
                <span>₹{fmt(balanceDue > 0 ? balanceDue : grandTotal)}</span>
              </div>
            </div>

            {/* Authorized Signature Box */}
            <div style={{ padding: '16px 12px 12px 12px', textAlign: 'center', borderTop: '1px solid #9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: '110px' }}>
              {(company as any).signatoryUrl ? (
                <img
                  src={(company as any).signatoryUrl}
                  alt="Signature"
                  style={{ height: '46px', maxWidth: '160px', objectFit: 'contain', marginBottom: '6px' }}
                />
              ) : (
                <div style={{ height: '36px' }}></div>
              )}
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '11px', fontWeight: 'bold', width: '100%' }}>
                {(company as any).signatoryName
                  ? `${(company as any).signatoryName} (${(company as any).signatoryDesignation || 'Authorized Signatory'})`
                  : 'Authorized Signature'}
              </div>
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          #printable-invoice { border: none !important; padding: 0 !important; max-width: 100% !important; }
        }
      `}} />
    </div>
  );
}
