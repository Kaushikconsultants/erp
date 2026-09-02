import { shipmozoService } from "./shipmozoService";
import { shiprocketService } from "./shiprocketService";
import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { RateCalculationParams, RateCalculationResponse } from "./shipmozoService";

export interface TrackingEvent {
  date: string;
  location: string;
  status: string;
  description: string;
}

export interface TrackingResponse {
  success: boolean;
  awb?: string;
  courier?: string;
  currentStatus?: string;
  expectedDelivery?: string;
  events?: TrackingEvent[];
  error?: string;
}

/**
 * Fetches real-time tracking from the configured shipping provider in the database
 */
export async function fetchRealTimeTracking(awb: string, courierName: string): Promise<TrackingResponse> {
  if (!awb) {
    return { success: false, error: "AWB Number is required" };
  }

  try {
    const orgId = await getTenantOrgId();
    if (!orgId) {
      return { success: false, error: "Unauthorized: Tenant ID missing" };
    }

    const courierLower = courierName?.toLowerCase() || "";

    // Route to Shipmozo
    if (courierLower.includes("shipmozo")) {
      const integration = await prisma.appIntegration.findFirst({
        where: { organizationId: orgId, providerId: "shipmozo", isEnabled: true }
      });

      if (!integration || !integration.credentials) {
        return { success: false, error: "Shipmozo Integration is not configured or is disabled." };
      }

      const creds = JSON.parse(integration.credentials);
      return await shipmozoService.fetchTracking(awb, creds.apiKey, creds.apiSecret);
    }

    // Route to Shiprocket
    if (courierLower.includes("shiprocket")) {
      const integration = await prisma.appIntegration.findFirst({
        where: { organizationId: orgId, providerId: "shiprocket", isEnabled: true }
      });

      if (!integration || !integration.credentials) {
        return { success: false, error: "Shiprocket Integration is not configured or is disabled." };
      }

      const creds = JSON.parse(integration.credentials);
      return await shiprocketService.fetchTracking(awb, creds.email, creds.password);
    }

    // Default Fallback
    return { 
      success: false, 
      error: `Live Tracking for courier '${courierName}' is not supported.`
    };
  } catch (error: any) {
    return { success: false, error: `Failed to track shipment: ${error.message}` };
  }
}

/**
 * Aggregates rates from ALL active shipping providers
 */
export async function aggregateShippingRates(params: RateCalculationParams): Promise<RateCalculationResponse> {
  try {
    const orgId = await getTenantOrgId();
    if (!orgId) {
      return { success: false, error: "Unauthorized: Tenant ID missing" };
    }

    const integrations = await prisma.appIntegration.findMany({
      where: { organizationId: orgId, isEnabled: true, category: "SHIPPING" }
    });

    if (integrations.length === 0) {
      return { success: false, error: "No active shipping integrations configured." };
    }

    const ratePromises = integrations.map(async (integration) => {
      const creds = JSON.parse(integration.credentials || "{}");
      
      if (integration.providerId === "shipmozo") {
        return shipmozoService.calculateRates(params, creds.apiKey, creds.apiSecret);
      }
      if (integration.providerId === "shiprocket") {
        return shiprocketService.calculateRates(params, creds.email, creds.password);
      }
      return { success: false, rates: [] };
    });

    const results = await Promise.allSettled(ratePromises);
    
    let allRates: any[] = [];
    let errors: string[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success && result.value.rates) {
        allRates = [...allRates, ...result.value.rates];
      } else if (result.status === "fulfilled" && !result.value.success) {
        errors.push(result.value.error || "Unknown provider error");
      } else if (result.status === "rejected") {
        errors.push(result.reason?.message || "Unknown error");
      }
    });

    if (allRates.length === 0 && errors.length > 0) {
      return { success: false, error: errors.join(" | ") };
    }

    // Sort rates by cheapest charge
    allRates.sort((a, b) => a.charge - b.charge);

    return { success: true, rates: allRates };

  } catch (error: any) {
    return { success: false, error: `Aggregation error: ${error.message}` };
  }
}
