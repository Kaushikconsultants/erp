import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.invoice.count();
  console.log('Invoices count:', count);
  const ordersCount = await prisma.order.count({ where: { invoices: { some: {} } } });
  console.log('Orders with invoices:', ordersCount);
  
  const processingOrders = await prisma.order.count({ where: { orderStatus: 'Processing' } });
  console.log('Processing orders count:', processingOrders);
}

main().finally(() => prisma.$disconnect());
