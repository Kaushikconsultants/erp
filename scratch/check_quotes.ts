import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
    console.log('Users:', users);
    const employees = await prisma.employee.findMany({ include: { user: true } });
    console.log('Employees:', employees.map(e => ({ id: e.id, userId: e.userId, name: e.user?.name, role: e.user?.role })));
    const quotations = await prisma.quotation.findMany({ include: { customer: true, salesperson: { include: { user: true } } } });
    console.log('Quotations in DB:', quotations.length, quotations);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
