const fs = require('fs');
const path = require('path');

const listViews = [
  'src/components/orders/OrderListClient.tsx',
  'src/components/vendor-credits/VendorCreditsClient.tsx',
  'src/components/purchases/PurchasesClient.tsx',
  'src/components/payments-made/PaymentsMadeClient.tsx',
  'src/components/payments/PaymentsClient.tsx',
  'src/components/invoices/InvoicesClient.tsx',
  'src/components/eway-bills/EWayBillsClient.tsx',
  'src/components/dispatches/DeliveryChallanClient.tsx',
  'src/components/credit-notes/CreditNotesClient.tsx',
  'src/components/expenses/ExpensesClient.tsx',
  'src/components/bills/BillsClient.tsx',
  'src/components/accounting/VouchersClient.tsx',
  'src/components/ui/CallsTableClient.tsx',
];

const targetPattern = /<div style=\{\{\s*display:\s*'inline-flex',\s*alignItems:\s*'center',\s*gap:\s*'6px',\s*backgroundColor:\s*'#f8fafc',\s*padding:\s*'4px 8px',\s*borderRadius:\s*'8px',\s*border:\s*'1px solid #cbd5e1'\s*\}\}>\s*<Calendar size=\{13\} style=\{\{\s*color:\s*'#94a3b8'\s*\}\} \/>\s*<input\s*type="date"\s*value=\{([a-zA-Z0-9_]+)\}\s*onChange=\{\(e\) => ([a-zA-Z0-9_]+)\(e\.target\.value\)\}.*?\/>\s*<span style=\{\{\s*color:\s*'#cbd5e1'\s*\}\}>-<\/span>\s*<input\s*type="date"\s*value=\{([a-zA-Z0-9_]+)\}\s*onChange=\{\(e\) => ([a-zA-Z0-9_]+)\(e\.target\.value\)\}.*?\/>\s*<\/div>/gs;

listViews.forEach(relPath => {
  const fullPath = path.join('c:/Users/HP/Desktop/new crm', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  const newContent = content.replace(targetPattern, (match, startVal, startSetter, endVal, endSetter) => {
    modified = true;
    return `<DateRangeFilter\n          startDate={${startVal}}\n          endDate={${endVal}}\n          onStartDateChange={${startSetter}}\n          onEndDateChange={${endSetter}}\n        />`;
  });

  if (modified) {
    // Also inject import if needed
    if (!newContent.includes('DateRangeFilter')) {
      const importLine = `import DateRangeFilter from '@/components/ui/DateRangeFilter';\n`;
      // Find the last import
      const lastImportIndex = newContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = newContent.indexOf('\n', lastImportIndex);
        content = newContent.slice(0, endOfLine + 1) + importLine + newContent.slice(endOfLine + 1);
      } else {
        content = importLine + newContent;
      }
    } else {
      content = newContent;
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Replaced DateRangeFilter in ${relPath}`);
  } else {
    console.log(`No match found in ${relPath}`);
  }
});
