import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { getDeliveryChallans } from "@/app/actions/deliveryChallanActions";
import DeliveryChallanClient from "@/components/dispatches/DeliveryChallanClient";

export const dynamic = "force-dynamic";

export default async function DeliveryChallansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const organizationId = await getTenantOrgId();

  const [challansRes, customers, vendors, products] = await Promise.all([
    getDeliveryChallans(),
    prisma.customer.findMany({ where: { organizationId }, select: { id: true, businessName: true, city: true } }),
    prisma.vendor.findMany({ where: { organizationId }, select: { id: true, companyName: true } }),
    prisma.product.findMany({ where: { organizationId }, select: { id: true, name: true, stockQuantity: true, sellingPrice: true, hsnCode: true } })
  ]);

  const challans = challansRes.success ? challansRes.challans : [];

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Truck className="text-indigo-600" /> Delivery Challans & Material Movement
          </h1>
          <p className="page-subtitle">
            Issue non-financial stock transfer documents for Job Work, Sample Approval, and Inter-Godown transfers.
          </p>
        </div>
      </div>

      <DeliveryChallanClient
        initialChallans={JSON.parse(JSON.stringify(challans))}
        customers={JSON.parse(JSON.stringify(customers))}
        vendors={JSON.parse(JSON.stringify(vendors))}
        products={JSON.parse(JSON.stringify(products))}
      />
    </div>
  );
}
