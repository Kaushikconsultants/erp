export interface IntegrationFieldDef {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "checkbox" | "url" | "number";
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: any;
}

export interface IntegrationProviderDef {
  id: string;
  name: string;
  category: "SHIPPING" | "ECOMMERCE" | "MESSAGING" | "PAYMENT" | "ACCOUNTING";
  tagline: string;
  description: string;
  logo: string;
  brandColor: string;
  badge?: string;
  docsUrl: string;
  fields: IntegrationFieldDef[];
  features: string[];
  supportedEvents: string[];
}

// Master Registry of Supported Integrations
export const INTEGRATION_REGISTRY: IntegrationProviderDef[] = [
  // ─── 🚚 SHIPPING AGGREGATORS ───
  {
    id: "shiprocket",
    name: "Shiprocket",
    category: "SHIPPING",
    tagline: "India's #1 eCommerce Shipping & Logistics Aggregator",
    description: "Connect Shiprocket to automate AWB generation, schedule courier pickups, compare shipping rates across 17+ couriers, and sync real-time tracking directly with customer orders.",
    logo: "🚀",
    brandColor: "#7c3aed",
    badge: "Most Popular",
    docsUrl: "https://apiv2.shiprocket.in/v1/external",
    fields: [
      { key: "email", label: "Shiprocket Account Email", type: "text", placeholder: "logistics@yourcompany.com", required: true },
      { key: "password", label: "Shiprocket Account Password", type: "password", placeholder: "••••••••••••", required: true },
      { key: "apiKey", label: "API Key / Auth Token (Optional)", type: "password", placeholder: "Optional static API token" },
      { key: "pickupLocation", label: "Default Pickup Location Nickname", type: "text", placeholder: "Primary_Warehouse_Rohtak", defaultValue: "Primary" },
      { key: "channelId", label: "Channel ID (Optional)", type: "text", placeholder: "Custom Channel ID" },
      { key: "autoAwb", label: "Auto-Generate AWB on Order Dispatch", type: "checkbox", defaultValue: true },
      { key: "notifyCustomer", label: "Send Automated WhatsApp Tracking Links", type: "checkbox", defaultValue: true },
    ],
    features: [
      "Automated AWB Number generation",
      "Multi-courier rate optimization (Bluedart, Delhivery, DTDC, Ekart)",
      "Real-time shipment tracking webhooks",
      "Instant Return (RTO) & NDR workflow automation",
      "Doorstep pickup scheduling"
    ],
    supportedEvents: ["shipment.created", "shipment.manifested", "shipment.in_transit", "shipment.out_for_delivery", "shipment.delivered", "shipment.rto"]
  },
  {
    id: "shipmozo",
    name: "Shipmozo",
    category: "SHIPPING",
    tagline: "Smart Multi-Carrier Shipping & Tracking Automation",
    description: "Connect Shipmozo via API to leverage AI-driven fastest courier routing, live pin-code serviceability check, bulk label generation, and automated delivery notifications.",
    logo: "📦",
    brandColor: "#0284c7",
    badge: "Direct API",
    docsUrl: "/Shipmozo_API_Setup_Guide.pdf",
    fields: [
      { key: "apiKey", label: "Shipmozo API Public Key", type: "text", placeholder: "smz_pub_live_...", required: true },
      { key: "apiSecret", label: "Shipmozo API Secret Key", type: "password", placeholder: "smz_sec_...", required: true },
      { key: "warehouseId", label: "Warehouse ID / Code", type: "text", placeholder: "WH-001", defaultValue: "WH-MAIN" },
      { 
        key: "courierPriority", 
        label: "Courier Priority Preference", 
        type: "select", 
        defaultValue: "FASTEST",
        options: [
          { label: "Cheapest Available Rate", value: "CHEAPEST" },
          { label: "Fastest Delivery SLA", value: "FASTEST" },
          { label: "Best NDR Delivery Performance", value: "BEST_NDR" }
        ]
      },
      { key: "autoManifest", label: "Auto-Generate Manifest & Shipping Labels", type: "checkbox", defaultValue: true }
    ],
    features: [
      "AI-driven courier assignment (Air / Surface)",
      "Real-time Pin-code serviceability check",
      "Instant Shipping label & Tax Invoice printing",
      "Non-Delivery Report (NDR) re-attempt engine",
      "Synchronized order delivery milestone timestamps"
    ],
    supportedEvents: ["order.shipment_assigned", "order.picked_up", "order.tracking_updated", "order.delivered", "order.ndr_raised"]
  },
  {
    id: "nimbuspost",
    name: "NimbusPost",
    category: "SHIPPING",
    tagline: "Commercial Shipping Automation & NDR Management",
    description: "Integrate NimbusPost to get low shipping rates, automated bulk dispatch, reverse pickup logistics, and unified tracking dashboard.",
    logo: "⚡",
    brandColor: "#ea580c",
    docsUrl: "https://nimbuspost.com/api-docs",
    fields: [
      { key: "email", label: "Registered Account Email", type: "text", placeholder: "shipping@company.com", required: true },
      { key: "apiKey", label: "API Secret Key", type: "password", placeholder: "nimbus_key_...", required: true },
      { key: "accountId", label: "Account ID (Optional)", type: "text", placeholder: "NMB-12345" },
      { key: "autoAwb", label: "Auto-Assign Carrier on Dispatch Approval", type: "checkbox", defaultValue: true }
    ],
    features: [
      "19+ Carrier Integrations with unified balance",
      "AI-powered NDR verification engine",
      "Automated WhatsApp NDR interactive bot",
      "Thermal barcode label & packing slip generation"
    ],
    supportedEvents: ["shipment.status_update", "shipment.delivered", "shipment.rto_initiated"]
  },
  {
    id: "delhivery",
    name: "Delhivery Direct",
    category: "SHIPPING",
    tagline: "Direct Carrier API for Express & Heavy Freight Shipping",
    description: "Connect directly to Delhivery's enterprise logistics network for Surface, Express, and B2B LTL/FTL cargo shipments without intermediary aggregator margins.",
    logo: "🚚",
    brandColor: "#dc2626",
    badge: "Enterprise Carrier",
    docsUrl: "https://www.delhivery.com/developer/apis",
    fields: [
      { key: "clientId", label: "Delhivery Client Name / ID", type: "text", placeholder: "DELHIVERY_CLIENT_CODE", required: true },
      { key: "apiToken", label: "API Token (Production)", type: "password", placeholder: "Bearer token string", required: true },
      { key: "warehousePincode", label: "Origin Dispatch Pincode", type: "text", placeholder: "124001", defaultValue: "124001", required: true },
      { 
        key: "serviceType", 
        label: "Default Service Mode", 
        type: "select", 
        defaultValue: "E",
        options: [
          { label: "Express Air (Fastest)", value: "E" },
          { label: "Surface Standard (Economical)", value: "S" },
          { label: "Heavy / B2B Freight", value: "B2B" }
        ]
      }
    ],
    features: [
      "Direct API integration with Delhivery Hubs",
      "Real-time Geo-tracking coordinates & scans",
      "Instant Waybill number reservation",
      "B2B Freight & Bulk Garment Pallet shipments"
    ],
    supportedEvents: ["scan.inward", "scan.in_transit", "scan.out_for_delivery", "scan.delivered"]
  },

  // ─── 🛒 E-COMMERCE PLATFORMS ───
  {
    id: "shopify",
    name: "Shopify Store",
    category: "ECOMMERCE",
    tagline: "Two-Way Direct API Sync for Orders, Products & Inventory",
    description: "Connect your Shopify online storefront directly via Admin API. Automatically pull incoming retail orders into CRM, push real-time stock levels, and write back tracking numbers upon dispatch.",
    logo: "🛍️",
    brandColor: "#16a34a",
    badge: "Real-Time Sync",
    docsUrl: "https://shopify.dev/docs/api/admin-rest",
    fields: [
      { key: "storeDomain", label: "Shopify Store Domain", type: "text", placeholder: "my-brand.myshopify.com", required: true, description: "Your .myshopify.com domain name" },
      { key: "accessToken", label: "Admin API Access Token", type: "password", placeholder: "shpat_xxxxxxxxxxxxxxxxxxxxxxxx", required: true, description: "From Shopify Apps > Develop apps > Admin API Access Token" },
      { key: "apiVersion", label: "Admin API Version", type: "text", placeholder: "2024-04", defaultValue: "2024-04", required: true },
      { key: "webhookSecret", label: "Webhook Signing Secret", type: "password", placeholder: "shphmac_...", description: "For verifying incoming order webhook payloads" },
      { key: "autoImportOrders", label: "Automatically Ingest New Paid Orders", type: "checkbox", defaultValue: true },
      { key: "syncInventory", label: "Two-Way Inventory Sync (Prevent Overselling)", type: "checkbox", defaultValue: true },
      { key: "pushTracking", label: "Auto-Fulfill on Shopify when Dispatched Here", type: "checkbox", defaultValue: true }
    ],
    features: [
      "Instant Order ingestion on Shopify checkout",
      "Two-way multi-variant inventory synchronization",
      "Automatic customer contact creation & CRM sync",
      "Automatic Shopify fulfillment & tracking link update",
      "Support for multi-location warehouse routing"
    ],
    supportedEvents: ["orders/create", "orders/updated", "orders/paid", "orders/cancelled", "inventory_levels/update"]
  },
  {
    id: "woocommerce",
    name: "WordPress / WooCommerce",
    category: "ECOMMERCE",
    tagline: "Direct REST API Integration for WordPress Stores",
    description: "Connect your self-hosted WooCommerce / WordPress site. Seamlessly sync orders, sync SKUs and stock quantities, import customer addresses, and notify customers on dispatch.",
    logo: "🌐",
    brandColor: "#9333ea",
    badge: "Open API",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
    fields: [
      { key: "storeUrl", label: "WordPress Site URL", type: "url", placeholder: "https://www.yourstore.com", required: true },
      { key: "consumerKey", label: "WooCommerce Consumer Key", type: "text", placeholder: "ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true },
      { key: "consumerSecret", label: "WooCommerce Consumer Secret", type: "password", placeholder: "cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true },
      { key: "orderStatus", label: "Default Imported Order Status", type: "select", defaultValue: "processing", options: [
        { label: "Processing (Paid / Ready for Dispatch)", value: "processing" },
        { label: "Pending Payment", value: "pending" },
        { label: "On Hold", value: "on-hold" },
        { label: "Completed", value: "completed" }
      ]},
      { key: "autoSyncStock", label: "Sync Real-time Product Stock Quantities", type: "checkbox", defaultValue: true },
      { key: "verifySsl", label: "Verify SSL Certificate", type: "checkbox", defaultValue: true }
    ],
    features: [
      "Direct REST API v3 integration (no heavy plugins required)",
      "Instant order ingestion with complete customer details & GSTIN",
      "Live bi-directional stock balance management",
      "Auto-order status update to 'Completed' with tracking details",
      "Compatible with custom fields and WooCommerce HPOS"
    ],
    supportedEvents: ["order.created", "order.updated", "order.deleted", "product.stock_status_update"]
  },
  {
    id: "magento",
    name: "Magento 2 / Adobe Commerce",
    category: "ECOMMERCE",
    tagline: "Enterprise E-Commerce API Integration",
    description: "Connect Magento 2 / Adobe Commerce stores via Integration Tokens. Ingest high-volume orders, manage B2B customer tier pricing, and keep multi-store inventory perfectly balanced.",
    logo: "🛍️",
    brandColor: "#f97316",
    badge: "Enterprise",
    docsUrl: "https://developer.adobe.com/commerce/webapi/",
    fields: [
      { key: "storeUrl", label: "Magento Base URL", type: "url", placeholder: "https://store.yourbrand.com", required: true },
      { key: "bearerToken", label: "Integration Access Token", type: "password", placeholder: "Bearer token from System > Integrations", required: true },
      { key: "storeViewCode", label: "Store View Code", type: "text", placeholder: "default", defaultValue: "default", required: true },
      { key: "autoCreateShipment", label: "Create Magento Shipment when Dispatched", type: "checkbox", defaultValue: true },
      { key: "syncInventory", label: "Sync Multi-Source Inventory (MSI)", type: "checkbox", defaultValue: true }
    ],
    features: [
      "Direct Magento 2 REST WebAPI integration",
      "B2B & Wholesale Tier-pricing synchronization",
      "Multi-Source Inventory (MSI) warehouse mapping",
      "Automated Magento shipment & invoice creation",
      "High-throughput concurrent order processing"
    ],
    supportedEvents: ["sales_order_save_commit_after", "sales_order_shipment_save_commit_after", "catalog_inventory_stock_item_save_commit_after"]
  },

  // ─── 💳 PAYMENTS ───
  {
    id: "razorpay",
    name: "Razorpay Payments",
    category: "PAYMENT",
    tagline: "India's Leading Payment Gateway & Automated Reconciliation",
    description: "Generate instant payment links with QR codes, collect advance token payments for quotations, and automatically reconcile order payments upon customer checkout.",
    logo: "💳",
    brandColor: "#0284c7",
    badge: "UPI & Cards",
    docsUrl: "https://razorpay.com/docs/api/",
    fields: [
      { key: "keyId", label: "Razorpay Key ID", type: "text", placeholder: "rzp_live_...", required: true },
      { key: "keySecret", label: "Razorpay Key Secret", type: "password", placeholder: "••••••••••••", required: true },
      { key: "webhookSecret", label: "Webhook Secret (For Instant Verification)", type: "password", placeholder: "whsec_..." },
      { key: "autoReconcile", label: "Auto-Reconcile Payment Received against Invoices", type: "checkbox", defaultValue: true }
    ],
    features: [
      "Instant UPI, Credit/Debit Card & Netbanking links",
      "Automated Token Amount collection on quotation confirmation",
      "Real-time webhook payment confirmation & ledger entry",
      "Automated refund processing"
    ],
    supportedEvents: ["payment.captured", "payment.failed", "payment_link.paid", "refund.processed"]
  }
];
