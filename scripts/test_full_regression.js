const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runRegressionSuite() {
  console.log("=================================================");
  console.log("       PASS 7: FULL END-TO-END REGRESSION TEST    ");
  console.log("=================================================\n");

  const results = [];
  function assert(category, testName, condition, detail = "") {
    results.push({ category, testName, passed: !!condition, detail });
    if (condition) {
      console.log(`  ✓ [PASS] [${category}] ${testName}`);
    } else {
      console.error(`  ✗ [FAIL] [${category}] ${testName} - ${detail}`);
    }
  }

  let testOrg, testCustomer, testEmployee, testProduct, testQuotation, testOrder, testInvoice, testPayment, testVendor, testPO, testWO;

  try {
    // 1. TENANT CONTEXT
    testOrg = await prisma.organization.findFirst();
    assert("Setup", "Default Organization Active", !!testOrg, `Org: ${testOrg?.name}`);

    // 2. HRMS / EMPLOYEE
    testEmployee = await prisma.employee.findFirst({ where: { organizationId: testOrg.id } });
    if (!testEmployee) {
      testEmployee = await prisma.employee.create({
        data: {
          organizationId: testOrg.id,
          name: "Regression Test Sales Rep",
          mobile: "9988776655",
          designation: "Sales Executive",
          status: "Active"
        }
      });
    }
    assert("HRMS", "Active Salesperson Linkage", !!testEmployee.id, `Employee ID: ${testEmployee.id}`);

    // 3. CRM CUSTOMER CREATION
    const randSuffix = Date.now().toString().slice(-4);
    testCustomer = await prisma.customer.create({
      data: {
        organizationId: testOrg.id,
        businessName: `Apex Sports Club ${randSuffix}`,
        contactPerson: "Rajesh Kumar",
        mobile: `98100${randSuffix}`,
        email: `apex_${randSuffix}@test.com`,
        state: "Haryana",
        gstNumber: "06AAAAA1234A1Z5",
        billingAddress: "Sector 14, Rohtak, Haryana",
        shippingAddress: "Sector 14, Rohtak, Haryana",
        assignedSalespersonId: testEmployee.id
      }
    });
    assert("CRM", "Customer Creation with Assigned Salesperson", !!testCustomer.id);

    // 4. INVENTORY / PRODUCT
    testProduct = await prisma.product.create({
      data: {
        organizationId: testOrg.id,
        name: `Pro Cricket Jersey ${randSuffix}`,
        sku: `CRIC-${randSuffix}`,
        articleNumber: `ART-${randSuffix}`,
        category: "Sportswear",
        sellingPrice: 800,
        purchasePrice: 450,
        mrp: 999,
        hsnCode: "6109",
        stockQuantity: 150
      }
    });
    assert("Inventory", "Product Creation with SKU and Stock", testProduct.stockQuantity === 150);

    // Inventory Inflow Transaction
    const inTx = await prisma.inventoryTransaction.create({
      data: {
        productId: testProduct.id,
        type: "IN",
        quantity: 50,
        reference: `BATCH-${randSuffix}`,
        notes: "QA Restock Test"
      }
    });
    assert("Inventory", "Inventory Transaction Tracking", !!inTx.id && inTx.quantity === 50);

    // 5. QUOTATION WITH GST CALCULATION
    const qty = 5;
    const rate = 800;
    const subtotal = qty * rate; // 4000
    const gstRate = 12;
    const taxTotal = (subtotal * gstRate) / 100; // 480 (cgst 240, sgst 240)
    const totalValue = subtotal + taxTotal; // 4480

    testQuotation = await prisma.quotation.create({
      data: {
        organizationId: testOrg.id,
        quotationNumber: `QT-REG-${randSuffix}`,
        customerId: testCustomer.id,
        salespersonId: testEmployee.id,
        date: new Date(),
        subtotal,
        taxableAmount: subtotal,
        taxTotal,
        cgst: taxTotal / 2,
        sgst: taxTotal / 2,
        igst: 0,
        totalValue,
        status: "Draft",
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: qty,
              rate,
              hsnCode: "6109",
              gstRate,
              taxableAmount: subtotal,
              taxAmount: taxTotal,
              cgst: taxTotal / 2,
              sgst: taxTotal / 2,
              igst: 0,
              total: totalValue
            }
          ]
        }
      },
      include: { items: true }
    });
    assert("Sales", "Quotation Creation with Line Items & GST", testQuotation.items.length === 1 && testQuotation.totalValue === 4480);

    // 6. ORDER CREATION
    testOrder = await prisma.order.create({
      data: {
        organizationId: testOrg.id,
        orderNumber: `ORD-REG-${randSuffix}`,
        customerId: testCustomer.id,
        salespersonId: testEmployee.id,
        subtotal,
        tax: taxTotal,
        cgst: taxTotal / 2,
        sgst: taxTotal / 2,
        igst: 0,
        totalValue,
        paymentReceived: 0,
        outstandingAmount: totalValue,
        paymentStatus: "Unpaid",
        orderStatus: "Processing",
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: qty,
              rate,
              hsnCode: "6109",
              gstRate,
              cgst: taxTotal / 2,
              sgst: taxTotal / 2,
              igst: 0,
              total: totalValue
            }
          ]
        }
      }
    });
    assert("Sales", "Sales Order Creation", !!testOrder.id && testOrder.outstandingAmount === 4480);

    // 7. INVOICE CREATION
    testInvoice = await prisma.invoice.create({
      data: {
        organizationId: testOrg.id,
        invoiceNumber: `INV-REG-${randSuffix}`,
        customerId: testCustomer.id,
        orderId: testOrder.id,
        subtotal,
        taxAmount: taxTotal,
        totalAmount: totalValue,
        amountPaid: 0,
        amountDue: totalValue,
        status: "Unpaid"
      }
    });
    assert("Billing", "Tax Invoice Creation", !!testInvoice.id && testInvoice.amountDue === 4480);

    // 8. PARTIAL PAYMENT RECORDING & LEDGER SYNC
    const payAmount = 2000;
    testPayment = await prisma.payment.create({
      data: {
        paymentNumber: `PAY-REG-${randSuffix}`,
        invoiceId: testInvoice.id,
        customerId: testCustomer.id,
        orderId: testOrder.id,
        amount: payAmount,
        paymentMode: "Bank Transfer",
        receivingAccount: "ICICI Bank Current A/c",
        referenceNumber: `UTR-${randSuffix}`,
        status: "Completed"
      }
    });

    // Update Invoice & Order
    const updatedInvoice = await prisma.invoice.update({
      where: { id: testInvoice.id },
      data: {
        amountPaid: payAmount,
        amountDue: totalValue - payAmount,
        status: "Partially Paid"
      }
    });
    const updatedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        paymentReceived: payAmount,
        outstandingAmount: totalValue - payAmount,
        paymentStatus: "Partially Paid"
      }
    });

    assert("Payments", "Partial Payment Linked to Invoice", updatedInvoice.amountPaid === 2000 && updatedInvoice.status === "Partially Paid");
    assert("Payments", "Order Payment Received Synced", updatedOrder.paymentReceived === 2000 && updatedOrder.paymentStatus === "Partially Paid");

    // 9. PURCHASING & VENDOR WORKFLOW
    testVendor = await prisma.vendor.create({
      data: {
        organizationId: testOrg.id,
        companyName: `Fabric Suppliers Pvt Ltd ${randSuffix}`,
        contactPerson: "Suresh Gupta",
        mobile: `98200${randSuffix}`,
        gstNumber: "06BBBBA4321B1Z2",
        status: "Active"
      }
    });
    assert("Purchasing", "Vendor Profile Creation", !!testVendor.id);

    testPO = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-REG-${randSuffix}`,
        vendorId: testVendor.id,
        totalValue: 25000,
        status: "Draft",
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 50,
              rate: 450,
              total: 22500
            }
          ]
        }
      },
      include: { items: true }
    });
    assert("Purchasing", "Purchase Order Creation with Line Items", testPO.items.length === 1 && testPO.totalValue === 25000);

    // 10. PRODUCTION & WORK ORDER
    testWO = await prisma.workOrder.create({
      data: {
        organizationId: testOrg.id,
        woNumber: `WO-REG-${randSuffix}`,
        title: `Jersey Batch Production ${randSuffix}`,
        sector: "Apparel",
        productId: testProduct.id,
        finishedGoodsName: testProduct.name,
        targetQty: 200,
        status: "In Planning"
      }
    });
    assert("Production", "Work Order Lifecycle Tracking", !!testWO.id && testWO.targetQty === 200);

  } catch (err) {
    assert("Fatal", "Test execution completed without unhandled exceptions", false, err.message);
  } finally {
    // 11. CLEANUP REGRESSION TEST DATA
    console.log("\n  Cleaning up regression test records...");
    if (testWO) await prisma.workOrder.delete({ where: { id: testWO.id } }).catch(() => {});
    if (testPO) {
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: testPO.id } }).catch(() => {});
      await prisma.purchaseOrder.delete({ where: { id: testPO.id } }).catch(() => {});
    }
    if (testVendor) await prisma.vendor.delete({ where: { id: testVendor.id } }).catch(() => {});
    if (testPayment) await prisma.payment.delete({ where: { id: testPayment.id } }).catch(() => {});
    if (testInvoice) await prisma.invoice.delete({ where: { id: testInvoice.id } }).catch(() => {});
    if (testOrder) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
      await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
    }
    if (testQuotation) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: testQuotation.id } }).catch(() => {});
      await prisma.quotation.delete({ where: { id: testQuotation.id } }).catch(() => {});
    }
    if (testProduct) {
      await prisma.inventoryTransaction.deleteMany({ where: { productId: testProduct.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
    }
    if (testCustomer) await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});

    await prisma.$disconnect();

    console.log("\n=================================================");
    console.log("       REGRESSION TEST SUMMARY MATRIX            ");
    console.log("=================================================");
    console.table(results);
  }
}

runRegressionSuite();
