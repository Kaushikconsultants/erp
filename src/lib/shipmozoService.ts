import { TrackingResponse, TrackingEvent } from "./shippingAggregator";

export interface BoxDimension {
  id: string;
  quantity: number;
  length: number; // CM
  width: number; // CM
  height: number; // CM
}

export interface RateCalculationParams {
  category?: "Domestic" | "International";
  shipmentType?: "Forward" | "Reverse";
  packageType?: string;
  originPincode: string;
  destinationPincode: string;
  weight: number; // in KG
  orderValue: number;
  paymentMode: "Prepaid" | "COD";
  codAmount?: number;
  rovType?: "Rov Owner" | "Rov Carrier";
  dimensions?: BoxDimension[];
}

export interface ShippingRateBreakdown {
  shippingCharges: number;
  codCharges?: number;
  firstMileCost?: number;
  sdl?: number;
  rovOwner?: number;
  fuelSurcharge?: number;
  awbCharges?: number;
  gst: number;
}

export interface ShippingRate {
  partnerName: string;
  serviceName: string;
  courierCompanyId: string;
  chargedWeight: number;
  estimatedDeliveryDays: number;
  zone: string;
  charge: number;
  breakdown: ShippingRateBreakdown;
  divisorInfo?: string;
  noteInfo?: string;
}

export interface RateCalculationResponse {
  success: boolean;
  rates?: ShippingRate[];
  error?: string;
}

