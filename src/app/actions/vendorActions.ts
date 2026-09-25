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
    const organizationId = await getTenantOrgId();
    const existing = await prisma.vendor.findUnique({ where: { id }, select: { organizationId: true } });
    if (!existing) return { error: "Vendor not found" };
    if (existing.organizationId !== organizationId) {
      return { error: "Unauthorized access to vendor" };
    }

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
    const organizationId = await getTenantOrgId();
    const existing = await prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseOrders: { select: { id: true } },
        bills: { select: { id: true } },
        payments: { select: { id: true } },
        vendorCredits: { select: { id: true } },
        deliveryChallans: { select: { id: true } },
        postDatedCheques: { select: { id: true } }
      }
    });

    if (!existing) return { error: "Vendor not found" };
    if (existing.organizationId !== organizationId) {
      return { error: "Unauthorized access to vendor" };
    }

    const linkedRecords: string[] = [];
    if (existing.purchaseOrders.length > 0) linkedRecords.push(`${existing.purchaseOrders.length} Purchase Order(s)`);
    if (existing.bills.length > 0) linkedRecords.push(`${existing.bills.length} Bill(s)`);
    if (existing.payments.length > 0) linkedRecords.push(`${existing.payments.length} Payment(s)`);
    if (existing.vendorCredits.length > 0) linkedRecords.push(`${existing.vendorCredits.length} Debit Note(s)`);
    if (existing.deliveryChallans.length > 0) linkedRecords.push(`${existing.deliveryChallans.length} Delivery Challan(s)`);
    if (existing.postDatedCheques.length > 0) linkedRecords.push(`${existing.postDatedCheques.length} Cheque(s)`);

    if (linkedRecords.length > 0) {
      return {
        error: `Cannot delete vendor "${existing.companyName}" because active records exist: ${linkedRecords.join(", ")}. Please remove or reassign these records first.`
      };
    }

    await prisma.$transaction(async (tx) => {
      // Clean up orphaned ledger account if any
      await tx.ledgerAccount.deleteMany({
        where: {
          organizationId: existing.organizationId,
          code: `VEN-${id.slice(0, 8).toUpperCase()}`
        }
      }).catch(() => {});

      await tx.vendor.delete({ where: { id } });
    });

    revalidatePath("/vendors");
    revalidatePath("/bills");
    revalidatePath("/purchases");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete vendor:", error);
    return { error: error.message || "Failed to delete vendor" };
  }
}

export async function deleteMultipleVendors(ids: string[]) {
  if (!await canManageVendors()) return { error: "Unauthorized" };

  if (!ids || ids.length === 0) {
    return { error: "No vendors selected for deletion." };
  }

  try {
    const organizationId = await getTenantOrgId();
    const vendors = await prisma.vendor.findMany({
      where: {
        id: { in: ids },
        ...(organizationId ? { organizationId } : {})
      },
      include: {
        purchaseOrders: { select: { id: true }, take: 1 },
        bills: { select: { id: true }, take: 1 },
        payments: { select: { id: true }, take: 1 },
        vendorCredits: { select: { id: true }, take: 1 },
        deliveryChallans: { select: { id: true }, take: 1 },
        postDatedCheques: { select: { id: true }, take: 1 }
      }
    });

    if (vendors.length === 0) {
      return { error: "No valid vendors found to delete." };
    }

    const linkedVendors = vendors.filter(v => 
      v.purchaseOrders.length > 0 ||
      v.bills.length > 0 ||
      v.payments.length > 0 ||
      v.vendorCredits.length > 0 ||
      v.deliveryChallans.length > 0 ||
      v.postDatedCheques.length > 0
    );

    const deletableVendors = vendors.filter(v => 
      v.purchaseOrders.length === 0 &&
      v.bills.length === 0 &&
      v.payments.length === 0 &&
      v.vendorCredits.length === 0 &&
      v.deliveryChallans.length === 0 &&
      v.postDatedCheques.length === 0
    );

    if (deletableVendors.length === 0) {
      return {
        error: `Cannot delete selected vendors because active records (Bills, POs, Payments) exist for them (${linkedVendors.map(v => v.companyName).slice(0, 3).join(', ')}${linkedVendors.length > 3 ? '...' : ''}).`
      };
    }

    const deletableIds = deletableVendors.map(v => v.id);

    await prisma.$transaction(async (tx) => {
      for (const v of deletableVendors) {
        await tx.ledgerAccount.deleteMany({
          where: {
            organizationId: v.organizationId,
            code: `VEN-${v.id.slice(0, 8).toUpperCase()}`
          }
        }).catch(() => {});
      }

      await tx.vendor.deleteMany({
        where: { id: { in: deletableIds } }
      });
    });

    revalidatePath("/vendors");
    revalidatePath("/bills");
    revalidatePath("/purchases");

    if (linkedVendors.length > 0) {
      return {
        success: true,
        count: deletableIds.length,
        message: `Deleted ${deletableIds.length} vendor(s). Skipped ${linkedVendors.length} vendor(s) with active records.`
      };
    }

    return { success: true, count: deletableIds.length };
  } catch (error: any) {
    console.error("Failed to delete multiple vendors:", error);
    return { error: error.message || "Failed to delete vendors" };
  }
}


export async function quickCreateVendorFromScan(data: {
  companyName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTerms?: string;
}) {
  if (!data.companyName) return { error: "Company name is required" };

  try {
    const organizationId = await getTenantOrgId();
    
    // Check if vendor already exists with this GSTIN or company name
    const existing = await prisma.vendor.findFirst({
      where: {
        organizationId,
        OR: [
          ...(data.gstNumber ? [{ gstNumber: { equals: data.gstNumber.trim(), mode: 'insensitive' as const } }] : []),
          { companyName: { equals: data.companyName.trim(), mode: 'insensitive' as const } }
        ]
      }
    });

    if (existing) {
      // If the vendor already exists, update missing address, contact, or GST details
      const updateData: any = {};
      if (!existing.address && data.address) updateData.address = data.address.trim();
      if (!existing.city && data.city) updateData.city = data.city.trim();
      if (!existing.state && data.state) updateData.state = data.state.trim();
      if (!existing.pincode && data.pincode) updateData.pincode = data.pincode.trim();
      if (!existing.mobile && data.mobile) updateData.mobile = data.mobile.trim();
      if (!existing.gstNumber && data.gstNumber) updateData.gstNumber = data.gstNumber.trim();
      if (!existing.pan && data.pan) updateData.pan = data.pan.trim();

      let updatedVendor = existing;
      if (Object.keys(updateData).length > 0) {
        updatedVendor = await prisma.vendor.update({
          where: { id: existing.id },
          data: updateData
        });
        revalidatePath("/vendors");
        revalidatePath("/bills");
      }
      return { success: true, vendor: updatedVendor, existed: true };
    }

    const vendor = await prisma.vendor.create({
      data: {
        organizationId,
        companyName: data.companyName.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        email: data.email?.trim() || null,
        mobile: data.mobile?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
        pan: data.pan?.trim() || (data.gstNumber && data.gstNumber.length >= 12 ? data.gstNumber.substring(2, 12) : null),
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        pincode: data.pincode?.trim() || null,
        paymentTerms: data.paymentTerms || "Net 30 Days",
        status: "Active"
      }
    });

    revalidatePath("/vendors");
    revalidatePath("/bills");
    return { success: true, vendor, existed: false };
  } catch (error: any) {
    return { error: "Failed to create vendor: " + error.message };
  }
}


