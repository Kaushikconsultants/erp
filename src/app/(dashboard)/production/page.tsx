import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canUserAccessSection } from "@/lib/authPermissions";
import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import ProductionClient from "@/components/production/ProductionClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Production & Workshop | Manufacturing Operations",
  description: "Universal manufacturing hub — Work Orders, Stage Tracking, Bill of Materials, and Piece-Rate Wage Ledger."
};

export default async function ProductionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const hasAccess = await canUserAccessSection(session.user, "production");
  if (!hasAccess) redirect("/");

  const organizationId = await getTenantOrgId();

  const [workOrders, boms, products, employees] = await Promise.all([
    prisma.workOrder.findMany({
      where: { organizationId },
      include: {
        product: { select: { id: true, name: true, sku: true, stockQuantity: true } },
        bom: { select: { id: true, bomCode: true, name: true } },
        materials: true,
        stages: { orderBy: { stageOrder: "asc" } },
        workerLogs: true
      },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.billOfMaterials.findMany({
      where: { organizationId },
      include: { items: true, product: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.product.findMany({
      where: { organizationId, status: "Active" },
      select: { id: true, name: true, sku: true, stockQuantity: true, purchasePrice: true, category: true },
      orderBy: { name: "asc" }
    }),
    prisma.employee.findMany({
      where: { organizationId },
      select: { id: true, user: { select: { name: true } }, department: true, designation: true },
      orderBy: { user: { name: "asc" } }
    })
  ]);

  // Compute summary
  const summary = {
    total: workOrders.length,
    active: workOrders.filter(w => ["In Production", "Material Allocated", "In Planning", "QA & Packing"].includes(w.status)).length,
    completed: workOrders.filter(w => w.status === "Completed").length,
    totalTargetQty: workOrders.reduce((a, w) => a + w.targetQty, 0),
    totalCompletedQty: workOrders.reduce((a, w) => a + w.completedQty, 0),
    totalRejectedQty: workOrders.reduce((a, w) => a + w.rejectedQty, 0),
    wipValue: workOrders.filter(w => !["Completed","Cancelled"].includes(w.status)).reduce((a, w) => a + w.estimatedCost, 0),
    efficiencyRate: workOrders.reduce((a, w) => a + w.targetQty, 0) > 0
      ? ((workOrders.reduce((a, w) => a + w.completedQty, 0) / workOrders.reduce((a, w) => a + w.targetQty, 0)) * 100).toFixed(1)
      : "0"
  };

  return (
    <ProductionClient
      initialWorkOrders={JSON.parse(JSON.stringify(workOrders))}
      initialBoms={JSON.parse(JSON.stringify(boms))}
      initialSummary={summary}
      products={JSON.parse(JSON.stringify(products))}
      employees={JSON.parse(JSON.stringify(employees))}
    />
  );
}
