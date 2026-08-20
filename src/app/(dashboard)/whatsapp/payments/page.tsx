"use client";

import React, { useState } from "react";
import { CreditCard, CheckCircle2, Clock, DollarSign, Plus, ArrowUpRight } from "lucide-react";

export default function WhatsAppPaymentsPage() {
  const [payments] = useState([
    { id: "PAY-1001", customer: "Rajesh Textiles Pvt Ltd", phone: "9812034567", amount: 145000, date: "Today, 11:20 AM", status: "COMPLETED", txnId: "TXN_991827364", mode: "UPI (Google Pay)" },
    { id: "PAY-1002", customer: "Mehta Garment House", phone: "9876543210", amount: 45000, date: "Today, 10:15 AM", status: "PENDING", txnId: "-", mode: "Payment Link Sent" },
    { id: "PAY-1003", customer: "Kothari Hosiery & Garments", phone: "9988776655", amount: 89000, date: "Yesterday", status: "COMPLETED", txnId: "TXN_772635411", mode: "Bank Transfer (NEFT)" }
  ]);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Payment Transactions & In-Chat Links</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Generate UPI / Card payment links inside WhatsApp chat & auto-update CRM paid status.</p>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 700 }}>
              <th style={{ padding: "12px 16px" }}>Payment Ref</th>
              <th style={{ padding: "12px 16px" }}>Customer Name</th>
              <th style={{ padding: "12px 16px" }}>WhatsApp Number</th>
              <th style={{ padding: "12px 16px" }}>Amount (₹)</th>
              <th style={{ padding: "12px 16px" }}>Date & Time</th>
              <th style={{ padding: "12px 16px" }}>Payment Mode</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827" }}>{p.id}</td>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{p.customer}</td>
                <td style={{ padding: "12px 16px", color: "#059669" }}>+91 {p.phone}</td>
                <td style={{ padding: "12px 16px", fontWeight: 800, color: "#111827" }}>₹{p.amount.toLocaleString("en-IN")}</td>
                <td style={{ padding: "12px 16px", color: "#6b7280" }}>{p.date}</td>
                <td style={{ padding: "12px 16px" }}>{p.mode}</td>
                <td style={{ padding: "12px 16px" }}>
                  {p.status === "COMPLETED" ? (
                    <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px" }}>
                      ● RECEIVED
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", fontWeight: 700, background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px" }}>
                      ● PENDING
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
