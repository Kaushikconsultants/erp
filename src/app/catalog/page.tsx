import React from "react";
import { getPublicCatalogData } from "@/app/actions/catalogActions";
import PublicCatalogClient from "@/components/catalog/PublicCatalogClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wholesale Product Catalog & Lookbook",
  description: "Browse wholesale collection, check article rates, and place bulk orders."
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
        companyName: "ESPON CLOTHING PRIVATE LIMITED",
        address: "Sco 71A, 2nd Floor, Ashoka Plaza, Delhi Road, Rohtak, Haryana",
        city: "Rohtak",
        state: "Haryana",
        mobile: "+91 7206066678",
        email: "clothingespon@gmail.com",
        gstin: "06AAHCE7721Q1Z4"
      }}
      initialTitle={title}
    />
  );
}
