require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all WhatsApp data...');
  await prisma.whatsAppMessage.deleteMany({});
  await prisma.whatsAppAILog.deleteMany({});
  await prisma.whatsAppConversation.deleteMany({});
  await prisma.whatsAppAccount.deleteMany({});
  
  await prisma.customer.deleteMany({
    where: {
      businessName: {
        contains: 'WhatsApp Lead'
      }
    }
  });
  
  await prisma.customer.deleteMany({
    where: {
      contactPerson: 'Debug'
    }
  });

  console.log('Database cleared successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
