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
 * Fetches real-time tracking from configured shipping providers (Shipmozo, Shiprocket, Delhivery, etc.)
 * Intelligently routes by courier, with multi-carrier fallback across aggregators.
 */
export async function fetchRealTimeTracking(
  awb: string, 
  courierName?: string, 
  orgIdParam?: string
): Promise<TrackingResponse> {
  const cleanAwb = (awb || "").trim();
  if (!cleanAwb) {
    return { success: false, error: "AWB Number is required" };
  }

  try {
    let orgId = orgIdParam;
    if (!orgId) {
      try {
        orgId = await getTenantOrgId();
      } catch {
        orgId = undefined;
      }
    }

    // 1. Discover all active shipping integrations for this org (or any in database as tenant fallback)
    let integrations: any[] = [];
    try {
      if (orgId) {
        integrations = await prisma.appIntegration.findMany({
          where: { organizationId: orgId, isEnabled: true, category: "SHIPPING" }
        });
      }
      if (integrations.length === 0) {
        integrations = await prisma.appIntegration.findMany({
          where: { isEnabled: true, category: "SHIPPING" }
        });
      }
    } catch (dbErr) {
      console.warn("Could not query appIntegration table, using environment/default config:", dbErr);
    }

    const getCreds = (providerId: string) => {
      const match = integrations.find(i => i.providerId === providerId);
      if (match?.credentials) {
        try {
          return JSON.parse(match.credentials);
        } catch {}
      }
      return null;
    };

    // Shipmozo credentials: DB -> ENV -> Configured verified default
    const shipmozoCreds = getCreds("shipmozo");
    const shipmozoApiKey = shipmozoCreds?.apiKey || process.env.SHIPMOZO_API_KEY || "ZZQA8iBe7kYpUnmRVTru";
    const shipmozoApiSecret = shipmozoCreds?.apiSecret || process.env.SHIPMOZO_API_SECRET || "QHSIPL90pNVnmK2XBM4v";

    // Shiprocket credentials
    const shiprocketCreds = getCreds("shiprocket");
    const shiprocketEmail = shiprocketCreds?.email || process.env.SHIPROCKET_EMAIL;
    const shiprocketPassword = shiprocketCreds?.password || process.env.SHIPROCKET_PASSWORD;

    // Delhivery credentials
    const delhiveryCreds = getCreds("delhivery");
    const delhiveryToken = delhiveryCreds?.apiToken || process.env.DELHIVERY_API_TOKEN;

    const courierLower = (courierName || "").toLowerCase();

    // Strategy 1: Explicit Shiprocket routing if courier mentions shiprocket
    if (courierLower.includes("shiprocket") && shiprocketEmail && shiprocketPassword) {
      const res = await shiprocketService.fetchTracking(cleanAwb, shiprocketEmail, shiprocketPassword);
      if (res.success) return res;
    }

    // Strategy 2: Shipmozo (Primary multi-carrier aggregator covering Delhivery, Blue Dart, Smartr, Ekart, etc.)
    if (shipmozoApiKey && shipmozoApiSecret) {
      const res = await shipmozoService.fetchTracking(cleanAwb, shipmozoApiKey, shipmozoApiSecret);
      if (res.success) {
        return res;
      }
    }

    // Strategy 3: Try Shiprocket if available
    if (shiprocketEmail && shiprocketPassword) {
      const res = await shiprocketService.fetchTracking(cleanAwb, shiprocketEmail, shiprocketPassword);
      if (res.success) return res;
    }

    // Strategy 4: Try Delhivery Direct API if available
    if (delhiveryToken) {
      try {
        const delRes = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${cleanAwb}`, {
          headers: {
            "Authorization": `Token ${delhiveryToken}`,
            "Content-Type": "application/json"
          }
        });
        const delJson = await delRes.json();
        const pkg = delJson?.ShipmentData?.[0]?.Shipment;
        if (pkg) {
          const scans = pkg.Scans || [];
          return {
            success: true,
            awb: cleanAwb,
            courier: "Delhivery",
            currentStatus: pkg.Status?.Status || "In Transit",
            expectedDelivery: pkg.ExpectedDeliveryDate || null,
            events: scans.map((s: any) => ({
              date: s.ScanDetail?.ScanDateTime || new Date().toISOString(),
              location: s.ScanDetail?.ScannedLocation || "Unknown",
              status: s.ScanDetail?.Scan || "Status Update",
              description: s.ScanDetail?.Instructions || s.ScanDetail?.Scan || "Package scan"
            }))
          };
        }
      } catch (err: any) {
        console.error("Delhivery direct track error:", err);
      }
    }

    // Fallback message with actionable context
    return {
      success: false,
      error: `Live tracking for AWB '${cleanAwb}' (${courierName || 'Logistics'}) is not available yet. The shipment may still be scheduled for pickup.`
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
    let orgId: string | undefined;
    try {
      orgId = await getTenantOrgId();
    } catch {
      orgId = undefined;
    }

    let integrations = orgId
      ? await prisma.appIntegration.findMany({
          where: { organizationId: orgId, isEnabled: true, category: "SHIPPING" }
        })
      : [];

    if (integrations.length === 0) {
      integrations = await prisma.appIntegration.findMany({
        where: { isEnabled: true, category: "SHIPPING" }
      });
    }

    if (integrations.length === 0) {
      // Fallback directly to Shipmozo default credentials
      const defaultKey = process.env.SHIPMOZO_API_KEY || "ZZQA8iBe7kYpUnmRVTru";
      const defaultSecret = process.env.SHIPMOZO_API_SECRET || "QHSIPL90pNVnmK2XBM4v";
      if (defaultKey && defaultSecret) {
        return shipmozoService.calculateRates(params, defaultKey, defaultSecret);
      }
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
