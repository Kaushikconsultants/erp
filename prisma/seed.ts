import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin', 10);

  const org = await prisma.organization.upsert({
    where: { slug: 'tinkal-erp' },
    update: {},
    create: {
      id: 'org-tinkal-root',
      name: 'ERP Tinkal Industries',
      slug: 'tinkal-erp',
      tradeName: 'ERP Tinkal',
      industry: 'Apparel & Garments',
      businessType: 'Private Limited',
      email: 'admin@tinkal.in',
      phone: '9999999999',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      subscriptionPlan: 'ENTERPRISE',
      billingCycle: 'ANNUALLY',
      subscriptionStatus: 'ACTIVE',
      maxUsers: 999,
      maxBranches: 99,
      maxWarehouses: 99,
      monthlyOrderLimit: 999999,
      whatsAppCreditBalance: 50000,
      isGstEnabled: true,
      isWhatsAppEnabled: true,
      isEWayBillEnabled: true,
      isHrmsEnabled: true
    }
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@tinkal.in' },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      canManageSettings: true,
      organizationId: org.id
    },
    create: {
      name: 'ERP Tinkal Admin',
      email: 'admin@tinkal.in',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      canManageSettings: true,
      organizationId: org.id
    }
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@tinkal.in' },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      canManageSettings: true,
      organizationId: org.id
    },
    create: {
      name: 'ERP Tinkal Owner',
      email: 'owner@tinkal.in',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      canManageSettings: true,
      organizationId: org.id
    }
  });

  console.log('Database seeded successfully.');
  console.log('Admin Login - Email: admin@tinkal.in | Password: admin');
  console.log('Owner Login - Email: owner@tinkal.in | Password: admin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
