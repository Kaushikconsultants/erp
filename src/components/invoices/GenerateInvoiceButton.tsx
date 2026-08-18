"use client";
import React, { useState } from "react";
import { createInvoiceFromOrder } from "@/app/actions/invoiceActions";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";

export default function GenerateInvoiceButton({ orderId, existingInvoiceId }: { orderId: string; existingInvoiceId?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleGenerate() {
    if (existingInvoiceId) {
      router.push("/invoices");
      return;
    }
    setLoading(true); setError("");
    const res = await createInvoiceFromOrder(orderId);
    setLoading(false);
    if (res.error && !res.invoiceId) { setError(res.error); return; }
    router.push("/invoices");
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        className="primary-btn"
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <Receipt size={16} />
        {loading ? "Generating..." : existingInvoiceId ? "View Invoice" : "Generate Invoice"}
      </button>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}
