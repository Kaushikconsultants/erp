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
  getHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Public-Key": process.env.SHIPMOZO_PUBLIC_KEY || "",
      "X-Private-Key": process.env.SHIPMOZO_PRIVATE_KEY || "",
    };
  },

  async fetchTracking(awb: string): Promise<TrackingResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const today = new Date();
    const isDelivered = awb.endsWith("9");
    const isException = awb.endsWith("1");

    let status = "In Transit";
    if (isDelivered) status = "Delivered";
    if (isException) status = "Exception";

    const events: TrackingEvent[] = [
      {
        date: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 2).toISOString(),
        location: "Shipmozo Hub, New Delhi",
        status: "Manifested",
        description: "Order manifested and ready for pickup.",
      },
      {
        date: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 1).toISOString(),
        location: "Shipmozo Facility, Gurugram",
        status: "In Transit",
        description: "Package received at Shipmozo sorting center.",
      },
    ];

    if (isDelivered) {
      events.push({
        date: today.toISOString(),
        location: "Destination Hub",
        status: "Delivered",
        description: "Shipment delivered successfully by Shipmozo.",
      });
    }

    if (isException) {
      events.push({
        date: today.toISOString(),
        location: "Local Hub",
        status: "Exception",
        description: "Customer unavailable. Delivery attempt failed.",
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      awb,
      courier: "Shipmozo",
      currentStatus: status,
      expectedDelivery: new Date(today.getTime() + 24 * 60 * 60 * 1000 * 3).toISOString(),
      events,
    };
  },

  async calculateRates(params: RateCalculationParams): Promise<RateCalculationResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!params.originPincode || !params.destinationPincode) {
      return { success: false, error: "Origin and Destination pincodes are required." };
    }

    if (!params.weight || params.weight <= 0) {
      return { success: false, error: "Approximate weight must be greater than 0." };
    }

    // Calculate Volumetric Weight from dimensions
    let totalVolumetricWeight = 0;
    if (params.dimensions && params.dimensions.length > 0) {
      params.dimensions.forEach((box) => {
        const vol = (box.length * box.width * box.height * box.quantity) / 4500;
        totalVolumetricWeight += vol;
      });
    }

    const chargedWeight = Math.max(params.weight, Math.round(totalVolumetricWeight * 100) / 100);

    // Simulated Zone Calculation
    const originPin = parseInt(params.originPincode) || 124001;
    const destPin = parseInt(params.destinationPincode) || 110001;
    const diff = Math.abs(originPin - destPin);
    
    let zoneCode = "Zone: N3 -> N1";
    let baseEstDays = 2;

    if (diff > 500000) {
      zoneCode = "Zone: N3 -> NE2";
      baseEstDays = 4;
    } else if (diff > 200000) {
      zoneCode = "Zone: E";
      baseEstDays = 3;
    } else if (diff > 50000) {
      zoneCode = "Zone: W";
      baseEstDays = 2;
    }

    const val = params.orderValue || 10000;
    const isCod = params.paymentMode === "COD";
    const codCharge = isCod ? Math.max(50, val * 0.015) : 0;
    const rovOwnerCharge = params.rovType === "Rov Carrier" ? 120 : 70;

    // Helper to calculate total with 18% GST
    const calcFullRate = (base: number, firstMile = 0, sdl = 0, rov = rovOwnerCharge, fuelPct = 0.08, awb = 50) => {
      const fuel = Math.round((base + sdl) * fuelPct * 100) / 100;
      const sub = base + firstMile + sdl + rov + fuel + awb + codCharge;
      const gst = Math.round(sub * 0.18 * 100) / 100;
      const total = Math.round((sub + gst) * 100) / 100;
      return { base, firstMile, sdl, rov, fuel, awb, gst, total };
    };

    // 1. DELHIVERY Rates
    const d1 = calcFullRate(Math.round(chargedWeight * 17), 25, chargedWeight > 10 ? 201.26 : 50, rovOwnerCharge, 0.11, 100);
    const d2 = calcFullRate(Math.round(chargedWeight * 31.37), 0, 0, 0, 0, 0);
    const d3 = calcFullRate(Math.round(chargedWeight * 27.5), 35, 182, 70, 0.035, 0);
    const d4 = calcFullRate(Math.round(chargedWeight * 22.2), 0, 312, 70, 0.05, 100);

    // 2. EKART Rates
    const ek1 = calcFullRate(Math.round(chargedWeight * 16.5), 20, 100, 60, 0.07, 40);
    const ek2 = calcFullRate(Math.round(chargedWeight * 24.0), 30, 150, 60, 0.09, 50);

    // 3. BLUEDART Rates
    const bd1 = calcFullRate(Math.round(chargedWeight * 28.0), 40, 200, 100, 0.12, 80);
    const bd2 = calcFullRate(Math.round(chargedWeight * 21.0), 30, 120, 80, 0.10, 60);

    // 4. DTDC Rates
    const dt1 = calcFullRate(Math.round(chargedWeight * 18.0), 25, 110, 70, 0.08, 50);
    const dt2 = calcFullRate(Math.round(chargedWeight * 25.5), 35, 160, 70, 0.10, 60);

    // 5. SMARTR LOGISTICS Rates
    const sm1 = calcFullRate(Math.round(chargedWeight * 15.8), 20, 90, 50, 0.06, 40);
    const sm2 = calcFullRate(Math.round(chargedWeight * 23.2), 30, 140, 50, 0.08, 50);

    // 6. XPRESSBEES Rates
    const xb1 = calcFullRate(Math.round(chargedWeight * 16.0), 20, 95, 60, 0.07, 40);

    // 7. AMAZON SHIPPING Rates
    const amz1 = calcFullRate(Math.round(chargedWeight * 17.2), 25, 105, 60, 0.075, 45);

    return {
      success: true,
      rates: [
        {
          partnerName: "DELHIVERY",
          serviceName: "Delhivery B2B LTL (Surface)",
          courierCompanyId: "DELHIVERY_LTL",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays,
          zone: zoneCode,
          charge: d1.total,
          breakdown: {
            shippingCharges: d1.base,
            firstMileCost: d1.firstMile,
            sdl: d1.sdl,
            rovOwner: d1.rov,
            fuelSurcharge: d1.fuel,
            awbCharges: d1.awb,
            gst: d1.gst
          },
          divisorInfo: "Divisor : LxBxH/4500",
          noteInfo: "Handling Charges will be applied on above 249 Kg's Single Box"
        },
        {
          partnerName: "DELHIVERY",
          serviceName: "Delhivery Heavy MPS (Surface)",
          courierCompanyId: "DELHIVERY_HEAVY",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays + 3,
          zone: "Zone: E",
          charge: d2.total,
          breakdown: {
            shippingCharges: d2.base,
            gst: d2.gst
          },
          noteInfo: "+1 more option from Delhivery Surface"
        },
        {
          partnerName: "EKART",
          serviceName: "Ekart B2B Surface Express",
          courierCompanyId: "EKART_SURFACE",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays + 1,
          zone: zoneCode,
          charge: ek1.total,
          breakdown: {
            shippingCharges: ek1.base,
            firstMileCost: ek1.firstMile,
            sdl: ek1.sdl,
            rovOwner: ek1.rov,
            fuelSurcharge: ek1.fuel,
            awbCharges: ek1.awb,
            gst: ek1.gst
          },
          divisorInfo: "Divisor : LxBxH/5000",
          noteInfo: "Fast & reliable eCommerce B2B delivery"
        },
        {
          partnerName: "BLUEDART",
          serviceName: "BlueDart Apex Air Priority",
          courierCompanyId: "BLUEDART_AIR",
          chargedWeight,
          estimatedDeliveryDays: Math.max(1, baseEstDays - 1),
          zone: "Zone: Metro Air",
          charge: bd1.total,
          breakdown: {
            shippingCharges: bd1.base,
            firstMileCost: bd1.firstMile,
            sdl: bd1.sdl,
            rovOwner: bd1.rov,
            fuelSurcharge: bd1.fuel,
            awbCharges: bd1.awb,
            gst: bd1.gst
          },
          divisorInfo: "Divisor : LxBxH/5000",
          noteInfo: "Premium Air Cargo delivery with guaranteed SLA"
        },
        {
          partnerName: "DTDC",
          serviceName: "DTDC Express Surface B2B",
          courierCompanyId: "DTDC_SURFACE",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays + 1,
          zone: zoneCode,
          charge: dt1.total,
          breakdown: {
            shippingCharges: dt1.base,
            firstMileCost: dt1.firstMile,
            sdl: dt1.sdl,
            rovOwner: dt1.rov,
            fuelSurcharge: dt1.fuel,
            awbCharges: dt1.awb,
            gst: dt1.gst
          },
          divisorInfo: "Divisor : LxBxH/4500",
          noteInfo: "Pan-India reach with door-to-door tracking"
        },
        {
          partnerName: "SMARTR LOGISTICS",
          serviceName: "Smartr Ground Cargo Express",
          courierCompanyId: "SMARTR_GROUND",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays + 2,
          zone: zoneCode,
          charge: sm1.total,
          breakdown: {
            shippingCharges: sm1.base,
            firstMileCost: sm1.firstMile,
            sdl: sm1.sdl,
            rovOwner: sm1.rov,
            fuelSurcharge: sm1.fuel,
            awbCharges: sm1.awb,
            gst: sm1.gst
          },
          divisorInfo: "Divisor : LxBxH/4500",
          noteInfo: "Economical ground shipping for bulk orders"
        },
        {
          partnerName: "XPRESSBEES",
          serviceName: "Xpressbees Heavy Surface",
          courierCompanyId: "XPRESSBEES_SURFACE",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays + 2,
          zone: zoneCode,
          charge: xb1.total,
          breakdown: {
            shippingCharges: xb1.base,
            firstMileCost: xb1.firstMile,
            sdl: xb1.sdl,
            rovOwner: xb1.rov,
            fuelSurcharge: xb1.fuel,
            awbCharges: xb1.awb,
            gst: xb1.gst
          },
          divisorInfo: "Divisor : LxBxH/5000",
          noteInfo: "Integrated tracking & automated pickup"
        },
        {
          partnerName: "AMAZON SHIPPING",
          serviceName: "Amazon Logistics B2B Surface",
          courierCompanyId: "AMAZON_SURFACE",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays + 1,
          zone: zoneCode,
          charge: amz1.total,
          breakdown: {
            shippingCharges: amz1.base,
            firstMileCost: amz1.firstMile,
            sdl: amz1.sdl,
            rovOwner: amz1.rov,
            fuelSurcharge: amz1.fuel,
            awbCharges: amz1.awb,
            gst: amz1.gst
          },
          divisorInfo: "Divisor : LxBxH/4500",
          noteInfo: "Amazon prime network logistics handling"
        },
        {
          partnerName: "DELHIVERY",
          serviceName: "Delhivery B2B LTL - N1 Special (Surface)",
          courierCompanyId: "DELHIVERY_N1_SPECIAL",
          chargedWeight,
          estimatedDeliveryDays: baseEstDays,
          zone: zoneCode,
          charge: d3.total,
          breakdown: {
            shippingCharges: d3.base,
            firstMileCost: d3.firstMile,
            sdl: d3.sdl,
            fuelSurcharge: d3.fuel,
            gst: d3.gst
          },
          noteInfo: "No Appointment Booking under this Service"
        },
        {
          partnerName: "DELHIVERY",
          serviceName: "Delhivery B2B 10 CFT (For Dense Load) (Surface)",
          courierCompanyId: "DELHIVERY_10CFT",
          chargedWeight: Math.round((chargedWeight * 1.48) * 100) / 100,
          estimatedDeliveryDays: baseEstDays,
          zone: zoneCode,
          charge: d4.total,
          breakdown: {
            shippingCharges: d4.base,
            sdl: d4.sdl,
            rovOwner: d4.rov,
            awbCharges: d4.awb,
            gst: d4.gst
          },
          divisorInfo: "Divisor : LxBxH/2700. Recommended for Dense Load",
          noteInfo: "Handling Charges will be applied on above 249 Kg's Single Box"
        }
      ]
    };
  }
};
