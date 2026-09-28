export interface R3GlasswareProduct {
  id: string;
  sku: string;
  articleNumber: string;
  name: string;
  category: string;
  subCategory?: string;
  material: string;
  capacityMl: number;
  size: string;
  diameterMm: number;
  heightMm: number;
  weight: number;
  masterCartonQty: number;
  allowedPacks: number[]; // e.g. [2, 4, 6]
  cbm: number;
  moq: number;
  hsnCode: string;
  purchasePrice: number;
  sellingPrice: number; // Base trade rate (1-99 pcs)
  mrp: number; // Suggested Retail Price (SRP)
  exportPriceUsd: number;
  exportPriceEur: number;
  exportPriceGbp: number;
  stockQuantity: number;
  minimumStock: number;
  customizationOptions: string;
  description: string;
  tags: string[]; // ["best", "trending", "new", "clear"]
  shape: string; // "bottle", "dw", "dwtall", "tumbler", "ribbed", "carafe", "server", "teapot", "mug", "jar"
  ship: number; // Estimated shipping charge ₹ per piece
  images: string[];
}

export const R3_HANDOVER_PRODUCTS: R3GlasswareProduct[] = [
  {
    id: "r3-bt750",
    sku: "R3-BT750",
    articleNumber: "ART-BT750",
    name: "Glass water bottle, 750 ml",
    category: "Water bottles",
    subCategory: "Pure Borosilicate Hydration",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 750,
    size: "750 ml",
    diameterMm: 75,
    heightMm: 260,
    weight: 0.38,
    masterCartonQty: 24,
    allowedPacks: [2, 4, 6],
    cbm: 0.045,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 150,
    sellingPrice: 300,
    mrp: 699,
    exportPriceUsd: 4.20,
    exportPriceEur: 3.90,
    exportPriceGbp: 3.30,
    stockQuantity: 420,
    minimumStock: 48,
    customizationOptions: "Bamboo Lid Laser Engraving, Silicone Sleeve Branding",
    description: "Ultra-durable 750ml pure borosilicate water bottle with leak-proof natural bamboo lid and food-grade silicone seal. Thermal shock resistant.",
    tags: ["best", "trending"],
    shape: "bottle",
    ship: 12,
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-dw080",
    sku: "R3-DW080",
    articleNumber: "ART-DW080",
    name: "Double-wall espresso cup, 80 ml",
    category: "Double-wall cups",
    subCategory: "Barista Thermal Series",
    material: "Double-Wall Thermal Insulated Glass",
    capacityMl: 80,
    size: "80 ml",
    diameterMm: 68,
    heightMm: 65,
    weight: 0.12,
    masterCartonQty: 24,
    allowedPacks: [2, 4, 6],
    cbm: 0.028,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 90,
    sellingPrice: 189,
    mrp: 449,
    exportPriceUsd: 2.60,
    exportPriceEur: 2.40,
    exportPriceGbp: 2.10,
    stockQuantity: 640,
    minimumStock: 48,
    customizationOptions: "Custom Gift Box, Screen Printed Logo",
    description: "Hand-blown double-wall insulated espresso shot glass. Suspends coffee in air while staying cool to the touch with zero condensation.",
    tags: ["best"],
    shape: "dw",
    ship: 5,
    images: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-dw350",
    sku: "R3-DW350",
    articleNumber: "ART-DW350",
    name: "Double-wall latte glass, 350 ml",
    category: "Double-wall cups",
    subCategory: "Tall Specialty Coffee",
    material: "Double-Wall Thermal Insulated Glass",
    capacityMl: 350,
    size: "350 ml",
    diameterMm: 84,
    heightMm: 125,
    weight: 0.24,
    masterCartonQty: 24,
    allowedPacks: [2, 4],
    cbm: 0.038,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 120,
    sellingPrice: 239,
    mrp: 549,
    exportPriceUsd: 3.40,
    exportPriceEur: 3.10,
    exportPriceGbp: 2.70,
    stockQuantity: 0, // Made to order
    minimumStock: 24,
    customizationOptions: "Custom Frosted Logo, Custom Double Pack Packaging",
    description: "Tall double-wall borosilicate tumbler for lattes, iced beverages, and cocktails. Retains optimal temperature for over 45 minutes.",
    tags: ["new"],
    shape: "dwtall",
    ship: 9,
    images: [
      "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-tb300",
    sku: "R3-TB300",
    articleNumber: "ART-TB300",
    name: "Heat-resistant tumbler, 300 ml",
    category: "Tumblers",
    subCategory: "Commercial Hospitality Tumblers",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 300,
    size: "300 ml",
    diameterMm: 76,
    heightMm: 100,
    weight: 0.18,
    masterCartonQty: 24,
    allowedPacks: [2, 4, 6],
    cbm: 0.032,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 60,
    sellingPrice: 119,
    mrp: 299,
    exportPriceUsd: 1.70,
    exportPriceEur: 1.55,
    exportPriceGbp: 1.35,
    stockQuantity: 1200,
    minimumStock: 120,
    customizationOptions: "Bottom Laser Etching, Custom Color Tinting",
    description: "Heavy-duty everyday drinking glass designed for high-turnover restaurant & café service. Dishwasher and microwave safe.",
    tags: ["best", "clear"],
    shape: "tumbler",
    ship: 6,
    images: [
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-tb450r",
    sku: "R3-TB450R",
    articleNumber: "ART-TB450R",
    name: "Ribbed tumbler, 450 ml",
    category: "Tumblers",
    subCategory: "Vintage Textured Glassware",
    material: "High Borosilicate Glass",
    capacityMl: 450,
    size: "450 ml",
    diameterMm: 80,
    heightMm: 120,
    weight: 0.22,
    masterCartonQty: 24,
    allowedPacks: [2, 4, 6],
    cbm: 0.038,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 75,
    sellingPrice: 149,
    mrp: 349,
    exportPriceUsd: 2.10,
    exportPriceEur: 1.95,
    exportPriceGbp: 1.70,
    stockQuantity: 0, // Made to order
    minimumStock: 48,
    customizationOptions: "Gold Rim Lining, Custom Color Tint",
    description: "Artisan flute-ribbed glassware with vertical texture for superior grip and vintage aesthetic. Ideal for highballs and specialty mocktails.",
    tags: ["new"],
    shape: "ribbed",
    ship: 7,
    images: [
      "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-cf1000",
    sku: "R3-CF1000",
    articleNumber: "ART-CF1000",
    name: "Carafe with glass lid, 1 litre",
    category: "Carafes & servers",
    subCategory: "Beverage Service",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 1000,
    size: "1 L",
    diameterMm: 95,
    heightMm: 240,
    weight: 0.45,
    masterCartonQty: 12,
    allowedPacks: [2],
    cbm: 0.042,
    moq: 50,
    hsnCode: "7013",
    purchasePrice: 220,
    sellingPrice: 449,
    mrp: 999,
    exportPriceUsd: 6.20,
    exportPriceEur: 5.75,
    exportPriceGbp: 5.00,
    stockQuantity: 180,
    minimumStock: 24,
    customizationOptions: "Precision Spout Etching, Custom Wooden Base",
    description: "Sleek 1000ml table carafe with matching precision-ground glass stopper lid. Engineered for iced water, fresh juices, and sangria service.",
    tags: ["clear"],
    shape: "carafe",
    ship: 22,
    images: [
      "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-ps600",
    sku: "R3-PS600",
    articleNumber: "ART-PS600",
    name: "Pour-over coffee server, 600 ml",
    category: "Carafes & servers",
    subCategory: "Specialty Pour-Over Coffee",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 600,
    size: "600 ml",
    diameterMm: 100,
    heightMm: 150,
    weight: 0.32,
    masterCartonQty: 12,
    allowedPacks: [2],
    cbm: 0.035,
    moq: 50,
    hsnCode: "7013",
    purchasePrice: 195,
    sellingPrice: 389,
    mrp: 899,
    exportPriceUsd: 5.40,
    exportPriceEur: 5.00,
    exportPriceGbp: 4.30,
    stockQuantity: 0, // Made to order
    minimumStock: 24,
    customizationOptions: "Printed Volume Markings, Walnut Handle Grip",
    description: "Specialty pour-over coffee carafe with measurement scale and dripless V-spout. Compatible with standard V60 and Kalita drippers.",
    tags: ["new"],
    shape: "server",
    ship: 16,
    images: [
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-tp600",
    sku: "R3-TP600",
    articleNumber: "ART-TP600",
    name: "Teapot with steel infuser, 600 ml",
    category: "Teapots",
    subCategory: "Artisan Tea Infusers",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 600,
    size: "600 ml",
    diameterMm: 110,
    heightMm: 130,
    weight: 0.42,
    masterCartonQty: 12,
    allowedPacks: [2],
    cbm: 0.038,
    moq: 50,
    hsnCode: "7013",
    purchasePrice: 260,
    sellingPrice: 529,
    mrp: 1199,
    exportPriceUsd: 7.40,
    exportPriceEur: 6.80,
    exportPriceGbp: 5.90,
    stockQuantity: 96,
    minimumStock: 12,
    customizationOptions: "Laser Etched Strainer, Branded Wooden Lid Knob",
    description: "Stovetop-safe borosilicate glass teapot with ultra-fine removable micro-mesh 304 stainless filter and ergonomic non-drip spout.",
    tags: ["best"],
    shape: "teapot",
    ship: 20,
    images: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-mg400",
    sku: "R3-MG400",
    articleNumber: "ART-MG400",
    name: "Clear mug with handle, 400 ml",
    category: "Mugs",
    subCategory: "Everyday Glass Mugs",
    material: "High Borosilicate Glass",
    capacityMl: 400,
    size: "400 ml",
    diameterMm: 85,
    heightMm: 110,
    weight: 0.21,
    masterCartonQty: 24,
    allowedPacks: [2, 4, 6],
    cbm: 0.036,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 95,
    sellingPrice: 199,
    mrp: 449,
    exportPriceUsd: 2.75,
    exportPriceEur: 2.55,
    exportPriceGbp: 2.20,
    stockQuantity: 0, // Made to order
    minimumStock: 48,
    customizationOptions: "Corporate Logo Decal, Full Color Gift Box",
    description: "Lightweight, crystal-clear glass mug with wide loop handle. Resistant to boiling water and thermal expansion.",
    tags: ["trending"],
    shape: "mug",
    ship: 9,
    images: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    id: "r3-jr800",
    sku: "R3-JR800",
    articleNumber: "ART-JR800",
    name: "Storage jar with bamboo lid, 800 ml",
    category: "Storage jars",
    subCategory: "Pantry & Hospitality Jars",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 800,
    size: "800 ml",
    diameterMm: 100,
    heightMm: 140,
    weight: 0.35,
    masterCartonQty: 24,
    allowedPacks: [2, 4],
    cbm: 0.048,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 140,
    sellingPrice: 279,
    mrp: 649,
    exportPriceUsd: 3.90,
    exportPriceEur: 3.60,
    exportPriceGbp: 3.10,
    stockQuantity: 300,
    minimumStock: 48,
    customizationOptions: "Custom Bamboo Lid Logo, Vinyl Decal Labels",
    description: "Stackable high-borosilicate cylindrical storage jar with food-safe silicone airtight sealing ring on solid natural bamboo lid.",
    tags: ["clear"],
    shape: "jar",
    ship: 14,
    images: [
      "https://images.unsplash.com/photo-1584269600519-112d071b35e6?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80"
    ]
  }
];

export const DUMMY_GLASSWARE_PRODUCTS = R3_HANDOVER_PRODUCTS;

export const R3_COMPANY_PROFILE = {
  companyName: "R3 EXPORTS",
  tradeName: "R3 Exports",
  ownerName: "Rahul Gupta",
  factoryAddress: "Agra Industrial Complex, Foundry Nagar, Agra, Uttar Pradesh 282006",
  city: "Agra",
  state: "Uttar Pradesh",
  pincode: "282006",
  mobile: "+91 99581 73594",
  email: "sales@r3exports.com",
  gstin: "09AAACR3333E1Z9",
  minOrderValueReadyStock: 15000,
  minOrderValueMadeToOrder: 50000,
  leadTimeReadyStockDays: 2,
  leadTimeMadeToOrderDays: 30,
  samplePricePerPc: 500,
  logoPrintPricePerPc: 30,
  logoMoqPerSku: 500,
  logoMoqMixed: 1000
};

export const R3_TRADE_SLABS = [
  { min: 1, max: 99, off: 0, label: "Under 100" },
  { min: 100, max: 299, off: 0.05, label: "100–299" },
  { min: 300, max: 499, off: 0.10, label: "300–499" },
  { min: 500, max: 999999, off: 0.20, label: "500+" }
];
