const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/HP/Desktop/new crm/src/components';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const importLine = `import DatePicker from '@/components/ui/DatePicker';\n`;
      if (content.includes("import DatePicker from '@/components/ui/DatePicker';")) {
        // Remove all occurrences
        content = content.replace(/import DatePicker from '@\/components\/ui\/DatePicker';\r?\n/g, '');
        content = content.replace(/import DatePicker from '@\/components\/ui\/DatePicker';/g, '');
        
        // Insert at the top, right after "use client"; if it exists
        if (content.startsWith('"use client";') || content.startsWith("'use client';")) {
          const firstNewline = content.indexOf('\n');
          content = content.slice(0, firstNewline + 1) + '\n' + importLine + content.slice(firstNewline + 1);
        } else {
          content = importLine + content;
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed import in ${fullPath}`);
      }
    }
  });
}

processDirectory(srcDir);
