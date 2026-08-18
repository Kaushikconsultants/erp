import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.customer.findMany({
      select: { id: true, businessName: true, state: true, pincode: true, billingAddress: true, shippingAddress: true, email: true, mobile: true, gstNumber: true },
      orderBy: { businessName: 'asc' }
    });
    console.log('Customers fetched:', res.length);
  } catch (e) {
    console.error('Prisma Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
