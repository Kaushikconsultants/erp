"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface DuplicateCheckParams {
  type?: 'customer' | 'lead';
  phone?: string;
  email?: string;
  name?: string;
  excludeId?: string;
}

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  matchType?: 'PHONE' | 'EMAIL' | 'NAME';
  confidence: number; // 0 - 100
  entity: {
    id: string;
    type: 'CUSTOMER' | 'LEAD';
    name: string;
    phone: string;
    email?: string | null;
    stage?: string;
    assignedAgent?: string | null;
    businessName?: string | null;
    createdAt: Date;
  } | null;
}

/**
 * Normalizes phone numbers to their last 10 digits for consistent comparison
 */
function extractLast10Digits(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Normalizes business/person names for similarity matching
 */
function cleanName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\b(pvt|ltd|private|limited|enterprises|traders|trading|stores|store|shop|corp|co)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .trim();
}

/**
 * Real-time debounced server check for duplicates across Customers and Leads
 */
export async function checkDuplicateEntity(params: DuplicateCheckParams): Promise<{
  success: boolean;
  result: DuplicateMatchResult;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { 
        success: false, 
        result: { isDuplicate: false, confidence: 0, entity: null }, 
        error: "Unauthorized" 
      };
    }

    const organizationId = await getTenantOrgId();
    const phone10 = extractLast10Digits(params.phone);
    const cleanEmail = params.email?.trim().toLowerCase();
    const normalizedName = cleanName(params.name);

    // If neither phone, email, nor valid name provided, return no duplicate
    if (!phone10 && !cleanEmail && (!normalizedName || normalizedName.length < 3)) {
      return { success: true, result: { isDuplicate: false, confidence: 0, entity: null } };
    }

    // 1. PHONE CHECK (HIGHEST PRIORITY - 100% confidence match)
    if (phone10.length === 10) {
      // Check existing customers
      const matchedCustomer = await prisma.customer.findFirst({
        where: {
          organizationId,
          ...(params.excludeId && params.type === 'customer' ? { id: { not: params.excludeId } } : {}),
          OR: [
            { mobile: { endsWith: phone10 } },
            { whatsappNumber: { endsWith: phone10 } },
            { alternatePhone: { endsWith: phone10 } }
          ]
        },
        include: {
          assignedSalesperson: {
            include: { user: { select: { name: true } } }
          }
        }
      });

      if (matchedCustomer) {
        return {
          success: true,
          result: {
            isDuplicate: true,
            matchType: 'PHONE',
            confidence: 100,
            entity: {
              id: matchedCustomer.id,
              type: 'CUSTOMER',
              name: matchedCustomer.businessName || matchedCustomer.contactPerson,
              phone: matchedCustomer.mobile,
              email: matchedCustomer.email,
              stage: matchedCustomer.leadStage || matchedCustomer.status,
              assignedAgent: matchedCustomer.assignedSalesperson?.user?.name || 'Unassigned',
              businessName: matchedCustomer.businessName,
              createdAt: matchedCustomer.createdAt
            }
          }
        };
      }

      // Check existing leads
      const matchedLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          ...(params.excludeId && params.type === 'lead' ? { id: { not: params.excludeId } } : {}),
          whatsappNumber: { endsWith: phone10 }
        },
        include: {
          assignedSalesperson: {
            include: { user: { select: { name: true } } }
          }
        }
      });

      if (matchedLead) {
        return {
          success: true,
          result: {
            isDuplicate: true,
            matchType: 'PHONE',
            confidence: 100,
            entity: {
              id: matchedLead.id,
              type: 'LEAD',
              name: matchedLead.name,
              phone: matchedLead.whatsappNumber,
              stage: matchedLead.status,
              assignedAgent: matchedLead.assignedSalesperson?.user?.name || 'Unassigned',
              businessName: matchedLead.shopName,
              createdAt: matchedLead.createdAt
            }
          }
        };
      }
    }

    // 2. EMAIL CHECK (95% confidence match)
    if (cleanEmail && cleanEmail.includes("@")) {
      const matchedCustEmail = await prisma.customer.findFirst({
        where: {
          organizationId,
          email: { equals: cleanEmail, mode: 'insensitive' },
          ...(params.excludeId && params.type === 'customer' ? { id: { not: params.excludeId } } : {})
        },
        include: {
          assignedSalesperson: {
            include: { user: { select: { name: true } } }
          }
        }
      });

      if (matchedCustEmail) {
        return {
          success: true,
          result: {
            isDuplicate: true,
            matchType: 'EMAIL',
            confidence: 95,
            entity: {
              id: matchedCustEmail.id,
              type: 'CUSTOMER',
              name: matchedCustEmail.businessName || matchedCustEmail.contactPerson,
              phone: matchedCustEmail.mobile,
              email: matchedCustEmail.email,
              stage: matchedCustEmail.leadStage || matchedCustEmail.status,
              assignedAgent: matchedCustEmail.assignedSalesperson?.user?.name || 'Unassigned',
              businessName: matchedCustEmail.businessName,
              createdAt: matchedCustEmail.createdAt
            }
          }
        };
      }
    }

    // 3. NAME FUZZY CHECK (70% - 85% confidence match)
    if (normalizedName && normalizedName.length >= 4) {
      const candidateCusts = await prisma.customer.findMany({
        where: {
          organizationId,
          ...(params.excludeId && params.type === 'customer' ? { id: { not: params.excludeId } } : {})
        },
        select: {
          id: true,
          businessName: true,
          contactPerson: true,
          mobile: true,
          email: true,
          leadStage: true,
          status: true,
          createdAt: true,
          assignedSalesperson: {
            include: { user: { select: { name: true } } }
          }
        },
        take: 100
      });

      for (const cust of candidateCusts) {
        const bName = cleanName(cust.businessName);
        const cPerson = cleanName(cust.contactPerson);

        if (bName === normalizedName || cPerson === normalizedName) {
          return {
            success: true,
            result: {
              isDuplicate: true,
              matchType: 'NAME',
              confidence: 85,
              entity: {
                id: cust.id,
                type: 'CUSTOMER',
                name: cust.businessName || cust.contactPerson,
                phone: cust.mobile,
                email: cust.email,
                stage: cust.leadStage || cust.status,
                assignedAgent: cust.assignedSalesperson?.user?.name || 'Unassigned',
                businessName: cust.businessName,
                createdAt: cust.createdAt
              }
            }
          };
        }
      }
    }

    return {
      success: true,
      result: { isDuplicate: false, confidence: 0, entity: null }
    };
  } catch (error: any) {
    console.error("Duplicate detection check failed:", error);
    return {
      success: false,
      result: { isDuplicate: false, confidence: 0, entity: null },
      error: error.message || "Failed to check duplicates"
    };
  }
}

