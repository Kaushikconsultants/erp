import { TrackingResponse, TrackingEvent } from "./shippingAggregator";
import { RateCalculationParams, RateCalculationResponse, ShippingRate } from "./shipmozoService";

export const shiprocketService = {
  // Shiprocket requires JWT authentication first
  async authenticate(email: string, password: string): Promise<string | null> {
    try {
      const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      return data.token || null;
    } catch (error) {
      console.error("Shiprocket Auth Error:", error);
      return null;
    }
  },

  async fetchTracking(awb: string, email: string, password: string): Promise<TrackingResponse> {
    const token = await this.authenticate(email, password);
    if (!token) {
      return { success: false, error: "Failed to authenticate with Shiprocket." };
    }

    try {
      const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const json = await response.json();
      
      if (!response.ok || !json.tracking_data) {
        return { success: false, error: json.message || "Shiprocket tracking error" };
      }

      const trackData = json.tracking_data;
      const shipment = trackData.shipment_track?.[0] || {};
      const activities = trackData.shipment_track_activities || [];

      return {
        success: true,
        awb: awb,
        courier: trackData.courier_name || "Shiprocket",
        currentStatus: shipment.current_status || "Unknown",
        expectedDelivery: shipment.expected_date || null,
        events: activities.map((evt: any) => ({
          date: evt.date,
          location: evt.location || "Unknown",
          status: evt.sr_status_label || evt.activity || "Update",
          description: evt.activity || "Tracking updated"
        }))
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shiprocket: ${error.message}` };
    }
  },

  async calculateRates(params: RateCalculationParams, email: string, password: string): Promise<RateCalculationResponse> {
    const token = await this.authenticate(email, password);
    if (!token) {
      return { success: false, error: "Failed to authenticate with Shiprocket." };
    }

    try {
      // Shiprocket GET /serviceability requires query params
      const queryParams = new URLSearchParams({
        pickup_postcode: params.originPincode,
        delivery_postcode: params.destinationPincode,
        weight: String(params.weight),
        cod: params.paymentMode === "COD" ? "1" : "0",
        declared_value: String(params.orderValue || 0)
      });

      const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const json = await response.json();

      if (!response.ok || json.status === 404 || !json.data?.available_courier_companies) {
        return { success: false, error: json.message || "No couriers available for these pincodes." };
      }

      const couriers = json.data.available_courier_companies;
      
      const ratesList: ShippingRate[] = couriers.map((c: any) => ({
         partnerName: c.courier_name,
         serviceName: c.courier_name,
         courierCompanyId: String(c.courier_company_id),
         chargedWeight: c.charged_weight || params.weight,
         estimatedDeliveryDays: c.etd ? Math.ceil((new Date(c.etd).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 3,
         zone: c.zone || "A",
         charge: c.rate || c.freight_charge || 0,
         breakdown: {
           shippingCharges: c.freight_charge || 0,
           gst: c.tax || 0
         }
      }));

      return {
        success: true,
        rates: ratesList
      };
    } catch (error: any) {
      return { success: false, error: `Failed to connect to Shiprocket: ${error.message}` };
    }
  }
};
