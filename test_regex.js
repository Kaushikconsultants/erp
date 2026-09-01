const fs = require('fs');

const content = fs.readFileSync('c:/Users/HP/Desktop/new crm/src/components/vendor-credits/VendorCreditsClient.tsx', 'utf8');

const regex = /<input\b[^<]*?type="date"[^<]*?\/>/gs;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('MATCH FOUND:');
  console.log(match[0]);
  console.log('---');
}
