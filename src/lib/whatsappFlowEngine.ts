import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

/**
 * WhatsApp Chatbot Flow Engine
 * Ported from Shopify-Price-Editor/api/whatsapp-ai.js → executeFlowEngine()
 * Uses Prisma (WhatsAppFlowState, WhatsAppChatbotFlow) instead of Supabase
 */

// Interpolate {{variable}} placeholders with values
function interpolate(str: string, vars: Record<string, string>) {
  if (!str) return '';
  let s = str;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`{{${k}}}`, 'g'), v || '');
  }
  return s;
}

// Dispatch a single flow node as a WhatsApp message
async function dispatchNode(toPhone: string, node: any, vars: Record<string, string>) {
  const inter = (s: string) => interpolate(s, vars);

  try {
    const creds = await getCreds();
    if (!creds) {
      console.log(`[Flow Engine] DRY RUN — would send node ${node.type} to ${toPhone}`);
      return;
    }

    const url = `https://graph.facebook.com/v20.0/${creds.phoneId}/messages`;
    const headers = { 'Authorization': `Bearer ${creds.token}`, 'Content-Type': 'application/json' };
    let payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to: toPhone };

    if (node.type === 'text') {
      payload.type = 'text';
      payload.text = { body: inter(node.data?.text || '') };

    } else if (node.type === 'image') {
      payload.type = 'image';
      payload.image = { link: inter(node.data?.url || '') };
      if (node.data?.caption) payload.image.caption = inter(node.data.caption);

    } else if (node.type === 'video') {
      payload.type = 'video';
      payload.video = { link: inter(node.data?.url || '') };

    } else if (node.type === 'document') {
      payload.type = 'document';
      payload.document = { link: inter(node.data?.url || ''), filename: node.data?.filename || 'Document' };

    } else if (node.type === 'buttons' || node.type === 'quick_reply') {
      const btns = [node.data?.button1, node.data?.button2, node.data?.button3]
        .filter(Boolean).slice(0, 3);
      payload.type = 'interactive';
      payload.interactive = {
        type: 'button',
        body: { text: inter(node.data?.text || 'Please select:') },
        action: {
          buttons: btns.map((b: string, i: number) => ({
            type: 'reply',
            reply: { id: `flow_btn_${node.id}_${i}`, title: String(b).slice(0, 20) }
          }))
        }
      };

    } else if (node.type === 'list_menu') {
      const items = [node.data?.item1, node.data?.item2, node.data?.item3, node.data?.item4, node.data?.item5]
        .filter(Boolean).slice(0, 10);
      payload.type = 'interactive';
      payload.interactive = {
        type: 'list',
        header: { type: 'text', text: String(node.data?.title || 'Options').slice(0, 60) },
        body: { text: inter(node.data?.text || 'Please choose:') },
        action: {
          button: String(node.data?.btnText || 'Menu').slice(0, 20),
          sections: [{ title: 'Options', rows: items.map((t: string, i: number) => ({ id: `flow_list_${node.id}_${i}`, title: String(t).slice(0, 24) })) }]
        }
      };

    } else if (node.type === 'delay') {
      const ms = Math.min((parseInt(node.data?.seconds) || 1) * 1000, 4000);
      await new Promise(r => setTimeout(r, ms));
      return; // No message dispatch for delays

    } else {
      return; // Unsupported or logic node — skip dispatch
    }

    await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch (e: any) {
    console.error(`[Flow Engine] Dispatch error for node ${node.id}:`, e.message);
  }
}

// Get Meta API credentials from DB
async function getCreds() {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { accessToken: { not: null } }
  });
  if (!account?.accessToken || !account?.phoneId) return null;
  return { token: account.accessToken, phoneId: account.phoneId };
}

// Run nodes sequentially until a pause point (button/input) or end
async function runNodes(flow: any, startNodeId: string, vars: Record<string, string>, toPhone: string) {
  let nextNodeId: string | null = startNodeId;

  while (nextNodeId) {
    const node = flow.nodes?.find((n: any) => n.id === nextNodeId);
    if (!node) break;

    await dispatchNode(toPhone, node, vars);

    // Pause at interactive nodes — wait for customer reply
    const isPause = ['buttons', 'quick_reply', 'list_menu', 'input_name', 'input_email', 'input_phone', 'input_date', 'request'].includes(node.type);
    if (isPause) {
      return { status: 'paused', nodeId: node.id };
    }

    // Find next edge
    const nextEdge = flow.edges?.find((e: any) => e.source === node.id);
    nextNodeId = nextEdge ? nextEdge.target : null;
  }

  return { status: 'ended' };
}

