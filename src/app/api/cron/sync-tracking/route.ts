import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchRealTimeTracking } from '@/lib/shippingAggregator';
import { revalidatePath } from 'next/cache';

// Cron Job to run every 30 minutes
export async function GET(request: Request) {
  return handleSyncTracking(request);
}

export async function POST(request: Request) {
  return handleSyncTracking(request);
}

async function handleSyncTracking(request: Request) {
  try {
    // 1. Authenticate the cron request
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Fetch all active orders that have an AWB and are not delivered/cancelled
    const activeOrders = await prisma.order.findMany({
      where: {
        awbNumber: { not: null },
        NOT: [
          { awbNumber: "" },
          { shippingStatus: { in: ['Delivered', 'delivered', 'Returned', 'Cancelled', 'cancelled', 'RTO Delivered'] } },
          { orderStatus: { in: ['Delivered', 'Cancelled', 'Returned'] } }
        ]
      },
      take: 100
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({ success: true, message: 'No active orders to sync.', updatedCount: 0 });
    }

    let updatedCount = 0;
    const errors = [];

    // 3. Process each order and update its shipping status
    for (const order of activeOrders) {
      try {
        if (!order.awbNumber) continue;

        // Automatically routes to correct integration service using the Aggregator with org context
        const trackingRes = await fetchRealTimeTracking(
          order.awbNumber, 
          order.courierName || "Unknown", 
          order.organizationId || undefined
        );
        
        if (trackingRes && trackingRes.success && trackingRes.currentStatus) {
          const isDelivered = trackingRes.currentStatus.toLowerCase().includes('delivered');
          const updateData: any = {};

          if (trackingRes.currentStatus !== order.shippingStatus) {
            updateData.shippingStatus = trackingRes.currentStatus;
          }

          if (isDelivered && order.orderStatus !== 'Delivered') {
            updateData.orderStatus = 'Delivered';
          }

          if (
            trackingRes.courier && 
            trackingRes.courier !== "Shipmozo Express" && 
            trackingRes.courier !== "Unknown" && 
            (!order.courierName || order.courierName === "Unknown" || order.courierName === "Standard Courier" || order.courierName === "Logistics")
          ) {
            updateData.courierName = trackingRes.courier;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.order.update({
              where: { id: order.id },
              data: updateData
            });
            updatedCount++;
          }
        }
      } catch (err: any) {
        errors.push({ orderId: order.id, error: err.message });
      }
    }

    if (updatedCount > 0) {
      revalidatePath('/orders');
      revalidatePath('/dispatches');
    }

    return NextResponse.json({
      success: true,
      message: `Successfully checked ${activeOrders.length} orders; updated ${updatedCount} tracking statuses.`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error syncing tracking statuses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
