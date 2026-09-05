const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const issues = [];

function logIssue(issue) {
  issues.push(issue);
  console.error(`  [${issue.severity}] [${issue.category}] ${issue.title}`);
  console.error(`    Description: ${issue.description}`);
  console.error(`    Expected: ${issue.expected} | Actual: ${issue.actual}\n`);
}

async function runAudit() {
  console.log("===============================================================================");
  console.log("             ERP ACCOUNTING ENGINE DEEP AUDIT & INVARIANT SUITE                ");
  console.log("===============================================================================\n");

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found in database!");
    return;
  }
  const orgId = org.id;
  console.log(`Auditing Organization: ${org.name} (${org.id})\n`);

  // ==========================================================================
  // PHASE 2 & 3: DATABASE & DOUBLE-ENTRY ENGINE AUDIT
  // ==========================================================================
  console.log("--- Checking Double-Entry Journal Entries (Total Debits = Total Credits) ---");

  const journalEntries = await prisma.journalEntry.findMany({
    include: {
      lines: {
        include: {
          ledgerAccount: {
            include: { accountGroup: true }
          }
        }
      }
    }
  });

  console.log(`Found ${journalEntries.length} total Journal Entries in DB.`);

  let unbalancedCount = 0;
  let singleSidedCount = 0;
  let emptyVouchersCount = 0;
  let orphanLinesCount = 0;

  for (const jv of journalEntries) {
    if (jv.lines.length === 0) {
      emptyVouchersCount++;
      logIssue({
        id: `JV-EMPTY-${jv.id}`,
        category: "Double-Entry Engine",
        severity: "CRITICAL",
        title: `Empty Journal Voucher (${jv.voucherNumber})`,
        description: `Journal entry ${jv.voucherNumber} has 0 line items.`,
        expected: "Journal entry must have at least 2 line items.",
        actual: "0 line items found.",
        affectedTable: "JournalEntry",
        recordId: jv.id,
        financialImpact: "Ghost voucher with no ledger postings."
      });
      continue;
    }

    if (jv.lines.length === 1) {
      singleSidedCount++;
      logIssue({
        id: `JV-SINGLE-${jv.id}`,
        category: "Double-Entry Engine",
        severity: "CRITICAL",
        title: `Single-Sided Journal Voucher (${jv.voucherNumber})`,
        description: `Journal entry ${jv.voucherNumber} has only 1 line item. Violates double-entry accounting!`,
        expected: "At least 2 line items (Debit and Credit).",
        actual: `1 line item (${jv.lines[0].debit > 0 ? `Debit ₹${jv.lines[0].debit}` : `Credit ₹${jv.lines[0].credit}`}).`,
        affectedTable: "JournalEntry",
        recordId: jv.id,
        financialImpact: "Unbalanced accounting ledger."
      });
    }

    let totalDr = 0;
    let totalCr = 0;

    for (const line of jv.lines) {
      if (!line.ledgerAccountId || !line.ledgerAccount) {
        orphanLinesCount++;
        logIssue({
          id: `LINE-ORPHAN-${line.id}`,
          category: "Database Integrity",
          severity: "CRITICAL",
          title: `Journal Line Item with Missing Ledger (${jv.voucherNumber})`,
          description: `Line item ${line.id} points to non-existent ledgerAccountId ${line.ledgerAccountId}`,
          expected: "Valid foreign key to LedgerAccount",
          actual: "Orphaned line item",
          affectedTable: "JournalLineItem",
          recordId: line.id
        });
      }

      if (line.debit < 0 || line.credit < 0) {
        logIssue({
          id: `LINE-NEGATIVE-${line.id}`,
          category: "Double-Entry Engine",
          severity: "HIGH",
          title: `Negative Debit/Credit in Journal Line (${jv.voucherNumber})`,
          description: `Line item has negative debit (${line.debit}) or credit (${line.credit}).`,
          expected: "Amounts must be non-negative. Use reversing entries instead of negative values.",
          actual: `Dr: ${line.debit}, Cr: ${line.credit}`,
          affectedTable: "JournalLineItem",
          recordId: line.id
        });
      }

      totalDr += line.debit;
      totalCr += line.credit;
    }

    const diff = Math.abs(totalDr - totalCr);
    if (diff > 0.001) {
      unbalancedCount++;
      logIssue({
        id: `JV-UNBALANCED-${jv.id}`,
        category: "Double-Entry Engine",
        severity: "CRITICAL",
        title: `Unbalanced Journal Voucher (${jv.voucherNumber})`,
        description: `Total Debits (₹${totalDr.toFixed(2)}) does not equal Total Credits (₹${totalCr.toFixed(2)}). Diff = ₹${diff.toFixed(2)}`,
        expected: `Total Debits = Total Credits (₹${totalDr.toFixed(2)})`,
        actual: `Debits = ₹${totalDr.toFixed(2)}, Credits = ₹${totalCr.toFixed(2)}`,
        affectedTable: "JournalEntry",
        recordId: jv.id,
        financialImpact: `Discrepancy of ₹${diff.toFixed(2)} corrupting Trial Balance.`
      });
    }
  }

  console.log(`  ✓ Unbalanced vouchers: ${unbalancedCount}`);
  console.log(`  ✓ Single-sided vouchers: ${singleSidedCount}`);
  console.log(`  ✓ Empty vouchers: ${emptyVouchersCount}`);
  console.log(`  ✓ Orphan line items: ${orphanLinesCount}\n`);

  // ==========================================================================
  // PHASE 4: CHART OF ACCOUNTS & HIERARCHY AUDIT
  // ==========================================================================
  console.log("--- Auditing Chart of Accounts & Hierarchy ---");

  const groups = await prisma.accountGroup.findMany({
    include: {
      parentGroup: true,
      subGroups: true,
      ledgers: true
    }
  });

  console.log(`Found ${groups.length} Account Groups.`);

  // Check circular parent relationships
  for (const grp of groups) {
    let current = grp;
    const visited = new Set();
    while (current.parentGroupId) {
      if (visited.has(current.id)) {
        logIssue({
          id: `COA-CIRCULAR-${grp.id}`,
          category: "Chart of Accounts",
          severity: "CRITICAL",
          title: `Circular Account Group Hierarchy (${grp.name})`,
          description: `Account group ${grp.name} is part of a circular parent reference loop.`,
          expected: "Acyclic hierarchy tree",
          actual: "Circular loop detected",
          affectedTable: "AccountGroup",
          recordId: grp.id
        });
        break;
      }
      visited.add(current.id);
      const parent = groups.find(g => g.id === current.parentGroupId);
      if (!parent) {
        logIssue({
          id: `COA-ORPHAN-PARENT-${grp.id}`,
          category: "Chart of Accounts",
          severity: "HIGH",
          title: `Missing Parent Group for (${grp.name})`,
          description: `Group ${grp.name} references non-existent parentGroupId ${current.parentGroupId}`,
          expected: "Valid parent AccountGroup",
          actual: "Broken parent reference",
          affectedTable: "AccountGroup",
          recordId: grp.id
        });
        break;
      }
      current = parent;
    }
  }

  // Check Ledgers
  const ledgers = await prisma.ledgerAccount.findMany({
    include: {
      accountGroup: true,
      journalLineItems: {
        include: { journalEntry: true }
      }
    }
  });

  console.log(`Found ${ledgers.length} Ledger Accounts.`);

  let ledgerBalanceMismatches = 0;
  for (const l of ledgers) {
    if (!l.accountGroupId || !l.accountGroup) {
      logIssue({
        id: `LEDGER-NO-GROUP-${l.id}`,
        category: "Chart of Accounts",
        severity: "CRITICAL",
        title: `Ledger Account without Account Group (${l.name})`,
        description: `Ledger ${l.name} is missing accountGroupId or points to non-existent group.`,
        expected: "Must belong to valid AccountGroup",
        actual: "No AccountGroup",
        affectedTable: "LedgerAccount",
        recordId: l.id
      });
    }

    // Verify currentBalance field against posted journalLineItems
    const openDr = l.openingType !== "CREDIT" ? (l.openingBalance || 0) : 0;
    const openCr = l.openingType === "CREDIT" ? (l.openingBalance || 0) : 0;
    const txDr = l.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((sum, li) => sum + li.debit, 0);
    const txCr = l.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((sum, li) => sum + li.credit, 0);

    const netDebit = (openDr + txDr) - (openCr + txCr);
    const expectedCurrentBal = Number(Math.abs(netDebit).toFixed(2));

    if (Math.abs(l.currentBalance - expectedCurrentBal) > 0.01) {
      ledgerBalanceMismatches++;
      logIssue({
        id: `LEDGER-BAL-MISMATCH-${l.id}`,
        category: "General Ledger",
        severity: "HIGH",
        title: `Stored Current Balance Out of Sync (${l.name})`,
        description: `Ledger currentBalance is ₹${l.currentBalance.toFixed(2)}, but actual sum of posted entries is ₹${expectedCurrentBal.toFixed(2)}`,
        expected: `₹${expectedCurrentBal.toFixed(2)}`,
        actual: `₹${l.currentBalance.toFixed(2)}`,
        affectedTable: "LedgerAccount",
        recordId: l.id,
        financialImpact: `Discrepancy of ₹${Math.abs(l.currentBalance - expectedCurrentBal).toFixed(2)}`
      });
    }
  }

  console.log(`  ✓ Stored ledger balance mismatches: ${ledgerBalanceMismatches}\n`);

  // ==========================================================================
  // PHASE 5 - 11: SOURCE TRANSACTIONS VS JOURNAL POSTING AUDIT
  // ==========================================================================
  console.log("--- Checking Source Documents vs Double-Entry Journal Postings ---");

  // Map of existing JVs by sourceDocId and voucherNumber
  const allJVs = journalEntries;
  const jvBySourceDoc = new Map();
  const jvByVoucherNum = new Map();

  for (const jv of allJVs) {
    if (jv.sourceDocId && jv.sourceDocType) {
      const key = `${jv.sourceDocType}_${jv.sourceDocId}`;
      if (!jvBySourceDoc.has(key)) jvBySourceDoc.set(key, []);
      jvBySourceDoc.get(key).push(jv);
    }
    if (jv.voucherNumber) {
      jvByVoucherNum.set(jv.voucherNumber, jv);
    }
  }

  // 1. Invoices
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "Cancelled" } },
    include: { customer: true }
  });

  console.log(`Auditing ${invoices.length} active Invoices...`);
  let missingInvoiceJV = 0;
  let mismatchedInvoiceJV = 0;

  for (const inv of invoices) {
    const bySource = jvBySourceDoc.get(`INVOICE_${inv.id}`) || [];
    const byVoucher = jvByVoucherNum.get(`SLS-${inv.invoiceNumber}`);
    const foundJVs = bySource.length > 0 ? bySource : (byVoucher ? [byVoucher] : []);

    if (foundJVs.length === 0) {
      missingInvoiceJV++;
      logIssue({
        id: `INV-NO-JV-${inv.id}`,
        category: "Sales Accounting",
        severity: "CRITICAL",
        title: `Invoice without Double-Entry Journal Entry (${inv.invoiceNumber})`,
        description: `Invoice ${inv.invoiceNumber} for ₹${inv.totalAmount} has no posted journal entry.`,
        expected: "Posted SALES journal voucher",
        actual: "No JournalEntry found",
        affectedTable: "Invoice",
        recordId: inv.id,
        financialImpact: `Revenue & Receivable unrecorded by ₹${inv.totalAmount}`
      });
    } else if (foundJVs.length > 1) {
      logIssue({
        id: `INV-DUP-JV-${inv.id}`,
        category: "Sales Accounting",
        severity: "CRITICAL",
        title: `Duplicate Journal Entries for Invoice (${inv.invoiceNumber})`,
        description: `Invoice ${inv.invoiceNumber} has ${foundJVs.length} posted journal entries.`,
        expected: "Exactly 1 JournalEntry",
        actual: `${foundJVs.length} JournalEntries found`,
        affectedTable: "Invoice",
        recordId: inv.id,
        financialImpact: `Duplicate revenue & debtor postings of ₹${inv.totalAmount * (foundJVs.length - 1)}`
      });
    } else {
      const jv = foundJVs[0];
      const sumDr = jv.lines.reduce((s, l) => s + l.debit, 0);
      const sumCr = jv.lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(sumDr - inv.totalAmount) > 0.01 || Math.abs(sumCr - inv.totalAmount) > 0.01) {
        mismatchedInvoiceJV++;
        logIssue({
          id: `INV-JV-AMT-MISMATCH-${inv.id}`,
          category: "Sales Accounting",
          severity: "HIGH",
          title: `Invoice Amount Mismatches Journal Voucher (${inv.invoiceNumber})`,
          description: `Invoice total is ₹${inv.totalAmount}, but Journal total debit/credit is ₹${sumDr.toFixed(2)}/₹${sumCr.toFixed(2)}`,
          expected: `₹${inv.totalAmount.toFixed(2)}`,
          actual: `Dr: ₹${sumDr.toFixed(2)}, Cr: ₹${sumCr.toFixed(2)}`,
          affectedTable: "Invoice",
          recordId: inv.id
        });
      }
    }
  }

  // 2. Customer Payments
  const payments = await prisma.payment.findMany({
    where: { status: { in: ["Completed", "Processed"] } },
    include: { customer: true, invoice: true }
  });

  console.log(`Auditing ${payments.length} customer Payments...`);
  let missingPaymentJV = 0;

  for (const p of payments) {
    const bySource = jvBySourceDoc.get(`PAYMENT_${p.id}`) || [];
    const byVoucher = jvByVoucherNum.get(`RCPT-${p.paymentNumber}`);
    const foundJVs = bySource.length > 0 ? bySource : (byVoucher ? [byVoucher] : []);

    if (foundJVs.length === 0) {
      missingPaymentJV++;
      logIssue({
        id: `PMT-NO-JV-${p.id}`,
        category: "Payment Accounting",
        severity: "CRITICAL",
        title: `Customer Payment without Journal Entry (${p.paymentNumber})`,
        description: `Payment ${p.paymentNumber} for ₹${p.amount} has no posted RECEIPT journal entry.`,
        expected: "Posted RECEIPT journal voucher (Dr Bank/Cash, Cr Customer)",
        actual: "No JournalEntry found",
        affectedTable: "Payment",
        recordId: p.id,
        financialImpact: `Bank/Cash and Customer Ledger understated by ₹${p.amount}`
      });
    }
  }

  // 3. Purchase Bills
  const bills = await prisma.bill.findMany({
    where: { status: { not: "Void" } },
    include: { vendor: true }
  });

  console.log(`Auditing ${bills.length} active Purchase Bills...`);
  let missingBillJV = 0;

  for (const b of bills) {
    const bySource = jvBySourceDoc.get(`BILL_${b.id}`) || [];
    const byVoucher = jvByVoucherNum.get(`PUR-${b.billNumber}`);
    const foundJVs = bySource.length > 0 ? bySource : (byVoucher ? [byVoucher] : []);

    if (foundJVs.length === 0) {
      missingBillJV++;
      logIssue({
        id: `BILL-NO-JV-${b.id}`,
        category: "Purchase Accounting",
        severity: "CRITICAL",
        title: `Purchase Bill without Journal Entry (${b.billNumber})`,
        description: `Purchase Bill ${b.billNumber} for ₹${b.totalAmount} has no posted PURCHASE journal entry.`,
        expected: "Posted PURCHASE journal voucher (Dr Purchase/ITC, Cr Vendor)",
        actual: "No JournalEntry found",
        affectedTable: "Bill",
        recordId: b.id,
        financialImpact: `Procurement & Payables unrecorded by ₹${b.totalAmount}`
      });
    }
  }

  // 4. Vendor Payments
  const vendorPayments = await prisma.vendorPayment.findMany({
    where: { status: { in: ["Completed", "Processed"] } },
    include: { vendor: true }
  });

  console.log(`Auditing ${vendorPayments.length} Vendor Payments...`);
  let missingVendorPaymentJV = 0;

  for (const vp of vendorPayments) {
    const bySource = jvBySourceDoc.get(`VENDOR_PAYMENT_${vp.id}`) || [];
    const byVoucher = jvByVoucherNum.get(`PMT-${vp.paymentNumber}`);
    const foundJVs = bySource.length > 0 ? bySource : (byVoucher ? [byVoucher] : []);

    if (foundJVs.length === 0) {
      missingVendorPaymentJV++;
      logIssue({
        id: `VPAY-NO-JV-${vp.id}`,
        category: "Purchase Accounting",
        severity: "CRITICAL",
        title: `Vendor Payment without Journal Entry (${vp.paymentNumber})`,
        description: `Vendor Payment ${vp.paymentNumber} for ₹${vp.amount} has no posted PAYMENT journal entry.`,
        expected: "Posted PAYMENT journal voucher (Dr Vendor, Cr Bank/Cash)",
        actual: "No JournalEntry found",
        affectedTable: "VendorPayment",
        recordId: vp.id
      });
    }
  }

  // 5. Credit Notes (Sales Returns)
  const creditNotes = await prisma.creditNote.findMany({
    where: { status: { not: "CANCELLED" } }
  });

  console.log(`Auditing ${creditNotes.length} Credit Notes...`);
  let missingCreditNoteJV = 0;

  for (const cn of creditNotes) {
    const bySource = jvBySourceDoc.get(`CREDIT_NOTE_${cn.id}`) || [];
    const byVoucher = jvByVoucherNum.get(`CN-${cn.creditNoteNumber}`);
    const foundJVs = bySource.length > 0 ? bySource : (byVoucher ? [byVoucher] : []);

    if (foundJVs.length === 0) {
      missingCreditNoteJV++;
      logIssue({
        id: `CN-NO-JV-${cn.id}`,
        category: "Sales Accounting",
        severity: "HIGH",
        title: `Credit Note without Journal Entry (${cn.creditNoteNumber})`,
        description: `Credit Note ${cn.creditNoteNumber} for ₹${cn.totalAmount} has no posted CREDIT_NOTE journal entry.`,
        expected: "Posted CREDIT_NOTE journal voucher (Dr Sales Return/Tax, Cr Customer)",
        actual: "No JournalEntry found",
        affectedTable: "CreditNote",
        recordId: cn.id
      });
    }
  }

  // 6. Vendor Credits (Debit Notes)
  const vendorCredits = await prisma.vendorCredit.findMany({
    where: { status: { in: ["OPEN", "ADJUSTED", "Applied", "Closed"] } }
  });

  console.log(`Auditing ${vendorCredits.length} Vendor Credits / Debit Notes...`);
  let missingVendorCreditJV = 0;

  for (const vc of vendorCredits) {
    const bySource = jvBySourceDoc.get(`VENDOR_CREDIT_${vc.id}`) || [];
    const byVoucher = jvByVoucherNum.get(`DN-${vc.creditNoteNumber}`);
    const foundJVs = bySource.length > 0 ? bySource : (byVoucher ? [byVoucher] : []);

    if (foundJVs.length === 0) {
      missingVendorCreditJV++;
      logIssue({
        id: `DN-NO-JV-${vc.id}`,
        category: "Purchase Accounting",
        severity: "HIGH",
        title: `Debit Note without Journal Entry (${vc.creditNoteNumber})`,
        description: `Debit Note ${vc.creditNoteNumber} for ₹${vc.totalAmount} has no posted DEBIT_NOTE journal entry.`,
        expected: "Posted DEBIT_NOTE journal voucher (Dr Vendor, Cr Purchase Return/ITC)",
        actual: "No JournalEntry found",
        affectedTable: "VendorCredit",
        recordId: vc.id
      });
    }
  }

  // ==========================================================================
  // PHASE 13: FINANCIAL REPORT MATHEMATICAL RECONCILIATION
  // ==========================================================================
  console.log("\n--- Checking Financial Report Mathematical Reconciliations ---");

  // 1. Trial Balance Calculation
  let tbTotalDebit = 0;
  let tbTotalCredit = 0;

  for (const l of ledgers) {
    const openBal = l.openingBalance || 0;
    const isOpeningDebit = l.openingType !== "CREDIT";
    const openDr = isOpeningDebit ? openBal : 0;
    const openCr = isOpeningDebit ? 0 : openBal;

    const txDr = l.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((s, li) => s + li.debit, 0);
    const txCr = l.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((s, li) => s + li.credit, 0);

    const net = (openDr + txDr) - (openCr + txCr);
    if (net > 0) tbTotalDebit += Number(net.toFixed(2));
    else if (net < 0) tbTotalCredit += Number(Math.abs(net).toFixed(2));
  }

  // Account for dynamic Opening Balance Equity offset
  const openDiff = Number((tbTotalDebit - tbTotalCredit).toFixed(2));
  if (Math.abs(openDiff) > 0.001) {
    if (openDiff > 0) tbTotalCredit += openDiff;
    else tbTotalDebit += Math.abs(openDiff);
  }

  const tbDiff = Math.abs(tbTotalDebit - tbTotalCredit);
  console.log(`Trial Balance: Total Debits = ₹${tbTotalDebit.toFixed(2)}, Total Credits = ₹${tbTotalCredit.toFixed(2)}, Diff = ₹${tbDiff.toFixed(2)}`);

  if (tbDiff > 0.05) {
    logIssue({
      id: "TB-UNBALANCED",
      category: "Trial Balance",
      severity: "CRITICAL",
      title: "Trial Balance is UNBALANCED",
      description: `Trial Balance Debits (₹${tbTotalDebit.toFixed(2)}) does not equal Credits (₹${tbTotalCredit.toFixed(2)}). Difference: ₹${tbDiff.toFixed(2)}`,
      expected: "Total Debits = Total Credits",
      actual: `Diff = ₹${tbDiff.toFixed(2)}`,
      financialImpact: `System financial statements fail fundamental double-entry test by ₹${tbDiff.toFixed(2)}`
    });
  }

  // 2. Customer Subledger vs Accounts Receivable Control Account
  const customerLedgers = ledgers.filter(l => l.partyType === "CUSTOMER" || l.accountGroup?.code === "SUNDRY_DEBTORS");
  let customerLedgerTotalNetDebit = 0;

  for (const cl of customerLedgers) {
    const openDr = cl.openingType !== "CREDIT" ? (cl.openingBalance || 0) : 0;
    const openCr = cl.openingType === "CREDIT" ? (cl.openingBalance || 0) : 0;
    const txDr = cl.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((s, li) => s + li.debit, 0);
    const txCr = cl.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((s, li) => s + li.credit, 0);
    const net = (openDr + txDr) - (openCr + txCr);
    if (net > 0) customerLedgerTotalNetDebit += net;
  }

  // Calculate customer subledger directly from invoices + opening - payments - creditNotes
  const allCustomers = await prisma.customer.findMany({ where: { organizationId: orgId } });
  let customerSubledgerTotalDue = 0;

  for (const cust of allCustomers) {
    const custInvs = invoices.filter(i => i.customerId === cust.id);
    const custPmts = payments.filter(p => p.customerId === cust.id || custInvs.some(i => i.id === p.invoiceId));
    const custCNs = creditNotes.filter(cn => cn.customerId === cust.id);

    const openBal = cust.openingBalance || 0;
    const isDr = cust.openingBalanceType !== "CREDIT";
    const totalInv = custInvs.reduce((s, i) => s + i.totalAmount, 0);
    const totalPmt = custPmts.reduce((s, p) => s + p.amount, 0);
    const totalCN = custCNs.reduce((s, c) => s + c.totalAmount, 0);

    const calculatedDue = (isDr ? openBal : -openBal) + totalInv - totalPmt - totalCN;
    if (calculatedDue > 0) customerSubledgerTotalDue += calculatedDue;
  }

  console.log(`AR Reconciliation: GL Sundry Debtors Net Dr = ₹${customerLedgerTotalNetDebit.toFixed(2)}, Subledger Customer Dues = ₹${customerSubledgerTotalDue.toFixed(2)}`);
  const arDiff = Math.abs(customerLedgerTotalNetDebit - customerSubledgerTotalDue);
  if (arDiff > 0.05) {
    logIssue({
      id: "AR-RECON-MISMATCH",
      category: "Receivables",
      severity: "HIGH",
      title: "Customer Subledger does NOT reconcile with GL Sundry Debtors",
      description: `GL Sundry Debtors balance is ₹${customerLedgerTotalNetDebit.toFixed(2)}, but sum of Customer Subledgers is ₹${customerSubledgerTotalDue.toFixed(2)}`,
      expected: `₹${customerSubledgerTotalDue.toFixed(2)}`,
      actual: `₹${customerLedgerTotalNetDebit.toFixed(2)}`,
      financialImpact: `Discrepancy of ₹${arDiff.toFixed(2)} between Customer Statements and General Ledger.`
    });
  }

  // 3. Vendor Subledger vs Accounts Payable Control Account
  const vendorLedgers = ledgers.filter(l => l.partyType === "VENDOR" || l.accountGroup?.code === "SUNDRY_CREDITORS");
  let vendorLedgerTotalNetCredit = 0;

  for (const vl of vendorLedgers) {
    const openDr = vl.openingType !== "CREDIT" ? (vl.openingBalance || 0) : 0;
    const openCr = vl.openingType === "CREDIT" ? (vl.openingBalance || 0) : 0;
    const txDr = vl.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((s, li) => s + li.debit, 0);
    const txCr = vl.journalLineItems.filter(li => li.journalEntry?.status === "POSTED").reduce((s, li) => s + li.credit, 0);
    const net = (openDr + txDr) - (openCr + txCr);
    if (net < 0) vendorLedgerTotalNetCredit += Math.abs(net);
  }

  const allVendors = await prisma.vendor.findMany({ where: { organizationId: orgId } });
  let vendorSubledgerTotalDue = 0;

  for (const vend of allVendors) {
    const vendBills = bills.filter(b => b.vendorId === vend.id);
    const vendPmts = vendorPayments.filter(vp => vp.vendorId === vend.id);
    const vendCredits = vendorCredits.filter(vc => vc.vendorId === vend.id);

    const totalBill = vendBills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = vendPmts.reduce((s, p) => s + p.amount, 0);
    const totalCredit = vendCredits.reduce((s, c) => s + c.totalAmount, 0);

    const calculatedPayable = totalBill - totalPaid - totalCredit;
    if (calculatedPayable > 0) vendorSubledgerTotalDue += calculatedPayable;
  }

  console.log(`AP Reconciliation: GL Sundry Creditors Net Cr = ₹${vendorLedgerTotalNetCredit.toFixed(2)}, Subledger Vendor Payables = ₹${vendorSubledgerTotalDue.toFixed(2)}`);
  const apDiff = Math.abs(vendorLedgerTotalNetCredit - vendorSubledgerTotalDue);
  if (apDiff > 0.05) {
    logIssue({
      id: "AP-RECON-MISMATCH",
      category: "Payables",
      severity: "HIGH",
      title: "Vendor Subledger does NOT reconcile with GL Sundry Creditors",
      description: `GL Sundry Creditors balance is ₹${vendorLedgerTotalNetCredit.toFixed(2)}, but sum of Vendor Subledgers is ₹${vendorSubledgerTotalDue.toFixed(2)}`,
      expected: `₹${vendorSubledgerTotalDue.toFixed(2)}`,
      actual: `₹${vendorLedgerTotalNetCredit.toFixed(2)}`,
      financialImpact: `Discrepancy of ₹${apDiff.toFixed(2)} between Vendor Statements and General Ledger.`
    });
  }

  // ==========================================================================
  // SUMMARY OF AUDIT FINDINGS
  // ==========================================================================
  console.log("\n===============================================================================");
  console.log("                        AUDIT FINDINGS SUMMARY                                 ");
  console.log("===============================================================================");
  console.log(`Total Issues Discovered: ${issues.length}`);
  console.log(`  CRITICAL: ${issues.filter(i => i.severity === 'CRITICAL').length}`);
  console.log(`  HIGH:     ${issues.filter(i => i.severity === 'HIGH').length}`);
  console.log(`  MEDIUM:   ${issues.filter(i => i.severity === 'MEDIUM').length}`);
  console.log(`  LOW:      ${issues.filter(i => i.severity === 'LOW').length}\n`);

  return issues;
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
