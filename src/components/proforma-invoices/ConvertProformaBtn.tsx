"use client";

import React, { useState } from "react";
import { convertProformaToTaxInvoice } from "@/app/actions/proformaActions";
import { useRouter } from "next/navigation";
import { Receipt, Loader2 } from "lucide-react";

export default function ConvertProformaBtn({
  proformaId,
  proformaNumber
}: {
  proformaId: string;
  proformaNumber: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConvert = async () => {
    if (
      !confirm(
        `Convert Proforma Invoice #${proformaNumber} into an official GST Tax Invoice? This will deduct warehouse stock and generate an invoice number.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await convertProformaToTaxInvoice(proformaId);
      if (res.success && res.invoice) {
        alert(`Successfully converted to Tax Invoice #${res.invoice.invoiceNumber}!`);
        router.push(`/invoices/${res.invoice.id}`);
        router.refresh();
      } else {
        alert(res.error || "Failed to convert Proforma Invoice");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to convert Proforma Invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        height: "32px",
        padding: "0 14px",
        borderRadius: "6px",
        fontSize: "0.82rem",
        fontWeight: 700,
        background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        color: "#ffffff",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        opacity: loading ? 0.7 : 1,
        boxSizing: "border-box"
      }}
      title="Convert to GST Tax Invoice"
    >
      {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Receipt size={14} />}
      {loading ? "Converting..." : "Convert to Tax Invoice"}
    </button>
  );
}
