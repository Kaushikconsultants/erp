import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import { numberToWordsINR } from '@/lib/gstUtils';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';
import DynamicUpiQr from '@/components/common/DynamicUpiQr';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const orgId = await getTenantOrgId();
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
  if (order.organizationId && order.organizationId !== orgId) notFound();

  if (!order.organizationId && orgId) {
    await prisma.order.update({
      where: { id },
      data: { organizationId: orgId }
    }).catch(() => {});
  }

  const rawRole = (session.user as any).role || 'SALES';
  const userRole = String(rawRole).trim().toUpperCase();
  const userId = (session.user as any).id;
  const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ACCOUNTS' || userRole === 'MANAGER';

  if (!isSuperOrAdmin) {
    let employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee && orgId) {
      employee = await prisma.employee.findFirst({ where: { organizationId: orgId, userId } });
    }
    if (!employee && session.user.email) {
      employee = await prisma.employee.findFirst({
        where: {
          organizationId: orgId,
          user: { email: { equals: session.user.email.trim(), mode: 'insensitive' } }
        }
      });
    }
    if (!employee || (order.salespersonId !== employee.id && order.customer?.assignedSalespersonId !== employee.id)) {
      redirect('/orders');
    }
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

  const isInterstate = order.isInterstate;
  const fmt = (val?: number | null) => (val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const formatPlaceOfSupply = (place?: string | null, state?: string | null, gstin?: string | null): string => {
    if (place && place.includes('(') && place.includes(')')) return place;
    const targetState = place || state || 'Haryana';
    const code = getStateCode(targetState, gstin);
    const cleanState = targetState.replace(/\(\d+\)/g, '').trim();
    return `${cleanState} (${code})`;
  };

  // Totals
  const totalIgst = order.igst || 0;
  const totalCgst = order.cgst || 0;
  const totalSgst = order.sgst || 0;
  const grandTotal = order.totalValue || 0;
  const receivedAmount = order.paymentReceived || 0;
  const balanceDue = Math.max(0, grandTotal - receivedAmount);

  // Sub Total & Taxable Amount calculations
  const taxableAmount = order.items.reduce((sum, item) => {
    const gst = (item.gstRate || 0) / 100;
    return sum + (item.total || (item.rate * item.quantity)) / (1 + gst);
  }, 0);

  const subTotal = order.items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  const itemDiscountTotal = Math.max(0, subTotal - taxableAmount);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const shippingCharges = Math.max(0, Math.round((grandTotal - taxableAmount - totalTax) * 100) / 100);
  const calculatedSum = taxableAmount + totalTax + shippingCharges;
  const rounding = Math.round((grandTotal - calculatedSum) * 100) / 100;
  const effectiveTaxRate = order.items[0]?.gstRate || (taxableAmount > 0 && totalIgst > 0 ? Math.round((totalIgst / taxableAmount) * 100) : 5);

  const totalUnits = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const getItemDiscountPct = (item: typeof order.items[0]): number => {
    const gross = item.rate * item.quantity;
    if (gross <= 0) return 0;
    const gst = (item.gstRate || 0) / 100;
    const discountedBase = (item.total || gross) / (1 + gst);
    const pct = Math.round((1 - discountedBase / gross) * 10000) / 100;
    return pct > 0 ? pct : 0;
  };

  const hasDiscount = order.items.some(item => getItemDiscountPct(item) > 0);

  const invoiceDateStr = new Date((order as any).date || order.createdAt || new Date()).toLocaleDateString('en-GB');
  const dueDateStr = new Date((order as any).dueDate || order.createdAt || (order as any).date || new Date()).toLocaleDateString('en-GB');

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px 12px 100px 12px' }} className="invoice-page-outer">

      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: '820px', margin: '0 auto 14px auto' }} className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <a href={`/orders/${order.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Order
          </a>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }} className="invoice-action-bar">
          <DownloadPdfButton elementId="printable-invoice" filename={`INV-${order.orderNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="mobile-scroll-hint no-print" style={{ maxWidth: '820px', margin: '0 auto 8px auto' }}>
        <div style={{ backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>👉 Swipe invoice sideways to view all GST & rate columns</span>
          <span>↔</span>
        </div>
      </div>

      {/* Touch-Scrollable Document Wrapper */}
      <div style={{ maxWidth: '820px', margin: '0 auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' }} className="invoice-doc-scroll-wrap">
        <div style={{
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
        }} id="printable-invoice">

        {/* 1. Header Row (Company Info on Left, Document Title on Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }} className="header-row">
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }} className="company-col">
            {/* Espon Shield Logo */}
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

            <div className="company-details">
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

          <div style={{ textAlign: 'right' }} className="doc-title-col">
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '0.5px', color: '#111827', lineHeight: '1.1' }}>TAX INVOICE</h1>
          </div>
        </div>

        {/* 2. Meta Details Box (Zoho 2-Column Key-Value Box) */}
        <div style={{ border: '1px solid #d1d5db', display: 'flex', marginBottom: '12px', fontSize: '10.5px' }} className="meta-box">
          <div style={{ flex: '1 1 50%', borderRight: '1px solid #d1d5db', padding: '7px 12px' }} className="meta-left">
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0', width: '90px' }}>Invoice No.</td>
                  <td style={{ color: '#111827', padding: '1.5px 0', width: '12px' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{order.orderNumber}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0' }}>Invoice Date</td>
                  <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{invoiceDateStr}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0' }}>Terms</td>
                  <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>Due on Receipt</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0' }}>Due Date</td>
                  <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{dueDateStr}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ flex: '1 1 50%', padding: '7px 12px' }} className="meta-right">
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '105px', color: '#374151', padding: '1.5px 0' }}>Place Of Supply</td>
                  <td style={{ color: '#111827', padding: '1.5px 0', width: '12px' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>
                    {formatPlaceOfSupply(order.placeOfSupply, order.customer.state, order.customer.gstNumber)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Address Box (Bill To / Ship To 2-Column Box) */}
        <div style={{ border: '1px solid #d1d5db', display: 'flex', marginBottom: '14px', fontSize: '10px' }} className="address-box">
          <div style={{ flex: '1 1 50%', borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '4px 12px', borderBottom: '1px solid #d1d5db', fontWeight: 700, color: '#111827', fontSize: '10px' }}>
              Bill To
            </div>
            <div style={{ padding: '8px 12px', lineHeight: '1.4', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '11px', color: '#111827', marginBottom: '2px' }}>{order.customer.businessName}</div>
              {order.customer.contactPerson && (
                <div style={{ color: '#374151' }}>Attn: {order.customer.contactPerson}</div>
              )}
              {order.customer.billingAddress && (
                <div style={{ color: '#374151' }}>{order.customer.billingAddress}</div>
              )}
              {order.customer.city && (
                <div style={{ color: '#374151' }}>{order.customer.city} {order.customer.pincode ? `- ${order.customer.pincode}` : ''} {order.customer.state}</div>
              )}
              <div style={{ color: '#374151' }}>India</div>
              {order.customer.mobile && (
                <div style={{ color: '#374151', marginTop: '2px' }}>{order.customer.mobile.startsWith('+') ? order.customer.mobile : `+91-${order.customer.mobile}`}</div>
              )}
              {order.customer.gstNumber && (
                <div style={{ color: '#111827', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>GSTIN {order.customer.gstNumber.toUpperCase()}</div>
              )}
            </div>
          </div>

          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '4px 12px', borderBottom: '1px solid #d1d5db', fontWeight: 700, color: '#111827', fontSize: '10px' }}>
              Ship To
            </div>
            <div style={{ padding: '8px 12px', lineHeight: '1.4', flex: 1 }}>
              <div style={{ color: '#374151' }}>{(order as any).shippingAddress || order.customer.shippingAddress || order.customer.billingAddress || order.customer.businessName}</div>
              {order.customer.city && <div style={{ color: '#374151' }}>{order.customer.city} {order.customer.pincode ? `- ${order.customer.pincode}` : ''} {order.customer.state}</div>}
              <div style={{ color: '#374151' }}>India</div>
            </div>
          </div>
        </div>

        {/* 4. Items Table (Zoho 2-Tier Nested Table) */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #d1d5db',
          borderTop: '2.5px solid #334155',
          fontSize: '10px'
        }} className="items-table">
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#111827', fontWeight: 700, fontSize: '10px' }}>
              <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'center', width: '28px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>#</th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'left', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Item &amp; Description</th>
              <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'center', width: '58px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>HSN/SAC</th>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '54px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Qty</th>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '62px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Rate</th>
              {hasDiscount && (
                <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '58px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Discount</th>
              )}
              {isInterstate ? (
                <>
                  <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '44px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>IGST %</th>
                  <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '62px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>IGST Amt</th>
                </>
              ) : (
                <>
                  <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '40px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>CGST %</th>
                  <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '54px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>CGST Amt</th>
                  <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '40px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>SGST %</th>
                  <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '54px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>SGST Amt</th>
                </>
              )}
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '80px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const gst = (item.gstRate || 0) / 100;
              const gross = item.rate * item.quantity;
              const itemTaxable = (item.total || gross) / (1 + gst);
              const discountPct = getItemDiscountPct(item);

              const igstVal = item.igst || (isInterstate ? (itemTaxable * gst) : 0);
              const halfGstVal = item.cgst || (!isInterstate ? (itemTaxable * (gst / 2)) : 0);

              return (
                <tr key={item.id}>
                  <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'center', verticalAlign: 'top', color: '#4b5563' }}>{index + 1}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#111827' }}>{item.product.articleNumber || item.product.name}</div>
                    <div style={{ color: '#4b5563', whiteSpace: 'pre-line', fontSize: '9.5px', marginTop: '1px', lineHeight: '1.3' }}>
                      {item.product.name}
                    </div>
                  </td>
                  <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'center', verticalAlign: 'top', color: '#4b5563' }}>
                    {item.hsnCode || item.product.hsnCode || '6107'}
                  </td>
                  <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.quantity.toFixed(2)}</div>
                    <div style={{ color: '#6b7280', fontSize: '9px' }}>pcs</div>
                  </td>
                  <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(item.rate)}
                  </td>
                  {hasDiscount && (
                    <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {discountPct > 0 ? `${discountPct.toFixed(2)}%` : '0.00%'}
                    </td>
                  )}
                  {isInterstate ? (
                    <>
                      <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {item.gstRate || 0}%
                      </td>
                      <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(igstVal)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {((item.gstRate || 0) / 2)}%
                      </td>
                      <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(halfGstVal)}
                      </td>
                      <td style={{ padding: '5px 4px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {((item.gstRate || 0) / 2)}%
                      </td>
                      <td style={{ padding: '5px 6px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(item.sgst || halfGstVal)}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '5px 8px', border: '1px solid #d1d5db', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: '#111827' }}>
                    {fmt(itemTaxable)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 5. Lower Box (Connected directly under table) */}
        <div style={{
          border: '1px solid #d1d5db',
          borderTop: 'none',
          display: 'flex',
          backgroundColor: '#ffffff'
        }} className="lower-box">
          
          {/* Left Column (58%) */}
          <div style={{ flex: '1 1 58%', borderRight: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '10px', color: '#111827', fontWeight: 600 }}>
                Items in Total {totalUnits.toFixed(2)}
              </div>

              <div style={{ padding: '7px 12px' }}>
                <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 500 }}>Total In Words</div>
                <div style={{ fontStyle: 'italic', fontWeight: 700, color: '#111827', fontSize: '10.5px', marginTop: '2px', lineHeight: '1.35' }}>
                  {numberToWordsINR(grandTotal)}
                </div>
              </div>

              <div style={{ padding: '6px 12px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>Terms &amp; Conditions</div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '9px', color: '#4b5563', lineHeight: '1.4' }}>
                  {(order as any).termsConditions || `1. Goods once sold cannot be taken back or exchanged.\n2. Full payment is due upon receipt of this invoice.\n3. Subject to Haryana Jurisdiction.`}
                </div>
              </div>
            </div>

            <div style={{ padding: '8px 12px 10px 12px', fontSize: '9.5px', color: '#1f2937', lineHeight: '1.45', borderTop: '1px dashed #e5e7eb' }}>
              <div style={{ fontWeight: 700, marginBottom: '2px', color: '#111827' }}>Bank Details -</div>
              <div>A/C Name - {company.bankAccountName || 'ESPON CLOTHING PRIVATE LIMITED.'}</div>
              <div>A/c No. - <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{company.accountNumber || '016805006415'}</span></div>
              <div>IFSC code - <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{company.ifscCode || 'ICIC0000168'}</span></div>
              <div>Branch - {company.branch || 'Rohtak.'}</div>
              {company.upiId && <div>UPI ID - {company.upiId}</div>}
            </div>
          </div>

          {/* Right Column (42%) */}
          <div style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ padding: '6px 12px', fontSize: '10.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                <span style={{ color: '#374151' }}>Sub Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(subTotal)}</span>
              </div>

              {itemDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0', color: '#dc2626' }}>
                  <span>Item Discount</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>(-) {fmt(itemDiscountTotal)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                <span style={{ color: '#374151' }}>Total Taxable Amount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(taxableAmount)}</span>
              </div>

              {isInterstate ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                  <span style={{ color: '#374151' }}>IGST{effectiveTaxRate} ({effectiveTaxRate}%)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(totalIgst)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                    <span style={{ color: '#374151' }}>CGST{(effectiveTaxRate / 2).toFixed(1).replace('.0', '')} ({(effectiveTaxRate / 2)}%)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(totalCgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                    <span style={{ color: '#374151' }}>SGST{(effectiveTaxRate / 2).toFixed(1).replace('.0', '')} ({(effectiveTaxRate / 2)}%)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(totalSgst)}</span>
                  </div>
                </>
              )}

              {shippingCharges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                  <span style={{ color: '#374151' }}>Shipping Charge</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(shippingCharges)}</span>
                </div>
              )}

              {rounding !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0', color: '#4b5563' }}>
                  <span>Rounding</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{rounding > 0 ? `+${fmt(rounding)}` : fmt(rounding)}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #d1d5db',
                borderBottom: '1px solid #d1d5db',
                padding: '5px 0',
                margin: '4px 0',
                fontWeight: 800,
                fontSize: '12px',
                color: '#111827'
              }}>
                <span>Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{fmt(grandTotal)}</span>
              </div>

              {receivedAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#dc2626', fontSize: '10.5px' }}>
                  <span>Payment Made</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>(-) ₹{fmt(receivedAmount)}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #d1d5db',
                borderBottom: '1px solid #d1d5db',
                padding: '5px 0',
                marginTop: '3px',
                fontWeight: 800,
                fontSize: '11.5px',
                color: '#111827'
              }}>
                <span>Balance Due</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{fmt(balanceDue)}</span>
              </div>
            </div>

            {/* Signature */}
            <div style={{
              padding: '10px 16px 12px 16px',
              textAlign: 'center',
              borderTop: '1px solid #d1d5db',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minHeight: '80px'
            }}>
              {(company as any).signatoryUrl ? (
                <img
                  src={(company as any).signatoryUrl}
                  alt="Signature"
                  style={{ maxHeight: '44px', maxWidth: '150px', objectFit: 'contain', marginBottom: '3px' }}
                />
              ) : (
                <div style={{ height: '44px' }} />
              )}
              <div style={{ fontSize: '9.5px', color: '#374151', fontWeight: 600, letterSpacing: '0.2px' }}>
                Authorized Signature
              </div>
            </div>
          </div>
        </div>

        {/* 6. Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '14px',
          fontSize: '9px',
          color: '#9ca3af',
          letterSpacing: '0.04em'
        }} className="zoho-footer">
          <div>POWERED BY HEART OF BUSINESS</div>
          <div>1</div>
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
          .invoice-doc-scroll-wrap {
            border: 1px solid #d1d5db;
            background-color: #ffffff;
            margin-bottom: 24px;
          }
          .invoice-action-bar::-webkit-scrollbar {
            height: 4px;
          }
          .invoice-action-bar::-webkit-scrollbar-thumb {
            background-color: #d1d5db;
            border-radius: 4px;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .mobile-scroll-hint, nav, header, aside, footer,
          .floating-voice-button-container, .floating-voice-capsule, .floating-voice-tooltip, .stylish-heart-container, [data-voice-widget], #ask-erp-modal, .voice-widget-root {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          .invoice-page-outer {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            min-height: auto !important;
          }
          .invoice-doc-scroll-wrap {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #printable-invoice {
            border: 1px solid #d1d5db !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 16px 20px !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            box-sizing: border-box !important;
            font-size: 10px !important;
            line-height: 1.35 !important;
            background: #ffffff !important;
            display: block !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            overflow: visible !important;
          }
          .items-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #d1d5db !important;
          }
          .items-table th, .items-table td {
            border: 1px solid #d1d5db !important;
            padding: 4px 6px !important;
          }
          .lower-box, .meta-box, .address-box, tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      `}} />
    </div>
  );
}
