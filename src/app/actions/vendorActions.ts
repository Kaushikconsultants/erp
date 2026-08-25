"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { canUserAccessSection } from "@/lib/authPermissions";
import { getTenantOrgId } from "@/lib/tenant";

async function canManageVendors() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return await canUserAccessSection(session.user, 'purchases');
}

export async function getVendors() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  const hasAccess = await canUserAccessSection(session.user, 'purchases');
  if (!hasAccess) return { error: "Unauthorized" };
  try {
    const organizationId = await getTenantOrgId();
    const vendors = await prisma.vendor.findMany({
      where: { organizationId },
      include: {
        purchaseOrders: {
          select: { id: true, totalValue: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, vendors };
  } catch (error: any) {
    return { error: "Failed to fetch vendors: " + error.message };
  }
}

export async function createVendor(formData: FormData) {
  if (!await canManageVendors()) return { error: "Unauthorized" };

  const companyName = formData.get("companyName") as string;
  const contactPerson = formData.get("contactPerson") as string;
  const email = formData.get("email") as string;
  const mobile = formData.get("mobile") as string;
  const gstNumber = formData.get("gstNumber") as string;
  const pan = formData.get("pan") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const pincode = formData.get("pincode") as string;
  const paymentTerms = formData.get("paymentTerms") as string;

  if (!companyName) return { error: "Company name is required" };

  try {
    const organizationId = await getTenantOrgId();
    const vendor = await prisma.vendor.create({
      data: {
        organizationId,
        companyName,
        contactPerson: contactPerson || null,
        email: email || null,
        mobile: mobile || null,
        gstNumber: gstNumber || null,
        pan: pan || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        paymentTerms: paymentTerms || null,
      }
    });
    revalidatePath("/vendors");
    return { success: true, vendor };
  } catch (error: any) {
    return { error: "Failed to create vendor: " + error.message };
  }
}

export async function updateVendor(id: string, formData: FormData) {
  if (!await canManageVendors()) return { error: "Unauthorized" };

  try {
    await prisma.vendor.update({
      where: { id },
      data: {
        companyName: formData.get("companyName") as string,
        contactPerson: formData.get("contactPerson") as string || null,
        email: formData.get("email") as string || null,
        mobile: formData.get("mobile") as string || null,
        gstNumber: formData.get("gstNumber") as string || null,
        pan: formData.get("pan") as string || null,
        address: formData.get("address") as string || null,
        city: formData.get("city") as string || null,
        state: formData.get("state") as string || null,
        pincode: formData.get("pincode") as string || null,
        paymentTerms: formData.get("paymentTerms") as string || null,
        status: formData.get("status") as string || "Active",
      }
    });
    revalidatePath("/vendors");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update vendor: " + error.message };
  }
}

export async function deleteVendor(id: string) {
  if (!await canManageVendors()) return { error: "Unauthorized" };
  try {
    await prisma.vendor.delete({ where: { id } });
    revalidatePath("/vendors");
    return { success: true };
  } catch (error: any) {
    return { error: "Cannot delete vendor with associated purchase orders." };
  }
}
