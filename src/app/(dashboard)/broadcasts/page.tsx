import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBroadcasts, getEmployeesForBroadcastTargeting } from "@/app/actions/broadcastActions";
import BroadcastListClient from "@/components/broadcasts/BroadcastListClient";
import { Megaphone } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Team Notices & Broadcasts | Antigravity CRM",
  description: "Official team announcements, offers of the day, holiday notices, and discussions.",
};

export default async function BroadcastsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role || "SALES";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const [broadcastsRes, employeesRes] = await Promise.all([
    getBroadcasts(),
    isAdmin ? getEmployeesForBroadcastTargeting() : Promise.resolve({ employees: [] })
  ]);

  const broadcasts = broadcastsRes.broadcasts || [];
  const employees = employeesRes.employees || [];

  return (
    <div className="page-container">
      <div className="dashboard-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Megaphone size={28} color="#4f46e5" /> Team Notices & Broadcasts
          </h1>
          <p className="page-subtitle">
            Stay updated with daily offers, holiday schedules, announcements, and team discussions.
          </p>
        </div>
      </div>

      <BroadcastListClient
        initialBroadcasts={broadcasts}
        currentUserId={userId}
        isAdmin={isAdmin}
        employees={employees}
      />
    </div>
  );
}
