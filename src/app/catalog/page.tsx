import React from "react";
import { getPublicCatalogData } from "@/app/actions/catalogActions";
import PublicCatalogClient from "@/components/catalog/PublicCatalogClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "R3 EXPORTS - Premium Glassware Wholesale Catalog & Lookbook",
  description: "Browse premium glassware wholesale collection, live inventory stock, trade rates, and place direct bulk orders."
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PublicCatalogPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const idsParam = resolvedParams.ids ? String(resolvedParams.ids).split(",").filter(Boolean) : undefined;
  const title = resolvedParams.title ? String(resolvedParams.title) : undefined;

  const catalogData = await getPublicCatalogData(idsParam);

  return (
    <PublicCatalogClient
      initialProducts={catalogData.products}
      categories={catalogData.categories}
      company={catalogData.company || {
        companyName: "R3 EXPORTS",
        tradeName: "R3 EXPORTS",
        address: "F-12, Industrial Area, Phase 2, Mayapuri, New Delhi, Delhi 110064",
        city: "New Delhi",
        state: "Delhi",
        mobile: "+91 9876543210",
        email: "sales@r3exports.com",
        gstin: "07AAACR3333E1Z9",
        minOrderValueReadyStock: 15000,
        minOrderValueMadeToOrder: 50000
      }}
      initialTitle={title}
    />
  );
}
