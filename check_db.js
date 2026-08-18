const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const employees = await prisma.employee.count();
  const users = await prisma.user.count({ where: { role: 'Sales' } });
  const orders = await prisma.order.count();
  const customers = await prisma.customer.count();
  console.log(`Employees: ${employees}, Sales Users: ${users}, Orders: ${orders}, Customers: ${customers}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
