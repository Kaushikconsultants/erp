import { prisma } from "@/lib/prisma";

export async function getOrCreateEmployee(userId: string, sessionUser: any) {
  if (!userId) return null;

  try {
    let employee = await prisma.employee.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!employee) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `EMP-${randomSuffix}`;

      employee = await prisma.employee.create({
        data: {
          userId,
          employeeId: code,
          department: sessionUser?.role === 'ACCOUNTS' ? 'Accounts' : sessionUser?.role === 'WAREHOUSE' ? 'Warehouse' : 'Sales',
          designation: sessionUser?.role || 'Executive',
          employmentStatus: "Active",
          joiningDate: new Date(),
          organizationId: sessionUser?.organizationId || null
        },
        include: { user: true }
      });
    }

    return employee;
  } catch (error) {
    console.error("Error in getOrCreateEmployee:", error);
    return null;
  }
}
