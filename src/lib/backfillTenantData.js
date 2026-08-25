const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting multi-tenant data backfill...");

  // 1. Get primary organization (Espon Global)
  let primaryOrg = await prisma.organization.findFirst({
    where: { slug: "espon-global" }
  });

  if (!primaryOrg) {
    primaryOrg = await prisma.organization.findFirst();
  }

  if (!primaryOrg) {
    console.error("No organization found in database!");
    return;
  }

  const orgId = primaryOrg.id;
  console.log(`Assigning unlinked data to Primary Organization: ${primaryOrg.name} (${orgId})`);

  // 2. Backfill Users with null organizationId
  const usersUpdated = await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Users updated: ${usersUpdated.count}`);

  // 3. Backfill Employees
  const empUpdated = await prisma.employee.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Employees updated: ${empUpdated.count}`);

  // 4. Backfill Customers
  const custUpdated = await prisma.customer.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Customers updated: ${custUpdated.count}`);

  // 5. Backfill Orders
  const ordersUpdated = await prisma.order.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Orders updated: ${ordersUpdated.count}`);

  // 6. Backfill Products
  const productsUpdated = await prisma.product.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Products updated: ${productsUpdated.count}`);

  // 7. Backfill Invoices
  const invoicesUpdated = await prisma.invoice.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Invoices updated: ${invoicesUpdated.count}`);

  // 8. Backfill Quotations
  const quotUpdated = await prisma.quotation.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Quotations updated: ${quotUpdated.count}`);

  // 9. Backfill Vendors
  const vendorsUpdated = await prisma.vendor.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Vendors updated: ${vendorsUpdated.count}`);

  // 10. Backfill Bills
  const billsUpdated = await prisma.bill.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Bills updated: ${billsUpdated.count}`);

  // 11. Backfill CreditNotes
  const cnUpdated = await prisma.creditNote.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`CreditNotes updated: ${cnUpdated.count}`);

  // 12. Backfill Branches & Warehouses
  const branchesUpdated = await prisma.branch.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Branches updated: ${branchesUpdated.count}`);

  const whUpdated = await prisma.warehouse.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });
  console.log(`Warehouses updated: ${whUpdated.count}`);

  // 13. Backfill CompanySettings & GstSettings
  await prisma.companySettings.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });

  await prisma.gstSetting.updateMany({
    where: { organizationId: null },
    data: { organizationId: orgId }
  });

  console.log("Multi-tenant data backfill complete!");
  await prisma.$disconnect();
}

backfill().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
