"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";

export interface SaveVoiceLearningRuleParams {
  spokenPhrase: string;
  resolvedAction: string;
  resolvedData: any;
  category?: "ALIAS" | "PRODUCT" | "CUSTOMER" | "ACTION";
}

/**
 * Saves a learned command pattern or custom alias for the user's organization
 */
export async function saveVoiceLearningRule(params: SaveVoiceLearningRuleParams) {
  try {
    if (!prisma?.voiceLearningRule) return { success: false, error: "Database table not initialized" };
    const organizationId = await getTenantOrgId();
    if (!organizationId) return { success: false, error: "No organization found" };

    const normalized = params.spokenPhrase.trim().toLowerCase();

    // Check if an existing rule exists for this phrase
    const existing = await prisma.voiceLearningRule.findFirst({
      where: {
        organizationId,
        normalizedPhrase: normalized
      }
    });

    if (existing) {
      const updated = await prisma.voiceLearningRule.update({
        where: { id: existing.id },
        data: {
          resolvedAction: params.resolvedAction,
          resolvedData: params.resolvedData,
          category: params.category || "ALIAS",
          useCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      });
      return { success: true, rule: updated };
    }

    const created = await prisma.voiceLearningRule.create({
      data: {
        organizationId,
        spokenPhrase: params.spokenPhrase.trim(),
        normalizedPhrase: normalized,
        resolvedAction: params.resolvedAction,
        resolvedData: params.resolvedData,
        category: params.category || "ALIAS",
        confidence: 1.0,
        useCount: 1,
      }
    });

    return { success: true, rule: created };
  } catch (error: any) {
    console.error("saveVoiceLearningRule error:", error);
    return { success: false, error: error?.message || "Failed to save learning rule" };
  }
}

/**
 * Fast lookup: Resolves custom voice aliases taught by this organization
 */
export async function matchVoiceLearningRule(spokenPhrase: string) {
  try {
    if (!prisma?.voiceLearningRule) return null;
    let organizationId: string | null = null;
    try {
      organizationId = await getTenantOrgId();
    } catch {
      const defaultOrg = await prisma.organization.findFirst();
      organizationId = defaultOrg?.id || null;
    }
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst();
      organizationId = defaultOrg?.id || null;
    }
    if (!organizationId) return null;

    const normalized = spokenPhrase.trim().toLowerCase();

    const rule = await prisma.voiceLearningRule.findFirst({
      where: {
        organizationId,
        normalizedPhrase: normalized
      }
    });

    if (rule) {
      // Update frequency counter asynchronously in the background
      prisma.voiceLearningRule.update({
        where: { id: rule.id },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() }
      }).catch(() => {});

      return {
        action: rule.resolvedAction,
        data: rule.resolvedData,
        category: rule.category,
        phrase: rule.spokenPhrase
      };
    }

    return null;
  } catch (err) {
    console.error("matchVoiceLearningRule error:", err);
    return null;
  }
}

/**
 * Get all learned rules for the settings dashboard
 */
export async function getVoiceLearningRules() {
  try {
    if (!prisma?.voiceLearningRule) return { success: false, rules: [] };
    const organizationId = await getTenantOrgId();
    if (!organizationId) return { success: false, rules: [] };

    const rules = await prisma.voiceLearningRule.findMany({
      where: { organizationId },
      orderBy: { useCount: "desc" },
      take: 50
    });

    return { success: true, rules };
  } catch (error: any) {
    console.error("getVoiceLearningRules error:", error);
    return { success: false, rules: [] };
  }
}

/**
 * Delete a learned rule
 */
export async function deleteVoiceLearningRule(ruleId: string) {
  try {
    if (!prisma?.voiceLearningRule) return { success: false, error: "Database table not initialized" };
    const organizationId = await getTenantOrgId();
    if (!organizationId) return { success: false, error: "Unauthorized" };

    await prisma.voiceLearningRule.deleteMany({
      where: { id: ruleId, organizationId }
    });

    return { success: true };
  } catch (error: any) {
    console.error("deleteVoiceLearningRule error:", error);
    return { success: false, error: error?.message || "Failed to delete rule" };
  }
}
