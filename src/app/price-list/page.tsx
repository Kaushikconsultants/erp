import React from "react";
import { getPublicCatalogData } from "@/app/actions/catalogActions";
import WholesalePriceListClient from "@/components/catalog/WholesalePriceListClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wholesale Price List & Trade Rates - R3 EXPORTS",
  description: "Official B2B glassware wholesale price list, live factory inventory, GST breakdown, retailer margins, and 1-click Excel download."
};

export default async function PriceListPage() {
  const catalogData = await getPublicCatalogData();

  return (
    <WholesalePriceListClient
      products={catalogData.products || []}
      company={catalogData.company || {
        companyName: "R3 EXPORTS",
        tradeName: "R3 EXPORTS",
        address: "F-12, Industrial Area, Phase 2, Mayapuri, New Delhi, Delhi 110064",
        city: "New Delhi",
        state: "Delhi",
        mobile: "+91 9876543210",
        email: "sales@r3exports.com",
        gstin: "07AAACR3333E1Z9"
      }}
    />
  );
}
