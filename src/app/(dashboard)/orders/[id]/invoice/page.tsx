import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import { generateHsnSummary, numberToWordsINR } from '@/lib/gstUtils';
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

  if (!order) {
    notFound();
  }

  const company = companyRes.settings || {
    companyName: "B2B Clothing Co.",
    gstin: "07AAAAA0000A1Z5",
    pan: "AAAAA0000A",
    address: "123 Industrial Park, Sector 4",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    email: "clothingespon@gmail.com",
    mobile: "7206066678",
    website: "www.espon.in",
    logoUrl: "",
    bankAccountName: "ESPON CLOTHING PRIVATE LIMITED.",
    accountNumber: "016805006415",
    ifscCode: "ICIC0000168",
    branch: "Rohtak",
    upiId: "7206066678@OKBIZAXIS"
  };

  const isInterstate = order.isInterstate || 
    (company.state?.trim().toLowerCase() !== (order.customer.state || company.state)?.trim().toLowerCase());

  const subtotal = order.subtotal || order.items.reduce((acc, item) => acc + (item.rate * item.quantity), 0);
  
  // Calculate HSN Summary
  const hsnSummary = generateHsnSummary(
    order.items.map(item => ({
      hsnCode: item.hsnCode || item.product.articleNumber || "6109",
      rate: item.rate,
      quantity: item.quantity,
      gstRate: item.gstRate || 12
    })),
    isInterstate
  );

  const totalCgst = order.cgst || hsnSummary.reduce((acc, row) => acc + row.cgstAmount, 0);
  const totalSgst = order.sgst || hsnSummary.reduce((acc, row) => acc + row.sgstAmount, 0);
  const totalIgst = order.igst || hsnSummary.reduce((acc, row) => acc + row.igstAmount, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(subtotal - order.discount + totalTax);

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px 20px' }} className="invoice-container-wrapper">
      
      {/* Top Floating Bar for Screen View */}
      <div style={{ maxWidth: '900px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <a href="/orders" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500, fontSize: '14px' }}>
          ← Back to Orders
        </a>
        <div style={{ display: 'flex', gap: '12px' }}>
          <DownloadPdfButton elementId="printable-invoice" filename={`INV-${order.orderNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Main Zoho Books Style Invoice Sheet */}
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
      }} id="printable-invoice">

        {/* Header Header & Company Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #4f46e5', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {company.logoUrl && (
              <img src={company.logoUrl} alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
            )}
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e1b4b', margin: 0, letterSpacing: '-0.5px' }}>
                TAX INVOICE
              </h1>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>
                (Original for Recipient)
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#4f46e5', margin: 0 }}>
              {company.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#4b5563' }}>{company.address}</p>
            <p style={{ margin: '0', color: '#4b5563' }}>{company.city}, {company.state} - {company.pincode}</p>
            <p style={{ margin: '4px 0 0', fontWeight: 600, color: '#111827' }}>
              GSTIN: <span style={{ color: '#4f46e5' }}>{company.gstin}</span> | PAN: {company.pan}
            </p>
          </div>
        </div>

        {/* Invoice Info & Bill To Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px', backgroundColor: '#f9fafb', padding: '20px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
          {/* Bill To */}
          <div>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', margin: '0 0 8px 0', fontWeight: 700 }}>
              Billed To:
            </h3>
            <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>
              {order.customer.businessName}
            </p>
            <p style={{ margin: '0 0 2px 0', color: '#374151' }}>Attn: {order.customer.contactPerson}</p>
            <p style={{ margin: '0 0 2px 0', color: '#374151' }}>Phone: {order.customer.mobile}</p>
            {order.customer.billingAddress && (
              <p style={{ margin: '4px 0 0 0', color: '#4b5563' }}>{order.customer.billingAddress}</p>
            )}
            <p style={{ margin: '8px 0 0 0', fontWeight: 700, color: '#111827' }}>
              GSTIN: {order.customer.gstNumber || 'Unregistered / B2C'}
            </p>
          </div>

          {/* Invoice Meta */}
          <div style={{ textAlign: 'right' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0', color: '#6b7280', textAlign: 'right' }}>Invoice No:</td>
                  <td style={{ padding: '3px 0 3px 12px', fontWeight: 700, textAlign: 'right' }}>{order.orderNumber}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', color: '#6b7280', textAlign: 'right' }}>Date:</td>
                  <td style={{ padding: '3px 0 3px 12px', fontWeight: 600, textAlign: 'right' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', color: '#6b7280', textAlign: 'right' }}>Place of Supply:</td>
                  <td style={{ padding: '3px 0 3px 12px', fontWeight: 600, textAlign: 'right' }}>{order.placeOfSupply || order.customer.state || company.state}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', color: '#6b7280', textAlign: 'right' }}>Sales Rep:</td>
                  <td style={{ padding: '3px 0 3px 12px', fontWeight: 500, textAlign: 'right' }}>{order.salesperson?.user?.name || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Itemized Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e1b4b', color: '#ffffff', textAlign: 'left', fontSize: '12px' }}>
              <th style={{ padding: '10px 12px', borderRadius: '4px 0 0 0' }}>#</th>
              <th style={{ padding: '10px 12px' }}>Item Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>HSN</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Taxable (₹)</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => {
              const taxable = item.rate * item.quantity;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{idx + 1}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{item.product.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>SKU: {item.product.articleNumber}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace' }}>
                    {item.hsnCode || item.product.articleNumber || '6109'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.rate.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{taxable.toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Calculations Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ width: '55%' }}>
            <p style={{ fontWeight: 700, margin: '0 0 4px 0', fontSize: '12px' }}>Amount in Words:</p>
            <p style={{ margin: '0 0 16px 0', color: '#4b5563', fontStyle: 'italic', fontWeight: 500 }}>
              {numberToWordsINR(grandTotal)}
            </p>

            {/* Bank Details */}
            <div style={{ backgroundColor: '#f9fafb', padding: '14px', borderRadius: '6px', border: '1px dashed #d1d5db', fontSize: '11px' }}>
              <p style={{ fontWeight: 700, margin: '0 0 6px 0', color: '#1e1b4b', textTransform: 'uppercase' }}>
                Bank & Payment Details:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>A/C Name: <strong>{company.bankAccountName}</strong></div>
                <div>Account No: <strong>{company.accountNumber}</strong></div>
                <div>IFSC Code: <strong>{company.ifscCode}</strong></div>
                <div>UPI ID: <strong>{company.upiId}</strong></div>
              </div>
            </div>
          </div>

          <div style={{ width: '40%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: '#4b5563' }}>Taxable Amount:</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN')}</td>
                </tr>
                {order.discount > 0 && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#16a34a' }}>Discount:</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>-₹{order.discount.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                {isInterstate ? (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#4b5563' }}>IGST:</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>₹{totalIgst.toLocaleString('en-IN')}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#4b5563' }}>CGST:</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>₹{totalCgst.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', color: '#4b5563' }}>SGST:</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>₹{totalSgst.toLocaleString('en-IN')}</td>
                    </tr>
                  </>
                )}
                <tr style={{ borderTop: '2px solid #1e1b4b', borderBottom: '2px solid #1e1b4b' }}>
                  <td style={{ padding: '10px 0', fontWeight: 800, fontSize: '16px', color: '#1e1b4b' }}>Total Invoice Amount:</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, fontSize: '16px', color: '#1e1b4b' }}>
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* HSN Summary Table */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 8px 0', fontWeight: 700 }}>
            HSN / SAC Tax Summary
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', textTransform: 'uppercase' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'left' }}>HSN/SAC</th>
                <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>Taxable Value</th>
                {isInterstate ? (
                  <>
                    <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>IGST %</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>IGST Amount</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>CGST %</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>CGST Amount</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>SGST %</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>SGST Amount</th>
                  </>
                )}
                <th style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummary.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', fontFamily: 'monospace' }}>{row.hsnCode}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{row.taxableValue.toLocaleString('en-IN')}</td>
                  {isInterstate ? (
                    <>
                      <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.gstRate}%</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{row.igstAmount.toLocaleString('en-IN')}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.gstRate / 2}%</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{row.cgstAmount.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.gstRate / 2}%</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{row.sgstAmount.toLocaleString('en-IN')}</td>
                    </>
                  )}
                  <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>₹{row.totalTax.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer & Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ width: '60%', fontSize: '11px', color: '#6b7280' }}>
            <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: '#374151' }}>Terms & Conditions:</p>
            <p style={{ margin: '0 0 2px 0' }}>1. Goods once sold will not be taken back or exchanged.</p>
            <p style={{ margin: '0 0 2px 0' }}>2. All disputes subject to local jurisdiction only.</p>
            <p style={{ margin: '0' }}>3. E. & O.E.</p>
          </div>
          <div style={{ textAlign: 'center', width: '30%' }}>
            <div style={{ height: '50px' }}></div>
            <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>For {company.companyName}</p>
            <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>(Authorized Signatory)</p>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          .invoice-container-wrapper { padding: 0 !important; background-color: white !important; }
          #printable-invoice { box-shadow: none !important; border-radius: 0 !important; padding: 20px !important; }
        }
      `}} />
    </div>
  );
}
