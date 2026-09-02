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
      "X-Public-Key": apiKey || "",
      "X-Private-Key": apiSecret || "",
    };
  },

  async fetchTracking(awb: string, apiKey: string, apiSecret: string): Promise<TrackingResponse> {
    if (!apiKey || !apiSecret) {
      return { success: false, error: "Missing Shipmozo API Credentials. Please configure them in the Integrations Hub." };
    }

    try {
      const response = await fetch(`https://api.shipmozo.com/v1/tracking/${awb}`, {
        method: "GET",
        headers: this.getHeaders(apiKey, apiSecret),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || `Shipmozo API Error: ${response.status} ${response.statusText}` 
        };
      }

      // Map actual Shipmozo response to our internal TrackingResponse
      return {
        success: true,
        awb: data.awb_number,
        courier: data.courier_name || "Shipmozo",
        currentStatus: data.current_status,
        expectedDelivery: data.expected_delivery_date,
        events: data.tracking_events?.map((evt: any) => ({
          date: evt.date,
          location: evt.location,
          status: evt.status,
          description: evt.description
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
      const response = await fetch(`https://api.shipmozo.com/v1/rates`, {
        method: "POST",
        headers: this.getHeaders(apiKey, apiSecret),
        body: JSON.stringify({
          origin: params.originPincode,
          destination: params.destinationPincode,
          weight: params.weight,
          payment_mode: params.paymentMode,
          order_value: params.orderValue,
          dimensions: params.dimensions
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || `Shipmozo API Error: ${response.status} ${response.statusText}` 
        };
      }

      return {
        success: true,
        rates: data.rates || [] // Ensure this maps to our ShippingRate interface correctly
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shipmozo: ${error.message}` };
    }
  }
};
