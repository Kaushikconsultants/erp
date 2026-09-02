const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, '..', 'src', 'app', 'actions');
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const schemaFile = path.join(__dirname, '..', 'prisma', 'schema.prisma');

console.log("=== PASS 1: DISCOVERY & ARCHITECTURE AUDIT ===");

// 1. Audit Server Actions
const actionFiles = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts'));
console.log(`Found ${actionFiles.length} server action files.`);

const actionFindings = [];

for (const file of actionFiles) {
  const content = fs.readFileSync(path.join(actionsDir, file), 'utf8');
  
  // Check tenant isolation
  const usesTenant = content.includes('getTenantOrgId') || content.includes('organizationId');
  const hasMutations = /prisma\.\w+\.(create|update|delete|deleteMany|updateMany|upsert)/.test(content);
  
  // Check if mutations are missing tenant isolation
  const mutationsWithoutOrg = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(delete\(|update\(|findUnique\()/.test(line)) {
      // Look around for where clause
      const snippet = lines.slice(i, i + 8).join(' ');
      if (snippet.includes('where: { id') && !snippet.includes('organizationId') && !file.includes('userActions') && !file.includes('adminActions')) {
        mutationsWithoutOrg.push({ line: i + 1, code: line.trim() });
      }
    }
  }

  // Check multi-writes without transaction
  const multiMutations = (content.match(/await prisma\.\w+\.(create|update|delete|deleteMany|updateMany)/g) || []).length;
  const hasTransaction = content.includes('$transaction');

  actionFindings.push({
    file,
    usesTenant,
    hasMutations,
    mutationCount: multiMutations,
    hasTransaction,
    unscopedWhereIds: mutationsWithoutOrg.length
  });
}

// 2. Audit API Routes
console.log("\nAuditing API Routes...");
const apiFindings = [];
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      const relPath = path.relative(path.join(__dirname, '..'), fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasAuth = content.includes('getServerSession') || content.includes('authOptions') || content.includes('cron') || content.includes('webhook');
      const hasMutations = /prisma\.\w+\.(create|update|delete)/.test(content);
      apiFindings.push({
        route: relPath,
        hasAuth,
        hasMutations,
        contentLen: content.length
      });
    }
  }
}
scanDir(apiDir);

// 3. Schema Models Audit
console.log("\nAuditing Prisma Schema...");
const schemaContent = fs.readFileSync(schemaFile, 'utf8');
const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
let match;
const schemaModels = [];
while ((match = modelRegex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  const body = match[2];
  const hasOrg = body.includes('organizationId');
  const hasOrgIndex = body.includes('@@index([organizationId])');
  schemaModels.push({
    name: modelName,
    hasOrg,
    hasOrgIndex
  });
}

console.log("\n=== DISCOVERY AUDIT SUMMARY ===");
console.log(`Total Models: ${schemaModels.length}`);
console.log(`Models with organizationId: ${schemaModels.filter(m => m.hasOrg).length}`);
console.log(`Models with organizationId but MISSING @@index([organizationId]):`);
const missingOrgIndex = schemaModels.filter(m => m.hasOrg && !m.hasOrgIndex);
missingOrgIndex.forEach(m => console.log(`  - ${m.name}`));

console.log(`\nActions with multiple DB writes but NO $transaction:`);
const riskyActions = actionFindings.filter(a => a.mutationCount > 2 && !a.hasTransaction);
riskyActions.forEach(a => console.log(`  - ${a.file} (${a.mutationCount} mutations without $transaction)`));

console.log(`\nActions with unscoped findUnique / update / delete by id without tenant check:`);
const unscoped = actionFindings.filter(a => a.unscopedWhereIds > 2);
unscoped.forEach(a => console.log(`  - ${a.file} (${a.unscopedWhereIds} occurrences)`));

console.log(`\nAPI Routes Summary:`);
apiFindings.forEach(a => console.log(`  - ${a.route}: auth=${a.hasAuth}, mutations=${a.hasMutations}`));
