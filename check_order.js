const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst();
  if (order) {
    console.log("Order Salesperson ID:", order.salespersonId);
    
    const employee = await prisma.employee.findUnique({ where: { id: order.salespersonId }});
    console.log("Employee found:", !!employee);
    
    if (employee) {
      console.log("Employee User ID:", employee.userId);
    } else {
      const user = await prisma.user.findUnique({ where: { id: order.salespersonId }});
      console.log("Was it a User ID?", !!user);
    }
  } else {
    console.log("No orders found");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
