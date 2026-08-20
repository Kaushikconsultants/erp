"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  MapPin,
  User,
  Link as LinkIcon,
  Layers,
  HelpCircle,
  List,
  Mail,
  Phone,
  Calendar,
  Star,
  Sliders,
  GitBranch,
  Clock,
  Shuffle,
  CornerDownRight,
  CreditCard,
  QrCode,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  Globe,
  UserPlus,
  UserCheck,
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Focus,
  Hand,
  Check,
  Plus,
  Radio,
  Settings,
  FolderOpen,
  Power,
  GripVertical,
  ExternalLink,
  ShieldCheck,
  Tag
} from "lucide-react";
import {
  getWhatsAppChatbotFlows,
  saveWhatsAppChatbotFlowAction,
  deleteWhatsAppChatbotFlowAction,
  duplicateWhatsAppChatbotFlowAction,
  toggleWhatsAppChatbotFlowStatusAction
} from "@/app/actions/whatsAppPlatformActions";
import "@/components/whatsapp/ChatbotBuilder.css";

// Block Library Categories
const blockCategories = [
  {
    name: "Messages",
    count: 11,
    blocks: [
      { id: "text", name: "Text", icon: MessageSquare },
      { id: "image", name: "Image", icon: ImageIcon },
      { id: "video", name: "Video", icon: Video },
      { id: "youtube", name: "YouTube", icon: Video },
      { id: "file", name: "File / PDF", icon: FileText },
      { id: "audio", name: "Audio", icon: Music },
      { id: "location", name: "Location", icon: MapPin },
      { id: "contact", name: "Contact", icon: User },
      { id: "link", name: "Link", icon: LinkIcon },
      { id: "carousel", name: "Media Carousel", icon: Layers },
      { id: "request", name: "Request", icon: HelpCircle }
    ]
  },
  {
    name: "Choices",
    count: 2,
    blocks: [
      { id: "buttons", name: "Buttons", icon: List },
      { id: "list_menu", name: "List Menu", icon: Layers }
    ]
  },
  {
    name: "Inputs",
    count: 5,
    blocks: [
      { id: "input_name", name: "Name Input", icon: User },
      { id: "input_email", name: "Email Input", icon: Mail },
      { id: "input_phone", name: "Phone Input", icon: Phone },
      { id: "input_date", name: "Date Input", icon: Calendar },
      { id: "input_rating", name: "Rating Input", icon: Star }
    ]
  },
  {
    name: "Logic",
    count: 5,
    blocks: [
      { id: "set_var", name: "Set Variable", icon: Sliders },
      { id: "condition", name: "Condition (If/Else)", icon: GitBranch },
      { id: "delay", name: "Delay / Wait", icon: Clock },
      { id: "split_test", name: "Split Test (A/B)", icon: Shuffle },
      { id: "jump", name: "Jump to Block", icon: CornerDownRight }
    ]
  },
  {
    name: "Payments",
    count: 3,
    blocks: [
      { id: "pay_link", name: "Payment Link", icon: CreditCard },
      { id: "pay_qr", name: "UPI QR Code", icon: QrCode },
      { id: "pay_collect", name: "Collect Payment", icon: DollarSign }
    ]
  },
  {
    name: "E-Commerce",
    count: 2,
    blocks: [
      { id: "catalog", name: "Product Catalog", icon: ShoppingBag },
      { id: "order", name: "Multi-Item Order", icon: ShoppingCart }
    ]
  },
  {
    name: "API & Live Data",
    count: 1,
    blocks: [
      { id: "webhook", name: "Webhook Fetch", icon: Globe }
    ]
  },
  {
    name: "Connect (CRM)",
    count: 3,
    blocks: [
      { id: "crm_contact", name: "Update CRM Contact", icon: UserCheck },
      { id: "crm_lead", name: "Create Lead", icon: UserPlus },
      { id: "crm_roundrobin", name: "Assign Sales Rep", icon: Shuffle }
    ]
  },
  {
    name: "AI & Meta",
    count: 2,
    blocks: [
      { id: "ai_bot", name: "AI GPT Intent", icon: Bot },
      { id: "meta_template", name: "Send Meta Template", icon: Sparkles }
    ]
  }
];

// Pre-built WATI & Galabox Templates
const BOT_TEMPLATES = [
  {
    id: "wati_lead_gen",
    name: "WATI Style Lead Qualification & Menu Bot",
    platform: "WATI",
    description: "Inquiry router that auto-categorizes incoming messages into Retailer/Wholesaler, tags contacts in CRM, and assigns agents via Round-Robin.",
    triggerKeyword: "HI, HELLO, INQUIRY, PRICING",
    nodes: [
      {
        id: "node_trigger",
        type: "TRIGGER",
        category: "trigger",
        title: "FLOW TRIGGER",
        x: 30,
        y: 100,
        text: "Incoming Message matches: HI, HELLO, INQUIRY",
        outputPort: "node_start"
      },
      {
        id: "node_start",
        type: "START",
        category: "start",
        title: "Start / Auto Assign",
        x: 330,
        y: 100,
        text: "Assign via Round-Robin distribution to Sales Team",
        outputPort: "node_menu"
      },
      {
        id: "node_menu",
        type: "CHOICE",
        category: "choice",
        title: "Inquiry Menu",
        x: 630,
        y: 100,
        imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500",
        text: "Welcome to Espon Clothing Wholesale! Please select your inquiry category below:",
        choices: [
          { id: "c1", text: "1. Retailer / Shop Owner", targetNode: "node_crm_retail" },
          { id: "c2", text: "2. Wholesaler / Bulk Buyer", targetNode: "node_crm_wholesale" },
          { id: "c3", text: "3. Personal Inquiry", targetNode: "node_end_personal" }
        ]
      },
      {
        id: "node_crm_retail",
        type: "CRM_CONTACT",
        category: "crm",
        title: "Update CRM Contact (Retailer)",
        x: 970,
        y: 40,
        leadStage: "Qualified Retailer",
        priority: "MEDIUM",
        temperature: "WARM",
        tags: "Retailer, Qualified",
        text: "Update CRM Contact:\n• Lead Stage: Qualified Retailer\n• Priority: MEDIUM",
        outputPort: "node_end_b2b"
      },
      {
        id: "node_crm_wholesale",
        type: "CRM_CONTACT",
        category: "crm",
        title: "Update CRM Contact (Wholesale)",
        x: 970,
        y: 200,
        leadStage: "Wholesale Inquiry",
        priority: "HIGH",
        temperature: "HOT",
        tags: "Wholesale, Hot Lead",
        text: "Update CRM Contact:\n• Lead Stage: Wholesale Inquiry\n• Priority: HIGH",
        outputPort: "node_end_b2b"
      },
      {
        id: "node_end_personal",
        type: "END",
        category: "end",
        title: "Personal Store Link",
        x: 970,
        y: 360,
        text: "For personal use, visit our online retail store directly:",
        buttonText: "Visit Online Store 🛍️",
        url: "https://espon.in/shop"
      },
      {
        id: "node_end_b2b",
        type: "END",
        category: "end",
        title: "Confirmation & Callback",
        x: 1300,
        y: 120,
        text: "Thank you! Our wholesale specialist will call you shortly with catalog & pricing details.",
        buttonText: "View Catalog 📄",
        url: "https://espon.in/catalog.pdf"
      }
    ]
  },
  {
    id: "galabox_ecom",
    name: "Galabox E-Commerce & Order Tracking Bot",
    platform: "Galabox",
    description: "Multi-option e-commerce bot supporting product catalog browsing, live order tracking by AWB, and quick UPI payment collection.",
    triggerKeyword: "CATALOG, ORDER, TRACK, PAYMENT",
    nodes: [
      {
        id: "node_trigger",
        type: "TRIGGER",
        category: "trigger",
        title: "FLOW TRIGGER",
        x: 30,
        y: 100,
        text: "Incoming Message matches: CATALOG, ORDER, TRACK",
        outputPort: "node_welcome"
      },
      {
        id: "node_welcome",
        type: "CHOICE",
        category: "choice",
        title: "E-Commerce Main Menu",
        x: 330,
        y: 100,
        text: "Welcome to Espon Apparel Direct! How can we assist your order today?",
        choices: [
          { id: "g1", text: "🛍️ Browse Apparel Catalog", targetNode: "node_catalog" },
          { id: "g2", text: "🚚 Track Existing Order", targetNode: "node_track_input" },
          { id: "g3", text: "💳 Pay Pending Invoice", targetNode: "node_payment_qr" }
        ]
      },
      {
        id: "node_catalog",
        type: "CATALOG",
        category: "choice",
        title: "Product Catalog Carousel",
        x: 680,
        y: 40,
        categoryName: "Wholesale Activewear",
        text: "Here are our top trending wholesale categories for 2026. Select item to request quotation.",
        outputPort: "node_catalog_end"
      },
      {
        id: "node_track_input",
        type: "INPUT_PHONE",
        category: "input",
        title: "Order ID / Mobile Input",
        x: 680,
        y: 200,
        variableName: "customer_mobile",
        retryMessage: "Invalid mobile number. Enter 10 digits.",
        text: "Please reply with your 10-digit registered mobile number or Order ID (e.g. ORD-1092).",
        outputPort: "node_track_result"
      },
      {
        id: "node_payment_qr",
        type: "PAY_QR",
        category: "payment",
        title: "Instant UPI QR Code",
        x: 680,
        y: 360,
        amount: 2500,
        upiId: "7206066678@OKBIZAXIS",
        payeeName: "Espon Clothing Pvt Ltd",
        text: "Scan QR code or click payment link below to complete payment instantly via GooglePay / PhonePe:",
        outputPort: "node_pay_end"
      },
      {
        id: "node_catalog_end",
        type: "END",
        category: "end",
        title: "Catalog Request Shared",
        x: 1000,
        y: 40,
        text: "Catalog PDF downloaded. Our representative will contact you for custom manufacturing orders."
      },
      {
        id: "node_track_result",
        type: "END",
        category: "end",
        title: "Tracking Details",
        x: 1000,
        y: 200,
        text: "Your order status: IN TRANSIT (Delhivery Courier AWB #7890123). Expected Delivery: Tomorrow 5 PM."
      },
      {
        id: "node_pay_end",
        type: "END",
        category: "end",
        title: "Payment Receipt Sent",
        x: 1000,
        y: 360,
        text: "Once payment is completed, your invoice receipt will be sent here automatically."
      }
    ]
  },
  {
    id: "blank",
    name: "Blank Canvas Bot Flow",
    platform: "Custom",
    description: "Start with a clean canvas containing only standard Flow Trigger and Start nodes.",
    triggerKeyword: "HI, START",
    nodes: [
      {
        id: "node_trigger",
        type: "TRIGGER",
        category: "trigger",
        title: "FLOW TRIGGER",
        x: 30,
        y: 100,
        triggerKeywords: "HI, HELLO",
        text: "Incoming Message matches: HI, HELLO",
        outputPort: "node_start"
      },
      {
        id: "node_start",
        type: "START",
        category: "start",
        title: "Start Node",
        x: 330,
        y: 100,
        text: "Start building your customized chatbot flow..."
      }
    ]
  }
];

