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

function getAppRoutes() {
  const pageFiles = getFiles('src/app', ['.tsx']);
  const routes = new Set();
  for (const pf of pageFiles) {
    if (path.basename(pf) === 'page.tsx') {
      let rel = path.relative('src/app', path.dirname(pf)).replace(/\\/g, '/');
      const parts = rel.split('/').filter(p => !p.startsWith('(') || !p.endsWith(')'));
      const route = '/' + parts.join('/');
      routes.add(route === '//' ? '/' : route.replace(/\/+/g, '/'));
    }
  }
  return routes;
}

const appRoutes = getAppRoutes();
const files = getFiles('src');

// Search for template literals in href or router.push
// e.g. href={`/customers/${id}`} or router.push(`/orders/${orderId}`)
const templateRegex = /(?:href|router\.push)\s*(?:=|\()\s*\{?\s*`([^`]+)`/g;

const templateUsages = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = templateRegex.exec(content)) !== null) {
    const rawTemplate = match[1];
    if (
      !rawTemplate.startsWith('/api') &&
      !rawTemplate.startsWith('/downloads') &&
      !rawTemplate.startsWith('/_next') &&
      !rawTemplate.startsWith('tel:') &&
      !rawTemplate.startsWith('mailto:') &&
      !rawTemplate.startsWith('http') &&
      !rawTemplate.startsWith('#')
    ) {
      templateUsages.push({
        file: path.relative('.', file).replace(/\\/g, '/'),
        template: rawTemplate
      });
    }
  }
}

console.log('Found dynamic template links:', templateUsages.length);

const brokenTemplates = [];
for (const item of templateUsages) {
  // Convert template like /orders/${id}/invoice to /orders/[id]/invoice pattern
  // Replace ${...} with a wildcard [param]
  const pattern = item.template.replace(/\$\{[^}]+\}/g, '[param]').replace(/\/$/, '') || '/';
  
  // Also strip query strings if any: e.g. /orders?status=...
  const patternWithoutQuery = pattern.split('?')[0];

  // Try to match against appRoutes
  let matched = false;
  for (const route of appRoutes) {
    // Convert route dynamic segments e.g. [id] to regex
    const routeRegex = new RegExp(
      '^' + route.replace(/\[[a-zA-Z0-9_]+\]/g, '[^/]+') + '$'
    );
    const testCandidate = patternWithoutQuery.replace(/\[param\]/g, 'SAMPLE_ID');
    if (routeRegex.test(testCandidate) || route === patternWithoutQuery) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    brokenTemplates.push({ ...item, pattern: patternWithoutQuery });
  }
}

if (brokenTemplates.length === 0) {
  console.log('✅ All dynamic template links matched valid routes!');
} else {
  console.log('⚠️ Potential unmatched dynamic links:', brokenTemplates.length);
  brokenTemplates.forEach(b => console.log(`  ${b.file}: \`${b.template}\` (pattern: ${b.pattern})`));
}
