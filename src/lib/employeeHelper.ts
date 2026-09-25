import { prisma } from "@/lib/prisma";

export async function generateUniqueEmployeeId(
  client: any = prisma,
  prefix?: string
): Promise<string> {
  const cleanPrefix = prefix
    ? prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()
    : "";

  // 1. If prefix provided, try EMP-{prefix}-001
  if (cleanPrefix && cleanPrefix !== "EMP") {
    const candidate001 = `EMP-${cleanPrefix}-001`;
    const exists = await client.employee.findUnique({ where: { employeeId: candidate001 } });
    if (!exists) return candidate001;
  } else {
    // Check EMP-001
    const exists001 = await client.employee.findUnique({ where: { employeeId: "EMP-001" } });
    if (!exists001) return "EMP-001";
  }

  // 2. Try random numbers with prefix or generic
  for (let i = 0; i < 25; i++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = cleanPrefix && cleanPrefix !== "EMP"
      ? `EMP-${cleanPrefix}-${rand}`
      : `EMP-${rand}`;
    const exists = await client.employee.findUnique({ where: { employeeId: candidate } });
    if (!exists) return candidate;
  }

  // 3. Fallback timestamp
  const ts = Date.now().toString().slice(-6);
  return cleanPrefix && cleanPrefix !== "EMP"
    ? `EMP-${cleanPrefix}-${ts}`
    : `EMP-${ts}`;
}

export async function getOrCreateEmployee(userId: string, sessionUser: any) {
  if (!userId) return null;

  try {
    let employee = await prisma.employee.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!employee) {
      const code = await generateUniqueEmployeeId(prisma);

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