export default function WhatsAppChatbotBuilderPage() {
  // DB Saved Flow State
  const [savedFlows, setSavedFlows] = useState<any[]>([]);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState<string>("Default Chatbot Flow");
  const [triggerKeyword, setTriggerKeyword] = useState<string>("HI, HELLO, CATALOG");
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [isLoadingFlows, setIsLoadingFlows] = useState<boolean>(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("wati_lead_gen");
  const [newBotNameInput, setNewBotNameInput] = useState<string>("");
  const [newBotKeywordInput, setNewBotKeywordInput] = useState<string>("");

  // Canvas Node State
  const [nodes, setNodes] = useState<any[]>(BOT_TEMPLATES[0].nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({ Messages: true, Choices: true });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [blockSearch, setBlockSearch] = useState<string>("");

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Interactive Drag-to-Connect Wire State
  const [connectingFrom, setConnectingFrom] = useState<{
    sourceNodeId: string;
    choiceId?: string;
    choiceIndex?: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);

  // Full Screen Studio State
  const [isFullScreenStudio, setIsFullScreenStudio] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<any[]>([BOT_TEMPLATES[0].nodes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Simulator Modal State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [drawerTab, setDrawerTab] = useState<"basic" | "advanced">("basic");

  // Fetch Saved Chatbot Flows from DB
  const fetchFlows = async () => {
    setIsLoadingFlows(true);
    const res = await getWhatsAppChatbotFlows();
    if (res.success && res.flows) {
      setSavedFlows(res.flows);
      if (res.flows.length > 0) {
        const target = res.flows.find((f: any) => f.id === currentFlowId) || res.flows[0];
        setCurrentFlowId(target.id);
        setFlowName(target.name);
        setTriggerKeyword(target.triggerKeyword || "HI, HELLO, CATALOG");
        setIsBotActive(target.isActive);
        try {
          const parsedNodes = JSON.parse(target.nodesJson);
          if (Array.isArray(parsedNodes)) {
            setNodes(parsedNodes);
            setHistoryStack([parsedNodes]);
            setHistoryIndex(0);
          }
        } catch (e) {
          console.error("Failed to parse nodesJson:", e);
        }
      } else {
        setCurrentFlowId(null);
        setFlowName("No Active Chatbot");
        setTriggerKeyword("");
        setIsBotActive(false);
        setNodes([]);
      }
    }
    setIsLoadingFlows(false);
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleSelectFlow = (flowId: string) => {
    const target = savedFlows.find((f) => f.id === flowId);
    if (!target) return;
    setCurrentFlowId(target.id);
    setFlowName(target.name);
    setTriggerKeyword(target.triggerKeyword || "HI, HELLO, CATALOG");
    setIsBotActive(target.isActive);
    try {
      const parsedNodes = JSON.parse(target.nodesJson);
      if (Array.isArray(parsedNodes)) {
        setNodes(parsedNodes);
        setHistoryStack([parsedNodes]);
        setHistoryIndex(0);
        setSelectedNodeId(null);
        setIsDrawerOpen(false);
      }
    } catch (e) {
      console.error("Error loading selected flow nodes:", e);
    }
  };

  const handleConfirmCreateNewBot = async () => {
    const template = BOT_TEMPLATES.find((t) => t.id === selectedTemplateId) || BOT_TEMPLATES[0];
    const botName = newBotNameInput.trim() || template.name;
    const botKeyword = newBotKeywordInput.trim() || template.triggerKeyword;

    setIsSaving(true);
    const res = await saveWhatsAppChatbotFlowAction({
      name: botName,
      triggerKeyword: botKeyword,
      nodesJson: JSON.stringify(template.nodes),
      isActive: true
    });

    if (res.success && res.flow) {
      setToastMsg(`✓ New Chatbot "${botName}" created successfully!`);
      setShowCreateModal(false);
      setNewBotNameInput("");
      setNewBotKeywordInput("");
      await fetchFlows();
      handleSelectFlow(res.flow.id);
    } else {
      setToastMsg(`Error creating chatbot: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDeleteFlowById = async (flowIdToDelete: string) => {
    setIsSaving(true);
    const targetFlow = savedFlows.find((f) => f.id === flowIdToDelete);
    const flowTitle = targetFlow ? targetFlow.name : "Chatbot";

    const res = await deleteWhatsAppChatbotFlowAction(flowIdToDelete);
    if (res.success) {
      setToastMsg(`✓ Chatbot "${flowTitle}" permanently deleted.`);
      setShowDeleteModal(false);

      const remaining = savedFlows.filter((f) => f.id !== flowIdToDelete);
      setSavedFlows(remaining);

      if (flowIdToDelete === currentFlowId) {
        if (remaining.length > 0) {
          const next = remaining[0];
          setCurrentFlowId(next.id);
          setFlowName(next.name);
          setTriggerKeyword(next.triggerKeyword || "HI, HELLO, CATALOG");
          setIsBotActive(next.isActive);
          try {
            const parsed = JSON.parse(next.nodesJson);
            if (Array.isArray(parsed)) {
              setNodes(parsed);
              setHistoryStack([parsed]);
              setHistoryIndex(0);
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          setCurrentFlowId(null);
          setFlowName("No Active Chatbot");
          setTriggerKeyword("");
          setIsBotActive(false);
          setNodes([]);
          setSelectedNodeId(null);
          setIsDrawerOpen(false);
        }
      }
    } else {
      setToastMsg(`Error deleting bot: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleConfirmDeleteBot = async () => {
    if (!currentFlowId) return;
    await handleDeleteFlowById(currentFlowId);
  };

  const handleDuplicateCurrentBot = async () => {
    if (!currentFlowId) return;
    setIsSaving(true);
    const res = await duplicateWhatsAppChatbotFlowAction(currentFlowId);
    if (res.success && res.flow) {
      setToastMsg(`✓ Cloned bot "${res.flow.name}" created!`);
      await fetchFlows();
      handleSelectFlow(res.flow.id);
    } else {
      setToastMsg(`Error cloning bot: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleToggleActiveStatus = async (flowId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const res = await toggleWhatsAppChatbotFlowStatusAction(flowId, newStatus);
    if (res.success) {
      if (flowId === currentFlowId) {
        setIsBotActive(newStatus);
      }
      setSavedFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, isActive: newStatus } : f)));
      setToastMsg(`Chatbot status changed to ${newStatus ? 'ACTIVE' : 'DRAFT'}`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handlePublishFlow = async () => {
    setIsSaving(true);
    const res = await saveWhatsAppChatbotFlowAction({
      id: currentFlowId || undefined,
      name: flowName,
      triggerKeyword: triggerKeyword,
      nodesJson: JSON.stringify(nodes),
      isActive: isBotActive
    });
    if (res.success && res.flow) {
      setCurrentFlowId(res.flow.id);
      setToastMsg("✓ Chatbot Flow successfully saved & published to WhatsApp database!");
      await fetchFlows();
    } else {
      setToastMsg(`Error saving flow: ${res.error}`);
    }
    setIsSaving(false);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Choice Option handlers
  const handleAddOptionToNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const currentChoices = n.choices || [];
        const newChoiceNum = currentChoices.length + 1;
        const newChoice = {
          id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          text: `Option ${newChoiceNum}`,
          targetNode: null
        };
        return { ...n, choices: [...currentChoices, newChoice] };
      })
    );
  };

  const handleDeleteOptionFromNode = (nodeId: string, choiceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, choices: (n.choices || []).filter((c: any) => c.id !== choiceId) };
      })
    );
  };

  const handleUpdateOptionText = (nodeId: string, choiceId: string, newText: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const updated = (n.choices || []).map((c: any) => (c.id === choiceId ? { ...c, text: newText } : c));
        return { ...n, choices: updated };
      })
    );
  };

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const pushHistory = (newNodes: any[]) => {
    const updated = historyStack.slice(0, historyIndex + 1);
    setHistoryStack([...updated, newNodes]);
    setHistoryIndex(updated.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setNodes(historyStack[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setNodes(historyStack[historyIndex + 1]);
    }
  };

  // ---------------------------------------------------------
  // RICH BLOCK INITIALIZATION FOR ALL 25+ BLOCK TYPES
  // ---------------------------------------------------------
  const handleAddBlockToCanvas = (block: any) => {
    const selected = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
    const newNodeId = `node_${Date.now()}`;
    const basePos = {
      x: selected ? selected.x + 290 : 400,
      y: selected ? selected.y + 40 : 200
    };

    let newNode: any = {
      id: newNodeId,
      type: block.id.toUpperCase(),
      title: block.name,
      x: basePos.x,
      y: basePos.y
    };

    switch (block.id) {
      case "text":
        newNode = { ...newNode, category: "choice", text: "Hi {{customer_name}}, thank you for reaching out to Espon Apparel!" };
        break;
      case "image":
        newNode = { ...newNode, category: "choice", imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500", caption: "Check out our latest 2026 Wholesale Activewear Collection!" };
        break;
      case "video":
        newNode = { ...newNode, category: "choice", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", caption: "Watch our apparel production demo video." };
        break;
      case "youtube":
        newNode = { ...newNode, category: "choice", youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "Espon Factory Tour & Manufacturing Demo" };
        break;
      case "file":
        newNode = { ...newNode, category: "choice", fileUrl: "https://espon.in/catalog.pdf", filename: "Espon_Apparel_Catalog_2026.pdf" };
        break;
      case "audio":
        newNode = { ...newNode, category: "choice", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", isVoiceNote: true, text: "Audio Note: Welcome message from Ikra Sales Manager" };
        break;
      case "location":
        newNode = { ...newNode, category: "choice", locationName: "Espon Apparel HQ Factory", address: "SCO 71A, Ashoka Plaza, Rohtak, Haryana 124001", lat: 28.8955, lng: 76.6066 };
        break;
      case "contact":
        newNode = { ...newNode, category: "choice", contactName: "Ikra Sales Manager", contactPhone: "+91 7206066678", contactOrg: "Espon Apparel Direct" };
        break;
      case "link":
        newNode = { ...newNode, category: "choice", text: "Click below to visit our B2B wholesale store:", buttonText: "Visit Portal 🌐", url: "https://espon.in" };
        break;
      case "carousel":
        newNode = {
          ...newNode,
          category: "choice",
          text: "Featured Categories Carousel:",
          items: [
            { id: "item_1", title: "Polo T-Shirts", subtitle: "₹290/pc · Min 100 pcs", imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400", buttonText: "Inquire Now" },
            { id: "item_2", title: "Track Pants", subtitle: "₹340/pc · Min 50 pcs", imageUrl: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400", buttonText: "Inquire Now" }
          ]
        };
        break;
      case "request":
        newNode = { ...newNode, category: "input", text: "Please enter your requirement quantity (pcs):", variableName: "req_qty" };
        break;
      case "buttons":
        newNode = {
          ...newNode,
          category: "choice",
          text: "Select your inquiry topic below:",
          choices: [
            { id: `c_${Date.now()}_1`, text: "1. Wholesale Catalog", targetNode: null },
            { id: `c_${Date.now()}_2`, text: "2. Custom Manufacturing", targetNode: null }
          ]
        };
        break;
      case "list_menu":
        newNode = {
          ...newNode,
          category: "choice",
          text: "Select from our service options menu:",
          menuTitle: "Main Menu Options",
          choices: [
            { id: `c_${Date.now()}_1`, text: "1. View Bulk Pricing", description: "Tiered wholesale slabs", targetNode: null },
            { id: `c_${Date.now()}_2`, text: "2. Track Order Status", description: "Live AWB status", targetNode: null }
          ]
        };
        break;
      case "input_name":
        newNode = { ...newNode, category: "input", text: "What is your full name?", variableName: "customer_name", retryMessage: "Please enter a valid name." };
        break;
      case "input_email":
        newNode = { ...newNode, category: "input", text: "Please enter your business email address:", variableName: "customer_email", retryMessage: "Invalid email format. Try again." };
        break;
      case "input_phone":
        newNode = { ...newNode, category: "input", text: "Please enter your 10-digit mobile number:", variableName: "customer_mobile", retryMessage: "Invalid mobile number. Enter 10 digits." };
        break;
      case "input_date":
        newNode = { ...newNode, category: "input", text: "Select your preferred delivery date (YYYY-MM-DD):", variableName: "delivery_date" };
        break;
      case "input_rating":
        newNode = { ...newNode, category: "input", text: "Rate your experience from 1 to 5 Stars ⭐:", variableName: "rating_score" };
        break;
      case "set_var":
        newNode = { ...newNode, category: "logic", title: "Set Variable", variableName: "lead_status", variableValue: "Qualified" };
        break;
      case "condition":
        newNode = { ...newNode, category: "logic", title: "Condition (If / Else)", variableName: "customer_type", operator: "EQUALS", compareValue: "Wholesaler", truePort: null, falsePort: null };
        break;
      case "delay":
        newNode = { ...newNode, category: "logic", title: "Wait / Delay", delayValue: 5, delayUnit: "MINUTES", text: "Wait 5 minutes before continuing..." };
        break;
      case "split_test":
        newNode = { ...newNode, category: "logic", title: "Split Test (A/B)", splitRatio: "50/50", branchAPort: null, branchBPort: null };
        break;
      case "jump":
        newNode = { ...newNode, category: "logic", title: "Jump to Block", targetNodeId: null };
        break;
      case "pay_link":
        newNode = { ...newNode, category: "payment", title: "Send Payment Link", amount: 1500, currency: "INR", paymentDescription: "Order Deposit Payment", paymentUrl: "https://pay.espon.in/dep1092" };
        break;
      case "pay_qr":
        newNode = { ...newNode, category: "payment", title: "UPI QR Code", amount: 2500, upiId: "7206066678@OKBIZAXIS", payeeName: "Espon Clothing Pvt Ltd", text: "Scan QR via GPay / PhonePe / Paytm:" };
        break;
      case "pay_collect":
        newNode = { ...newNode, category: "payment", title: "Collect Payment", amount: 5000, paymentModes: ["UPI", "Cards", "NetBanking"] };
        break;
      case "catalog":
        newNode = { ...newNode, category: "choice", title: "Product Catalog Carousel", categoryName: "Wholesale Activewear", text: "Browse ready stock catalog below:" };
        break;
      case "order":
        newNode = { ...newNode, category: "choice", title: "Multi-Item Order", text: "Order Summary: 100 pcs Polo T-Shirts (₹29,000)" };
        break;
      case "webhook":
        newNode = { ...newNode, category: "api", title: "Webhook Fetch (API)", webhookUrl: "https://api.espon.in/v1/inventory", method: "POST", headers: "Content-Type: application/json", requestBody: '{"sku": "ESP-902"}' };
        break;
      case "crm_contact":
        newNode = { ...newNode, category: "crm", title: "Update CRM Contact", leadStage: "Qualified Lead", priority: "HIGH", temperature: "HOT", tags: "Hot Lead, Wholesale" };
        break;
      case "crm_lead":
        newNode = { ...newNode, category: "crm", title: "Create Lead", leadSource: "WhatsApp Bot", customerType: "Wholesaler" };
        break;
      case "crm_roundrobin":
        newNode = { ...newNode, category: "crm", title: "Assign Sales Rep", assignmentMode: "ROUND_ROBIN", department: "Wholesale Sales" };
        break;
      case "ai_bot":
        newNode = { ...newNode, category: "ai", title: "AI GPT Intent Auto-Answer", systemPrompt: "You are Espon AI Assistant. Answer product catalog and pricing inquiries politely.", confidenceThreshold: 85 };
        break;
      case "meta_template":
        newNode = { ...newNode, category: "ai", title: "Send Meta Template", templateName: "order_confirmation_v2", language: "en_US" };
        break;
      default:
        newNode = { ...newNode, category: "choice", text: `Configure ${block.name}...` };
    }

    const updated = [...nodes, newNode];
    setNodes(updated);
    pushHistory(updated);
    setSelectedNodeId(newNodeId);
    setIsDrawerOpen(true);
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.canvas-node-card') ||
      target.closest('.node-card-header') ||
      target.closest('.block-tile') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('.node-input-port') ||
      target.closest('.node-output-port') ||
      target.closest('.choice-option-port')
    ) {
      return;
    }

    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggingNodeId(id);
    const targetNode = nodes.find((n) => n.id === id);
    if (targetNode) {
      setDragOffset({
        x: e.clientX - (targetNode.x * zoom + pan.x),
        y: e.clientY - (targetNode.y * zoom + pan.y)
      });
    }
  };

  const handleOpenNodeSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setIsDrawerOpen(true);
  };

  const handleStartConnectWire = (
    e: React.MouseEvent,
    sourceNodeId: string,
    choiceId?: string,
    choiceIndex?: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    let startX = sourceNode.x + 260;
    let startY = sourceNode.y + 40;

    if (typeof choiceIndex === "number" && sourceNode.choices && sourceNode.choices[choiceIndex]) {
      startY = sourceNode.y + 140 + choiceIndex * 30;
    }

    const currentCanvasMouseX = (e.clientX - pan.x) / zoom;
    const currentCanvasMouseY = (e.clientY - pan.y) / zoom;

    setConnectingFrom({
      sourceNodeId,
      choiceId,
      choiceIndex,
      startX,
      startY
    });
    setConnectingMousePos({ x: currentCanvasMouseX, y: currentCanvasMouseY });
  };

  const handleDropConnection = (targetNodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!connectingFrom) return;

    const sourceNode = nodes.find((n) => n.id === connectingFrom.sourceNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);

    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
      setConnectingFrom(null);
      setConnectingMousePos(null);
      setHoveredTargetNodeId(null);
      return;
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== connectingFrom.sourceNodeId) return n;
        if (connectingFrom.choiceId) {
          const updatedChoices = (n.choices || []).map((c: any) =>
            c.id === connectingFrom.choiceId ? { ...c, targetNode: targetNodeId } : c
          );
          return { ...n, choices: updatedChoices };
        } else {
          return { ...n, outputPort: targetNodeId };
        }
      })
    );

    pushHistory(nodes);
    setToastMsg(`✓ Flow Connected: "${sourceNode.title}" ➔ "${targetNode.title}"`);
    setTimeout(() => setToastMsg(null), 3000);

    setConnectingFrom(null);
    setConnectingMousePos(null);
    setHoveredTargetNodeId(null);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (connectingFrom) {
      const mx = (e.clientX - pan.x) / zoom;
      const my = (e.clientY - pan.y) / zoom;
      setConnectingMousePos({ x: mx, y: my });
      return;
    }

    if (!draggingNodeId) return;
    const newX = (e.clientX - dragOffset.x - pan.x) / zoom;
    const newY = (e.clientY - dragOffset.y - pan.y) / zoom;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(10, newX), y: Math.max(10, newY) } : n))
    );
  };

  const handleMouseUpCanvas = (e: React.MouseEvent) => {
    setIsPanning(false);

    if (connectingFrom) {
      setConnectingFrom(null);
      setConnectingMousePos(null);
      setHoveredTargetNodeId(null);
    }

    if (draggingNodeId) {
      const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
      if (dist < 4) {
        setSelectedNodeId(draggingNodeId);
      }
      pushHistory(nodes);
    }
    setDraggingNodeId(null);
  };

  const handleWheelCanvas = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
      setZoom((prev) => Math.min(1.5, Math.max(0.3, prev + zoomDelta)));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8
      }));
    }
  };

  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    pushHistory(updated);
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setIsDrawerOpen(false);
    }
  };

  const handleDuplicateNode = (node: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      ...node,
      id: newNodeId,
      title: `${node.title} (Copy)`,
      x: node.x + 40,
      y: node.y + 40
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    pushHistory(updated);
    setSelectedNodeId(newNodeId);
  };

  const handleFitAllNodesToScreen = () => {
    setZoom(0.65);
    setPan({ x: 0, y: 0 });
  };

  const getBezierPath = (sourceNode: any, targetNode: any, optionIndex?: number) => {
    if (!sourceNode || !targetNode) return "";
    const nodeWidth = 260;
    const startX = sourceNode.x + nodeWidth;
    let startY = sourceNode.y + 40;

    if (typeof optionIndex === "number" && sourceNode.choices && sourceNode.choices[optionIndex]) {
      startY = sourceNode.y + 140 + optionIndex * 30;
    }

    const endX = targetNode.x;
    const endY = targetNode.y + 40;

    const controlDist = Math.max(60, Math.abs(endX - startX) * 0.5);
    const cx1 = startX + controlDist;
    const cx2 = endX - controlDist;

    return `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`;
  };

  const getBezierFromTo = (startX: number, startY: number, endX: number, endY: number) => {
    const controlDist = Math.max(60, Math.abs(endX - startX) * 0.5);
    const cx1 = startX + controlDist;
    const cx2 = endX - controlDist;
    return `M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`;
  };

  const handleStartSimTest = () => {
    const startNode = nodes.find((n) => n.type === "CHOICE" || n.type === "START") || nodes[0];
    setSimMessages([
      {
        sender: "bot",
        text: startNode?.text || "Welcome to WhatsApp Assistant!",
        imageUrl: startNode?.imageUrl,
        choices: startNode?.choices || []
      }
    ]);
    setShowSimModal(true);
  };

  const handleSimChoiceSelect = (choice: any) => {
    const userMsg = { sender: "user", text: choice.text };
    const targetNode = nodes.find((n) => n.id === choice.targetNode);

    let botReplyMsg = null;
    if (targetNode) {
      if (targetNode.type.startsWith("CRM") && targetNode.outputPort) {
        const nextEndNode = nodes.find((n) => n.id === targetNode.outputPort);
        botReplyMsg = {
          sender: "bot",
          text: (targetNode.text ? `[CRM Log]: ${targetNode.text}\n\n` : "") + (nextEndNode?.text || "Thank you for reaching out!"),
          buttonText: nextEndNode?.buttonText
        };
      } else {
        botReplyMsg = {
          sender: "bot",
          text: targetNode.text || targetNode.title,
          buttonText: targetNode.buttonText
        };
      }
    } else {
      botReplyMsg = {
        sender: "bot",
        text: "Thank you! Our executive will contact you shortly regarding your request."
      };
    }

    setSimMessages((prev) => [...prev, userMsg, botReplyMsg]);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className={`studio-container ${isFullScreenStudio ? "fullscreen-studio" : ""}`}>
      {/* TOP CONTROL BAR */}
      <div className="studio-top-bar">
        <div className="studio-title-block">
          <Bot size={22} color="#10b981" />
          <select
            className="bot-selector-dropdown"
            value={currentFlowId || ""}
            onChange={(e) => handleSelectFlow(e.target.value)}
            disabled={savedFlows.length === 0}
          >
            {savedFlows.length > 0 ? (
              savedFlows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.isActive ? "🟢 (Live)" : "⚪ (Draft)"}
                </option>
              ))
            ) : (
              <option value="">No Active Chatbot</option>
            )}
          </select>

          <span className={`flow-status-pill ${isBotActive ? "" : "draft"}`} style={{ background: isBotActive ? "#dcfce7" : "#f1f5f9", color: isBotActive ? "#15803d" : "#64748b" }}>
            {isBotActive ? "ACTIVE LIVE" : "DRAFT"}
          </span>

          <span className="flow-meta-sub">
            {nodes.length} steps · DB Synced
          </span>
        </div>

        <div className="studio-actions-group">
          <button className="studio-btn primary" onClick={() => setShowCreateModal(true)} title="Create New Chatbot">
            <Plus size={15} /> ＋ New Chatbot
          </button>

          <button className="studio-btn" onClick={handleDuplicateCurrentBot} disabled={!currentFlowId} title="Duplicate Current Chatbot">
            <Copy size={14} /> Duplicate
          </button>

          <button className="studio-btn" onClick={() => setShowManageModal(true)} title="Manage All Chatbots">
            <FolderOpen size={14} /> All Bots ({savedFlows.length})
          </button>

          <button className="studio-btn danger" onClick={() => setShowDeleteModal(true)} disabled={!currentFlowId} title="Delete Current Chatbot">
            <Trash2 size={14} /> Delete Bot
          </button>

          <div style={{ width: "1px", height: "24px", background: "#e2e8f0", margin: "0 4px" }} />

          <button className="circular-history-btn" onClick={handleUndo} title="Undo"><RotateCcw size={15} /></button>
          <button className="circular-history-btn" onClick={handleRedo} title="Redo"><RotateCw size={15} /></button>

          <button
            className="studio-btn fullscreen-btn"
            onClick={() => setIsFullScreenStudio(!isFullScreenStudio)}
            title="Toggle Full Screen Studio Mode"
          >
            {isFullScreenStudio ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button className="studio-btn test-btn" onClick={handleStartSimTest} disabled={nodes.length === 0}>
            <Play size={14} /> Preview & Test
          </button>

          <button className="studio-btn primary" onClick={handlePublishFlow} disabled={isSaving || nodes.length === 0}>
            <CheckCircle2 size={14} /> {isSaving ? "Saving..." : "Save Bot Flow"}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: "#dcfce7", borderBottom: "1px solid #86efac", color: "#166534", padding: "8px 16px", fontSize: "12.5px", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: "16px" }}>×</button>
        </div>
      )}

      {/* STUDIO MAIN BODY */}
      <div className="studio-body">
        {/* LEFT SIDEBAR: BLOCK LIBRARY */}
        <div className={`block-library-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <div className="library-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="library-title">Block Library</span>
              <button className="panel-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                {isSidebarCollapsed ? <ChevronRight size={16} /> : <X size={16} />}
              </button>
            </div>

            {!isSidebarCollapsed && (
              <div className="library-search-box" style={{ marginTop: "6px" }}>
                <input
                  type="text"
                  placeholder="Search blocks..."
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <div className="library-scroll-area">
              {blockCategories.map((cat) => {
                const isOpen = openCategories[cat.name] ?? false;
                const filteredBlocks = cat.blocks.filter((b) =>
                  b.name.toLowerCase().includes(blockSearch.toLowerCase())
                );
                if (blockSearch && filteredBlocks.length === 0) return null;

                return (
                  <div key={cat.name} className="category-accordion">
                    <div className="category-header-row" onClick={() => toggleCategory(cat.name)}>
                      <span>{cat.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="category-badge">{cat.count}</span>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="category-blocks-grid">
                        {filteredBlocks.map((b) => {
                          const Icon = b.icon;
                          return (
                            <div key={b.id} className="block-tile" onClick={() => handleAddBlockToCanvas(b)}>
                              <Icon size={18} color="#10b981" />
                              <span>{b.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER INFINITE CANVAS */}
        <div
          className={`infinite-canvas-wrapper ${isPanning ? "panning" : ""}`}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          onWheel={handleWheelCanvas}
          style={{ cursor: isPanning ? "grabbing" : "grab", position: "relative" }}
        >
          {/* EMPTY STATE BANNER WHEN ALL BOTS ARE DELETED */}
          {nodes.length === 0 && !isLoadingFlows && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10, background: "#ffffff", padding: "36px 44px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)", border: "1px solid #e2e8f0", maxWidth: "420px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                <Bot size={28} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>No Chatbots Created</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                You currently have no chatbot flows. Create your first chatbot from scratch or select a pre-built WATI / Galabox template!
              </p>
              <button className="studio-btn primary" style={{ padding: "10px 20px", fontSize: "13.5px", margin: "0 auto" }} onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> ＋ Create First Chatbot
              </button>
            </div>
          )}

          {/* PAN-ZOOM INNER CONTAINER */}
          <div
            className="canvas-pan-zoom-container"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0"
            }}
          >
            {/* SVG CONNECTOR WIRES LAYER */}
            <svg className="canvas-svg-layer">
              {nodes.map((node) => {
                if (node.outputPort) {
                  const target = nodes.find((n) => n.id === node.outputPort);
                  if (target) return <path key={`${node.id}_${target.id}`} d={getBezierPath(node, target)} />;
                }
                if (node.choices && Array.isArray(node.choices)) {
                  return node.choices.map((c: any, idx: number) => {
                    if (c.targetNode) {
                      const targetChoiceNode = nodes.find((n) => n.id === c.targetNode);
                      if (targetChoiceNode) {
                        return <path key={`${node.id}_${c.id}`} d={getBezierPath(node, targetChoiceNode, idx)} className="active-path" />;
                      }
                    }
                    return null;
                  });
                }
                return null;
              })}

              {connectingFrom && connectingMousePos && (
                <path
                  d={getBezierFromTo(connectingFrom.startX, connectingFrom.startY, connectingMousePos.x, connectingMousePos.y)}
                  className="connecting-active-wire"
                />
              )}
            </svg>

            {/* RICH NODE CARDS ON CANVAS */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnectingHover = hoveredTargetNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={`canvas-node-card ${isSelected ? "selected" : ""} ${isConnectingHover ? "connecting-target-hover" : ""}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`
                  }}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onMouseUp={(e) => {
                    if (connectingFrom) {
                      handleDropConnection(node.id, e);
                    }
                  }}
                  onMouseEnter={() => {
                    if (connectingFrom && connectingFrom.sourceNodeId !== node.id) {
                      setHoveredTargetNodeId(node.id);
                    }
                  }}
                  onMouseLeave={() => setHoveredTargetNodeId(null)}
                >
                  <div className={`node-card-header ${node.category || 'choice'}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <GripVertical size={13} style={{ opacity: 0.7 }} />
                      <span>{node.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span
                        title="Edit Node Settings"
                        onClick={(e) => handleOpenNodeSettings(node.id, e)}
                        style={{ cursor: "pointer", display: "inline-flex", background: "rgba(255,255,255,0.2)", padding: "3px", borderRadius: "4px" }}
                      >
                        <Settings size={12} />
                      </span>
                      <span title="Duplicate Node" onClick={(e) => handleDuplicateNode(node, e)} style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Copy size={12} />
                      </span>
                      <span title="Delete Node" onClick={(e) => handleDeleteNode(node.id, e)} style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Trash2 size={12} />
                      </span>
                    </div>
                  </div>

                  <div className="node-card-body">
                    {/* TYPE-SPECIFIC VISUAL CONTENT BADGES & PREVIEWS */}
                    {node.imageUrl && (
                      <img src={node.imageUrl} alt="Banner" className="node-banner-img" />
                    )}

                    {node.type === "VIDEO" && (
                      <div style={{ background: "#0f172a", color: "#fff", padding: "8px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Video size={14} color="#10b981" />
                        <span>Video: {node.videoUrl || 'Video media'}</span>
                      </div>
                    )}

                    {node.type === "FILE" && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <FileText size={14} color="#3b82f6" />
                        <strong>{node.filename || 'Document.pdf'}</strong>
                      </div>
                    )}

                    {node.type === "LOCATION" && (
                      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <MapPin size={14} color="#d97706" />
                        <span>{node.locationName || 'Send Location'}</span>
                      </div>
                    )}

                    {node.type === "CONTACT" && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <User size={14} color="#16a34a" />
                        <span>{node.contactName} ({node.contactPhone})</span>
                      </div>
                    )}

                    {node.type.startsWith("PAY_") && (
                      <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <CreditCard size={14} />
                        <span>Amount: ₹{node.amount || 0}</span>
                      </div>
                    )}

                    {node.type.startsWith("CRM_") && (
                      <div style={{ background: "#e0e7ff", border: "1px solid #c7d2fe", color: "#3730a3", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <UserCheck size={13} />
                          <span>Stage: {node.leadStage || 'Qualified'}</span>
                        </div>
                        {node.priority && <span style={{ fontSize: "10px", opacity: 0.8 }}>Priority: {node.priority}</span>}
                      </div>
                    )}

                    {node.type === "CONDITION" && (
                      <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", color: "#9a3412", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <GitBranch size={13} style={{ marginBottom: "2px" }} />
                        <div>If <strong>{node.variableName || 'var'}</strong> {node.operator || 'EQUALS'} "{node.compareValue || ''}"</div>
                      </div>
                    )}

                    {node.type === "DELAY" && (
                      <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Clock size={14} color="#64748b" />
                        <span>Delay: {node.delayValue || 5} {node.delayUnit || 'MINUTES'}</span>
                      </div>
                    )}

                    {node.type === "WEBHOOK" && (
                      <div style={{ background: "#fdf4ff", border: "1px solid #f5d0fe", color: "#86198f", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <Globe size={13} />
                        <div><strong>{node.method || 'POST'}</strong> {node.webhookUrl || 'API URL'}</div>
                      </div>
                    )}

                    {node.type === "AI_BOT" && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", marginBottom: "6px" }}>
                        <Bot size={13} />
                        <div>AI Confidence Threshold: {node.confidenceThreshold || 85}%</div>
                      </div>
                    )}

                    {node.text && <p className="node-text-preview">{node.text}</p>}

                    {/* CHOICES LIST */}
                    {node.choices && (
                      <div className="node-choices-list" onMouseDown={(e) => e.stopPropagation()}>
                        {node.choices.map((c: any, cIdx: number) => (
                          <div
                            key={c.id}
                            className="node-choice-item"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                              <span className="choice-drag-dots">::</span>
                              <span className="choice-num-badge">{cIdx + 1}</span>
                              <input
                                type="text"
                                value={c.text}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateOptionText(node.id, c.id, e.target.value)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  color: "#334155",
                                  width: "100%",
                                  outline: "none"
                                }}
                              />
                            </div>

                            <span
                              title="Delete Option"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => handleDeleteOptionFromNode(node.id, c.id, e)}
                              style={{ cursor: "pointer", color: "#94a3b8", display: "inline-flex", padding: "2px" }}
                            >
                              <Trash2 size={11} />
                            </span>

                            <span
                              className="choice-option-port"
                              title="Click & Drag to connect this option to a node"
                              onMouseDown={(e) => handleStartConnectWire(e, node.id, c.id, cIdx)}
                            />
                          </div>
                        ))}

                        <button
                          className="add-card-option-btn"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleAddOptionToNode(node.id, e)}
                        >
                          <span>+ Add option</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {node.type !== "TRIGGER" && (
                    <span
                      className="node-input-port"
                      title="Drop connection here to link to this node"
                      onMouseUp={(e) => handleDropConnection(node.id, e)}
                    />
                  )}

                  {node.type !== "END" && (
                    <span
                      className="node-output-port"
                      title="Click & Drag to connect to next node"
                      onMouseDown={(e) => handleStartConnectWire(e, node.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* CANVAS CONTROLS */}
          <div className="canvas-zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(Math.min(1.4, zoom + 0.1))} title="Zoom In"><ZoomIn size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} title="Zoom Out"><ZoomOut size={16} /></button>
            <button className="zoom-btn" onClick={() => setPan({ x: 0, y: 0 })} title="Reset Center Pan">
              <Hand size={16} color={pan.x !== 0 || pan.y !== 0 ? "#10b981" : "#475569"} />
            </button>
            <button className="zoom-btn" onClick={handleFitAllNodesToScreen} title="Fit All Blocks"><Focus size={16} color="#3b82f6" /></button>
          </div>
        </div>

        {/* RICH TYPE-SPECIFIC PROPERTY EDITOR DRAWER */}
        {selectedNode && isDrawerOpen && (
          <div className="node-editor-drawer">
            <div className="drawer-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Settings size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {selectedNode.title}
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                    Configure block parameters & logic connections.
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="drawer-tabs-bar">
              <button
                className={`drawer-tab-btn ${drawerTab === "basic" ? "active" : ""}`}
                onClick={() => setDrawerTab("basic")}
              >
                Basic Settings
              </button>
              <button
                className={`drawer-tab-btn ${drawerTab === "advanced" ? "active" : ""}`}
                onClick={() => setDrawerTab("advanced")}
              >
                Advanced Logic
              </button>
            </div>

            <div className="drawer-section-block">
              <span className="drawer-section-title">BLOCK CONFIGURATION</span>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Block Title</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) =>
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, title: e.target.value } : n)))
                    }
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Message / Description</label>
                  <textarea
                    rows={3}
                    value={selectedNode.text || ""}
                    onChange={(e) =>
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, text: e.target.value } : n)))
                    }
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", resize: "none" }}
                  />
                </div>

                {/* TYPE-SPECIFIC CONFIGURATION FIELDS WITH DIRECT FILE UPLOADER */}
                {selectedNode.type === "IMAGE" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                      Upload Image File or Enter Image URL
                    </label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label
                        className="studio-btn primary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <ImageIcon size={14} /> Upload Image File
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const result = evt.target?.result as string;
                                setNodes((prev) =>
                                  prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: result } : n))
                                );
                                setToastMsg(`✓ Image "${file.name}" uploaded successfully!`);
                                setTimeout(() => setToastMsg(null), 3000);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {selectedNode.imageUrl && (
                        <button
                          className="studio-btn danger"
                          style={{ padding: "6px 10px", fontSize: "11.5px" }}
                          onClick={() =>
                            setNodes((prev) =>
                              prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: "" } : n))
                            )
                          }
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste image URL (https://...)"
                      value={selectedNode.imageUrl || ""}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: e.target.value } : n))
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px"
                      }}
                    />

                    <div>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                        Or Select Sample Product Banner:
                      </span>
                      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                        {[
                          { title: "Apparel Banner", url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500" },
                          { title: "Activewear", url: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=500" },
                          { title: "Wholesale Polo", url: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500" },
                          { title: "QR Deposit", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500" }
                        ].map((samp, idx) => (
                          <img
                            key={idx}
                            src={samp.url}
                            alt={samp.title}
                            title={samp.title}
                            onClick={() =>
                              setNodes((prev) =>
                                prev.map((n) => (n.id === selectedNode.id ? { ...n, imageUrl: samp.url } : n))
                              )
                            }
                            style={{
                              width: "48px",
                              height: "36px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              cursor: "pointer",
                              border: selectedNode.imageUrl === samp.url ? "2px solid #10b981" : "1px solid #cbd5e1"
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {selectedNode.imageUrl && (
                      <div style={{ marginTop: "4px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px", background: "#f8fafc" }}>
                        <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                          Live Uploaded Image Preview:
                        </span>
                        <img
                          src={selectedNode.imageUrl}
                          alt="Uploaded Preview"
                          style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "6px" }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {(selectedNode.type === "VIDEO" || selectedNode.type === "YOUTUBE") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                      Upload Video File or Enter Video URL
                    </label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label
                        className="studio-btn primary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Video size={14} /> Upload Video File
                        <input
                          type="file"
                          accept="video/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const result = evt.target?.result as string;
                                setNodes((prev) =>
                                  prev.map((n) => (n.id === selectedNode.id ? { ...n, videoUrl: result } : n))
                                );
                                setToastMsg(`✓ Video "${file.name}" uploaded successfully!`);
                                setTimeout(() => setToastMsg(null), 3000);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Or paste video URL (https://...)"
                      value={selectedNode.videoUrl || selectedNode.youtubeUrl || ""}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id ? { ...n, videoUrl: e.target.value, youtubeUrl: e.target.value } : n
                          )
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px"
                      }}
                    />
                  </div>
                )}

                {selectedNode.type === "FILE" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Document File Name</label>
                      <input
                        type="text"
                        value={selectedNode.filename || ""}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, filename: e.target.value } : n))
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          marginTop: "4px"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>
                        Upload Document File / PDF
                      </label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                        <label
                          className="studio-btn primary"
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <FileText size={14} /> Upload File / PDF
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xlsx,.zip"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const result = evt.target?.result as string;
                                  setNodes((prev) =>
                                    prev.map((n) =>
                                      n.id === selectedNode.id
                                        ? { ...n, fileUrl: result, filename: file.name }
                                        : n
                                    )
                                  );
                                  setToastMsg(`✓ Document "${file.name}" uploaded successfully!`);
                                  setTimeout(() => setToastMsg(null), 3000);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <input
                        type="text"
                        placeholder="Or paste document URL (https://...)"
                        value={selectedNode.fileUrl || ""}
                        onChange={(e) =>
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, fileUrl: e.target.value } : n))
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          marginTop: "6px"
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === "LOCATION" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Location Name</label>
                      <input
                        type="text"
                        value={selectedNode.locationName || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, locationName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Address</label>
                      <input
                        type="text"
                        value={selectedNode.address || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, address: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === "LINK" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Button Text</label>
                      <input
                        type="text"
                        value={selectedNode.buttonText || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, buttonText: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Target Website URL</label>
                      <input
                        type="text"
                        value={selectedNode.url || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, url: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type.startsWith("INPUT_") && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Save Variable Name</label>
                      <input
                        type="text"
                        value={selectedNode.variableName || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, variableName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Retry Error Message</label>
                      <input
                        type="text"
                        value={selectedNode.retryMessage || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, retryMessage: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type.startsWith("PAY_") && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Payment Amount (₹)</label>
                      <input
                        type="number"
                        value={selectedNode.amount || 0}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, amount: parseFloat(e.target.value) || 0 } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>UPI ID</label>
                      <input
                        type="text"
                        value={selectedNode.upiId || "7206066678@OKBIZAXIS"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, upiId: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type.startsWith("CRM_") && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>CRM Lead Stage</label>
                      <select
                        value={selectedNode.leadStage || "New Lead"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, leadStage: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="New Lead">New Lead</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified Lead">Qualified Lead</option>
                        <option value="Wholesale Inquiry">Wholesale Inquiry</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won / Customer</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Priority</label>
                      <select
                        value={selectedNode.priority || "MEDIUM"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, priority: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedNode.type === "CONDITION" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Variable to Test</label>
                      <input
                        type="text"
                        value={selectedNode.variableName || "customer_type"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, variableName: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Operator</label>
                      <select
                        value={selectedNode.operator || "EQUALS"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, operator: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="EQUALS">EQUALS</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="GREATER_THAN">GREATER_THAN</option>
                        <option value="LESS_THAN">LESS_THAN</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Comparison Value</label>
                      <input
                        type="text"
                        value={selectedNode.compareValue || "Wholesaler"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, compareValue: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === "DELAY" && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Delay Duration (Minutes)</label>
                    <input
                      type="number"
                      value={selectedNode.delayValue || 5}
                      onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, delayValue: parseInt(e.target.value) || 1 } : n)))}
                      style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                    />
                  </div>
                )}

                {selectedNode.type === "WEBHOOK" && (
                  <>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Webhook API URL</label>
                      <input
                        type="text"
                        value={selectedNode.webhookUrl || ""}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, webhookUrl: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>HTTP Method</label>
                      <select
                        value={selectedNode.method || "POST"}
                        onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, method: e.target.value } : n)))}
                        style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedNode.type !== "END" && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Direct Next Node Link</label>
                    <select
                      value={selectedNode.outputPort || ""}
                      onChange={(e) => {
                        const target = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, outputPort: target } : n))
                        );
                      }}
                      style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", background: "#fff" }}
                    >
                      <option value="">No direct link (or use choices below)...</option>
                      {nodes.filter(n => n.id !== selectedNode.id).map((targetCandidate) => (
                        <option key={targetCandidate.id} value={targetCandidate.id}>
                          ➔ Connect to: {targetCandidate.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Choice Option List */}
                {selectedNode.choices && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Option Links</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                      {selectedNode.choices.map((c: any, index: number) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                          <span className="choice-num-badge">{index + 1}</span>
                          <input
                            type="text"
                            value={c.text}
                            onChange={(e) => handleUpdateOptionText(selectedNode.id, c.id, e.target.value)}
                            style={{ flex: 1, padding: "5px 7px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#ffffff" }}
                          />
                          <select
                            value={c.targetNode || ""}
                            onChange={(e) => {
                              const target = e.target.value;
                              setNodes((prev) =>
                                prev.map((n) => {
                                  if (n.id !== selectedNode.id) return n;
                                  const updatedChoices = [...n.choices];
                                  updatedChoices[index].targetNode = target;
                                  return { ...n, choices: updatedChoices };
                                })
                              );
                            }}
                            style={{ width: "110px", padding: "5px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff" }}
                          >
                            <option value="">Connect to...</option>
                            {nodes.map((targetCandidate) => (
                              <option key={targetCandidate.id} value={targetCandidate.id}>
                                {targetCandidate.title}
                              </option>
                            ))}
                          </select>
                          <span
                            title="Delete Option"
                            onClick={(e) => handleDeleteOptionFromNode(selectedNode.id, c.id, e)}
                            style={{ cursor: "pointer", color: "#ef4444", padding: "3px" }}
                          >
                            <Trash2 size={13} />
                          </span>
                        </div>
                      ))}

                      <button
                        className="add-card-option-btn"
                        onClick={(e) => handleAddOptionToNode(selectedNode.id, e)}
                        style={{ marginTop: "4px" }}
                      >
                        <span>+ Add option</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS 1, 2, 3, 4 */}
      {showCreateModal && (
        <div className="bot-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="bot-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header">
              <div>
                <h3 className="bot-modal-title">Create New Chatbot</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Select a pre-built template from WATI or Galabox, or start from scratch.
                </span>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="bot-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Chatbot Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Sales Inquiry Bot"
                    value={newBotNameInput}
                    onChange={(e) => setNewBotNameInput(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12.5px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Trigger Keywords</label>
                  <input
                    type="text"
                    placeholder="e.g. HI, HELLO, CATALOG, OFFERS"
                    value={newBotKeywordInput}
                    onChange={(e) => setNewBotKeywordInput(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12.5px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px" }}
                  />
                </div>
              </div>

              <strong style={{ fontSize: "13px", color: "#0f172a" }}>Select Popular Chatbot Template:</strong>

              <div className="templates-grid">
                {BOT_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`template-card-tile ${selectedTemplateId === tmpl.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      if (!newBotNameInput) setNewBotNameInput(tmpl.name);
                      if (!newBotKeywordInput) setNewBotKeywordInput(tmpl.triggerKeyword);
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span className={`template-tag ${tmpl.platform.toLowerCase()}`}>{tmpl.platform}</span>
                        {selectedTemplateId === tmpl.id && <Check size={16} color="#10b981" />}
                      </div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>{tmpl.name}</strong>
                      <p style={{ fontSize: "11.5px", color: "#64748b", margin: "4px 0 0 0", lineHeight: 1.3 }}>{tmpl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bot-modal-footer">
              <button className="studio-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="studio-btn primary" onClick={handleConfirmCreateNewBot} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Chatbot Flow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="bot-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="bot-modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header" style={{ background: "#fef2f2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Trash2 size={18} color="#dc2626" />
                <h3 className="bot-modal-title" style={{ color: "#991b1b" }}>Delete Chatbot Flow?</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="bot-modal-body">
              <p style={{ fontSize: "13px", color: "#334155", margin: 0 }}>
                Are you sure you want to permanently delete <strong>"{flowName}"</strong>? This will remove all triggers, node graphs and automation rules associated with this chatbot flow.
              </p>
            </div>

            <div className="bot-modal-footer">
              <button className="studio-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="studio-btn danger" onClick={handleConfirmDeleteBot} disabled={isSaving}>
                {isSaving ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && (
        <div className="bot-modal-backdrop" onClick={() => setShowManageModal(false)}>
          <div className="bot-modal-card" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderOpen size={18} color="#10b981" />
                <h3 className="bot-modal-title">All Chatbot Flows ({savedFlows.length})</h3>
              </div>
              <button onClick={() => setShowManageModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="bot-modal-body" style={{ padding: 0 }}>
              <table className="bot-manage-table">
                <thead>
                  <tr>
                    <th>Flow Name</th>
                    <th>Triggers</th>
                    <th>Status</th>
                    <th>Executions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedFlows.map((f) => (
                    <tr key={f.id} style={{ background: f.id === currentFlowId ? "#f0fdf4" : "transparent" }}>
                      <td>
                        <strong style={{ fontSize: "13px", display: "block" }}>{f.name}</strong>
                        {f.id === currentFlowId && <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700 }}>Currently Editing</span>}
                      </td>
                      <td style={{ fontSize: "11.5px", color: "#64748b" }}>{f.triggerKeyword || "HI, HELLO"}</td>
                      <td>
                        <button
                          onClick={() => handleToggleActiveStatus(f.id, f.isActive)}
                          style={{
                            border: "none",
                            background: f.isActive ? "#dcfce7" : "#f1f5f9",
                            color: f.isActive ? "#166534" : "#475569",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Power size={11} /> {f.isActive ? "ACTIVE" : "DRAFT"}
                        </button>
                      </td>
                      <td>{f.executionCount || 0} runs</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="studio-btn"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => {
                              handleSelectFlow(f.id);
                              setShowManageModal(false);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="studio-btn danger"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => handleDeleteFlowById(f.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bot-modal-footer">
              <button className="studio-btn" onClick={() => setShowManageModal(false)}>Close</button>
              <button className="studio-btn primary" onClick={() => { setShowManageModal(false); setShowCreateModal(true); }}>
                ＋ Create Another Bot
              </button>
            </div>
          </div>
        </div>
      )}

      {showSimModal && (
        <div className="phone-sim-backdrop" onClick={() => setShowSimModal(false)}>
          <div className="phone-mockup-frame" onClick={(e) => e.stopPropagation()}>
            <div className="phone-screen">
              <div className="sim-wa-header">
                <div className="sim-wa-avatar">
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <strong style={{ fontSize: "13px", display: "block" }}>Espon AI Assistant</strong>
                  <span style={{ fontSize: "10.5px", opacity: 0.9 }}>Online · Live Flow Simulator</span>
                </div>
                <button onClick={() => setShowSimModal(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>×</button>
              </div>

              <div className="sim-chat-body">
                {simMessages.map((msg, idx) => (
                  <div key={idx} className={`sim-msg-row ${msg.sender}`}>
                    <div className="sim-bubble">
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Bot Header" style={{ width: "100%", borderRadius: "6px", marginBottom: "6px" }} />
                      )}
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>

                      {msg.choices && (
                        <div className="sim-buttons-list">
                          {msg.choices.map((c: any) => (
                            <button key={c.id} className="sim-choice-btn" onClick={() => handleSimChoiceSelect(c)}>
                              {c.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
