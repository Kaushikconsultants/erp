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
  Zap,
  Play,
  CheckCircle2,
  Settings,
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Edit3
} from "lucide-react";
import { saveWhatsAppChatbotFlowAction, getWhatsAppChatbotFlows } from "@/app/actions/whatsAppPlatformActions";
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
    x: 40,
    y: 120,
    triggerKeywords: "HI, HELLO, CATALOG, PRICING",
    text: "Incoming Message matches: HI, HELLO, CATALOG",
    outputPort: "node_start"
  },
  {
    id: "node_start",
    type: "START",
    category: "start",
    title: "Start / Auto Assign",
    x: 340,
    y: 120,
    text: "Assign via Round-Robin distribution",
    outputPort: "node_group4"
  },
  {
    id: "node_group4",
    type: "CHOICE",
    category: "choice",
    title: "Group 4 (Inquiry Menu)",
    x: 640,
    y: 120,
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
    x: 1000,
    y: 60,
    text: "Update CRM Contact:\n• Lead Stage: Qualified Retailer\n• Assigned Salesperson: Ikra (Sales)",
    outputPort: "node_group12"
  },
  {
    id: "node_group10",
    type: "CRM",
    category: "crm",
    title: "Group 10 (Update Contact)",
    x: 1000,
    y: 220,
    text: "Update CRM Contact:\n• Lead Stage: Wholesale Inquiry\n• Priority: HIGH",
    outputPort: "node_group12"
  },
  {
    id: "node_group11",
    type: "CRM",
    category: "crm",
    title: "Group 11 (Update Contact)",
    x: 1000,
    y: 380,
    text: "Update CRM Contact:\n• Lead Stage: Personal Enquiry",
    outputPort: "node_group13"
  },
  {
    id: "node_group12",
    type: "END",
    category: "end",
    title: "Group 12 (Confirmation)",
    x: 1340,
    y: 100,
    text: "OUR SENIOR EXPERT WILL BE CALLING YOU SHORTLY TO DISCUSS YOUR SPECIFIC REQUIREMENTS.\n\nWhile you wait, visit our website:",
    buttonText: "Visit Website 🌐",
    url: "https://espon.in"
  },
  {
    id: "node_group13",
    type: "END",
    category: "end",
    title: "Group 13 (Confirmation)",
    x: 1340,
    y: 380,
    text: "SEE IT IS EASY FOR SHARING YOUR DETAILS. For personal use visit our online store by clicking below:",
    buttonText: "Visit Store 🛍️",
    url: "https://espon.in/shop"
  }
];

