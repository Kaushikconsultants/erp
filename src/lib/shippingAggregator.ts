import { shipmozoService } from "./shipmozoService";
import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";

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

    // Attempt to route to Shipmozo if specified or default
    if (courierName?.toLowerCase().includes("shipmozo")) {
      const integration = await prisma.appIntegration.findFirst({
        where: { 
          organizationId: orgId, 
          providerId: "shipmozo", 
          isEnabled: true 
        }
      });

      if (!integration || !integration.credentials) {
        return { success: false, error: "Shipmozo Integration is not configured or is disabled in Settings." };
      }

      const creds = JSON.parse(integration.credentials);
      return await shipmozoService.fetchTracking(awb, creds.apiKey, creds.apiSecret);
    }

    // Default Fallback (for other unconfigured couriers, return a live error instead of fake data)
    return { 
      success: false, 
      error: `Live Tracking for courier '${courierName}' is not yet implemented or configured.`
    };
  } catch (error: any) {
    return { success: false, error: `Failed to track shipment: ${error.message}` };
  }
}