/**
 * Merge duplicate record into the primary record
 */
export async function mergeDuplicateRecords(payload: {
  primaryId: string;
  duplicateId: string;
  entityType: 'customer' | 'lead';
  deleteDuplicate?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };
    const organizationId = await getTenantOrgId();

    const { primaryId, duplicateId, entityType, deleteDuplicate = true } = payload;

    if (primaryId === duplicateId) {
      return { success: false, error: "Primary and duplicate record cannot be identical." };
    }

    if (entityType === 'customer') {
      const [primary, duplicate] = await Promise.all([
        prisma.customer.findFirst({ where: { id: primaryId, organizationId } }),
        prisma.customer.findFirst({ where: { id: duplicateId, organizationId } })
      ]);

      if (!primary || !duplicate) {
        return { success: false, error: "One or both customer records could not be found." };
      }

      // Re-link all related records to primary
      await prisma.$transaction([
        prisma.call.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        }),
        prisma.followUp.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        }),
        prisma.task.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        }),
        prisma.order.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        }),
        prisma.quotation.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        }),
        prisma.invoice.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        }),
        prisma.payment.updateMany({
          where: { customerId: duplicateId },
          data: { customerId: primaryId }
        })
      ]);

      // Append merge history to notes
      const mergeNote = `\n[System Note]: Merged duplicate customer "${duplicate.businessName}" (${duplicate.mobile}) on ${new Date().toLocaleDateString('en-IN')}.`;
      await prisma.customer.update({
        where: { id: primaryId },
        data: {
          notes: (primary.notes || "") + mergeNote,
          email: primary.email || duplicate.email || null,
          gstNumber: primary.gstNumber || duplicate.gstNumber || null,
          alternatePhone: primary.alternatePhone || duplicate.mobile || null
        }
      });

      if (deleteDuplicate) {
        await prisma.customer.delete({ where: { id: duplicateId } });
      }

      revalidatePath("/customers");
      revalidatePath(`/customers/${primaryId}`);
      return { 
        success: true, 
        message: `Successfully consolidated all timeline history and orders into "${primary.businessName}".` 
      };
    } else {
      // Merging Leads
      const [primaryLead, duplicateLead] = await Promise.all([
        prisma.lead.findFirst({ where: { id: primaryId, organizationId } }),
        prisma.lead.findFirst({ where: { id: duplicateId, organizationId } })
      ]);

      if (!primaryLead || !duplicateLead) {
        return { success: false, error: "One or both lead records could not be found." };
      }

      await prisma.$transaction([
        prisma.call.updateMany({
          where: { leadId: duplicateId },
          data: { leadId: primaryId }
        }),
        prisma.followUp.updateMany({
          where: { leadId: duplicateId },
          data: { leadId: primaryId }
        }),
        prisma.task.updateMany({
          where: { leadId: duplicateId },
          data: { leadId: primaryId }
        })
      ]);

      if (deleteDuplicate) {
        await prisma.lead.delete({ where: { id: duplicateId } });
      }

      revalidatePath("/leads");
      revalidatePath("/pipeline");
      return { 
        success: true, 
        message: `Merged timeline and call activities into lead "${primaryLead.name}".` 
      };
    }
  } catch (err: any) {
    console.error("Merge error:", err);
    return { success: false, error: err.message || "Failed to merge duplicate records" };
  }
}
