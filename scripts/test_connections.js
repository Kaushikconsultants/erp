const { PrismaClient } = require('@prisma/client');

async function testConnection(name, url) {
  console.log(`Testing ${name}...`);
  if (!url) {
    console.log(`  ✗ ${name} URL is empty`);
    return false;
  }
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  try {
    const org = await prisma.organization.findFirst();
    console.log(`  ✓ ${name} SUCCESS: Found Org: ${org?.name || 'None'}`);
    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.log(`  ✗ ${name} FAILED: ${err.message}`);
    await prisma.$disconnect();
    return false;
  }
}

async function main() {
  await testConnection("Railway (Current DATABASE_URL)", process.env.DATABASE_URL);
  await testConnection("Supabase Pooling (POSTGRES_PRISMA_URL)", process.env.POSTGRES_PRISMA_URL);
  await testConnection("Supabase Non-Pooling (POSTGRES_URL_NON_POOLING)", process.env.POSTGRES_URL_NON_POOLING);
}

main();
