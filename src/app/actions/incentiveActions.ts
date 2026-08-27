"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantOrgId } from "@/lib/tenant";
import {
  IncentivePolicyConfig,
  DEFAULT_INCENTIVE_POLICY,
  INDUSTRY_INCENTIVE_PRESETS,
  calculateIncentives,
  OrderData,
  IncentiveResult
} from "@/lib/incentiveEngine";

const INCENTIVE_POLICY_RULE_NAME = "ORGANIZATION_ACTIVE_INCENTIVE_POLICY";

/**
 * Fetch the active incentive policy for the current tenant workspace
 */
export async function getIncentivePolicyAction(): Promise<{
  success: boolean;
  policy: IncentivePolicyConfig;
  presets: typeof INDUSTRY_INCENTIVE_PRESETS;
}> {
  try {
    const orgId = await getTenantOrgId();

    // Query IncentiveRule table
    const ruleRecord = await prisma.incentiveRule.findFirst({
      where: {
        name: INCENTIVE_POLICY_RULE_NAME
      },
      orderBy: { updatedAt: "desc" }
    });

    if (ruleRecord && ruleRecord.condition) {
      try {
        const parsed = JSON.parse(ruleRecord.condition);
        return {
          success: true,
          policy: {
            ...DEFAULT_INCENTIVE_POLICY,
            ...parsed
          },
          presets: INDUSTRY_INCENTIVE_PRESETS
        };
      } catch (e) {
        console.error("Failed to parse incentive rule condition JSON:", e);
      }
    }

    return {
      success: true,
      policy: DEFAULT_INCENTIVE_POLICY,
      presets: INDUSTRY_INCENTIVE_PRESETS
    };
  } catch (error: any) {
    console.error("Error fetching incentive policy:", error);
    return {
      success: true,
      policy: DEFAULT_INCENTIVE_POLICY,
      presets: INDUSTRY_INCENTIVE_PRESETS
    };
  }
}

/**
 * Save and persist the updated multi-industry incentive policy
 */
export async function saveIncentivePolicyAction(
  policy: IncentivePolicyConfig
): Promise<{ success: boolean; error?: string; policy?: IncentivePolicyConfig }> {
  try {
    const conditionJson = JSON.stringify(policy);

    // Find existing rule or create
    const existingRule = await prisma.incentiveRule.findFirst({
      where: { name: INCENTIVE_POLICY_RULE_NAME }
    });

    if (existingRule) {
      await prisma.incentiveRule.update({
        where: { id: existingRule.id },
        data: {
          condition: conditionJson,
          rewardType: policy.activeModelType,
          rewardValue: policy.zeroDiscountBonusPercent || 2.0
        }
      });
    } else {
      await prisma.incentiveRule.create({
        data: {
          name: INCENTIVE_POLICY_RULE_NAME,
          condition: conditionJson,
          rewardType: policy.activeModelType,
          rewardValue: policy.zeroDiscountBonusPercent || 2.0
        }
      });
    }

    revalidatePath("/settings");
    revalidatePath("/payroll");
    revalidatePath("/orders");
    revalidatePath("/");

    return { success: true, policy };
  } catch (error: any) {
    console.error("Error saving incentive policy:", error);
    return { success: false, error: error.message || "Failed to save incentive policy." };
  }
}

/**
 * Real-time simulator test calculation
 */
export async function simulateIncentiveCalculationAction(params: {
  monthlyRevenue: number;
  orderCount: number;
  zeroDiscountOrderCount: number;
  highDiscountRevenue: number;
  newCustomersCount: number;
  firstOrderSales: number;
  totalUnitsSold: number;
  estimatedGrossProfit: number;
  policy: IncentivePolicyConfig;
}): Promise<{ success: boolean; result: IncentiveResult }> {
  try {
    const simulatedOrders: OrderData[] = [];
    const count = Math.max(1, params.orderCount || 10);
    const avgOrderVal = params.monthlyRevenue / count;
    const zeroDiscCount = Math.min(count, params.zeroDiscountOrderCount || 0);

    for (let i = 0; i < count; i++) {
      const isZeroDisc = i < zeroDiscCount;
      const isHighDisc = !isZeroDisc && (i % 4 === 0) && params.highDiscountRevenue > 0;

      simulatedOrders.push({
        id: `sim_order_${i + 1}`,
        taxableValue: avgOrderVal,
        discount: isZeroDisc ? 0 : isHighDisc ? 18 : 8,
        isCreditCustomer: isHighDisc,
        isNewCustomerOrder: i < (params.newCustomersCount || 0),
        quantity: Math.round(params.totalUnitsSold / count) || 1
      });
    }

    const result = calculateIncentives(
      simulatedOrders,
      params.monthlyRevenue,
      params.policy,
      {
        newCustomerCount: params.newCustomersCount,
        totalUnitsSold: params.totalUnitsSold,
        estimatedGrossProfit: params.estimatedGrossProfit
      }
    );

    return { success: true, result };
  } catch (e: any) {
    console.error("Simulation error:", e);
    return {
      success: false,
      result: calculateIncentives([], 500000, params.policy)
    };
  }
}
