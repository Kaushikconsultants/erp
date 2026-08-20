"use client";

import React, { useState } from "react";
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
  Move,
  Edit2,
  GripVertical,
  Check,
  Plus,
  Radio
} from "lucide-react";
import { saveWhatsAppChatbotFlowAction } from "@/app/actions/whatsAppPlatformActions";
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
      { id: "file", name: "File", icon: FileText },
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
    count: 12,
    blocks: [
      { id: "input_name", name: "Name", icon: User },
      { id: "input_email", name: "Email", icon: Mail },
      { id: "input_phone", name: "Phone", icon: Phone },
      { id: "input_date", name: "Date", icon: Calendar },
      { id: "input_rating", name: "Rating", icon: Star }
    ]
  },
  {
    name: "Logic",
    count: 6,
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
    count: 4,
    blocks: [
      { id: "pay_link", name: "Payment Link", icon: CreditCard },
      { id: "pay_qr", name: "UPI QR Code", icon: QrCode },
      { id: "pay_collect", name: "Collect Payment", icon: DollarSign }
    ]
  },
  {
    name: "E-Commerce",
    count: 3,
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
    count: 4,
    blocks: [
      { id: "crm_contact", name: "Update CRM Contact", icon: UserCheck },
      { id: "crm_lead", name: "Create Lead", icon: UserPlus },
      { id: "crm_roundrobin", name: "Assign Sales Rep", icon: Shuffle }
    ]
  },
  {
    name: "AI & Meta",
    count: 3,
    blocks: [
      { id: "ai_bot", name: "AI GPT Intent", icon: Bot },
      { id: "meta_template", name: "Send Meta Template", icon: Sparkles }
    ]
  }
];

// Initial Nodes Graph
const initialNodes = [
  {
    id: "node_trigger",
    type: "TRIGGER",
    category: "trigger",
    title: "FLOW TRIGGER",
    x: 30,
    y: 100,
    triggerKeywords: "HI, HELLO, CATALOG, PRICING",
    text: "Incoming Message matches: HI, HELLO, CATALOG",
    outputPort: "node_start"
  },
  {
    id: "node_start",
    type: "START",
    category: "start",
    title: "Start / Auto Assign",
    x: 330,
    y: 100,
    text: "Assign via Round-Robin distribution",
    outputPort: "node_group4"
  },
  {
    id: "node_group4",
    type: "CHOICE",
    category: "choice",
    title: "Group 4 (Inquiry Menu)",
    x: 630,
    y: 100,
    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500",
    text: "Hi! Welcome to Espon Clothing. We are direct manufacturers of premium activewear & wholesale apparel. Please select your inquiry category below:",
    choices: [
      { id: "c1", text: "Retailer / Shop Owner", targetNode: "node_group9" },
      { id: "c2", text: "Wholesaler / Reseller", targetNode: "node_group10" },
      { id: "c3", text: "Personal Use", targetNode: "node_group11" }
    ]
  },
  {
    id: "node_group9",
    type: "CRM",
    category: "crm",
    title: "Group 9 (Update Contact)",
    x: 970,
    y: 40,
    text: "Update CRM Contact:\n• Lead Stage: Qualified Retailer\n• Assigned Salesperson: Ikra (Sales)",
    outputPort: "node_group12"
  },
  {
    id: "node_group10",
    type: "CRM",
    category: "crm",
    title: "Group 10 (Update Contact)",
    x: 970,
    y: 200,
    text: "Update CRM Contact:\n• Lead Stage: Wholesale Inquiry\n• Priority: HIGH",
    outputPort: "node_group12"
  },
  {
    id: "node_group11",
    type: "CRM",
    category: "crm",
    title: "Group 11 (Update Contact)",
    x: 970,
    y: 360,
    text: "Update CRM Contact:\n• Lead Stage: Personal Enquiry",
    outputPort: "node_group13"
  },
  {
    id: "node_group12",
    type: "END",
    category: "end",
    title: "Group 12 (Confirmation)",
    x: 1300,
    y: 80,
    text: "OUR SENIOR EXPERT WILL BE CALLING YOU SHORTLY TO DISCUSS YOUR SPECIFIC REQUIREMENTS.\n\nWhile you wait, visit our website:",
    buttonText: "Visit Website 🌐",
    url: "https://espon.in"
  },
  {
    id: "node_group13",
    type: "END",
    category: "end",
    title: "Group 13 (Confirmation)",
    x: 1300,
    y: 360,
    text: "SEE IT IS EASY FOR SHARING YOUR DETAILS. For personal use visit our online store by clicking below:",
    buttonText: "Visit Store 🛍️",
    url: "https://espon.in/shop"
  }
];

