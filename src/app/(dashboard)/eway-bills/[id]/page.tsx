import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCompanySettings } from '@/app/actions/companyActions';
import PrintInvoiceButton from '@/components/orders/PrintInvoiceButton';
import DownloadPdfButton from '@/components/orders/DownloadPdfButton';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canUserAccessSection } from '@/lib/authPermissions';

export const dynamic = 'force-dynamic';

export default async function EWayBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const hasAccess = await canUserAccessSection(session.user, 'eway_bills');
  if (!hasAccess) redirect('/');

  const { id } = await params;

  const [ewayBill, companyRes] = await Promise.all([
    prisma.eWayBill.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          include: {
            items: { include: { product: true } }
          }
        }
      }
    }),
    getCompanySettings()
  ]);

  if (!ewayBill) {
    notFound();
  }

  const company = companyRes.settings || {
    companyName: "ESPON CLOTHING PRIVATE LIMITED",
    gstin: "06AAHCE7721Q1Z4"
  };

  const isInterstate = ewayBill.igstAmount > 0;

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px 20px' }}>
      
      {/* Top Floating Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <Link href="/eway-bills" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          ← Back to E-Way Bills
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <DownloadPdfButton elementId="printable-eway-bill" filename={`EWB-${ewayBill.ewbNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Main Official GST E-Way Bill Sheet */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '36px 44px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#111827',
        fontSize: '12px',
        lineHeight: 1.5,
        border: '1px solid #cbd5e1'
      }} id="printable-eway-bill">

        {/* Top Header with National Emblem / GST Portal title */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Government of India • Goods and Services Tax
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 900, margin: '2px 0', color: '#0f172a', letterSpacing: '0.02em' }}>
            E-WAY BILL SYSTEM
          </h1>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0d9488' }}>
            e-Way Bill Slip (Standard Form GST EWB-01)
          </div>
        </div>

        {/* E-Way Bill Number Bar & QR / Barcode representation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          padding: '12px 18px',
          borderRadius: '6px',
          marginBottom: '18px'
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              E-Way Bill Number
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em' }}>
              {ewayBill.ewbNumber.replace(/(\d{4})/g, '$1 ').trim()}
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
              <strong>Generated Date:</strong> {new Date(ewayBill.ewbDate).toLocaleString('en-GB')}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Valid Until
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>
              {ewayBill.validUntil ? new Date(ewayBill.validUntil).toLocaleString('en-GB') : '-'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Approx Distance: <strong>{ewayBill.approxDistanceKm} KMs</strong>
            </div>
          </div>
        </div>

        {/* Section 1: PART-A Details */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '4px 4px 0 0'
          }}>
            PART - A (Consignment & Tax Details)
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', borderTop: 'none', fontSize: '11px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', width: '25%', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>1. GSTIN of Supplier:</td>
                <td style={{ padding: '8px 12px', width: '25%', fontWeight: 700, color: '#0f172a' }}>{ewayBill.fromGstin || '-'}</td>
                <td style={{ padding: '8px 12px', width: '25%', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>2. Place of Dispatch:</td>
                <td style={{ padding: '8px 12px', width: '25%' }}>{ewayBill.fromPlace}, {ewayBill.fromState} - {ewayBill.fromPincode}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>3. GSTIN of Recipient:</td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{ewayBill.toGstin || 'URP (Unregistered)'}</td>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>4. Place of Delivery:</td>
                <td style={{ padding: '8px 12px' }}>{ewayBill.toPlace || '-'}, {ewayBill.toState || '-'} - {ewayBill.toPincode || '-'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>5. Document No. & Date:</td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0d9488' }}>
                  {ewayBill.docNumber} ({new Date(ewayBill.docDate).toLocaleDateString('en-GB')})
                </td>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>6. Document Type:</td>
                <td style={{ padding: '8px 12px' }}>{ewayBill.docType}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>7. Transaction & Supply:</td>
                <td style={{ padding: '8px 12px' }}>{ewayBill.transactionType} / {ewayBill.supplyType} - {ewayBill.subSupplyType}</td>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>8. Main HSN Code:</td>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{ewayBill.mainHsnCode || '6109'}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>9. Consignee Trade Name:</td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{ewayBill.toTradeName}</td>
                <td style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 700, color: '#475569' }}>10. Consignor Trade Name:</td>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{ewayBill.fromTradeName}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Value Breakdown Strip */}
        <div style={{ marginBottom: '20px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '6px 8px' }}>Taxable Amount (₹)</th>
                <th style={{ padding: '6px 8px' }}>CGST Amount (₹)</th>
                <th style={{ padding: '6px 8px' }}>SGST Amount (₹)</th>
                <th style={{ padding: '6px 8px' }}>IGST Amount (₹)</th>
                <th style={{ padding: '6px 8px' }}>CESS Amount (₹)</th>
                <th style={{ padding: '6px 8px', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 800 }}>Total Invoice Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 8px', fontWeight: 700 }}>₹{ewayBill.totalTaxableAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px' }}>₹{ewayBill.cgstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px' }}>₹{ewayBill.sgstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px' }}>₹{ewayBill.igstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px' }}>₹{ewayBill.cessAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '10px 8px', fontWeight: 900, color: '#0d9488', fontSize: '13px' }}>
                  ₹{ewayBill.totalInvoiceValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: PART-B Details (Vehicle & Transportation) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            backgroundColor: '#0d9488',
            color: '#ffffff',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '4px 4px 0 0'
          }}>
            PART - B (Vehicle & Transportation Details)
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', borderTop: 'none', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px' }}>Mode</th>
                <th style={{ padding: '6px 10px' }}>Vehicle / Trans Doc No</th>
                <th style={{ padding: '6px 10px' }}>From</th>
                <th style={{ padding: '6px 10px' }}>Transporter Name / ID</th>
                <th style={{ padding: '6px 10px' }}>Vehicle Type</th>
                <th style={{ padding: '6px 10px' }}>Entered Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px', fontWeight: 700, color: '#0f766e' }}>{ewayBill.transportMode}</td>
                <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>
                  {ewayBill.vehicleNumber || ewayBill.docNoOrLorryReceipt || 'Pending Vehicle'}
                </td>
                <td style={{ padding: '10px' }}>{ewayBill.fromPlace} ({ewayBill.fromState})</td>
                <td style={{ padding: '10px', fontWeight: 600 }}>{ewayBill.transporterName || ewayBill.transporterId || '-'}</td>
                <td style={{ padding: '10px' }}>{ewayBill.vehicleType}</td>
                <td style={{ padding: '10px' }}>{new Date(ewayBill.ewbDate).toLocaleDateString('en-GB')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer & QR Barcode Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '16px', fontSize: '10px', color: '#64748b' }}>
          <div>
            <div><strong>Note:</strong> Valid throughout India for transport of specified goods.</div>
            <div>Generated via ESPON Clothing ERP • Verified by GST E-Way Bill Portal Standards</div>
          </div>

          <div style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
            Status: <span style={{ color: ewayBill.status === 'CANCELLED' ? '#dc2626' : '#16a34a' }}>{ewayBill.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