export default function WhatsAppChatbotBuilderPage() {
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node_group4");
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({ Messages: true });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [blockSearch, setBlockSearch] = useState<string>("");

  // Flow State & History Stack for Undo / Redo
  const [flowName, setFlowName] = useState<string>("espon new");
  const [version, setVersion] = useState<string>("LIVE V21");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<any[]>([initialNodes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Zoom State
  const [zoom, setZoom] = useState<number>(1.0);

  // Phone Simulator Modal State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simMessages, setSimMessages] = useState<any[]>([]);

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Toggle Category Accordion (Accordion logic: single or multi toggle)
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

  // Node Drag Handler
  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    setDraggingNodeId(id);
    const targetNode = nodes.find((n) => n.id === id);
    if (targetNode) {
      setDragOffset({
        x: e.clientX - targetNode.x * zoom,
        y: e.clientY - targetNode.y * zoom
      });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    const newX = (e.clientX - dragOffset.x) / zoom;
    const newY = (e.clientY - dragOffset.y) / zoom;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(10, newX), y: Math.max(10, newY) } : n))
    );
  };

  const handleMouseUpCanvas = () => {
    if (draggingNodeId) {
      pushHistory(nodes);
    }
    setDraggingNodeId(null);
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
    <div className="studio-container">
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
          className="infinite-canvas-wrapper"
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
        >
          {/* DYNAMIC SVG CONNECTOR WIRES */}
          <svg className="canvas-svg-layer">
            {/* Draw SVG Bezier Curves dynamically based on node positions */}
            <path d={getBezierPath(nodes.find(n => n.id === "node_trigger"), nodes.find(n => n.id === "node_start"))} />
            <path d={getBezierPath(nodes.find(n => n.id === "node_start"), nodes.find(n => n.id === "node_group4"))} />

            {/* Dynamic Choice Port Curves */}
            <path d={getBezierPath(nodes.find(n => n.id === "node_group4"), nodes.find(n => n.id === "node_group9"), 0)} className="active-path" />
            <path d={getBezierPath(nodes.find(n => n.id === "node_group4"), nodes.find(n => n.id === "node_group10"), 1)} />
            <path d={getBezierPath(nodes.find(n => n.id === "node_group4"), nodes.find(n => n.id === "node_group11"), 2)} />

            {/* CRM to End Node Connections */}
            <path d={getBezierPath(nodes.find(n => n.id === "node_group9"), nodes.find(n => n.id === "node_group12"))} />
            <path d={getBezierPath(nodes.find(n => n.id === "node_group10"), nodes.find(n => n.id === "node_group12"))} />
            <path d={getBezierPath(nodes.find(n => n.id === "node_group11"), nodes.find(n => n.id === "node_group13"))} />

            {/* Dynamic Connections for Custom Added Nodes */}
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
                  left: `${node.x * zoom}px`,
                  top: `${node.y * zoom}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left"
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

                  {/* Render Choices with Output Dots */}
                  {node.choices && node.choices.length > 0 && (
                    <div className="node-choices-list">
                      {node.choices.map((c: any) => (
                        <div key={c.id} className="node-choice-item">
                          <span>{c.text}</span>
                          <span className="choice-option-port" title="Connect Choice to Node" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input & Output Ports */}
                {node.type !== "TRIGGER" && <span className="node-input-port" />}
                {node.type !== "END" && <span className="node-output-port" />}
              </div>
            );
          })}

          {/* Zoom Controls */}
          <div className="canvas-zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} title="Zoom In"><ZoomIn size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(Math.max(0.6, zoom - 0.1))} title="Zoom Out"><ZoomOut size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(1.0)} title="Fit Screen"><Maximize2 size={15} /></button>
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

        {/* NODE PROPERTY EDITOR SIDE DRAWER */}
        {selectedNode && (
          <div className="node-editor-drawer">
            <div className="drawer-header">
              <h3>Edit Block: {selectedNode.title}</h3>
              <button onClick={() => setSelectedNodeId(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>×</button>
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Block Title</label>
              <input
                type="text"
                value={selectedNode.title}
                onChange={(e) =>
                  setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, title: e.target.value } : n)))
                }
                style={{ width: "100%", padding: "6px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "4px", marginTop: "4px" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Message Body / Content</label>
              <textarea
                rows={4}
                value={selectedNode.text || ""}
                onChange={(e) =>
                  setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, text: e.target.value } : n)))
                }
                style={{ width: "100%", padding: "6px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "4px", marginTop: "4px", resize: "none" }}
              />
            </div>

            {selectedNode.choices && (
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569" }}>Interactive Choice Buttons</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  {selectedNode.choices.map((c: any, index: number) => (
                    <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <input
                        type="text"
                        value={c.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) => {
                              if (n.id !== selectedNode.id) return n;
                              const updatedChoices = [...n.choices];
                              updatedChoices[index].text = val;
                              return { ...n, choices: updatedChoices };
                            })
                          );
                        }}
                        style={{ padding: "5px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "4px" }}
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
                        style={{ padding: "4px", fontSize: "11px", border: "1px solid #d1d5db", borderRadius: "4px", background: "#fff" }}
                      >
                        <option value="">Connect to Node...</option>
                        {nodes.map((targetCandidate) => (
                          <option key={targetCandidate.id} value={targetCandidate.id}>
                            {targetCandidate.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
