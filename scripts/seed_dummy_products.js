const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DUMMY_GLASSWARE_PRODUCTS = [
  {
    name: "R3 Royal 450ml Lead-Free Crystal Bordeaux Wine Glass",
    sku: "R3-WG-BOR-450",
    articleNumber: "ART-7013-01",
    category: "Wine Glasses (Bordeaux / Burgundy)",
    subCategory: "Royal Crystal Signature Series",
    material: "Lead-Free Crystal Glass",
    capacityMl: 450,
    size: "450ml",
    diameterMm: 85,
    heightMm: 230,
    weight: 0.28,
    masterCartonQty: 24,
    cbm: 0.045,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 220,
    sellingPrice: 450,
    mrp: 899,
    exportPriceUsd: 5.50,
    exportPriceEur: 5.10,
    exportPriceGbp: 4.40,
    stockQuantity: 480,
    minimumStock: 48,
    customizationOptions: "Laser Logo Etching, Gold Rim, Custom Gift Box",
    description: "Ultra-clear lead-free crystal wine glass engineered with laser-cut rim and pulled stem for enhanced aeration and acoustic clarity. Dishwasher safe up to 1000 cycles.",
    images: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 Pure Borosilicate 1000ml Infuser Water Bottle with Bamboo Lid",
    sku: "R3-BOT-INF-1000",
    articleNumber: "ART-7013-02",
    category: "Water Bottles & Flasks",
    subCategory: "Eco-Friendly Lifestyle Collection",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 1000,
    size: "1000ml",
    diameterMm: 78,
    heightMm: 245,
    weight: 0.38,
    masterCartonQty: 24,
    cbm: 0.052,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 280,
    sellingPrice: 550,
    mrp: 1199,
    exportPriceUsd: 6.80,
    exportPriceEur: 6.30,
    exportPriceGbp: 5.40,
    stockQuantity: 360,
    minimumStock: 48,
    customizationOptions: "Bamboo Lid Laser Engraving, Silicone Sleeve Branding",
    description: "Food-grade high borosilicate hydration bottle featuring removable 304 stainless steel tea/fruit infuser and hermetic natural bamboo twist lid.",
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 ThermoGrip Double-Wall Insulated Espresso Glasses 250ml (Set of 2)",
    sku: "R3-DWC-ESP-250",
    articleNumber: "ART-7013-03",
    category: "Double-Wall Cups & Glasses",
    subCategory: "Barista Thermal Series",
    material: "Double-Wall Thermal Insulated Glass",
    capacityMl: 250,
    size: "250ml",
    diameterMm: 80,
    heightMm: 95,
    weight: 0.22,
    masterCartonQty: 24,
    cbm: 0.038,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 180,
    sellingPrice: 380,
    mrp: 799,
    exportPriceUsd: 4.80,
    exportPriceEur: 4.40,
    exportPriceGbp: 3.80,
    stockQuantity: 600,
    minimumStock: 48,
    customizationOptions: "Custom Colored Gift Box, Screen Printed Logo",
    description: "Hand-blown double-wall borosilicate glass cups that create a floating beverage illusion while keeping hot drinks warm and cold drinks chilled with zero exterior condensation.",
    images: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 Diamond Cut Heavy Base Whiskey Tumblers 320ml (Set of 4)",
    sku: "R3-TUM-DIA-320",
    articleNumber: "ART-7013-04",
    category: "Whiskey Tumblers & Old Fashioned",
    subCategory: "Vintage Barware Classics",
    material: "Lead-Free Crystal Glass",
    capacityMl: 320,
    size: "320ml",
    diameterMm: 82,
    heightMm: 98,
    weight: 0.35,
    masterCartonQty: 24,
    cbm: 0.042,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 190,
    sellingPrice: 390,
    mrp: 799,
    exportPriceUsd: 4.90,
    exportPriceEur: 4.50,
    exportPriceGbp: 3.90,
    stockQuantity: 240,
    minimumStock: 48,
    customizationOptions: "Custom Monogram Etching, Gold Foil Stamped Gift Packaging",
    description: "Classic old-fashioned lowball tumbler with geometric diamond light refraction facets and substantial weighted base for scotch, bourbon, and craft cocktails.",
    images: [
      "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 Artisan 1500ml Hand-Blown Crystal Wine Aerator Decanter",
    sku: "R3-DEC-ART-1500",
    articleNumber: "ART-7013-05",
    category: "Decanters & Aerators",
    subCategory: "Sommelier Master Collection",
    material: "Hand-Blown Artisan Crystal",
    capacityMl: 1500,
    size: "1500ml",
    diameterMm: 210,
    heightMm: 260,
    weight: 0.85,
    masterCartonQty: 6,
    cbm: 0.048,
    moq: 50,
    hsnCode: "7013",
    purchasePrice: 650,
    sellingPrice: 1350,
    mrp: 2699,
    exportPriceUsd: 16.50,
    exportPriceEur: 15.20,
    exportPriceGbp: 13.00,
    stockQuantity: 120,
    minimumStock: 12,
    customizationOptions: "Slanted Gold Rim, Premium Foam Lined Gift Box",
    description: "Ergonomic U-shaped wide-body decanter handcrafted by master glassblowers to maximize oxygenation and release rich aromas of vintage wines.",
    images: [
      "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 Nordic Zen 1200ml Borosilicate Teapot with Stainless Infuser",
    sku: "R3-TEA-ZEN-1200",
    articleNumber: "ART-7013-06",
    category: "Teapots & Infusers",
    subCategory: "Zen Infusions Tea Collection",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 1200,
    size: "1200ml",
    diameterMm: 140,
    heightMm: 165,
    weight: 0.45,
    masterCartonQty: 12,
    cbm: 0.040,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 420,
    sellingPrice: 850,
    mrp: 1699,
    exportPriceUsd: 10.50,
    exportPriceEur: 9.80,
    exportPriceGbp: 8.30,
    stockQuantity: 0,
    minimumStock: 24,
    customizationOptions: "Laser Etched Strainer, Branded Wooden Lid Knob",
    description: "Stovetop-safe borosilicate glass teapot with ultra-fine removable micro-mesh filter and non-drip V-spout for blooming teas, herbal infusions, and green tea.",
    images: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 Hermetic Bamboo Airtight Storage Canister 750ml",
    sku: "R3-JAR-BAM-750",
    articleNumber: "ART-7013-07",
    category: "Airtight Storage Jars & Canisters",
    subCategory: "Pantry & Kitchen Organization",
    material: "High Borosilicate Glass (Heat Resistant -20°C to 150°C)",
    capacityMl: 750,
    size: "750ml",
    diameterMm: 90,
    heightMm: 150,
    weight: 0.32,
    masterCartonQty: 36,
    cbm: 0.055,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 140,
    sellingPrice: 290,
    mrp: 599,
    exportPriceUsd: 3.60,
    exportPriceEur: 3.30,
    exportPriceGbp: 2.80,
    stockQuantity: 720,
    minimumStock: 72,
    customizationOptions: "Custom Bamboo Lid Logo, Vinyl Decal Labels",
    description: "Stackable high-borosilicate cylindrical storage jar with food-safe silicone airtight sealing ring on solid natural bamboo lid. Moisture and pest proof.",
    images: [
      "https://images.unsplash.com/photo-1584269600519-112d071b35e6?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80"
    ]
  },
  {
    name: "R3 Celebration Champagne Flutes 220ml (Set of 6 Pack)",
    sku: "R3-FLU-CEL-220",
    articleNumber: "ART-7013-08",
    category: "Champagne Flutes",
    subCategory: "Banquet & Event Stemware",
    material: "Lead-Free Crystal Glass",
    capacityMl: 220,
    size: "220ml",
    diameterMm: 65,
    heightMm: 245,
    weight: 0.24,
    masterCartonQty: 24,
    cbm: 0.046,
    moq: 100,
    hsnCode: "7013",
    purchasePrice: 210,
    sellingPrice: 420,
    mrp: 849,
    exportPriceUsd: 5.20,
    exportPriceEur: 4.80,
    exportPriceGbp: 4.10,
    stockQuantity: 360,
    minimumStock: 48,
    customizationOptions: "Gold Rim Lining, Hotel/Banquet Logo Printing",
    description: "Slender conical bowl crystal flute designed to preserve effervescence and direct bubbles upward in sparkling wines, prosecco, and champagne.",
    images: [
      "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=800&auto=format&fit=crop&q=80"
    ]
  }
];

async function seed() {
  console.log("Starting Dummy Glassware Products Seeder for R3 EXPORTS...");

  // 1. Resolve Organization
  let org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: { in: ["r3-exports", "r3-enterprises"] } },
        { name: { contains: "R3", mode: "insensitive" } }
      ]
    }
  }) || await prisma.organization.findFirst();

  if (!org) {
    console.log("Creating R3 EXPORTS organization...");
    org = await prisma.organization.create({
      data: {
        name: "R3 EXPORTS",
        slug: "r3-exports",
        tradeName: "R3 EXPORTS",
        industry: "Glassware & Tableware Manufacturing",
        businessType: "Private Limited",
        gstin: "07AAACR3333E1Z9",
        phone: "+91 9876543210",
        email: "sales@r3exports.com",
        address: "F-12, Industrial Area, Phase 2, Mayapuri",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110064",
        country: "India"
      }
    });
  }

  console.log(`Using Organization: ${org.name} (${org.id})`);

  let addedCount = 0;
  let updatedCount = 0;

  for (const prodData of DUMMY_GLASSWARE_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { sku: prodData.sku },
          { articleNumber: prodData.articleNumber }
        ]
      }
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...prodData,
          organizationId: org.id
        }
      });
      updatedCount++;
      console.log(`Updated product: ${prodData.name} (${prodData.sku})`);
    } else {
      await prisma.product.create({
        data: {
          ...prodData,
          organizationId: org.id,
          status: "Active",
          inventoryTransactions: {
            create: {
              type: "IN",
              quantity: prodData.stockQuantity,
              reference: "Initial Factory Seed Stock",
              notes: "Imported into live ERP inventory"
            }
          }
        }
      });
      addedCount++;
      console.log(`Created product: ${prodData.name} (${prodData.sku})`);
    }
  }

  console.log(`\n✅ Seeding Complete! Added: ${addedCount}, Updated: ${updatedCount}`);
}

seed()
  .catch(err => {
    console.error("Seeder Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
