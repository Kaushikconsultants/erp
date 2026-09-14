const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.tsx', '.ts']) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath, exts));
      } else if (exts.includes(path.extname(fullPath))) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

// 1. Collect all app routes from src/app
function getAppRoutes() {
  const pageFiles = getFiles('src/app', ['.tsx']);
  const routes = new Set();
  for (const pf of pageFiles) {
    if (path.basename(pf) === 'page.tsx') {
      let rel = path.relative('src/app', path.dirname(pf)).replace(/\\/g, '/');
      // remove route groups like (dashboard), (auth)
      const parts = rel.split('/').filter(p => !p.startsWith('(') || !p.endsWith(')'));
      const route = '/' + parts.join('/');
      routes.add(route === '//' ? '/' : route.replace(/\/+/g, '/'));
    }
  }
  return routes;
}

const appRoutes = getAppRoutes();
console.log('Registered Next.js page routes:', Array.from(appRoutes).sort());

// 2. Scan all ts/tsx files for links
const files = getFiles('src');
const linkUsage = [];
const regex = /(?:href|router\.push)\s*(?:=|\()\s*["'`](\/[a-zA-Z0-9_\-\/]+)["'`]/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const url = match[1];
    if (
      !url.startsWith('/api') &&
      !url.startsWith('/downloads') &&
      !url.startsWith('/_next') &&
      !url.startsWith('/icons') &&
      !url.startsWith('/images')
    ) {
      linkUsage.push({ file: path.relative('.', file).replace(/\\/g, '/'), url });
    }
  }
}

// 3. Verify each link against app routes
console.log('\n--- Checking link validity ---');
const brokenLinks = [];
for (const item of linkUsage) {
  const cleanUrl = item.url.replace(/\/$/, '') || '/';
  
  // Check exact match
  let matches = false;
  for (const route of appRoutes) {
    if (route === cleanUrl) {
      matches = true;
      break;
    }
    // Check dynamic route match (e.g., /orders/[id] matching /orders)
    // or /customers/[id]/ledger matching /customers/...
    const routeRegex = new RegExp(
      '^' + route.replace(/\[[a-zA-Z0-9_]+\]/g, '[^/]+') + '$'
    );
    if (routeRegex.test(cleanUrl)) {
      matches = true;
      break;
    }
  }

  if (!matches) {
    // Check if it's an asset or special link
    brokenLinks.push(item);
  }
}

console.log('Total links found:', linkUsage.length);
if (brokenLinks.length === 0) {
  console.log('✅ No broken static internal links found!');
} else {
  console.log('❌ Potential broken links found:', brokenLinks.length);
  brokenLinks.forEach(b => console.log(`  ${b.file} -> ${b.url}`));
}
