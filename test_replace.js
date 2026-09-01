const fs = require('fs');

const content = fs.readFileSync('c:/Users/HP/Desktop/new crm/src/components/vendor-credits/VendorCreditsClient.tsx', 'utf8');

const regex = /<input\b([^<]*?)type="date"([^<]*?)\/>/gs;
let newContent = content.replace(regex, '<DatePicker$1$2/>');

console.log('REPLACEMENT TEST:');
console.log(newContent.substring(newContent.indexOf('startDate}'), newContent.indexOf('startDate}') + 200));
