import WhatsAppInboxComponent from "@/components/whatsapp/WhatsAppInboxComponent";
import { getWhatsAppConversations, getAllEmployeesAndTeams } from "@/app/actions/whatsAppPlatformActions";

export const dynamic = 'force-dynamic';

export default async function WhatsAppInboxPage() {
  const [convsRes, empsRes] = await Promise.all([
    getWhatsAppConversations(),
    getAllEmployeesAndTeams()
  ]);

  return (
    <WhatsAppInboxComponent 
      initialConversations={convsRes.conversations || []} 
      initialEmployees={empsRes.employees || []}
    />
  );
}
