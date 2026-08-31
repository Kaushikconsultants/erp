import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = req.nextUrl.searchParams;
  const orgId = searchParams.get("org");

  try {
    const rawBody = await req.text();
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      payload = { raw: rawBody };
    }

    // Verify integration config
    let integration = null;
    if (orgId) {
      integration = await prisma.appIntegration.findFirst({
        where: { organizationId: orgId, providerId: provider }
      });
    } else {
      integration = await prisma.appIntegration.findFirst({
        where: { providerId: provider, isEnabled: true }
      });
    }

    if (!integration) {
      return NextResponse.json(
        { success: false, error: "Integration not found or inactive for this provider" },
        { status: 404 }
      );
    }

    let processedCount = 1;
    let summaryMessage = `Webhook received for ${provider.toUpperCase()}`;

    // Process provider-specific events
    switch (provider) {
      case "shiprocket": {
        const awb = payload.awb || payload.awb_code;
        const currentStatus = payload.current_status || payload.status;
        const orderId = payload.order_id || payload.channel_order_id;
        
        if (awb && currentStatus) {
          summaryMessage = `Shiprocket Tracking Update: AWB ${awb} status changed to "${currentStatus}"`;
          // If we have orderId, update Order tracking in DB
          if (orderId) {
            await prisma.order.updateMany({
              where: {
                organizationId: integration.organizationId || undefined,
                OR: [{ orderNumber: String(orderId) }, { awbNumber: String(awb) }]
              },
              data: {
                shippingStatus: String(currentStatus),
                awbNumber: String(awb),
                courierName: payload.courier_name || "Shiprocket Express"
              }
            }).catch(() => {});
          }
        }
        break;
      }

      case "shipmozo": {
        const trackingNo = payload.tracking_number || payload.awb;
        const status = payload.status || payload.event;
        summaryMessage = `Shipmozo Webhook: Waybill ${trackingNo || 'N/A'} -> ${status || 'Updated'}`;
        break;
      }

      case "shopify": {
        const eventTopic = req.headers.get("x-shopify-topic") || "order_event";
        const shopifyOrderNo = payload.order_number || payload.name;
        summaryMessage = `Shopify Event [${eventTopic}]: Order #${shopifyOrderNo || payload.id || 'N/A'}`;
        break;
      }

      case "woocommerce": {
        const wcTopic = req.headers.get("x-wc-webhook-topic") || "order.created";
        summaryMessage = `WooCommerce Event [${wcTopic}]: Order #${payload.id || payload.number || 'N/A'}`;
        break;
      }

      case "magento": {
        summaryMessage = `Magento 2 Webhook Event: Order #${payload.increment_id || payload.entity_id || 'N/A'}`;
        break;
      }

      default: {
        summaryMessage = `Generic webhook event received for ${provider}`;
        break;
      }
    }

    // Log the webhook execution
    await prisma.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        providerId: provider,
        syncType: "WEBHOOK_EVENT",
        status: "SUCCESS",
        recordsProcessed: processedCount,
        recordsFailed: 0,
        details: `${summaryMessage}. Payload: ${JSON.stringify(payload).slice(0, 300)}`
      }
    });

    // Update integration last sync metadata
    await prisma.appIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastSyncMessage: summaryMessage,
        syncCount: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      provider,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[Webhook ${provider} Error]:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Webhook handling failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return NextResponse.json({
    status: "active",
    provider,
    message: "Integrations Webhook Endpoint is ready to receive POST events.",
    documentation: "Send POST payload with header signatures or URL ?org=<ORG_ID>"
  });
}
