import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchRealTimeTracking } from '@/lib/shippingAggregator';

// Vercel Cron Job to run every hour
export async function GET(request: Request) {
  try {
    // 1. Authenticate the cron request if CRON_SECRET is set
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Fetch all orders that are dispatched (or have an AWB) and not delivered/cancelled
    const activeOrders = await prisma.order.findMany({
      where: {
        awbNumber: { not: null },
        orderStatus: {
          notIn: ['Delivered', 'Cancelled', 'Returned']
        }
      }
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({ success: true, message: 'No active orders to sync.' });
    }

    let updatedCount = 0;
    const errors = [];

    // 3. Process each order and update its shipping status
    for (const order of activeOrders) {
      try {
        if (!order.awbNumber || !order.courierName) continue;
        if (!order.organizationId) continue;

        // Automatically routes to correct integration service using the new Aggregator
        const trackingRes = await fetchRealTimeTracking(order.awbNumber, order.courierName);
        
        if (trackingRes && trackingRes.currentStatus) {
          const isDelivered = trackingRes.currentStatus.toLowerCase().includes('delivered');
          
          await prisma.order.update({
            where: { id: order.id },
            data: {
              shippingStatus: trackingRes.currentStatus,
              orderStatus: isDelivered ? 'Delivered' : order.orderStatus
            }
          });
          
          updatedCount++;
        }
      } catch (err: any) {
        errors.push({ orderId: order.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${updatedCount} orders.`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error syncing tracking statuses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
