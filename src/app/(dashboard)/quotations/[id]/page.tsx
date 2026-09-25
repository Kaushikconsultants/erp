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
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) notFound();

  let orgId: string | null = null;
  try {
    orgId = await getTenantOrgId();
  } catch {
    orgId = (session.user as any)?.organizationId || null;
  }
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

  const userRole = String((session.user as any)?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';

  if (!isAdmin && quotation.organizationId && orgId && quotation.organizationId !== orgId) {
    notFound();
  }

  if (!quotation.organizationId && orgId) {
    await prisma.quotation.update({
      where: { id },
      data: { organizationId: orgId }
    }).catch(() => {});
  }

  // Ensure customer GST number is normalized to uppercase in DB and view
  if (quotation.customer?.gstNumber && quotation.customer.gstNumber !== quotation.customer.gstNumber.toUpperCase()) {
    const upperGst = quotation.customer.gstNumber.toUpperCase();
    await prisma.customer.update({
      where: { id: quotation.customer.id },
      data: { gstNumber: upperGst }
    }).catch(() => {});
    quotation.customer.gstNumber = upperGst;
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

  const totalUnits = quotation.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const effectiveTaxBase = quotation.taxableAmount > 0 
    ? quotation.taxableAmount 
    : (quotation.subtotal - (quotation.itemDiscount || 0) - (quotation.additionalDiscount || 0));
  const effectiveTaxRate = quotation.items[0]?.gstRate || (effectiveTaxBase > 0 && quotation.igst > 0 ? Math.round((quotation.igst / effectiveTaxBase) * 100) : 5);
  const hasItemDiscount = quotation.items.some(item => (item.discountPercent || 0) > 0 || (item.discountAmount || 0) > 0);

  const totalTax = isInterstate ? quotation.igst : (quotation.cgst + quotation.sgst);
  const calculatedSum = effectiveTaxBase + totalTax + (quotation.shippingCharges || 0);
  const rounding = Math.round((quotation.totalValue - calculatedSum) * 100) / 100;
  const balanceDue = Math.max(0, quotation.totalValue - (quotation.receivedAmount || 0));

  const validTillDate = (quotation as any).validUntil 
    ? new Date((quotation as any).validUntil).toLocaleDateString('en-GB')
    : new Date(new Date(quotation.date).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '16px 10px 140px 10px' }} className="quote-page-outer">
      
      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: '820px', margin: '0 auto 14px auto' }} className="no-print">
        <div className="quote-top-nav">
          <a href="/quotations" className="quote-back-btn">
            <ArrowLeft size={15} />
            <span>Back to Quotations</span>
          </a>
          <div className="quote-status-badge">
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginRight: '4px' }}>Status:</span>
            <span 
              className="quote-status-pill"
              style={{
                backgroundColor: quotation.status === 'Converted' ? '#ecfdf5' : quotation.status === 'Confirmed' ? '#eff6ff' : '#fffbeb',
                color: quotation.status === 'Converted' ? '#059669' : quotation.status === 'Confirmed' ? '#2563eb' : '#d97706',
                border: `1px solid ${quotation.status === 'Converted' ? '#a7f3d0' : quotation.status === 'Confirmed' ? '#bfdbfe' : '#fde68a'}`,
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.74rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {quotation.status === 'Converted' && <CheckCircle2 size={12} />}
              {quotation.status === 'Confirmed' && <CheckCircle2 size={12} />}
              {quotation.status}
            </span>
          </div>
        </div>

        {/* Responsive Action Buttons Grid on Mobile */}
        <div className="quote-action-bar">
          <a 
            href={`/quotations/${quotation.id}/edit`} 
            style={{ 
              padding: '7px 14px', 
              border: '1px solid #bfdbfe', 
              backgroundColor: '#eff6ff', 
              borderRadius: '8px', 
              color: '#1d4ed8', 
              textDecoration: 'none', 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '6px', 
              whiteSpace: 'nowrap'
            }}
          >
            <span>✏️</span> Edit
          </a>
          
          <SendQuotationWhatsAppBtn 
            quotationId={quotation.id} 
            customerPhone={quotation.customer?.mobile} 
            quotationNumber={quotation.quotationNumber} 
          />
          <DownloadPdfButton elementId="printable-quote" filename={`${quotation.quotationNumber}.pdf`} />
          <PrintInvoiceButton />

          {quotation.status === 'Confirmed' && (
            <div className="quote-action-confirmed-group">
              <EditTokenActionBtn
                quotationId={quotation.id}
                quotationNumber={quotation.quotationNumber}
                customerName={quotation.customer?.businessName || quotation.customer?.contactPerson}
                totalValue={Number(quotation.totalValue || 0)}
                receivedAmount={Number(quotation.receivedAmount || 0)}
                discountSlab={quotation.discountSlab || '1-15'}
              />
              <ConvertToInvoiceBtn quotationId={quotation.id} />
            </div>
          )}
          {quotation.status !== 'Converted' && quotation.status !== 'Confirmed' && (
            <div className="quote-action-convert-wrapper">
              <ConvertQuotationBtn quotationId={quotation.id} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="mobile-scroll-hint no-print" style={{ maxWidth: '820px', margin: '0 auto 10px auto' }}>
        <div style={{
          background: 'linear-gradient(90deg, #eff6ff 0%, #ecfdf5 100%)',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '11px',
          fontWeight: 700,
          padding: '7px 12px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>↔️</span>
            <span>Swipe items table horizontally to inspect GST &amp; rate breakdown</span>
          </span>
          <span style={{ fontSize: '13px', fontWeight: 800 }}>⇄</span>
        </div>
      </div>

      {/* Touch-Scrollable Document Wrapper */}
      <div style={{ maxWidth: '820px', margin: '0 auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' }} className="quote-doc-scroll-wrap">
        <div style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          padding: '24px 28px',
          border: '1px solid #cbd5e1',
          boxSizing: 'border-box',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: '#111827',
          fontSize: '10.5px',
          lineHeight: '1.4'
        }} id="printable-quote">

        {/* 1. Header Row (Company Info on Left, Document Title on Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', width: '100%', boxSizing: 'border-box' }} className="header-row">
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
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '0.5px', color: '#111827', lineHeight: '1.1' }}>QUOTATION</h1>
          </div>
        </div>

        {/* 2. Meta Details Box (Zoho 2-Column Key-Value Box) */}
        <div style={{ border: '1px solid #cbd5e1', display: 'flex', marginBottom: '12px', fontSize: '10.5px', width: '100%', boxSizing: 'border-box' }} className="meta-box">
          <div style={{ flex: '1 1 50%', borderRight: '1px solid #cbd5e1', padding: '7px 12px' }} className="meta-left">
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0', width: '90px' }}>Quotation No.</td>
                  <td style={{ color: '#111827', padding: '1.5px 0', width: '12px' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{quotation.quotationNumber}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0' }}>Quotation Date</td>
                  <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{new Date(quotation.date).toLocaleDateString('en-GB')}</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0' }}>Terms</td>
                  <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>Due on Receipt</td>
                </tr>
                <tr>
                  <td style={{ color: '#374151', padding: '1.5px 0' }}>Valid Till</td>
                  <td style={{ color: '#111827', padding: '1.5px 0' }}>:</td>
                  <td style={{ color: '#111827', fontWeight: 700, padding: '1.5px 0' }}>{validTillDate}</td>
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
                    {formatPlaceOfSupply(quotation.placeOfSupply, quotation.customer.state, quotation.customer.gstNumber)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Address Box (Bill To / Ship To 2-Column Box) */}
        <div style={{ border: '1px solid #cbd5e1', display: 'flex', marginBottom: '14px', fontSize: '10px', width: '100%', boxSizing: 'border-box' }} className="address-box">
          <div style={{ flex: '1 1 50%', borderRight: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '5px 12px', borderBottom: '1px solid #cbd5e1', fontWeight: 700, color: '#111827', fontSize: '10px' }}>
              Bill To
            </div>
            <div style={{ padding: '8px 12px', lineHeight: '1.4', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '11px', color: '#111827', marginBottom: '2px' }}>{quotation.customer.businessName}</div>
              {quotation.customer.contactPerson && (
                <div style={{ color: '#374151' }}>Attn: {quotation.customer.contactPerson}</div>
              )}
              {quotation.customer.billingAddress && (
                <div style={{ color: '#374151' }}>{quotation.customer.billingAddress}</div>
              )}
              {quotation.customer.city && (
                <div style={{ color: '#374151' }}>{quotation.customer.city} {quotation.customer.pincode ? `- ${quotation.customer.pincode}` : ''} {quotation.customer.state}</div>
              )}
              <div style={{ color: '#374151' }}>India</div>
              {quotation.customer.mobile && (
                <div style={{ color: '#374151', marginTop: '2px' }}>{quotation.customer.mobile.startsWith('+') ? quotation.customer.mobile : `+91-${quotation.customer.mobile}`}</div>
              )}
              {quotation.customer.gstNumber && (
                <div style={{ color: '#111827', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>GSTIN {quotation.customer.gstNumber.toUpperCase()}</div>
              )}
            </div>
          </div>

          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '5px 12px', borderBottom: '1px solid #cbd5e1', fontWeight: 700, color: '#111827', fontSize: '10px' }}>
              Ship To
            </div>
            <div style={{ padding: '8px 12px', lineHeight: '1.4', flex: 1 }}>
              <div style={{ color: '#374151' }}>{quotation.shippingAddress || quotation.customer.shippingAddress || quotation.customer.billingAddress || quotation.customer.businessName}</div>
              {quotation.customer.city && <div style={{ color: '#374151' }}>{quotation.customer.city} {quotation.customer.pincode ? `- ${quotation.customer.pincode}` : ''} {quotation.customer.state}</div>}
              <div style={{ color: '#374151' }}>India</div>
            </div>
          </div>
        </div>

        {/* 4. Items Table (Wrapped in responsive scroll container) */}
        <div className="quote-table-scroll-container" style={{ width: '100%', boxSizing: 'border-box' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #cbd5e1',
            borderTop: '2.5px solid #334155',
            fontSize: '10px',
            boxSizing: 'border-box'
          }} className="items-table">
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#111827', fontWeight: 700, fontSize: '10px' }}>
              <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'center', width: '28px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>#</th>
              <th style={{ padding: '10px 8px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'left', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Item &amp; Description</th>
              <th style={{ padding: '10px 4px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'center', width: '58px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>HSN/SAC</th>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '54px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Qty</th>
              <th style={{ padding: '10px 6px', border: '1px solid #cbd5e1', borderTop: '2.5px solid #334155', textAlign: 'right', width: '62px', verticalAlign: 'middle', lineHeight: '1.35', boxSizing: 'border-box' }}>Rate</th>
              {hasItemDiscount && (
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
            {quotation.items.map((item, index) => {
              const gst = (item.gstRate || 0) / 100;
              const gross = item.rate * item.quantity;
              const itemTaxable = item.taxableAmount ?? (item.total ? item.total / (1 + gst) : gross);
              const discountPercent = item.discountPercent > 0 
                ? item.discountPercent 
                : (gross > 0 && itemTaxable < gross ? ((gross - itemTaxable) / gross) * 100 : 0);

              const igstVal = item.igst ?? (isInterstate ? (itemTaxable * gst) : 0);
              const halfGstVal = item.cgst ?? (!isInterstate ? (itemTaxable * (gst / 2)) : 0);

              return (
                <tr key={item.id}>
                  <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top', color: '#4b5563', boxSizing: 'border-box' }}>{index + 1}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', verticalAlign: 'top', boxSizing: 'border-box' }}>
                    <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#111827' }}>{item.product.articleNumber || item.product.name}</div>
                    <div style={{ color: '#4b5563', whiteSpace: 'pre-line', fontSize: '9.5px', marginTop: '1px', lineHeight: '1.3' }}>
                      {item.description || item.product.name}
                    </div>
                  </td>
                  <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'top', color: '#4b5563', boxSizing: 'border-box' }}>
                    {item.hsnCode || '6107'}
                  </td>
                  <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
                    <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.quantity.toFixed(2)}</div>
                    <div style={{ color: '#6b7280', fontSize: '9px' }}>{item.unit || 'pcs'}</div>
                  </td>
                  <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                    {fmt(item.rate)}
                  </td>
                  {hasItemDiscount && (
                    <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                      {discountPercent > 0 ? `${discountPercent.toFixed(2)}%` : '0.00%'}
                    </td>
                  )}
                  {isInterstate ? (
                    <>
                      <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                        {item.gstRate}%
                      </td>
                      <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                        {fmt(igstVal)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                        {(item.gstRate / 2)}%
                      </td>
                      <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                        {fmt(halfGstVal)}
                      </td>
                      <td style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                        {(item.gstRate / 2)}%
                      </td>
                      <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}>
                        {fmt(item.sgst ?? halfGstVal)}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: '#111827', boxSizing: 'border-box' }}>
                    {fmt(itemTaxable)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* 5. Lower Box (Connected directly under table) */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderTop: 'none',
          display: 'flex',
          backgroundColor: '#ffffff',
          width: '100%',
          boxSizing: 'border-box'
        }} className="lower-box">
          
          {/* Left Column (58%) */}
          <div className="lower-left" style={{ flex: '1 1 58%', borderRight: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '10px', color: '#111827', fontWeight: 600 }}>
                Items in Total {totalUnits.toFixed(2)}
              </div>

              <div style={{ padding: '7px 12px' }}>
                <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 500 }}>Total In Words</div>
                <div style={{ fontStyle: 'italic', fontWeight: 700, color: '#111827', fontSize: '10.5px', marginTop: '2px', lineHeight: '1.35' }}>
                  {numberToWordsINR(quotation.totalValue)}
                </div>
              </div>

              <div style={{ padding: '6px 12px' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>Terms &amp; Conditions</div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '9px', color: '#4b5563', lineHeight: '1.4' }}>
                  {quotation.termsConditions || `1. Goods once sold cannot be taken back or exchanged.\n2. 50% advance payment required for custom orders.\n3. Quotation valid for 15 days from date of issue.\n4. Subject to Haryana Jurisdiction.`}
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
          <div className="lower-right" style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ padding: '6px 12px', fontSize: '10.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                <span style={{ color: '#374151' }}>Sub Total</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(quotation.subtotal || quotation.taxableAmount)}</span>
              </div>

              {quotation.itemDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0', color: '#dc2626' }}>
                  <span>Item Discount</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>(-) {fmt(quotation.itemDiscount)}</span>
                </div>
              )}

              {quotation.additionalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0', color: '#dc2626' }}>
                  <span>Additional Discount</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>(-) {fmt(quotation.additionalDiscount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                <span style={{ color: '#374151' }}>Total Taxable Amount</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(effectiveTaxBase)}</span>
              </div>

              {isInterstate ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                  <span style={{ color: '#374151' }}>IGST{effectiveTaxRate} ({effectiveTaxRate}%)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(quotation.igst)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                    <span style={{ color: '#374151' }}>CGST{(effectiveTaxRate / 2).toFixed(1).replace('.0', '')} ({(effectiveTaxRate / 2)}%)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(quotation.cgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                    <span style={{ color: '#374151' }}>SGST{(effectiveTaxRate / 2).toFixed(1).replace('.0', '')} ({(effectiveTaxRate / 2)}%)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(quotation.sgst)}</span>
                  </div>
                </>
              )}

              {quotation.shippingCharges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' }}>
                  <span style={{ color: '#374151' }}>Shipping Charge</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#111827' }}>{fmt(quotation.shippingCharges)}</span>
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
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{fmt(quotation.totalValue)}</span>
              </div>

              {quotation.receivedAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#dc2626', fontSize: '10.5px' }}>
                  <span>Payment Made</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>(-) ₹{fmt(quotation.receivedAmount)}</span>
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
              {company.signatoryUrl ? (
                <img
                  src={company.signatoryUrl}
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

        .quote-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .quote-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.82rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.15s ease;
        }

        .quote-back-btn:hover {
          background-color: #eff6ff;
          border-color: #bfdbfe;
        }

        .quote-action-bar {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .quote-table-scroll-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: none;
          padding: 1px 0 0 0;
          margin: 0;
        }

        .quote-table-scroll-container::-webkit-scrollbar {
          height: 6px;
        }
        .quote-table-scroll-container::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }

        .quote-doc-scroll-wrap {
          border-radius: 12px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(226, 232, 240, 0.8);
          background-color: #ffffff;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .quote-page-outer {
            padding: 12px 8px 140px 8px !important;
          }

          .mobile-scroll-hint {
            display: block !important;
          }

          .quote-action-bar {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .quote-action-bar > *,
          .quote-action-bar button,
          .quote-action-bar a {
            width: 100% !important;
            height: 38px !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            justify-content: center !important;
            align-items: center !important;
            display: inline-flex !important;
            text-align: center !important;
            font-size: 0.78rem !important;
            font-weight: 700 !important;
            border-radius: 8px !important;
            padding: 0 6px !important;
            white-space: nowrap !important;
          }

          .quote-action-confirmed-group,
          .quote-action-convert-wrapper {
            grid-column: span 2 !important;
            display: flex !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .quote-doc-scroll-wrap {
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            background-color: #ffffff !important;
            margin-bottom: 24px !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06) !important;
          }

          #printable-quote {
            padding: 14px 10px !important;
            border: none !important;
          }

          #printable-quote .header-row {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: stretch !important;
          }

          #printable-quote .doc-title-col {
            text-align: left !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 6px !important;
            margin-bottom: 4px !important;
          }

          #printable-quote .doc-title-col h1 {
            font-size: 20px !important;
            letter-spacing: 0.8px !important;
          }

          #printable-quote .company-col {
            gap: 10px !important;
          }

          #printable-quote .meta-box {
            flex-direction: column !important;
            border-radius: 6px !important;
            overflow: hidden !important;
            margin-bottom: 10px !important;
          }

          #printable-quote .meta-left {
            border-right: none !important;
            border-bottom: 1px solid #d1d5db !important;
            padding: 6px 10px !important;
          }

          #printable-quote .meta-right {
            padding: 6px 10px !important;
          }

          #printable-quote .address-box {
            flex-direction: column !important;
            border-radius: 6px !important;
            overflow: hidden !important;
            margin-bottom: 10px !important;
          }

          #printable-quote .address-box > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid #d1d5db !important;
          }

          #printable-quote .items-table {
            min-width: 620px !important;
          }

          #printable-quote .lower-box {
            flex-direction: column-reverse !important;
            border-radius: 0 0 6px 6px !important;
          }

          #printable-quote .lower-left {
            border-right: none !important;
            border-top: 1px solid #d1d5db !important;
          }

          #printable-quote .lower-right {
            flex: 1 1 100% !important;
          }

          .stylish-heart-container, .floating-voice-button-container {
            bottom: 92px !important;
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
          .quote-page-outer {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            min-height: auto !important;
          }
          .quote-doc-scroll-wrap {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #printable-quote {
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
          .quote-table-scroll-container {
            border: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .items-table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
            border: 1px solid #cbd5e1 !important;
          }
          .items-table th, .items-table td {
            border: 1px solid #cbd5e1 !important;
          }
          .items-table th {
            border-top: 2px solid #94a3b8 !important;
            padding: 8px 6px !important;
            vertical-align: middle !important;
            line-height: 1.3 !important;
          }
          .lower-box, .meta-box, .address-box, tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .lower-box {
            flex-direction: row !important;
            border: 1px solid #cbd5e1 !important;
            border-top: none !important;
          }
          .lower-left {
            border-right: 1px solid #cbd5e1 !important;
            border-top: none !important;
          }
          .header-row {
            flex-direction: row !important;
          }
          .meta-box, .address-box {
            flex-direction: row !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      `}} />
    </div>
  );
}
