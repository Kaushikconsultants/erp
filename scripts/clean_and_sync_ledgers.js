const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning stale test entities from cancelled runs...");

  // 1. Delete test JVs first
  const testJVs = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: "-T1-" } },
        { voucherNumber: { contains: "-T2-" } },
        { voucherNumber: { contains: "-T3-" } },
        { narration: { contains: "Test " } },
        { voucherNumber: { startsWith: "SLS-INV-T" } },
        { voucherNumber: { startsWith: "RCPT-PAY-T" } },
        { voucherNumber: { startsWith: "RCPT-PAY-ADV-" } },
        { voucherNumber: { startsWith: "CN-CN-T" } },
        { voucherNumber: { startsWith: "PUR-BILL-T" } },
        { voucherNumber: { startsWith: "PMT-VPAY-T" } },
        { voucherNumber: { startsWith: "DN-DN-T" } }
      ]
    },
    select: { id: true }
  });
  const testJvIds = testJVs.map(j => j.id);
  console.log(`Found ${testJvIds.length} test JVs to remove.`);

  if (testJvIds.length > 0) {
    await prisma.journalLineItem.deleteMany({ where: { journalEntryId: { in: testJvIds } } });
    await prisma.journalEntry.deleteMany({ where: { id: { in: testJvIds } } });
  }

  // 2. Delete test Credit Notes
  const testCNs = await prisma.creditNote.findMany({
    where: {
      creditNoteNumber: { startsWith: "CN-T" }
    },
    select: { id: true }
  });
  if (testCNs.length > 0) {
    const cnIds = testCNs.map(c => c.id);
    await prisma.creditNoteItem.deleteMany({ where: { creditNoteId: { in: cnIds } } });
    await prisma.creditNote.deleteMany({ where: { id: { in: cnIds } } });
  }

  // 3. Delete test Vendor Credits
  const testVCs = await prisma.vendorCredit.findMany({
    where: {
      creditNoteNumber: { startsWith: "DN-T" }
    },
    select: { id: true }
  });
  if (testVCs.length > 0) {
    const vcIds = testVCs.map(c => c.id);
    await prisma.vendorCreditItem.deleteMany({ where: { vendorCreditId: { in: vcIds } } });
    await prisma.vendorCredit.deleteMany({ where: { id: { in: vcIds } } });
  }

  // 4. Delete test Vendor Payments
  await prisma.vendorPayment.deleteMany({
    where: {
      paymentNumber: { startsWith: "VPAY-T" }
    }
  });

  // 5. Delete test Bills
  const testBills = await prisma.bill.findMany({
    where: { billNumber: { startsWith: "BILL-T" } },
    select: { id: true }
  });
  if (testBills.length > 0) {
    const bIds = testBills.map(b => b.id);
    await prisma.billItem.deleteMany({ where: { billId: { in: bIds } } });
    await prisma.bill.deleteMany({ where: { id: { in: bIds } } });
  }

  // 6. Delete test Payments
  await prisma.payment.deleteMany({
    where: {
      OR: [
        { paymentNumber: { startsWith: "PAY-T" } },
        { paymentNumber: { startsWith: "PAY-ADV-" } }
      ]
    }
  });

  // 7. Delete test Invoices
  await prisma.invoice.deleteMany({
    where: {
      invoiceNumber: { startsWith: "INV-T" }
    }
  });

  // 8. Delete test Ledgers & Parties
  const testCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        { businessName: { startsWith: "Test " } },
        { contactPerson: { in: ["Aakash Sharma", "Vijay Patil"] } }
      ]
    },
    select: { id: true }
  });
  const custIds = testCustomers.map(c => c.id);

  const testVendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { companyName: { startsWith: "Test " } },
        { contactPerson: "Deepak Verma" }
      ]
    },
    select: { id: true }
  });
  const vendIds = testVendors.map(v => v.id);

  const partyIds = [...custIds, ...vendIds];
  if (partyIds.length > 0) {
    const partyLedgers = await prisma.ledgerAccount.findMany({
      where: { partyId: { in: partyIds } },
      select: { id: true }
    });
    const plIds = partyLedgers.map(l => l.id);
    if (plIds.length > 0) {
      await prisma.journalLineItem.deleteMany({ where: { ledgerAccountId: { in: plIds } } });
      await prisma.ledgerAccount.deleteMany({ where: { id: { in: plIds } } });
    }
    if (custIds.length > 0) await prisma.customer.deleteMany({ where: { id: { in: custIds } } });
    if (vendIds.length > 0) await prisma.vendor.deleteMany({ where: { id: { in: vendIds } } });
  }

  await prisma.product.deleteMany({
    where: {
      OR: [
        { name: { startsWith: "Audit Cotton Shirt" } },
        { sku: { startsWith: "SKU-AUDIT-" } }
      ]
    }
  });

  console.log("✓ Stale test data cleaned.");

  // Sync balances only for mismatched ledgers
  const allLedgers = await prisma.ledgerAccount.findMany({
    include: {
      journalLineItems: {
        where: { journalEntry: { status: "POSTED" } }
      }
    }
  });

  let synced = 0;
  for (const l of allLedgers) {
    const openDr = l.openingType !== "CREDIT" ? (l.openingBalance || 0) : 0;
    const openCr = l.openingType === "CREDIT" ? (l.openingBalance || 0) : 0;
    const txDr = l.journalLineItems.reduce((acc, item) => acc + (item.debit || 0), 0);
    const txCr = l.journalLineItems.reduce((acc, item) => acc + (item.credit || 0), 0);

    const netDebit = (openDr + txDr) - (openCr + txCr);
    const computedBalance = Number(Math.abs(netDebit).toFixed(2));

    if (Math.abs(l.currentBalance - computedBalance) > 0.001) {
      await prisma.ledgerAccount.update({
        where: { id: l.id },
        data: { currentBalance: computedBalance }
      });
      synced++;
    }
  }

  console.log(`✓ Resynchronized ${synced} mismatched ledger accounts (out of ${allLedgers.length} total).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
