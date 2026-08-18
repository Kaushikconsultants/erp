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

import { shipmozoService } from "./shipmozoService";

/**
 * MOCK: Simulates an API call to a shipping aggregator (e.g. Shiprocket, Pickrr, Delhivery)
 */
export async function fetchRealTimeTracking(awb: string, courierName: string): Promise<TrackingResponse> {
  // If the courier is Shipmozo, use the Shipmozo service directly
  if (courierName?.toLowerCase().includes("shipmozo")) {
    return await shipmozoService.fetchTracking(awb);
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!awb) {
    return { success: false, error: "AWB Number is required" };
  }

  // Generate dynamic deterministic mock data based on the AWB length/characters
  const today = new Date();
  
  // Status simulation: if AWB ends in '0', it's Delivered, else In Transit.
  const isDelivered = awb.endsWith("0");
  const currentStatus = isDelivered ? "Delivered" : "In Transit";
  
  const expectedDate = new Date(today);
  expectedDate.setDate(today.getDate() + 3);

  const events: TrackingEvent[] = [
    {
      date: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 2).toISOString(),
      location: "Warehouse, Mumbai",
      status: "Manifested",
      description: "Shipment details received by courier."
    },
    {
      date: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 1.5).toISOString(),
      location: "Sort Center, Mumbai",
      status: "Dispatched",
      description: "Shipment picked up and in transit."
    }
  ];

  if (isDelivered) {
    events.push({
      date: today.toISOString(),
      location: "Destination City",
      status: "Delivered",
      description: "Shipment delivered successfully."
    });
  } else {
    events.push({
      date: today.toISOString(),
      location: "In Transit Route",
      status: "In Transit",
      description: "Shipment is on the way to the destination city."
    });
  }

  return {
    success: true,
    awb,
    courier: courierName || "Standard Courier",
    currentStatus,
    expectedDelivery: expectedDate.toISOString(),
    events: events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // latest first
  };
}