export default function WhatsAppChatbotBuilderPage() {
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({ Messages: true });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [blockSearch, setBlockSearch] = useState<string>("");

  // Full Screen Studio State
  const [isFullScreenStudio, setIsFullScreenStudio] = useState<boolean>(false);

  // Flow State & History Stack for Undo / Redo
  const [flowName, setFlowName] = useState<string>("espon new");
  const [version, setVersion] = useState<string>("LIVE V21");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<any[]>([initialNodes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(0.75); // Default zoom 75%
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Phone Simulator Modal State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simMessages, setSimMessages] = useState<any[]>([]);

  // Drawer Tab State
  const [drawerTab, setDrawerTab] = useState<"basic" | "advanced">("basic");

  // Add option button to a node
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

  // Delete choice option from a node
  const handleDeleteOptionFromNode = (nodeId: string, choiceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, choices: (n.choices || []).filter((c: any) => c.id !== choiceId) };
      })
    );
  };

  // Update choice text directly
  const handleUpdateOptionText = (nodeId: string, choiceId: string, newText: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const updated = (n.choices || []).map((c: any) => (c.id === choiceId ? { ...c, text: newText } : c));
        return { ...n, choices: updated };
      })
    );
  };

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Toggle Category Accordion
  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  // Record Undo State
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

  // Canvas Hand Cursor Panning (Keep pressing left click on background to slide page)
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.canvas-node-card') ||
      target.closest('.node-card-header') ||
      target.closest('.block-tile') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea')
    ) {
      return;
    }

    setIsPanning(true);
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  // Node Drag Handler
  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setDraggingNodeId(id);
    const targetNode = nodes.find((n) => n.id === id);
    if (targetNode) {
      setDragOffset({
        x: e.clientX - (targetNode.x * zoom + pan.x),
        y: e.clientY - (targetNode.y * zoom + pan.y)
      });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!draggingNodeId) return;
    const newX = (e.clientX - dragOffset.x - pan.x) / zoom;
    const newY = (e.clientY - dragOffset.y - pan.y) / zoom;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(10, newX), y: Math.max(10, newY) } : n))
    );
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    if (draggingNodeId) {
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

  // Add New Node from Block Library without Overlapping
  const handleAddBlockToCanvas = (block: any) => {
    const selected = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: block.id.toUpperCase(),
      category: "choice",
      title: `New ${block.name} Node`,
      x: selected ? selected.x + 290 : 400,
      y: selected ? selected.y + 40 : 200,
      text: `Enter message for ${block.name}...`,
      choices: block.id === "buttons" ? [{ id: `c_${Date.now()}`, text: "Option 1", targetNode: null }] : []
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    pushHistory(updated);
    setSelectedNodeId(newNodeId);
  };

  // Delete Node
  const handleDeleteNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    pushHistory(updated);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Duplicate Node
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

  // Auto-Fit All Blocks on Single Screen
  const handleFitAllNodesToScreen = () => {
    setZoom(0.60); // Auto scale down so all 8+ nodes fit on 1 screen seamlessly
    setPan({ x: 0, y: 0 });
  };

  // Dynamic SVG Bezier Path Generator for Connections
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

  // Publish / Save Flow Action
  const handlePublishFlow = async () => {
    setIsSaving(true);
    const res = await saveWhatsAppChatbotFlowAction({
      name: flowName,
      triggerKeyword: "HI, HELLO, CATALOG, PRICING",
      nodesJson: JSON.stringify(nodes),
      isActive: true
    });
    if (res.success) {
      setToastMsg("✓ Chatbot Flow successfully published and active on WhatsApp!");
      setTimeout(() => setToastMsg(null), 4000);
    }
    setIsSaving(false);
  };

  // Start Simulator Flow Test
  const handleStartSimTest = () => {
    const startNode = nodes.find((n) => n.id === "node_group4") || nodes[0];
    setSimMessages([
      {
        sender: "bot",
        text: startNode?.text || "Welcome to Espon Clothing!",
        imageUrl: startNode?.imageUrl,
        choices: startNode?.choices || []
      }
    ]);
    setShowSimModal(true);
  };

  // User Choice Select in Simulator
  const handleSimChoiceSelect = (choice: any) => {
    const userMsg = { sender: "user", text: choice.text };
    const targetNode = nodes.find((n) => n.id === choice.targetNode);

    let botReplyMsg = null;
    if (targetNode) {
      if (targetNode.type === "CRM" && targetNode.outputPort) {
        const nextEndNode = nodes.find((n) => n.id === targetNode.outputPort);
        botReplyMsg = {
          sender: "bot",
          text: (targetNode.text ? `[CRM Lead Intake]: ${targetNode.text}\n\n` : "") + (nextEndNode?.text || "Thank you for reaching out!"),
          buttonText: nextEndNode?.buttonText
        };
      } else {
        botReplyMsg = {
          sender: "bot",
          text: targetNode.text,
          buttonText: targetNode.buttonText
        };
      }
    } else {
      botReplyMsg = {
        sender: "bot",
        text: "Thank you! Our sales executive has been assigned to your request and will contact you in 5 minutes."
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
          <h2 className="flow-title-text">{flowName}</h2>
          <span className="flow-status-pill">{version}</span>
          <span className="flow-meta-sub">
            {nodes.length} steps · {nodes.length} blocks · Live DB Synced
          </span>
        </div>

        <div className="studio-shortcuts-row">
          <span className="shortcut-pill">Save Ctrl+S</span>
          <span className="shortcut-pill">Undo Ctrl+Z</span>
          <span className="shortcut-pill">Preview Shift+P</span>
        </div>

        <div className="studio-actions-group">
          <button className="circular-history-btn" onClick={handleUndo} title="Undo"><RotateCcw size={15} /></button>
          <button className="circular-history-btn" onClick={handleRedo} title="Redo"><RotateCw size={15} /></button>

          <button
            className="studio-btn fullscreen-btn"
            onClick={() => setIsFullScreenStudio(!isFullScreenStudio)}
            title="Toggle Full Screen Studio Mode"
          >
            {isFullScreenStudio ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullScreenStudio ? "Exit Full Screen" : "Full Screen Studio"}</span>
          </button>

          <button className="studio-btn test-btn" onClick={handleStartSimTest}>
            <Play size={14} /> Preview & Test
          </button>
          <button className="studio-btn" onClick={handlePublishFlow}>
            <Save size={14} /> Save Draft
          </button>
          <button className="studio-btn primary" onClick={handlePublishFlow} disabled={isSaving}>
            <CheckCircle2 size={14} /> {isSaving ? "Publishing..." : "Publish Bot Flow"}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: "#dcfce7", borderBottom: "1px solid #86efac", color: "#166534", padding: "8px 16px", fontSize: "12.5px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} style={{ background: "none", border: "none", color: "#166534", cursor: "pointer" }}>×</button>
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

        {/* CENTER INFINITE GRID CANVAS */}
        <div
          className={`infinite-canvas-wrapper ${isPanning ? "panning" : ""}`}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          onWheel={handleWheelCanvas}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          {/* PAN-ZOOM INNER CONTAINER */}
          <div
            className="canvas-pan-zoom-container"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0"
            }}
          >
            {/* DYNAMIC SVG CONNECTOR WIRES */}
            <svg className="canvas-svg-layer">
              <path d={getBezierPath(nodes.find(n => n.id === "node_trigger"), nodes.find(n => n.id === "node_start"))} />
              <path d={getBezierPath(nodes.find(n => n.id === "node_start"), nodes.find(n => n.id === "node_group4"))} />

              <path d={getBezierPath(nodes.find(n => n.id === "node_group4"), nodes.find(n => n.id === "node_group9"), 0)} className="active-path" />
              <path d={getBezierPath(nodes.find(n => n.id === "node_group4"), nodes.find(n => n.id === "node_group10"), 1)} />
              <path d={getBezierPath(nodes.find(n => n.id === "node_group4"), nodes.find(n => n.id === "node_group11"), 2)} />

              <path d={getBezierPath(nodes.find(n => n.id === "node_group9"), nodes.find(n => n.id === "node_group12"))} />
              <path d={getBezierPath(nodes.find(n => n.id === "node_group10"), nodes.find(n => n.id === "node_group12"))} />
              <path d={getBezierPath(nodes.find(n => n.id === "node_group11"), nodes.find(n => n.id === "node_group13"))} />

              {nodes.map((node) => {
                if (node.outputPort) {
                  const target = nodes.find((n) => n.id === node.outputPort);
                  if (target) return <path key={`${node.id}_${target.id}`} d={getBezierPath(node, target)} />;
                }
                return null;
              })}
            </svg>

            {/* Node Cards */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              return (
                <div
                  key={node.id}
                  className={`canvas-node-card ${isSelected ? "selected" : ""}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`
                  }}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                >
                  <div className={`node-card-header ${node.category}`}>
                    <span>{node.title}</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span title="Duplicate Node" onClick={(e) => handleDuplicateNode(node, e)} style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Copy size={12} />
                      </span>
                      <span title="Delete Node" onClick={(e) => handleDeleteNode(node.id, e)} style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Trash2 size={12} />
                      </span>
                    </div>
                  </div>

                  <div className="node-card-body">
                    {node.imageUrl && (
                      <img src={node.imageUrl} alt="Banner" className="node-banner-img" />
                    )}
                    {node.text && <p className="node-text-preview">{node.text}</p>}

                    {node.choices && (
                      <div className="node-choices-list" onMouseDown={(e) => e.stopPropagation()}>
                        {node.choices.map((c: any, cIdx: number) => (
                          <div
                            key={c.id}
                            className="node-choice-item"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id);
                            }}
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
                            <span className="choice-option-port" title="Connect Choice to Node" />
                          </div>
                        ))}

                        <button
                          className="add-card-option-btn"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleAddOptionToNode(node.id, e)}
                        >
                          <span>+ + Add option</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {node.type !== "TRIGGER" && <span className="node-input-port" />}
                  {node.type !== "END" && <span className="node-output-port" />}
                </div>
              );
            })}
          </div>

          {/* Floating Zoom & Hand Pan Controls & Fit All Button */}
          <div className="canvas-zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(Math.min(1.4, zoom + 0.1))} title="Zoom In (+)"><ZoomIn size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} title="Zoom Out (-)"><ZoomOut size={16} /></button>
            <button className="zoom-btn" onClick={() => setPan({ x: 0, y: 0 })} title="Pan / Center Canvas (Reset 0,0)">
              <Hand size={16} color={pan.x !== 0 || pan.y !== 0 ? "#10b981" : "#475569"} />
            </button>
            <button className="zoom-btn" onClick={handleFitAllNodesToScreen} title="Fit All Blocks to Single Screen"><Focus size={16} color="#3b82f6" /></button>
            <button className="zoom-btn" onClick={() => setIsFullScreenStudio(!isFullScreenStudio)} title="Toggle Full Screen Mode">
              {isFullScreenStudio ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>

          {/* Minimap Box */}
          <div className="canvas-minimap-box">
            <div className="minimap-mini-nodes">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="minimap-dot"
                  style={{ left: `${(n.x / 1600) * 100}%`, top: `${(n.y / 600) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* NODE PROPERTY EDITOR SIDE DRAWER (MATCHING SCREENSHOT) */}
        {selectedNode && (
          <div className="node-editor-drawer">
            {/* Drawer Header Row */}
            <div className="drawer-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    {selectedNode.type === "TRIGGER" ? "Flow Start" : selectedNode.title}
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                    Choose how people enter this automation. Edit trigger & block parameters.
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedNodeId(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Category Pill Badge */}
            <div>
              <span className="drawer-cat-pill">Message based</span>
            </div>

            {/* Basic / Advanced Tabs Bar */}
            <div className="drawer-tabs-bar">
              <button
                className={`drawer-tab-btn ${drawerTab === "basic" ? "active" : ""}`}
                onClick={() => setDrawerTab("basic")}
              >
                Basic
              </button>
              <button
                className={`drawer-tab-btn ${drawerTab === "advanced" ? "active" : ""}`}
                onClick={() => setDrawerTab("advanced")}
              >
                Advanced
              </button>
            </div>

            {/* SECTION 1: ENTRY POINT / HOW THIS FLOW STARTS */}
            <div className="drawer-section-block">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span className="drawer-section-title">ENTRY POINT</span>
                <span style={{ fontSize: "12px", color: "#94a3b8", cursor: "pointer" }}>ⓘ</span>
              </div>
              <h4 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 2px 0" }}>
                How this flow starts
              </h4>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px 0" }}>
                Pick the trigger that should bring people into this flow.
              </p>

              {/* 2x2 Trigger Type Cards Grid Matching Screenshot */}
              <div className="trigger-cards-grid">
                {[
                  { id: "msg", title: "Message based", desc: "Start when someone sends a message.", icon: MessageSquare, active: true },
                  { id: "cart", title: "Cart / Order", desc: "Start after an order event.", icon: ShoppingBag, active: false },
                  { id: "form", title: "WhatsApp Form", desc: "Start from form submissions.", icon: FileText, active: false },
                  { id: "ad", title: "CTWA Ad", desc: "Start from ad conversations.", icon: Radio, active: false },
                  { id: "template", title: "Template Button", desc: "Start from template quick replies.", icon: List, active: false }
                ].map((tc) => {
                  const Icon = tc.icon;
                  return (
                    <div key={tc.id} className={`trigger-card-tile ${tc.active ? "selected" : ""}`}>
                      {tc.active && (
                        <div className="card-check-badge">
                          <Check size={10} color="#fff" />
                        </div>
                      )}
                      <div className="trigger-card-icon">
                        <Icon size={16} color="#10b981" />
                      </div>
                      <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block", marginTop: "6px" }}>{tc.title}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px", lineHeight: 1.3 }}>{tc.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: MESSAGES / TRIGGER PHRASES */}
            <div className="drawer-section-block" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
              <span className="drawer-section-title">MESSAGES</span>
              <h4 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "4px 0 2px 0" }}>
                Start from messages
              </h4>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 10px 0" }}>
                Use any incoming message or match specific keywords (comma separated).
              </p>
              <input
                type="text"
                value="HI, HELLO, CATALOG, APPLY, JOB"
                readOnly
                style={{ width: "100%", padding: "7px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", color: "#0f172a", fontWeight: 600, background: "#f8fafc" }}
              />
            </div>

            {/* SECTION 3: BLOCK CONTENT & INTERACTIVE CHOICE BUTTONS MANAGER */}
            <div className="drawer-section-block" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
              <span className="drawer-section-title">BLOCK OPTIONS</span>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
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
                  <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Message Content</label>
                  <textarea
                    rows={3}
                    value={selectedNode.text || ""}
                    onChange={(e) =>
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, text: e.target.value } : n)))
                    }
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", marginTop: "4px", resize: "none" }}
                  />
                </div>

                {/* Interactive Choice Buttons List */}
                {selectedNode.choices && (
                  <div>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Interactive Option Buttons</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                      {selectedNode.choices.map((c: any, index: number) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                          <span className="choice-drag-dots">::</span>
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
                            <option value="">Connect...</option>
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
                        <span>+ + Add option</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: LIVE WHATSAPP PHONE SIMULATOR */}
      {showSimModal && (
        <div className="phone-sim-backdrop" onClick={() => setShowSimModal(false)}>
          <div className="phone-mockup-frame" onClick={(e) => e.stopPropagation()}>
            <div className="phone-screen">
              <div className="sim-wa-header">
                <div className="sim-wa-avatar">
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <strong style={{ fontSize: "13px", display: "block" }}>Espon AI Bot</strong>
                  <span style={{ fontSize: "10.5px", opacity: 0.9 }}>Online · Live Flow Test</span>
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