export const shipmozoService = {
  getHeaders(apiKey: string, apiSecret: string) {
    return {
      "Content-Type": "application/json",
      "public-key": apiKey || "",
      "private-key": apiSecret || "",
    };
  },

  async fetchTracking(awb: string, apiKey?: string, apiSecret?: string): Promise<TrackingResponse> {
    const key = apiKey || process.env.SHIPMOZO_API_KEY || "";
    const secret = apiSecret || process.env.SHIPMOZO_API_SECRET || "";

    if (!key || !secret) {
      return { success: false, error: "Missing Shipmozo API Credentials. Please configure them in the Integrations Hub." };
    }

    try {
      const cleanAwb = encodeURIComponent((awb || "").trim());
      const response = await fetch(`https://shipping-api.com/app/api/v1/track-order?awb_number=${cleanAwb}`, {
        method: "GET",
        headers: this.getHeaders(key, secret),
      });

      const json = await response.json();

      if (json.result === "0" || json.result === 0) {
        return { 
          success: false, 
          error: json.message || "Shipmozo tracking error: AWB not found or not yet manifested." 
        };
      }

      const data = json.data || {};
      const rawScans = Array.isArray(data.scan_detail) ? data.scan_detail : [];

      const events: TrackingEvent[] = rawScans.map((evt: any) => ({
        date: evt.status_time || evt.date || new Date().toISOString(),
        location: evt.location || "Carrier Hub",
        status: evt.status || evt.activity || "Update",
        description: evt.activity || evt.remark || evt.description || evt.status || "Status updated"
      }));

      // If no scan events exist yet, provide initial order status
      if (events.length === 0 && (data.current_status || data.order_status)) {
        events.push({
          date: data.status_time || new Date().toISOString(),
          location: "Carrier Hub",
          status: data.current_status || data.order_status || "Manifested",
          description: `Shipment status is currently ${data.current_status || data.order_status}`
        });
      }

      return {
        success: true,
        awb: data.awb_number || awb,
        courier: data.courier || "Shipmozo Express",
        currentStatus: data.current_status || data.order_status || "Unknown",
        expectedDelivery: data.expected_delivery_date || null,
        events,
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shipmozo: ${error.message}` };
    }
  },

  async calculateRates(params: RateCalculationParams, apiKey?: string, apiSecret?: string): Promise<RateCalculationResponse> {
    const key = apiKey || process.env.SHIPMOZO_API_KEY || "";
    const secret = apiSecret || process.env.SHIPMOZO_API_SECRET || "";

    if (!key || !secret) {
      return { success: false, error: "Missing Shipmozo API Credentials. Please configure them in the Integrations Hub." };
    }

    if (!params.originPincode || !params.destinationPincode) {
      return { success: false, error: "Origin and Destination pincodes are required." };
    }

    if (!params.weight || params.weight <= 0) {
      return { success: false, error: "Approximate weight must be greater than 0." };
    }

    try {
      const dimensions = params.dimensions?.map(d => ({
        no_of_box: String(d.quantity || 1),
        length: String(d.length),
        width: String(d.width),
        height: String(d.height)
      })) || [];

      // If dimensions are missing, Shipmozo still expects valid parameters, use defaults or omit depending on strictness
      if (dimensions.length === 0) {
        dimensions.push({
           no_of_box: "1",
           length: "10",
           width: "10",
           height: "10"
        });
      }

      const isMultiBox = dimensions.length > 1 || dimensions.some(d => (Number(d.no_of_box) || 1) > 1);
      const isHeavy = params.weight > 10;

      const baseBody = {
        pickup_pincode: Number(params.originPincode),
        delivery_pincode: Number(params.destinationPincode),
        payment_type: params.paymentMode === "COD" ? "COD" : "PREPAID",
        shipment_type: params.shipmentType === "Reverse" ? "RETURN" : "FORWARD",
        order_amount: params.orderValue || 0,
        rov_type: params.rovType === "Rov Carrier" ? "ROV_CARRIER" : "ROV_OWNER",
        cod_amount: params.paymentMode === "COD" ? String(params.codAmount ?? params.orderValue) : "",
        weight: Math.round(params.weight * 1000), // Shipmozo accepts weight in grams
        dimensions: dimensions
      };

      const mapRates = (data: any[]): ShippingRate[] =>
        data.map((r: any) => ({
          partnerName: r.name || r.courier_name || r.courier_company || r.courier || "Shipmozo",
          serviceName: r.service_name || r.courier_company_service || "Standard",
          courierCompanyId: String(r.id || r.courier_id || "1"),
          chargedWeight: r.chargeable_weight || r.volumetric_weight || r.applied_weight || parseFloat(String(r.charged_weight || params.weight).replace(/kg/i, '').trim()) || params.weight,
          estimatedDeliveryDays: r.estimated_delivery || r.estimated_delivery_days || 3,
          zone: r.to_zone || r.zone || "A",
          charge: r.total_charges || r.total_amount || r.freight_charge || r.charge || r.rate || 0,
          breakdown: {
            shippingCharges: r.shipping_charges || r.freight_charge || 0,
            codCharges: r.overhead_charges || r.cod_charges || 0,
            gst: r.gst || 0
          }
        }));

      const callApi = async (packageType: string): Promise<ShippingRate[]> => {
        try {
          const resp = await fetch(`https://shipping-api.com/app/api/v1/rate-calculator`, {
            method: "POST",
            headers: this.getHeaders(key, secret),
            body: JSON.stringify({ ...baseBody, type_of_package: packageType })
          });
          const j = await resp.json();
          if (j.result === "0" || !Array.isArray(j.data)) return [];
          return mapRates(j.data);
        } catch {
          return [];
        }
      };

      let allRates: ShippingRate[];

      if (isHeavy || isMultiBox) {
        // For heavy/multi-box: call both MPS (2 results) and B2B (5 results) in parallel
        const [mpsRates, b2bRates] = await Promise.all([
          callApi("MPS"),
          callApi("B2B")
        ]);
        // Merge and deduplicate by partnerName + serviceName
        const seen = new Set<string>();
        allRates = [];
        for (const rate of [...b2bRates, ...mpsRates]) {
          const key = `${rate.partnerName}|${rate.serviceName}`;
          if (!seen.has(key)) {
            seen.add(key);
            allRates.push(rate);
          }
        }
      } else {
        // For regular shipments: SPS gives all light courier options
        allRates = await callApi("SPS");
      }

      return {
        success: true,
        rates: allRates
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shipmozo: ${error.message}` };
    }
  }

};
