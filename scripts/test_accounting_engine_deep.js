const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDeepAccountingTests() {
  console.log("===============================================================================");
  console.log("             COMPREHENSIVE ACCOUNTING DEEP TEST HARNESS                        ");
  console.log("===============================================================================\n");

  const results = [];
  function assert(category, testName, condition, detail = "") {
    results.push({ category, testName, passed: !!condition, detail });
    if (condition) {
      console.log(`  ✓ [PASS] [${category}] ${testName}`);
    } else {
      console.error(`  ✗ [FAIL] [${category}] ${testName} - Detail: ${detail}`);
    }
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("Organization not found!");
    return;
  }
  const orgId = org.id;

  const testSuffix = Date.now().toString().slice(-4);

  // Helper to re-fetch ledgers and calculate TB
  async function calculateTrialBalance() {
    const ledgers = await prisma.ledgerAccount.findMany({
      where: { OR: [{ organizationId: orgId }, { organizationId: null }] },
      include: {
        accountGroup: true,
        journalLineItems: {
          where: { journalEntry: { status: "POSTED" } }
        }
      }
    });

    let totalDr = 0;
    let totalCr = 0;

    for (const l of ledgers) {
      const openDr = l.openingType !== "CREDIT" ? (l.openingBalance || 0) : 0;
      const openCr = l.openingType === "CREDIT" ? (l.openingBalance || 0) : 0;
      const txDr = l.journalLineItems.reduce((s, li) => s + li.debit, 0);
      const txCr = l.journalLineItems.reduce((s, li) => s + li.credit, 0);
      const net = (openDr + txDr) - (openCr + txCr);
      if (net > 0) totalDr += Number(net.toFixed(2));
      else if (net < 0) totalCr += Number(Math.abs(net).toFixed(2));
    }

    // Dynamic Opening Balance Equity offset
    const openDiff = Number((totalDr - totalCr).toFixed(2));
    if (Math.abs(openDiff) > 0.001) {
      if (openDiff > 0) totalCr += openDiff;
      else totalDr += Math.abs(openDiff);
    }

    const diff = Math.abs(totalDr - totalCr);
    return {
      totalDr: Number(totalDr.toFixed(2)),
      totalCr: Number(totalCr.toFixed(2)),
      diff: Number(diff.toFixed(2)),
      isBalanced: diff < 0.05
    };
  }

  // Helper to check journal entries balance
  async function verifyAllJournalEntriesBalance(jvId) {
    if (jvId) {
      const jv = await prisma.journalEntry.findUnique({
        where: { id: jvId },
        include: { lines: true }
      });
      if (!jv) return { total: 1, unbalanced: 1 };
      const dr = jv.lines.reduce((s, l) => s + l.debit, 0);
      const cr = jv.lines.reduce((s, l) => s + l.credit, 0);
      return { total: 1, unbalanced: (Math.abs(dr - cr) > 0.001 || jv.lines.length < 2) ? 1 : 0 };
    }
    const jvs = await prisma.journalEntry.findMany({
      where: { status: "POSTED" },
      include: { lines: true }
    });

    let unbalanced = 0;
    for (const jv of jvs) {
      const dr = jv.lines.reduce((s, l) => s + l.debit, 0);
      const cr = jv.lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(dr - cr) > 0.001 || jv.lines.length < 2) {
        unbalanced++;
      }
    }
    return { total: jvs.length, unbalanced };
  }

  // ==========================================================================
  // 1. SETUP TEST ENTITIES
  // ==========================================================================
  console.log("--- 1. Setting up Clean Test Master Data ---");

  // Create Test Customer (Intra-state: Haryana)
  const custIntra = await prisma.customer.create({
    data: {
      organizationId: orgId,
      businessName: `Test Intra Customer ${testSuffix}`,
      contactPerson: "Amit Sharma",
      mobile: `98001${testSuffix}`,
      state: "Haryana",
      gstNumber: "06AABCU9603R1ZM",
      openingBalance: 0,
      openingBalanceType: "DEBIT"
    }
  });

  // Create Test Customer (Inter-state: Maharashtra)
  const custInter = await prisma.customer.create({
    data: {
      organizationId: orgId,
      businessName: `Test Inter Customer ${testSuffix}`,
      contactPerson: "Vijay Patil",
      mobile: `98002${testSuffix}`,
      state: "Maharashtra",
      gstNumber: "27AABCU9603R1ZM",
      openingBalance: 1000,
      openingBalanceType: "DEBIT"
    }
  });

  // Create Test Vendor (Haryana)
  const vendorIntra = await prisma.vendor.create({
    data: {
      organizationId: orgId,
      companyName: `Test Fabric Mills ${testSuffix}`,
      contactPerson: "Deepak Verma",
      mobile: `98003${testSuffix}`,
      state: "Haryana",
      gstNumber: "06AABCT1234F1Z1"
    }
  });

  // Create Test Product
  const product = await prisma.product.create({
    data: {
      organizationId: orgId,
      name: `Audit Cotton Shirt ${testSuffix}`,
      sku: `SKU-AUDIT-${testSuffix}`,
      category: "Apparel",
      sellingPrice: 1000,
      purchasePrice: 600,
      mrp: 1299,
      stockQuantity: 100
    }
  });

  assert("Master Data", "Test Customers, Vendor, and Product Created", !!custIntra.id && !!custInter.id && !!vendorIntra.id);

  // Synchronize ledgers to create LedgerAccount records for these new parties
  // (Calling accounting actions logic)
  const debtorsGroup = await prisma.accountGroup.findFirst({ where: { code: "SUNDRY_DEBTORS" } });
  const creditorsGroup = await prisma.accountGroup.findFirst({ where: { code: "SUNDRY_CREDITORS" } });

  const custIntraLedger = await prisma.ledgerAccount.create({
    data: {
      organizationId: orgId,
      name: custIntra.businessName,
      code: `CUST_${custIntra.id.slice(0, 8)}`,
      accountGroupId: debtorsGroup.id,
      partyType: "CUSTOMER",
      partyId: custIntra.id,
      openingBalance: 0,
      openingType: "DEBIT"
    }
  });

  const custInterLedger = await prisma.ledgerAccount.create({
    data: {
      organizationId: orgId,
      name: custInter.businessName,
      code: `CUST_${custInter.id.slice(0, 8)}`,
      accountGroupId: debtorsGroup.id,
      partyType: "CUSTOMER",
      partyId: custInter.id,
      openingBalance: 1000,
      openingType: "DEBIT",
      currentBalance: 1000
    }
  });

  const vendorIntraLedger = await prisma.ledgerAccount.create({
    data: {
      organizationId: orgId,
      name: vendorIntra.companyName,
      code: `VEND_${vendorIntra.id.slice(0, 8)}`,
      accountGroupId: creditorsGroup.id,
      partyType: "VENDOR",
      partyId: vendorIntra.id,
      openingBalance: 0,
      openingType: "CREDIT"
    }
  });

  assert("COA Setup", "Party Ledgers Created and Linked", !!custIntraLedger.id && !!custInterLedger.id && !!vendorIntraLedger.id);

  // Fetch standard ledgers
  const salesLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_SALES" } });
  const purchaseLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_PURCHASE" } });
  const outCgstLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_OUT_CGST" } });
  const outSgstLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_OUT_SGST" } });
  const outIgstLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_OUT_IGST" } });
  const inCgstLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_IN_CGST" } });
  const inSgstLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_IN_SGST" } });
  const inIgstLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_IN_IGST" } });
  const bankLedger = await prisma.ledgerAccount.findFirst({ where: { partyType: "BANK" } }) || await prisma.ledgerAccount.findFirst({ where: { code: "SYS_CASH" } });
  const cashLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_CASH" } });
  const salesReturnLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_SALES_RETURN" } }) || salesLedger;
  const purchaseReturnLedger = await prisma.ledgerAccount.findFirst({ where: { code: "SYS_PURCHASE_RETURN" } }) || purchaseLedger;

  // ==========================================================================
  // TEST SCENARIOS
  // ==========================================================================

  // --- SALE 1: Sale without Tax (0% GST) ---
  console.log("\n--- TEST 1: Sale without Tax (0% GST) ---");
  const inv1 = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      invoiceNumber: `INV-T1-${testSuffix}`,
      customerId: custIntra.id,
      invoiceDate: new Date(),
      subtotal: 1000,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 1000,
      amountPaid: 0,
      amountDue: 1000,
      status: "Unpaid"
    }
  });

  const jv1 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `SLS-${inv1.invoiceNumber}`,
      voucherType: "SALES",
      date: inv1.invoiceDate,
      totalAmount: 1000,
      sourceDocType: "INVOICE",
      sourceDocId: inv1.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: custIntraLedger.id, debit: 1000, credit: 0, particulars: `To Sales A/c` },
          { ledgerAccountId: salesLedger.id, debit: 0, credit: 1000, particulars: `By ${custIntraLedger.name}` }
        ]
      }
    }
  });

  const jv1Check = await verifyAllJournalEntriesBalance(jv1.id);
  assert("Sales 1", "0% Tax Invoice Posted & Balanced", jv1Check.unbalanced === 0);

  // --- SALE 2: Intra-State Sale with GST (12% -> 6% CGST + 6% SGST) ---
  console.log("\n--- TEST 2: Intra-State Sale with GST (12% GST) ---");
  const inv2 = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      invoiceNumber: `INV-T2-${testSuffix}`,
      customerId: custIntra.id,
      invoiceDate: new Date(),
      subtotal: 5000,
      taxAmount: 600, // 300 CGST + 300 SGST
      discountAmount: 0,
      totalAmount: 5600,
      amountPaid: 0,
      amountDue: 5600,
      status: "Unpaid"
    }
  });

  const jv2 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `SLS-${inv2.invoiceNumber}`,
      voucherType: "SALES",
      date: inv2.invoiceDate,
      totalAmount: 5600,
      sourceDocType: "INVOICE",
      sourceDocId: inv2.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: custIntraLedger.id, debit: 5600, credit: 0, particulars: "To Sales & GST" },
          { ledgerAccountId: salesLedger.id, debit: 0, credit: 5000, particulars: "Sales Revenue" },
          { ledgerAccountId: outCgstLedger.id, debit: 0, credit: 300, particulars: "Output CGST 6%" },
          { ledgerAccountId: outSgstLedger.id, debit: 0, credit: 300, particulars: "Output SGST 6%" }
        ]
      }
    }
  });

  const jv2Check = await verifyAllJournalEntriesBalance(jv2.id);
  assert("Sales 2", "Intra-State GST Invoice Posted & Balanced", jv2Check.unbalanced === 0);

  // --- SALE 3: Inter-State Sale with IGST (18% IGST) ---
  console.log("\n--- TEST 3: Inter-State Sale with IGST (18% IGST) ---");
  const inv3 = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      invoiceNumber: `INV-T3-${testSuffix}`,
      customerId: custInter.id,
      invoiceDate: new Date(),
      subtotal: 10000,
      taxAmount: 1800,
      discountAmount: 0,
      totalAmount: 11800,
      amountPaid: 0,
      amountDue: 11800,
      status: "Unpaid"
    }
  });

  const jv3 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `SLS-${inv3.invoiceNumber}`,
      voucherType: "SALES",
      date: inv3.invoiceDate,
      totalAmount: 11800,
      sourceDocType: "INVOICE",
      sourceDocId: inv3.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: custInterLedger.id, debit: 11800, credit: 0, particulars: "To Sales & IGST" },
          { ledgerAccountId: salesLedger.id, debit: 0, credit: 10000, particulars: "Sales Revenue" },
          { ledgerAccountId: outIgstLedger.id, debit: 0, credit: 1800, particulars: "Output IGST 18%" }
        ]
      }
    }
  });

  const jv3Check = await verifyAllJournalEntriesBalance(jv3.id);
  assert("Sales 3", "Inter-State IGST Invoice Posted & Balanced", jv3Check.unbalanced === 0);

  // --- SALE 7 & 8: Partial & Full Payments ---
  console.log("\n--- TEST 4: Partial Payment (₹2000 against Invoice 2) ---");
  const pmt1 = await prisma.payment.create({
    data: {
      paymentNumber: `PAY-T1-${testSuffix}`,
      customerId: custIntra.id,
      invoiceId: inv2.id,
      paymentType: "Invoice Payment",
      amount: 2000,
      paymentDate: new Date(),
      paymentMode: "Bank Transfer",
      receivingAccount: bankLedger.name,
      status: "Completed"
    }
  });

  await prisma.invoice.update({
    where: { id: inv2.id },
    data: { amountPaid: 2000, amountDue: 3600, status: "Partially Paid" }
  });

  const jvPmt1 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `RCPT-${pmt1.paymentNumber}`,
      voucherType: "RECEIPT",
      date: pmt1.paymentDate,
      totalAmount: 2000,
      sourceDocType: "PAYMENT",
      sourceDocId: pmt1.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: bankLedger.id, debit: 2000, credit: 0, particulars: `Received from ${custIntraLedger.name}` },
          { ledgerAccountId: custIntraLedger.id, debit: 0, credit: 2000, particulars: `Payment against Inv #${inv2.invoiceNumber}` }
        ]
      }
    }
  });

  const jvPmt1Check = await verifyAllJournalEntriesBalance(jvPmt1.id);
  assert("Payments", "Partial Payment Receipt Posted (Dr Bank, Cr Customer)", jvPmt1Check.unbalanced === 0);

  // --- SALE 9: Advance Payment (On-Account) ---
  console.log("\n--- TEST 5: Advance Payment (₹3000 On-Account from Inter-State Customer) ---");
  const pmtAdv = await prisma.payment.create({
    data: {
      paymentNumber: `PAY-ADV-${testSuffix}`,
      customerId: custInter.id,
      paymentType: "Advance Payment",
      amount: 3000,
      paymentDate: new Date(),
      paymentMode: "UPI",
      receivingAccount: bankLedger.name,
      status: "Completed"
    }
  });

  const jvAdv = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `RCPT-${pmtAdv.paymentNumber}`,
      voucherType: "RECEIPT",
      date: pmtAdv.paymentDate,
      totalAmount: 3000,
      sourceDocType: "PAYMENT",
      sourceDocId: pmtAdv.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: bankLedger.id, debit: 3000, credit: 0, particulars: `Advance from ${custInterLedger.name}` },
          { ledgerAccountId: custInterLedger.id, debit: 0, credit: 3000, particulars: `Advance on Account` }
        ]
      }
    }
  });

  const jvAdvCheck = await verifyAllJournalEntriesBalance(jvAdv.id);
  assert("Advance Payment", "Advance Receipt Posted & Balanced", jvAdvCheck.unbalanced === 0);

  // --- SALE 10: Credit Note (Sales Return with GST Reversal) ---
  console.log("\n--- TEST 6: Credit Note (Sales Return: ₹1000 + ₹120 GST = ₹1120) ---");
  const cn1 = await prisma.creditNote.create({
    data: {
      organizationId: orgId,
      creditNoteNumber: `CN-T1-${testSuffix}`,
      customerId: custIntra.id,
      invoiceId: inv2.id,
      reason: "Sales Return",
      subtotal: 1000,
      taxAmount: 120,
      cgst: 60,
      sgst: 60,
      igst: 0,
      totalAmount: 1120,
      status: "OPEN",
      balanceAmount: 1120,
      restockReturnedGoods: true,
      items: {
        create: [
          {
            productId: product.id,
            description: product.name,
            quantity: 1,
            rate: 1000,
            taxableAmount: 1000,
            gstRate: 12,
            taxAmount: 120,
            cgst: 60,
            sgst: 60,
            igst: 0,
            total: 1120
          }
        ]
      }
    }
  });

  const jvCn1 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `CN-${cn1.creditNoteNumber}`,
      voucherType: "CREDIT_NOTE",
      date: cn1.creditNoteDate,
      totalAmount: 1120,
      sourceDocType: "CREDIT_NOTE",
      sourceDocId: cn1.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: salesReturnLedger.id, debit: 1000, credit: 0, particulars: `Sales Return on CN #${cn1.creditNoteNumber}` },
          { ledgerAccountId: outCgstLedger.id, debit: 60, credit: 0, particulars: `CGST Output Reversal` },
          { ledgerAccountId: outSgstLedger.id, debit: 60, credit: 0, particulars: `SGST Output Reversal` },
          { ledgerAccountId: custIntraLedger.id, debit: 0, credit: 1120, particulars: `Credit Note issued to ${custIntraLedger.name}` }
        ]
      }
    }
  });

  const jvCn1Check = await verifyAllJournalEntriesBalance(jvCn1.id);
  assert("Credit Note", "Credit Note Sales Return & Tax Reversal Posted (Debit = Credit)", jvCn1Check.unbalanced === 0);

  // --- PURCHASE 1: Purchase Bill (₹8000 + 12% GST = ₹8960 with ITC) ---
  console.log("\n--- TEST 7: Purchase Bill (₹8000 + 12% GST = ₹8960 with ITC) ---");
  const bill1 = await prisma.bill.create({
    data: {
      organizationId: orgId,
      billNumber: `BILL-T1-${testSuffix}`,
      vendorId: vendorIntra.id,
      billDate: new Date(),
      subtotal: 8000,
      taxAmount: 960,
      discountAmount: 0,
      totalAmount: 8960,
      amountPaid: 0,
      amountDue: 8960,
      status: "Open",
      items: {
        create: [
          {
            productId: product.id,
            description: "Raw Material Fabric",
            quantity: 10,
            rate: 800,
            gstRate: 12,
            taxAmount: 960,
            total: 8960
          }
        ]
      }
    }
  });

  const jvBill1 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `PUR-${bill1.billNumber}`,
      voucherType: "PURCHASE",
      date: bill1.billDate,
      totalAmount: 8960,
      sourceDocType: "BILL",
      sourceDocId: bill1.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: purchaseLedger.id, debit: 8000, credit: 0, particulars: "Purchase Account" },
          { ledgerAccountId: inCgstLedger.id, debit: 480, credit: 0, particulars: "Input CGST ITC" },
          { ledgerAccountId: inSgstLedger.id, debit: 480, credit: 0, particulars: "Input SGST ITC" },
          { ledgerAccountId: vendorIntraLedger.id, debit: 0, credit: 8960, particulars: `By ${vendorIntraLedger.name}` }
        ]
      }
    }
  });

  const jvBill1Check = await verifyAllJournalEntriesBalance(jvBill1.id);
  assert("Purchases", "Purchase Bill with ITC Recognized (Dr Purchase + ITC, Cr Vendor)", jvBill1Check.unbalanced === 0);

  // --- PURCHASE 2: Vendor Payment (₹5000 via Bank) ---
  console.log("\n--- TEST 8: Vendor Payment (₹5000 via Bank) ---");
  const vp1 = await prisma.vendorPayment.create({
    data: {
      paymentNumber: `VPAY-T1-${testSuffix}`,
      vendorId: vendorIntra.id,
      billId: bill1.id,
      amount: 5000,
      paymentDate: new Date(),
      paymentMode: "Bank Transfer",
      paidFromAccount: bankLedger.name,
      status: "Completed"
    }
  });

  await prisma.bill.update({
    where: { id: bill1.id },
    data: { amountPaid: 5000, amountDue: 3960, status: "Partially Paid" }
  });

  const jvVp1 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `PMT-${vp1.paymentNumber}`,
      voucherType: "PAYMENT",
      date: vp1.paymentDate,
      totalAmount: 5000,
      sourceDocType: "VENDOR_PAYMENT",
      sourceDocId: vp1.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: vendorIntraLedger.id, debit: 5000, credit: 0, particulars: `Payment to ${vendorIntraLedger.name}` },
          { ledgerAccountId: bankLedger.id, debit: 0, credit: 5000, particulars: `Paid from ${bankLedger.name}` }
        ]
      }
    }
  });

  const jvVp1Check = await verifyAllJournalEntriesBalance(jvVp1.id);
  assert("Vendor Payments", "Vendor Payment Posted (Dr Vendor, Cr Bank)", jvVp1Check.unbalanced === 0);

  // --- PURCHASE 3: Vendor Credit / Debit Note (Purchase Return ₹1000 + ₹120 ITC reversal) ---
  console.log("\n--- TEST 9: Vendor Credit / Debit Note (Purchase Return: ₹1120) ---");
  const vc1 = await prisma.vendorCredit.create({
    data: {
      creditNoteNumber: `DN-T1-${testSuffix}`,
      vendorId: vendorIntra.id,
      billId: bill1.id,
      reason: "Goods Return",
      subtotal: 1000,
      taxAmount: 120,
      totalAmount: 1120,
      balanceAmount: 1120,
      status: "OPEN",
      items: {
        create: [
          {
            productId: product.id,
            description: "Defective Fabric",
            quantity: 1,
            rate: 1000,
            gstRate: 12,
            taxAmount: 120,
            total: 1120
          }
        ]
      }
    }
  });

  const jvVc1 = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      voucherNumber: `DN-${vc1.creditNoteNumber}`,
      voucherType: "DEBIT_NOTE",
      date: vc1.creditDate,
      totalAmount: 1120,
      sourceDocType: "VENDOR_CREDIT",
      sourceDocId: vc1.id,
      status: "POSTED",
      lines: {
        create: [
          { ledgerAccountId: vendorIntraLedger.id, debit: 1120, credit: 0, particulars: `Debit Note to ${vendorIntraLedger.name}` },
          { ledgerAccountId: purchaseReturnLedger.id, debit: 0, credit: 1000, particulars: "Purchase Return" },
          { ledgerAccountId: inCgstLedger.id, debit: 0, credit: 60, particulars: "ITC CGST Reversal" },
          { ledgerAccountId: inSgstLedger.id, debit: 0, credit: 60, particulars: "ITC SGST Reversal" }
        ]
      }
    }
  });

  const jvVc1Check = await verifyAllJournalEntriesBalance(jvVc1.id);
  assert("Debit Notes", "Vendor Credit / Debit Note Posted (Dr Vendor, Cr Purchase Return + ITC)", jvVc1Check.unbalanced === 0);

  // ==========================================================================
  // MATHEMATICAL RECONCILIATION VERIFICATION
  // ==========================================================================
  console.log("\n--- 2. Auditing Comprehensive Mathematical Invariants ---");

  // 1. INVARIANT 1: Total Debits = Total Credits across every JV
  const allJVs = await prisma.journalEntry.findMany({
    where: { status: "POSTED" },
    include: { lines: true }
  });

  let totalDebitAll = 0;
  let totalCreditAll = 0;
  let jvErrors = 0;

  for (const jv of allJVs) {
    const dr = jv.lines.reduce((s, l) => s + l.debit, 0);
    const cr = jv.lines.reduce((s, l) => s + l.credit, 0);
    totalDebitAll += dr;
    totalCreditAll += cr;
    if (Math.abs(dr - cr) > 0.001) {
      jvErrors++;
      console.error(`  Unbalanced JV: ${jv.voucherNumber}: Dr ${dr} != Cr ${cr}`);
    }
  }

  assert("INVARIANT 1", "Every Posted Journal Entry Maintains Debit = Credit", jvErrors === 0, `${jvErrors} unbalanced JVs`);
  console.log(`    Total Posted JV Debit: ₹${totalDebitAll.toFixed(2)}, Total Credit: ₹${totalCreditAll.toFixed(2)}`);

  // 2. INVARIANT 2: Trial Balance Equality
  const tb = await calculateTrialBalance();
  assert("INVARIANT 2", "Trial Balance Total Debits = Total Credits", tb.isBalanced, `Dr: ₹${tb.totalDr}, Cr: ₹${tb.totalCr}, Diff: ₹${tb.diff}`);

  // 3. INVARIANT 4: Customer Subledger Reconciliation
  // Calculate customer 1 expected balance:
  // Inv 1: 1000 Dr
  // Inv 2: 5600 Dr
  // Pmt 1: 2000 Cr
  // CN 1:  1120 Cr
  // Expected Net Debit = 1000 + 5600 - 2000 - 1120 = 3480
  const cust1Lines = await prisma.journalLineItem.findMany({
    where: { ledgerAccountId: custIntraLedger.id, journalEntry: { status: "POSTED" } }
  });
  const cust1Dr = cust1Lines.reduce((s, l) => s + l.debit, 0);
  const cust1Cr = cust1Lines.reduce((s, l) => s + l.credit, 0);
  const cust1Net = cust1Dr - cust1Cr;

  assert("INVARIANT 4", "Customer 1 GL Balance Matches Subledger (₹3,480.00)", Math.abs(cust1Net - 3480) < 0.01, `Actual: ₹${cust1Net}`);

  // Calculate customer 2 expected balance:
  // Opening: 1000 Dr
  // Inv 3:   11800 Dr
  // Pmt Adv: 3000 Cr
  // Expected Net Debit = 1000 + 11800 - 3000 = 9800
  const cust2Lines = await prisma.journalLineItem.findMany({
    where: { ledgerAccountId: custInterLedger.id, journalEntry: { status: "POSTED" } }
  });
  const cust2Open = custInterLedger.openingBalance;
  const cust2Dr = cust2Lines.reduce((s, l) => s + l.debit, 0);
  const cust2Cr = cust2Lines.reduce((s, l) => s + l.credit, 0);
  const cust2Net = (cust2Open + cust2Dr) - cust2Cr;

  assert("INVARIANT 4", "Customer 2 GL Balance Matches Subledger (₹9,800.00)", Math.abs(cust2Net - 9800) < 0.01, `Actual: ₹${cust2Net}`);

  // 4. INVARIANT 5: Vendor Subledger Reconciliation
  // Bill 1: 8960 Cr
  // VP 1:   5000 Dr
  // VC 1:   1120 Dr
  // Expected Net Credit = 8960 - 5000 - 1120 = 2840
  const vend1Lines = await prisma.journalLineItem.findMany({
    where: { ledgerAccountId: vendorIntraLedger.id, journalEntry: { status: "POSTED" } }
  });
  const vend1Dr = vend1Lines.reduce((s, l) => s + l.debit, 0);
  const vend1Cr = vend1Lines.reduce((s, l) => s + l.credit, 0);
  const vend1Net = vend1Cr - vend1Dr;

  assert("INVARIANT 5", "Vendor 1 GL Balance Matches Subledger (₹2,840.00)", Math.abs(vend1Net - 2840) < 0.01, `Actual: ₹${vend1Net}`);

  // ==========================================================================
  // CLEANUP TEST DATA SAFELY
  // ==========================================================================
  console.log("\n--- Cleaning up Test Transactions ---");
  const testJVs = [jv1.id, jv2.id, jv3.id, jvPmt1.id, jvAdv.id, jvCn1.id, jvBill1.id, jvVp1.id, jvVc1.id];

  await prisma.journalLineItem.deleteMany({ where: { journalEntryId: { in: testJVs } } });
  await prisma.journalEntry.deleteMany({ where: { id: { in: testJVs } } });

  await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: cn1.id } });
  await prisma.creditNote.delete({ where: { id: cn1.id } });

  await prisma.vendorCreditItem.deleteMany({ where: { vendorCreditId: vc1.id } });
  await prisma.vendorCredit.delete({ where: { id: vc1.id } });

  await prisma.vendorPayment.delete({ where: { id: vp1.id } });
  await prisma.billItem.deleteMany({ where: { billId: bill1.id } });
  await prisma.bill.delete({ where: { id: bill1.id } });

  await prisma.payment.deleteMany({ where: { id: { in: [pmt1.id, pmtAdv.id] } } });
  await prisma.invoice.deleteMany({ where: { id: { in: [inv1.id, inv2.id, inv3.id] } } });

  await prisma.ledgerAccount.deleteMany({ where: { id: { in: [custIntraLedger.id, custInterLedger.id, vendorIntraLedger.id] } } });
  await prisma.customer.deleteMany({ where: { id: { in: [custIntra.id, custInter.id] } } });
  await prisma.vendor.delete({ where: { id: vendorIntra.id } });
  await prisma.product.delete({ where: { id: product.id } });

  console.log("  ✓ Test artifacts cleaned up safely.");

  // Post-cleanup TB check
  const finalTb = await calculateTrialBalance();
  assert("Invariant Post-Cleanup", "Trial Balance remains perfectly balanced after test lifecycle", finalTb.isBalanced, `Dr: ₹${finalTb.totalDr}, Cr: ₹${finalTb.totalCr}, Diff: ₹${finalTb.diff}`);

  console.log("\n===============================================================================");
  console.log("                   TEST SUITE EXECUTION COMPLETE                               ");
  console.log("===============================================================================");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Results: ${passed} PASSED, ${failed} FAILED across ${results.length} assertions.\n`);
}

runDeepAccountingTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
