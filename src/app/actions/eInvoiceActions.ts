"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";

export async function generateEInvoicePayload(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const organizationId = await getTenantOrgId();

    const [invoice, company, gstSetting] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          order: { include: { items: { include: { product: true } } } }
        }
      }),
      prisma.companySettings.findFirst({ where: { organizationId } }),
      prisma.gstSetting.findFirst({ where: { organizationId } })
    ]);

    if (!invoice) return { success: false, error: "Invoice not found" };

    const sellerGstin = gstSetting?.gstin || company?.gstin || "06AAHCE7721Q1Z4";
    const buyerGstin = invoice.customer?.gstNumber || "URP";
    const isInterstate = Boolean(invoice.customer?.state && company?.state && invoice.customer.state.toLowerCase() !== company.state.toLowerCase());

    const items = invoice.order?.items || [];
    const itemList = items.length > 0 ? items.map((it, idx) => {
      const gstRate = it.gstRate || 12;
      const taxable = it.total / (1 + gstRate / 100);
      const cgstAmt = isInterstate ? 0 : (taxable * (gstRate / 2)) / 100;
      const sgstAmt = isInterstate ? 0 : (taxable * (gstRate / 2)) / 100;
      const igstAmt = isInterstate ? (taxable * gstRate) / 100 : 0;

      return {
        SlNo: String(idx + 1),
        PrdDesc: it.product?.name || "Garments",
        IsServc: "N",
        HsnCd: it.hsnCode || "6109",
        Qty: it.quantity,
        Unit: "PCS",
        UnitPrice: it.rate,
        TotAmt: Number((it.quantity * it.rate).toFixed(2)),
        Discount: 0,
        AssAmt: Number(taxable.toFixed(2)),
        GstRt: gstRate,
        IgstAmt: Number(igstAmt.toFixed(2)),
        CgstAmt: Number(cgstAmt.toFixed(2)),
        SgstAmt: Number(sgstAmt.toFixed(2)),
        CesRt: 0,
        CesAmt: 0,
        TotItemVal: Number(it.total.toFixed(2))
      };
    }) : [
      {
        SlNo: "1",
        PrdDesc: "Apparel & Garment Sales",
        IsServc: "N",
        HsnCd: "6109",
        Qty: 1,
        Unit: "PCS",
        UnitPrice: invoice.subtotal,
        TotAmt: invoice.subtotal,
        Discount: 0,
        AssAmt: invoice.subtotal,
        GstRt: 12,
        IgstAmt: isInterstate ? invoice.taxAmount : 0,
        CgstAmt: isInterstate ? 0 : Number((invoice.taxAmount / 2).toFixed(2)),
        SgstAmt: isInterstate ? 0 : Number((invoice.taxAmount / 2).toFixed(2)),
        CesRt: 0,
        CesAmt: 0,
        TotItemVal: invoice.totalAmount
      }
    ];

    // Standard IRP (NIC / ClearTax Schema v1.1)
    const eInvoicePayload = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: isInterstate ? "INTER" : "INTRA",
        RegRev: "N",
        EcmGstin: null,
        IgstOnIntra: "N"
      },
      DocDtls: {
        Typ: "INV",
        No: invoice.invoiceNumber,
        Dt: new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")
      },
      SellerDtls: {
        Gstin: sellerGstin,
        LglNm: company?.companyName || "ESPON CLOTHING PRIVATE LIMITED",
        TrdNm: company?.companyName || "ESPON CLOTHING",
        Addr1: company?.address || "Delhi Road",
        Loc: company?.city || "Rohtak",
        Pin: Number(company?.pincode || "124001"),
        Stcd: "06",
        Ph: company?.mobile || "7206066678",
        Em: company?.email || "clothingespon@gmail.com"
      },
      BuyerDtls: {
        Gstin: buyerGstin,
        LglNm: invoice.customer?.businessName || "Customer",
        TrdNm: invoice.customer?.businessName || "Customer",
        Pos: invoice.customer?.state || "06",
        Addr1: invoice.customer?.billingAddress || "Main Market",
        Loc: invoice.customer?.city || "Rohtak",
        Pin: Number(invoice.customer?.pincode || "124001"),
        Stcd: "06",
        Ph: invoice.customer?.mobile || "",
        Em: invoice.customer?.email || ""
      },
      ItemList: itemList,
      ValDtls: {
        AssVal: invoice.subtotal,
        CgstVal: isInterstate ? 0 : Number((invoice.taxAmount / 2).toFixed(2)),
        SgstVal: isInterstate ? 0 : Number((invoice.taxAmount / 2).toFixed(2)),
        IgstVal: isInterstate ? invoice.taxAmount : 0,
        CesVal: 0,
        StCesVal: 0,
        Discount: invoice.discountAmount || 0,
        OthChrg: 0,
        RndOffAmt: 0,
        TotInvVal: invoice.totalAmount
      }
    };

    // Generate mock IRN (64-character SHA-256 hex string compliant with NIC format)
    const mockHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const mockAckNo = `1226${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const mockAckDt = new Date().toISOString();

    const signedQrData = `GSTIN:${sellerGstin}|BUYER:${buyerGstin}|DOC:${invoice.invoiceNumber}|DT:${eInvoicePayload.DocDtls.Dt}|VAL:${invoice.totalAmount}|IRN:${mockHash}`;

    return {
      success: true,
      irn: mockHash,
      ackNo: mockAckNo,
      ackDate: mockAckDt,
      signedQrData,
      payload: eInvoicePayload
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate E-Invoice payload" };
  }
}
