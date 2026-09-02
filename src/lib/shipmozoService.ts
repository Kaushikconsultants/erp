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
  rovType?: "Rov Owner" | "Rov Carrier";
  dimensions?: BoxDimension[];
}

export interface ShippingRateBreakdown {
  shippingCharges: number;
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

  async fetchTracking(awb: string, apiKey: string, apiSecret: string): Promise<TrackingResponse> {
    if (!apiKey || !apiSecret) {
      return { success: false, error: "Missing Shipmozo API Credentials. Please configure them in the Integrations Hub." };
    }

    try {
      const response = await fetch(`https://shipping-api.com/app/api/v1/track-order?awb_number=${awb}`, {
        method: "GET",
        headers: this.getHeaders(apiKey, apiSecret),
      });

      const json = await response.json();

      if (json.result === "0") {
        return { 
          success: false, 
          error: json.message || "Shipmozo tracking error" 
        };
      }

      const data = json.data || {};

      return {
        success: true,
        awb: data.awb_number || awb,
        courier: data.courier || "Shipmozo",
        currentStatus: data.current_status || "Unknown",
        expectedDelivery: data.expected_delivery_date || null,
        events: data.scan_detail?.map((evt: any) => ({
          date: evt.status_time || evt.date || new Date().toISOString(),
          location: evt.location || "Unknown",
          status: evt.status || evt.activity || "Update",
          description: evt.activity || "Tracking updated"
        })) || [],
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shipmozo: ${error.message}` };
    }
  },

  async calculateRates(params: RateCalculationParams, apiKey: string, apiSecret: string): Promise<RateCalculationResponse> {
    if (!apiKey || !apiSecret) {
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

      const body = {
        pickup_pincode: Number(params.originPincode),
        delivery_pincode: Number(params.destinationPincode),
        payment_type: params.paymentMode === "COD" ? "COD" : "PREPAID",
        shipment_type: params.shipmentType === "Reverse" ? "RETURN" : "FORWARD",
        order_amount: params.orderValue || 0,
        type_of_package: "SPS",
        rov_type: params.rovType === "Rov Carrier" ? "ROV_CARRIER" : "ROV_OWNER",
        cod_amount: params.paymentMode === "COD" ? String(params.orderValue) : "",
        weight: Math.round(params.weight * 1000), // Shipmozo accepts weight in grams
        dimensions: dimensions
      };

      const response = await fetch(`https://shipping-api.com/app/api/v1/rate-calculator`, {
        method: "POST",
        headers: this.getHeaders(apiKey, apiSecret),
        body: JSON.stringify(body)
      });

      const json = await response.json();

      if (json.result === "0") {
        return { 
          success: false, 
          error: json.message || "Shipmozo API Error" 
        };
      }

      // Map whatever data comes back to our internal array
      const ratesList: ShippingRate[] = Array.isArray(json.data) ? json.data.map((r: any) => ({
         partnerName: r.courier_name || r.partnerName || "Shipmozo",
         serviceName: r.service_name || r.serviceName || "Standard",
         courierCompanyId: String(r.courier_id || r.courierCompanyId || "1"),
         chargedWeight: r.charged_weight || r.chargedWeight || params.weight,
         estimatedDeliveryDays: r.estimated_delivery_days || 3,
         zone: r.zone || "A",
         charge: r.charge || r.total_charge || r.rate || 0,
         breakdown: {
           shippingCharges: r.charge || 0,
           gst: r.gst || 0
         }
      })) : [];

      return {
        success: true,
        rates: ratesList
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shipmozo: ${error.message}` };
    }
  }
};
