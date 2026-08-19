"use client";

import React, { useEffect, useState } from "react";
import { getCustomerTimeline } from "@/app/actions/customerActions";
import { Phone, CheckSquare, ShoppingCart, CheckCircle2, FileText, Receipt, IndianRupee, Clock } from "lucide-react";

export default function CustomerTimeline({ customerId }: { customerId: string }) {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerTimeline(customerId);
      if (res.success) {
        setTimeline(res.timeline || []);
      }
      setLoading(false);
    }
    load();
  }, [customerId]);

  if (loading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8', textAlign: 'center' }}>
        Loading 360° customer timeline...
      </div>
    );
  }

  if (!timeline.length) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8', textAlign: 'center', fontSize: '0.875rem' }}>
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock style={{ color: '#4f46e5' }} size={20} />
        360° Customer Timeline
      </h3>

      <div style={{ position: 'relative', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Vertical Timeline Line */}
        <div style={{ position: 'absolute', left: '15px', top: '8px', bottom: '8px', width: '2px', backgroundColor: '#e2e8f0' }} />

        {timeline.map((item, idx) => {
          let Icon = CheckCircle2;
          let color = "#64748b";
          let bgColor = "#f1f5f9";
          let borderColor = "#cbd5e1";
          let title = "";
          let desc = "";

          if (item.type === "CALL") {
            Icon = Phone;
            color = "#2563eb";
            bgColor = "#dbeafe";
            borderColor = "#93c5fd";
            title = `Call: ${item.data.outcome}`;
            desc = item.data.notes || "No call notes.";
          } else if (item.type === "FOLLOW_UP") {
            Icon = CheckSquare;
            color = "#ea580c";
            bgColor = "#ffedd5";
            borderColor = "#fed7aa";
            title = `Follow-up (${item.data.status})`;
            desc = item.data.notes || "";
          } else if (item.type === "ORDER") {
            Icon = ShoppingCart;
            color = "#16a34a";
            bgColor = "#dcfce7";
            borderColor = "#86efac";
            title = `Order Placed: ${item.data.orderNumber}`;
            desc = `Total Value: ₹${(item.data.totalValue || item.data.grandTotal)?.toLocaleString()}`;
          } else if (item.type === "QUOTATION") {
            Icon = FileText;
            color = "#9333ea";
            bgColor = "#f3e8ff";
            borderColor = "#d8b4fe";
            title = `Quotation Sent: ${item.data.quotationNumber}`;
            desc = `Value: ₹${(item.data.grandTotal || item.data.totalValue)?.toLocaleString()} (${item.data.status})`;
          } else if (item.type === "INVOICE") {
            Icon = Receipt;
            color = "#4f46e5";
            bgColor = "#e0e7ff";
            borderColor = "#a5b4fc";
            title = `Invoice Generated: ${item.data.invoiceNumber}`;
            desc = `Total: ₹${(item.data.totalAmount || item.data.grandTotal)?.toLocaleString()} (${item.data.status})`;
          } else if (item.type === "PAYMENT") {
            Icon = IndianRupee;
            color = "#059669";
            bgColor = "#ecfdf5";
            borderColor = "#a7f3d0";
            title = `Payment Received`;
            desc = `₹${item.data.amount?.toLocaleString()} via ${item.data.paymentMode}`;
          }

          return (
            <div key={idx} style={{ position: 'relative' }}>
              {/* Event Circle Bullet */}
              <div style={{
                position: 'absolute',
                left: '-32px',
                top: '0',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                transform: 'translateX(-50%)'
              }}>
                <Icon size={16} style={{ color: color }} />
              </div>

              {/* Event Content Card */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>{title}</h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0, lineHeight: '1.4' }}>{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
