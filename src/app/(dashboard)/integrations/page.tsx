import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantIntegrations } from "@/app/actions/integrationActions";
import IntegrationsHubClient from "@/components/integrations/IntegrationsHubClient";

export const metadata = {
  title: "Integrations & APIs Hub | Heart of Business",
  description: "Connect multi-carrier shipping aggregators (Shiprocket, Shipmozo) and e-commerce platforms (Shopify, WooCommerce, Magento) directly via API."
};

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { integrations, stats } = await getTenantIntegrations();

  return (
    <IntegrationsHubClient
      initialIntegrations={integrations}
      initialStats={stats}
    />
  );
}
