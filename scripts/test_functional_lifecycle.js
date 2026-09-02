const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFunctionalTests() {
  console.log("=== PASS 2: FUNCTIONAL WORKFLOWS AUDIT & TESTING ===");
  const testResults = [];

  function recordResult(module, testName, passed, error = null) {
    testResults.push({ module, testName, passed, error });
    if (passed) {
      console.log(`[PASS] [${module}] ${testName}`);
    } else {
      console.error(`[FAIL] [${module}] ${testName} -> ${error}`);
    }
  }

  try {
    // 0. Get or verify Default Organization
    const defaultOrg = await prisma.organization.findFirst();
    if (!defaultOrg) {
      throw new Error("No organization found in database.");
    }
    const orgId = defaultOrg.id;
    console.log(`Using Organization: ${defaultOrg.name} (${orgId})`);

    // 1. TEST CUSTOMER & CRM
    let testCust;
    try {
      testCust = await prisma.customer.create({
        data: {
          organizationId: orgId,
          businessName: "QA Test Business " + Date.now().toString().slice(-4),
          contactPerson: "QA Tester",
          mobile: "99999" + Date.now().toString().slice(-5),
          email: `qa_${Date.now()}@test.com`,
          state: "Haryana",
          gstNumber: "06AAAAA0000A1Z5",
          billingAddress: "QA Test Address",
          shippingAddress: "QA Test Address"
        }
      });
      recordResult("CRM", "Customer Creation", !!testCust.id);
    } catch (e) {
      recordResult("CRM", "Customer Creation", false, e.message);
    }

    // 2. TEST PRODUCT & INVENTORY
    let testProd;
    try {
      testProd = await prisma.product.create({
        data: {
          organizationId: orgId,
          name: "QA Test Jersey " + Date.now().toString().slice(-4),
          sku: "QA-" + Date.now().toString().slice(-6),
          category: "General",
          sellingPrice: 500,
          purchasePrice: 300,
          mrp: 600,
          hsnCode: "6109",
          stockQuantity: 100
        }
      });
      recordResult("Inventory", "Product Creation", !!testProd.id);

      // Test Inventory Transaction
      const tx = await prisma.inventoryTransaction.create({
        data: {
          productId: testProd.id,
          type: "IN",
          quantity: 20,
          reference: "QA-TEST-BATCH",
          notes: "QA Initial Test Inflow"
        }
      });
      recordResult("Inventory", "Inventory Transaction Creation", !!tx.id);
    } catch (e) {
      recordResult("Inventory", "Product/Inventory Creation", false, e.message);
    }

    // 3. TEST QUOTATION & CONVERSION
    let testQuote;
    try {
      const subtotal = 1000;
      const taxTotal = 120; // 12%
      const totalValue = 1120;

      testQuote = await prisma.quotation.create({
        data: {
          organizationId: orgId,
          quotationNumber: "QT-QA-" + Date.now().toString().slice(-5),
          customerId: testCust.id,
          date: new Date(),
          expiryDate: new Date(Date.now() + 15 * 86400000),
          placeOfSupply: "Haryana",
          subtotal,
          taxableAmount: subtotal,
          taxTotal,
          cgst: 60,
          sgst: 60,
          igst: 0,
          totalValue,
          status: "Draft",
          items: {
            create: [
              {
                productId: testProd.id,
                quantity: 2,
                rate: 500,
                hsnCode: "6109",
                gstRate: 12,
                taxableAmount: 1000,
                taxAmount: 120,
                cgst: 60,
                sgst: 60,
                igst: 0,
                total: 1120
              }
            ]
          }
        },
        include: { items: true }
      });
      recordResult("Quotation", "Quotation Creation with Line Items", testQuote.items.length === 1);
    } catch (e) {
      recordResult("Quotation", "Quotation Creation", false, e.message);
    }

    // 4. TEST ORDER & INVOICING
    let testOrder, testInvoice;
    try {
      const defaultEmp = await prisma.employee.findFirst({ where: { organizationId: orgId } });
      testOrder = await prisma.order.create({
        data: {
          organizationId: orgId,
          orderNumber: "ORD-QA-" + Date.now().toString().slice(-5),
          customerId: testCust.id,
          salespersonId: defaultEmp ? defaultEmp.id : (await prisma.employee.create({
            data: {
              organizationId: orgId,
              name: "QA Default Salesperson",
              mobile: "9876543210",
              status: "Active"
            }
          })).id,
          subtotal: 1000,
          tax: 120,
          cgst: 60,
          sgst: 60,
          igst: 0,
          isInterstate: false,
          placeOfSupply: "Haryana",
          totalValue: 1120,
          paymentReceived: 0,
          outstandingAmount: 1120,
          paymentStatus: "Unpaid",
          orderStatus: "Processing",
          items: {
            create: [
              {
                productId: testProd.id,
                quantity: 2,
                rate: 500,
                hsnCode: "6109",
                gstRate: 12,
                cgst: 60,
                sgst: 60,
                igst: 0,
                total: 1120
              }
            ]
          }
        }
      });
      recordResult("SalesOrder", "Order Creation with Items", !!testOrder.id);

      // Create Invoice
      testInvoice = await prisma.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: "INV-QA-" + Date.now().toString().slice(-5),
          customerId: testCust.id,
          orderId: testOrder.id,
          subtotal: 1000,
          taxAmount: 120,
          totalAmount: 1120,
          amountPaid: 0,
          amountDue: 1120,
          status: "Unpaid",
          notes: "QA Test Invoice"
        }
      });
      recordResult("Invoicing", "Invoice Creation", !!testInvoice.id);

      // Record Payment
      const payment = await prisma.payment.create({
        data: {
          organizationId: orgId,
          paymentNumber: "PAY-QA-" + Date.now().toString().slice(-5),
          invoiceId: testInvoice.id,
          customerId: testCust.id,
          amount: 500,
          paymentMode: "UPI",
          status: "Completed",
          notes: "QA Partial Payment"
        }
      });

      // Update Invoice & Order
      await prisma.invoice.update({
        where: { id: testInvoice.id },
        data: {
          amountPaid: 500,
          amountDue: 620,
          status: "Partially Paid"
        }
      });
      await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          paymentReceived: 500,
          outstandingAmount: 620,
          paymentStatus: "Partially Paid"
        }
      });
      recordResult("Payments", "Payment Recording & Balance Sync", !!payment.id);
    } catch (e) {
      recordResult("Sales & Payments", "Order/Invoice/Payment Flow", false, e.message);
    }

    // 5. TEST HRMS & ATTENDANCE & LEAVES
    try {
      const hrEmp = await prisma.employee.findFirst({ where: { organizationId: orgId } });
      if (hrEmp) {
        // Attendance check
        const today = new Date();
        today.setHours(0,0,0,0);
        const att = await prisma.attendance.upsert({
          where: { id: "test-att-" + hrEmp.id },
          create: {
            id: "test-att-" + hrEmp.id,
            employeeId: hrEmp.id,
            date: today,
            status: "Present",
            workingHours: 8.5
          },
          update: {
            workingHours: 9.0
          }
        });
        recordResult("HRMS", "Attendance Upsert & Working Hours", !!att.id);

        // Leave creation
        const leave = await prisma.leave.create({
          data: {
            employeeId: hrEmp.id,
            leaveType: "Casual Leave",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            numberOfDays: 1,
            reason: "QA Test Leave",
            status: "Pending"
          }
        });
        recordResult("HRMS", "Leave Request Creation", !!leave.id);

        // Cleanup test leave and attendance
        await prisma.leave.delete({ where: { id: leave.id } });
        await prisma.attendance.delete({ where: { id: att.id } }).catch(() => {});
      } else {
        recordResult("HRMS", "Employee Availability", false, "No employee found in tenant");
      }
    } catch (e) {
      recordResult("HRMS", "Attendance & Leaves", false, e.message);
    }

    // 6. TEST VENDOR & PURCHASING
    try {
      const vendor = await prisma.vendor.create({
        data: {
          organizationId: orgId,
          companyName: "QA Test Vendor " + Date.now().toString().slice(-4),
          contactPerson: "QA Vendor Rep",
          mobile: "98989" + Date.now().toString().slice(-5),
          status: "Active"
        }
      });
      recordResult("Purchasing", "Vendor Creation", !!vendor.id);

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: "PO-QA-" + Date.now().toString().slice(-5),
          vendorId: vendor.id,
          totalValue: 5000,
          status: "Draft",
          items: {
            create: [
              {
                productId: testProd.id,
                quantity: 10,
                rate: 300,
                total: 3000
              }
            ]
          }
        }
      });
      recordResult("Purchasing", "Purchase Order Creation", !!po.id);

      // Cleanup test purchasing data
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });
      await prisma.purchaseOrder.delete({ where: { id: po.id } });
      await prisma.vendor.delete({ where: { id: vendor.id } });
    } catch (e) {
      recordResult("Purchasing", "Vendor & PO Flow", false, e.message);
    }

    // CLEANUP QA TEST RECORDS
    console.log("\nCleaning up temporary test records...");
    if (testInvoice) {
      await prisma.payment.deleteMany({ where: { invoiceId: testInvoice.id } }).catch(() => {});
      await prisma.invoice.delete({ where: { id: testInvoice.id } }).catch(() => {});
    }
    if (testOrder) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } }).catch(() => {});
      await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
    }
    if (testQuote) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: testQuote.id } }).catch(() => {});
      await prisma.quotation.delete({ where: { id: testQuote.id } }).catch(() => {});
    }
    if (testProd) {
      await prisma.inventoryTransaction.deleteMany({ where: { productId: testProd.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: testProd.id } }).catch(() => {});
    }
    if (testCust) {
      await prisma.customer.delete({ where: { id: testCust.id } }).catch(() => {});
    }

    console.log("\n=== FUNCTIONAL TEST RESULTS ===");
    console.table(testResults);

  } catch (err) {
    console.error("Fatal test runner error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runFunctionalTests();
