import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'dispatch@espon.in';
  
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        name: 'Dispatch Team',
        email,
        password: hashedPassword,
        role: 'DISPATCH',
      }
    });
    console.log('Created Dispatch User:', user.email);
  } else {
    console.log('Dispatch User already exists:', user.email);
    // ensure role is set
    if (user.role !== 'DISPATCH') {
      await prisma.user.update({
        where: { email },
        data: { role: 'DISPATCH' }
      });
      console.log('Updated user role to DISPATCH');
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
