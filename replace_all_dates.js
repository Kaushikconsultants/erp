const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/HP/Desktop/new crm/src/components';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') && !fullPath.includes('DatePicker.tsx') && !fullPath.includes('DateRangeFilter.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let modified = false;
      const newContent = content.replace(/<input\b([^<]*?)type="date"([^<]*?)\/>/gi, (match, p1, p2) => {
        modified = true;
        return `<DatePicker${p1}${p2}/>`;
      });
      
      if (modified) {
        let finalContent = newContent;
        if (!finalContent.includes("import DatePicker from '@/components/ui/DatePicker'")) {
          // find last import
          const lastImportMatch = [...finalContent.matchAll(/^import /gm)].pop();
          if (lastImportMatch) {
            const index = finalContent.indexOf('\n', lastImportMatch.index) + 1;
            finalContent = finalContent.slice(0, index) + `import DatePicker from '@/components/ui/DatePicker';\n` + finalContent.slice(index);
          } else {
            finalContent = `import DatePicker from '@/components/ui/DatePicker';\n` + finalContent;
          }
        }
        
        fs.writeFileSync(fullPath, finalContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  });
}

processDirectory(srcDir);
