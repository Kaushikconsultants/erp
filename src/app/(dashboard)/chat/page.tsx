import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeamChatComponent from "@/components/chat/TeamChatComponent";
import { MessageSquare } from "lucide-react";

export const metadata = {
  title: "Team Chat | Antigravity CRM",
  description: "Internal team direct messaging and collaboration.",
};

interface ChatPageProps {
  searchParams: Promise<{ conv?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const resolvedParams = await searchParams;
  const convId = resolvedParams?.conv;

  return (
    <div className="page-container" style={{ paddingBottom: "20px" }}>
      <div className="dashboard-header" style={{ marginBottom: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <MessageSquare size={26} color="#4f46e5" /> Team Direct Chat
          </h1>
          <p className="page-subtitle">
            1-on-1 direct messaging, live online presence, and double checkmark read receipts.
          </p>
        </div>
      </div>

      <TeamChatComponent currentUserId={userId} initialConversationId={convId} />
    </div>
  );
}
