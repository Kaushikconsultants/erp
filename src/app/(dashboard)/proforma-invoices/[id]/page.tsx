import React from "react";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getCompanySettings } from "@/app/actions/companyActions";
import { numberToWordsINR } from "@/lib/gstUtils";
import PrintInvoiceButton from "@/components/orders/PrintInvoiceButton";
import DownloadPdfButton from "@/components/orders/DownloadPdfButton";
import ConvertProformaBtn from "@/components/proforma-invoices/ConvertProformaBtn";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ProformaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  let orgId: string | null = null;
  try {
    orgId = await getTenantOrgId();
  } catch {
    orgId = (session.user as any)?.organizationId || null;
  }
  const { id } = await params;

  const [proforma, companyRes] = await Promise.all([
    prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        invoice: true,
        items: { include: { product: true } }
      }
    }),
    getCompanySettings()
  ]);

  if (!proforma) {
    notFound();
  }

  const userRole = String((session.user as any)?.role || "").toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "MANAGER";

  if (!isAdmin && proforma.organizationId && orgId && proforma.organizationId !== orgId) {
    notFound();
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

  const isInterstate = proforma.igst > 0 || (
    company.state?.trim().toLowerCase() !== (proforma.customer.state || company.state)?.trim().toLowerCase()
  );

  const fmt = (val?: number | null) =>
    (val ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStateCode = (state?: string | null, gstin?: string | null): string => {
    if (gstin && gstin.length >= 2 && !isNaN(Number(gstin.slice(0, 2)))) {
      return gstin.slice(0, 2);
    }
    const s = (state || "").toLowerCase().trim();
    const map: Record<string, string> = {
      "jammu & kashmir": "01", "jammu and kashmir": "01", "himachal pradesh": "02", "punjab": "03",
      "chandigarh": "04", "uttarakhand": "05", "haryana": "06", "delhi": "07", "rajasthan": "08",
      "uttar pradesh": "09", "bihar": "10", "sikkim": "11", "arunachal pradesh": "12", "nagaland": "13",
      "manipur": "14", "mizoram": "15", "tripura": "16", "meghalaya": "17", "assam": "18",
      "west bengal": "19", "jharkhand": "20", "odisha": "21", "chhattisgarh": "22", "madhya pradesh": "23",
      "gujarat": "24", "daman & diu": "25", "dadra & nagar haveli": "26", "maharashtra": "27",
      "karnataka": "29", "goa": "30", "lakshadweep": "31", "kerala": "32", "tamil nadu": "33",
      "puducherry": "34", "andaman & nicobar islands": "35", "telangana": "36", "andhra pradesh": "37", "ladakh": "38"
    };
    return map[s] || "06";
  };

  const formatPlaceOfSupply = (state?: string | null, gstin?: string | null): string => {
    const targetState = state || "Haryana";
    const code = getStateCode(targetState, gstin);
    const cleanState = targetState.replace(/\(\d+\)/g, "").trim();
    return `${cleanState} (${code})`;
  };

  const totalUnits = proforma.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const effectiveTaxBase = proforma.subtotal || 0;
  const effectiveTaxRate = proforma.items[0]?.gstRate || 12;

  const validTillDate = proforma.expiryDate
    ? new Date(proforma.expiryDate).toLocaleDateString("en-GB")
    : new Date(new Date(proforma.issueDate).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");

  return (
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", padding: "20px 12px 100px 12px" }}>
      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: "820px", margin: "0 auto 14px auto" }} className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
          <Link href="/proforma-invoices" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600, fontSize: "13.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            ← Back to Proforma Invoices
          </Link>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
            Status:{" "}
            <strong style={{ color: proforma.status === "CONVERTED" ? "#059669" : proforma.status === "SENT" ? "#0284c7" : "#d97706" }}>
              {proforma.status}
            </strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", overflowX: "auto", paddingBottom: "6px" }}>
          {proforma.status !== "CONVERTED" && (
            <ConvertProformaBtn proformaId={proforma.id} proformaNumber={proforma.proformaNumber} />
          )}
          {proforma.invoice && (
            <Link
              href={`/invoices/${proforma.invoice.id}`}
              style={{
                padding: "7px 14px",
                border: "1px solid #86efac",
                backgroundColor: "#f0fdf4",
                borderRadius: "6px",
                color: "#166534",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap"
              }}
            >
              ✓ View Tax Invoice #{proforma.invoice.invoiceNumber}
            </Link>
          )}
          <DownloadPdfButton elementId="printable-proforma" filename={`${proforma.proformaNumber}.pdf`} />
          <PrintInvoiceButton />
        </div>
      </div>

      {/* Touch-Scrollable Document Wrapper */}
      <div style={{ maxWidth: "820px", margin: "0 auto", overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: "4px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            padding: "28px 32px",
            border: "1px solid #d1d5db",
            boxSizing: "border-box",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            color: "#111827",
            fontSize: "10.5px",
            lineHeight: "1.4"
          }}
          id="printable-proforma"
        >
          {/* 1. Header Row (Company Info on Left, Document Title on Right) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" style={{ width: "64px", height: "68px", objectFit: "contain", flexShrink: 0 }} />
              ) : (
                <svg width="60" height="66" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <path d="M50 4 C24 4 10 10 10 32 C10 68 34 94 50 106 C66 94 90 68 90 32 C90 10 76 4 50 4 Z" stroke="#000000" strokeWidth="5" fill="#ffffff" />
                  <text x="50" y="32" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="13" fill="#000000" letterSpacing="1">ESPON</text>
                  <path d="M48 44 C41 44 36 50 36 60 C36 74 46 80 58 76 C65 74 68 68 68 68 M40 56 C44 56 60 55 60 48 C60 42 52 44 48 44" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M50 78 C44 84 42 90 48 94 C53 96 62 88 64 80" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                </svg>
              )}

              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>{company.companyName}</div>
                <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.35" }}>{company.address}</div>
                <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.35" }}>{company.city}- {company.state} {company.pincode}</div>
                <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.35" }}>{company.country || "India"}</div>
                <div style={{ fontSize: "10px", color: "#111827", fontWeight: 600, marginTop: "2px", textTransform: 'uppercase' }}>GSTIN {company.gstin ? company.gstin.toUpperCase() : ''}</div>
                <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.35" }}>{company.mobile}</div>
                <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.35" }}>{company.email}</div>
                {company.website && <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.35" }}>{company.website}</div>}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, letterSpacing: "0.5px", color: "#111827", lineHeight: "1.1" }}>
                PROFORMA INVOICE
              </h1>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                (Advance Quotation Invoice)
              </div>
            </div>
          </div>

          {/* 2. Meta Details Box (Zoho 2-Column Key-Value Box) */}
          <div style={{ border: "1px solid #d1d5db", display: "flex", marginBottom: "12px", fontSize: "10.5px" }}>
            <div style={{ flex: "1 1 50%", borderRight: "1px solid #d1d5db", padding: "7px 12px" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "10px" }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#374151", padding: "1.5px 0", width: "95px" }}>Proforma No.</td>
                    <td style={{ color: "#111827", padding: "1.5px 0", width: "12px" }}>:</td>
                    <td style={{ color: "#111827", fontWeight: 700, padding: "1.5px 0" }}>{proforma.proformaNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#374151", padding: "1.5px 0" }}>Proforma Date</td>
                    <td style={{ color: "#111827", padding: "1.5px 0" }}>:</td>
                    <td style={{ color: "#111827", fontWeight: 700, padding: "1.5px 0" }}>{new Date(proforma.issueDate).toLocaleDateString("en-GB")}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#374151", padding: "1.5px 0" }}>Terms</td>
                    <td style={{ color: "#111827", padding: "1.5px 0" }}>:</td>
                    <td style={{ color: "#111827", fontWeight: 700, padding: "1.5px 0" }}>Advance Payment / Due on Receipt</td>
                  </tr>
                  <tr>
                    <td style={{ color: "#374151", padding: "1.5px 0" }}>Valid Till</td>
                    <td style={{ color: "#111827", padding: "1.5px 0" }}>:</td>
                    <td style={{ color: "#111827", fontWeight: 700, padding: "1.5px 0" }}>{validTillDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ flex: "1 1 50%", padding: "7px 12px" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "10px" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "105px", color: "#374151", padding: "1.5px 0" }}>Place Of Supply</td>
                    <td style={{ color: "#111827", padding: "1.5px 0", width: "12px" }}>:</td>
                    <td style={{ color: "#111827", fontWeight: 700, padding: "1.5px 0" }}>
                      {formatPlaceOfSupply(proforma.customer.state, proforma.customer.gstNumber)}
                    </td>
                  </tr>
                  {proforma.order && (
                    <tr>
                      <td style={{ color: "#374151", padding: "1.5px 0" }}>Linked Order</td>
                      <td style={{ color: "#111827", padding: "1.5px 0" }}>:</td>
                      <td style={{ color: "#111827", fontWeight: 700, padding: "1.5px 0" }}>{proforma.order.orderNumber}</td>
                    </tr>
                  )}
                  {proforma.invoice && (
                    <tr>
                      <td style={{ color: "#374151", padding: "1.5px 0" }}>Converted Invoice</td>
                      <td style={{ color: "#111827", padding: "1.5px 0" }}>:</td>
                      <td style={{ color: "#059669", fontWeight: 700, padding: "1.5px 0" }}>#{proforma.invoice.invoiceNumber}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Address Box (Bill To / Ship To 2-Column Box) */}
          <div style={{ border: "1px solid #d1d5db", display: "flex", marginBottom: "14px", fontSize: "10px" }}>
            <div style={{ flex: "1 1 50%", borderRight: "1px solid #d1d5db", display: "flex", flexDirection: "column" }}>
              <div style={{ backgroundColor: "#f8fafc", padding: "4px 12px", borderBottom: "1px solid #d1d5db", fontWeight: 700, color: "#111827", fontSize: "10px" }}>
                Bill To
              </div>
              <div style={{ padding: "8px 12px", lineHeight: "1.4", flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "11px", color: "#111827", marginBottom: "2px" }}>{proforma.customer.businessName}</div>
                {proforma.customer.contactPerson && (
                  <div style={{ color: "#374151" }}>Attn: {proforma.customer.contactPerson}</div>
                )}
                {proforma.customer.billingAddress && (
                  <div style={{ color: "#374151" }}>{proforma.customer.billingAddress}</div>
                )}
                {proforma.customer.city && (
                  <div style={{ color: "#374151" }}>{proforma.customer.city} {proforma.customer.pincode ? `- ${proforma.customer.pincode}` : ""} {proforma.customer.state}</div>
                )}
                <div style={{ color: "#374151" }}>India</div>
                {proforma.customer.mobile && (
                  <div style={{ color: "#374151", marginTop: "2px" }}>{proforma.customer.mobile.startsWith("+") ? proforma.customer.mobile : `+91-${proforma.customer.mobile}`}</div>
                )}
                {proforma.customer.gstNumber && (
                  <div style={{ color: "#111827", fontWeight: 600, marginTop: "2px", textTransform: 'uppercase' }}>GSTIN {proforma.customer.gstNumber.toUpperCase()}</div>
                )}
              </div>
            </div>

            <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column" }}>
              <div style={{ backgroundColor: "#f8fafc", padding: "4px 12px", borderBottom: "1px solid #d1d5db", fontWeight: 700, color: "#111827", fontSize: "10px" }}>
                Ship To
              </div>
              <div style={{ padding: "8px 12px", lineHeight: "1.4", flex: 1 }}>
                <div style={{ color: "#374151" }}>{proforma.customer.shippingAddress || proforma.customer.billingAddress || proforma.customer.businessName}</div>
                {proforma.customer.city && <div style={{ color: "#374151" }}>{proforma.customer.city} {proforma.customer.pincode ? `- ${proforma.customer.pincode}` : ""} {proforma.customer.state}</div>}
                <div style={{ color: "#374151" }}>India</div>
              </div>
            </div>
          </div>

          {/* 4. Items Table (Zoho 2-Tier Nested Table) */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", color: "#111827", fontWeight: 700, fontSize: "10px" }}>
                <th rowSpan={2} style={{ padding: "8px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", width: "28px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>#</th>
                <th rowSpan={2} style={{ padding: "8px 8px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "left", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Item &amp; Description</th>
                <th rowSpan={2} style={{ padding: "8px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", width: "58px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>HSN/SAC</th>
                <th rowSpan={2} style={{ padding: "8px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "right", width: "54px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Qty</th>
                <th rowSpan={2} style={{ padding: "8px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "right", width: "62px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Rate</th>
                {isInterstate ? (
                  <th colSpan={2} style={{ padding: "6px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>IGST</th>
                ) : (
                  <>
                    <th colSpan={2} style={{ padding: "6px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>CGST</th>
                    <th colSpan={2} style={{ padding: "6px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>SGST</th>
                  </>
                )}
                <th rowSpan={2} style={{ padding: "8px 8px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "right", width: "80px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Amount</th>
              </tr>
              <tr style={{ backgroundColor: "#f8fafc", color: "#111827", fontWeight: 700, fontSize: "9.5px" }}>
                {isInterstate ? (
                  <>
                    <th style={{ padding: "4px 4px", border: "1px solid #cbd5e1", textAlign: "right", width: "38px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>%</th>
                    <th style={{ padding: "4px 6px", border: "1px solid #cbd5e1", textAlign: "right", width: "58px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Amt</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: "4px 4px", border: "1px solid #cbd5e1", textAlign: "right", width: "36px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>%</th>
                    <th style={{ padding: "4px 6px", border: "1px solid #cbd5e1", textAlign: "right", width: "52px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Amt</th>
                    <th style={{ padding: "4px 4px", border: "1px solid #cbd5e1", textAlign: "right", width: "36px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>%</th>
                    <th style={{ padding: "4px 6px", border: "1px solid #cbd5e1", textAlign: "right", width: "52px", verticalAlign: "middle", lineHeight: "1.3", boxSizing: "border-box" }}>Amt</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {proforma.items.map((item, index) => {
                const gst = (item.gstRate || 0) / 100;
                const taxable = item.taxableAmount || (item.rate * item.quantity);
                const igstVal = item.igst || (isInterstate ? taxable * gst : 0);
                const halfGstVal = item.cgst || (!isInterstate ? taxable * (gst / 2) : 0);

                return (
                  <tr key={item.id}>
                    <td style={{ padding: "5px 4px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "top", color: "#4b5563" }}>{index + 1}</td>
                    <td style={{ padding: "5px 8px", border: "1px solid #d1d5db", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, fontSize: "10.5px", color: "#111827" }}>
                        {item.product?.name || item.description}
                      </div>
                      {item.product?.sku && (
                        <div style={{ color: "#6b7280", fontSize: "9px" }}>SKU: {item.product.sku}</div>
                      )}
                      {item.description && item.description !== item.product?.name && (
                        <div style={{ color: "#4b5563", fontSize: "9.5px", marginTop: "1px" }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: "5px 4px", border: "1px solid #d1d5db", textAlign: "center", verticalAlign: "top", color: "#4b5563" }}>
                      {item.hsnCode || "6109"}
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{item.quantity.toFixed(2)}</div>
                      <div style={{ color: "#6b7280", fontSize: "9px" }}>{item.unit || "pcs"}</div>
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(item.rate)}
                    </td>
                    {isInterstate ? (
                      <>
                        <td style={{ padding: "5px 4px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {item.gstRate}%
                        </td>
                        <td style={{ padding: "5px 6px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {fmt(igstVal)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "5px 4px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {item.gstRate / 2}%
                        </td>
                        <td style={{ padding: "5px 6px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {fmt(halfGstVal)}
                        </td>
                        <td style={{ padding: "5px 4px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                          {item.gstRate / 2}%
                        </td>
                        <td style={{ padding: "5px 6px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {fmt(item.sgst || halfGstVal)}
                        </td>
                      </>
                    )}
                    <td style={{ padding: "5px 8px", border: "1px solid #d1d5db", textAlign: "right", verticalAlign: "top", fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "#111827" }}>
                      {fmt(taxable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 5. Lower Box (Connected directly under table) */}
          <div style={{ border: "1px solid #d1d5db", borderTop: "none", display: "flex", backgroundColor: "#ffffff" }}>
            {/* Left Column (58%) */}
            <div style={{ flex: "1 1 58%", borderRight: "1px solid #d1d5db", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ padding: "6px 12px", borderBottom: "1px solid #e5e7eb", fontSize: "10px", color: "#111827", fontWeight: 600 }}>
                  Items in Total {totalUnits.toFixed(2)}
                </div>

                <div style={{ padding: "7px 12px" }}>
                  <div style={{ fontSize: "9px", color: "#6b7280", fontWeight: 500 }}>Total In Words</div>
                  <div style={{ fontStyle: "italic", fontWeight: 700, color: "#111827", fontSize: "10.5px", marginTop: "2px", lineHeight: "1.35" }}>
                    {numberToWordsINR(proforma.totalAmount)}
                  </div>
                </div>

                <div style={{ padding: "6px 12px" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#111827", marginBottom: "3px" }}>Terms &amp; Conditions</div>
                  <div style={{ whiteSpace: "pre-line", fontSize: "9px", color: "#4b5563", lineHeight: "1.4" }}>
                    {proforma.termsConditions || `1. Proforma Invoice for advance estimation. Not a tax invoice.\n2. Goods will be dispatched upon receipt of 100% advance payment.\n3. Proforma valid for 15 days from date of issue.\n4. Subject to Haryana Jurisdiction.`}
                  </div>
                </div>
              </div>

              <div style={{ padding: "8px 12px 10px 12px", fontSize: "9.5px", color: "#1f2937", lineHeight: "1.45", borderTop: "1px dashed #e5e7eb" }}>
                <div style={{ fontWeight: 700, marginBottom: "2px", color: "#111827" }}>Bank Details -</div>
                <div>A/C Name - {company.bankAccountName || "ESPON CLOTHING PRIVATE LIMITED."}</div>
                <div>A/c No. - <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{company.accountNumber || "016805006415"}</span></div>
                <div>IFSC code - <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{company.ifscCode || "ICIC0000168"}</span></div>
                <div>Branch - {company.branch || "Rohtak."}</div>
                {company.upiId && <div>UPI ID - {company.upiId}</div>}
              </div>
            </div>

            {/* Right Column (42%) */}
            <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ padding: "6px 12px", fontSize: "10.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0" }}>
                  <span style={{ color: "#374151" }}>Sub Total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>{fmt(proforma.subtotal)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0" }}>
                  <span style={{ color: "#374151" }}>Total Taxable Amount</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>{fmt(effectiveTaxBase)}</span>
                </div>

                {isInterstate ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0" }}>
                    <span style={{ color: "#374151" }}>IGST ({effectiveTaxRate}%)</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>{fmt(proforma.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0" }}>
                      <span style={{ color: "#374151" }}>CGST ({effectiveTaxRate / 2}%)</span>
                      <span style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>{fmt(proforma.cgst)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0" }}>
                      <span style={{ color: "#374151" }}>SGST ({effectiveTaxRate / 2}%)</span>
                      <span style={{ fontVariantNumeric: "tabular-nums", color: "#111827" }}>{fmt(proforma.sgst)}</span>
                    </div>
                  </>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 4px 0", borderTop: "1px solid #111827", marginTop: "6px", fontWeight: 800, fontSize: "12px", color: "#111827" }}>
                  <span>Total Proforma Amount</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>₹{fmt(proforma.totalAmount)}</span>
                </div>
              </div>

              {/* Authorized Signatory */}
              <div style={{ padding: "8px 12px 12px 12px", textAlign: "center", borderTop: "1px dashed #e5e7eb" }}>
                <div style={{ height: "36px" }}></div>
                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "4px", fontSize: "10px", fontWeight: 700, color: "#111827" }}>
                  Authorized Signatory
                </div>
                <div style={{ fontSize: "9px", color: "#6b7280" }}>For {company.companyName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
