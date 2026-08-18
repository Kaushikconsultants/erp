const { PrismaClient } = require('@prisma/client');

async function test() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:itsMAZIK%2A22@db.qhcdojiqfyvawirywwuf.supabase.co:6543/postgres?pgbouncer=true"
      }
    }
  });

  try {
    const res = await prisma.companySettings.findUnique({ where: { id: 'default' } });
    console.log("6543 CONNECTION SUCCESS:", res?.companyName);
  } catch (err) {
    console.error("6543 CONNECTION ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
