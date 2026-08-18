"use client";

import React, { useEffect, useState } from "react";
import { getCustomerTimeline } from "@/app/actions/customerActions";
import { Phone, CheckSquare, ShoppingCart, CheckCircle2, FileText, Receipt, IndianRupee } from "lucide-react";

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

  if (loading) return <div className="p-4">Loading timeline...</div>;
  if (!timeline.length) return <div className="p-4 text-gray-500">No activity recorded yet.</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        360° Customer Timeline
      </h3>
      <div className="space-y-6 border-l-2 border-gray-100 ml-3 pl-6">
        {timeline.map((item, idx) => {
          let Icon = CheckCircle2;
          let color = "text-gray-500";
          let bgColor = "bg-gray-100";
          let title = "";
          let desc = "";

          if (item.type === "CALL") {
            Icon = Phone;
            color = "text-blue-500";
            bgColor = "bg-blue-100";
            title = `Call: ${item.data.outcome}`;
            desc = item.data.notes || "No notes.";
          } else if (item.type === "FOLLOW_UP") {
            Icon = CheckSquare;
            color = "text-orange-500";
            bgColor = "bg-orange-100";
            title = `Follow-up (${item.data.status})`;
            desc = item.data.notes || "";
          } else if (item.type === "ORDER") {
            Icon = ShoppingCart;
            color = "text-green-500";
            bgColor = "bg-green-100";
            title = `Order Placed: ${item.data.orderNumber}`;
            desc = `Value: ₹${item.data.totalValue}`;
          } else if (item.type === "QUOTATION") {
            Icon = FileText;
            color = "text-purple-500";
            bgColor = "bg-purple-100";
            title = `Quotation Sent: ${item.data.quotationNumber}`;
            desc = `Value: ₹${item.data.totalValue} (${item.data.status})`;
          } else if (item.type === "INVOICE") {
            Icon = Receipt;
            color = "text-indigo-500";
            bgColor = "bg-indigo-100";
            title = `Invoice Generated: ${item.data.invoiceNumber}`;
            desc = `Total: ₹${item.data.totalAmount} (${item.data.status})`;
          } else if (item.type === "PAYMENT") {
            Icon = IndianRupee;
            color = "text-emerald-500";
            bgColor = "bg-emerald-100";
            title = `Payment Received`;
            desc = `₹${item.data.amount} via ${item.data.paymentMode}`;
          }

          return (
            <div key={idx} className="relative">
              <div className={`absolute -left-[39px] p-2 rounded-full ${bgColor} ${color} border-2 border-white`}>
                <Icon size={16} />
              </div>
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-sm text-gray-900">{title}</h4>
                  <span className="text-xs text-gray-400">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