/**
 * Main Flow Engine Entry Point
 * Returns true if a flow handled the message (stops AI from responding)
 */
export async function executeFlowEngine(senderPhone: string, userText: string, conversationId: string): Promise<boolean> {
  try {
    // 1. Check if this user is currently inside a flow
    const userState = await prisma.whatsAppFlowState.findUnique({
      where: { phone: senderPhone }
    });

    if (userState) {
      // User is mid-flow — find the flow
      const flowRecord = await prisma.whatsAppChatbotFlow.findUnique({
        where: { id: userState.flowId }
      });

      if (!flowRecord?.nodesJson) {
        // Flow gone — clear state
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
        return false;
      }

      let flow: any;
      try { flow = JSON.parse(flowRecord.nodesJson); } catch (_) { return false; }

      const vars: Record<string, string> = JSON.parse(userState.variables || '{}');
      const currentNode = flow.nodes?.find((n: any) => n.id === userState.currentNodeId);

      if (!currentNode) {
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
        return false;
      }

      // Save input captured from user
      if (['input_name', 'input_email', 'input_phone', 'input_date', 'request'].includes(currentNode.type)) {
        if (currentNode.data?.variable) {
          vars[currentNode.data.variable] = userText;
        }
      }

      // Route based on button clicked
      let nextEdge = null;
      if (['buttons', 'quick_reply', 'list_menu'].includes(currentNode.type)) {
        const allItems = [
          currentNode.data?.button1, currentNode.data?.button2, currentNode.data?.button3,
          currentNode.data?.item1, currentNode.data?.item2, currentNode.data?.item3,
          currentNode.data?.item4, currentNode.data?.item5
        ].filter(Boolean);

        const matchIndex = allItems.findIndex((b: string) =>
          b && userText.toLowerCase().includes(b.toLowerCase())
        );

        if (matchIndex !== -1) {
          nextEdge = flow.edges?.find((e: any) =>
            e.source === currentNode.id && e.sourceHandle === `btn-${matchIndex + 1}`
          );
        }
      }

      if (!nextEdge) {
        nextEdge = flow.edges?.find((e: any) => e.source === currentNode.id);
      }

      if (!nextEdge) {
        // Flow ended
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
        return true;
      }

      const result = await runNodes(flow, nextEdge.target, vars, senderPhone);

      if (result.status === 'ended') {
        await prisma.whatsAppFlowState.delete({ where: { phone: senderPhone } });
      } else {
        await prisma.whatsAppFlowState.update({
          where: { phone: senderPhone },
          data: { currentNodeId: result.nodeId!, variables: JSON.stringify(vars) }
        });
      }

      return true; // Flow handled the message
    }

    // 2. User NOT in a flow — check active flows for keyword triggers
    const activeFlows = await prisma.whatsAppChatbotFlow.findMany({
      where: { isActive: true }
    });

    for (const flowRecord of activeFlows) {
      if (!flowRecord.nodesJson) continue;

      let flow: any;
      try { flow = JSON.parse(flowRecord.nodesJson); } catch (_) { continue; }

      // Check trigger keyword
      const triggerKeyword = flowRecord.triggerKeyword?.toLowerCase().trim();
      if (!triggerKeyword) continue;

      if (userText.toLowerCase().trim() === triggerKeyword || userText.toLowerCase().includes(triggerKeyword)) {
        // Start this flow
        const triggerNode = flow.nodes?.find((n: any) => n.type === 'trigger');
        const firstEdge = flow.edges?.find((e: any) => e.source === (triggerNode?.id || ''));

        if (!firstEdge) continue;

        // Create flow state
        await prisma.whatsAppFlowState.upsert({
          where: { phone: senderPhone },
          update: { flowId: flowRecord.id, currentNodeId: firstEdge.target, variables: '{}' },
          create: { phone: senderPhone, flowId: flowRecord.id, currentNodeId: firstEdge.target, variables: '{}' }
        });

        const result = await runNodes(flow, firstEdge.target, {}, senderPhone);

        if (result.status === 'ended') {
          await prisma.whatsAppFlowState.deleteMany({ where: { phone: senderPhone } });
        } else {
          await prisma.whatsAppFlowState.update({
            where: { phone: senderPhone },
            data: { currentNodeId: result.nodeId! }
          });
        }

        // Increment execution count
        await prisma.whatsAppChatbotFlow.update({
          where: { id: flowRecord.id },
          data: { executionCount: { increment: 1 } }
        });

        return true; // Flow intercepted
      }
    }

    return false; // No flow matched
  } catch (err: any) {
    console.error('[Flow Engine Error]:', err.message);
    return false;
  }
}
