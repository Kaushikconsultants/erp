"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  Youtube,
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
  CheckSquare,
  CreditCard,
  QrCode,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  Globe,
  Database,
  UserPlus,
  UserCheck,
  Bot,
  Sparkles,
  Zap,
  Plus,
  Play,
  CheckCircle2,
  Settings,
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Send,
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
      { id: "youtube", name: "YouTube", icon: Youtube },
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

// Initial Nodes matching Reference Images 2 & 3
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
    x: 320,
    y: 120,
    text: "Assign via Round-Robin distribution",
    outputPort: "node_group4"
  },
  {
    id: "node_group4",
    type: "CHOICE",
    category: "choice",
    title: "Group 4 (Inquiry Menu)",
    x: 580,
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
    x: 940,
    y: 60,
    text: "Update CRM Contact:\n• Lead Stage: Qualified Retailer\n• Assign Sales Rep: Ikra (Sales)",
    outputPort: "node_group12"
  },
  {
    id: "node_group10",
    type: "CRM",
    category: "crm",
    title: "Group 10 (Update Contact)",
    x: 940,
    y: 220,
    text: "Update CRM Contact:\n• Lead Stage: Wholesale Inquiry\n• Priority: HIGH",
    outputPort: "node_group12"
  },
  {
    id: "node_group11",
    type: "CRM",
    category: "crm",
    title: "Group 11 (Update Contact)",
    x: 940,
    y: 380,
    text: "Update CRM Contact:\n• Lead Stage: Personal Enquiry",
    outputPort: "node_group13"
  },
  {
    id: "node_group12",
    type: "END",
    category: "end",
    title: "Group 12 (Confirmation)",
    x: 1240,
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
    x: 1240,
    y: 380,
    text: "SEE IT IS EASY FOR SHARING YOUR DETAILS. For personal use visit our online store by clicking below:",
    buttonText: "Visit Store 🛍️",
    url: "https://espon.in/shop"
  }
];

export default function WhatsAppChatbotBuilderPage() {
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node_group4");
  const [activeCategory, setActiveCategory] = useState<string>("Messages");
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({ Messages: true, Choices: true });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Flow State
  const [flowName, setFlowName] = useState<string>("espon new");
  const [version, setVersion] = useState<string>("LIVE V21");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1.0);

  // Phone Simulator Modal State
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [simMessages, setSimMessages] = useState<any[]>([]);

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Toggle Category Accordion
  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
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
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n))
    );
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
  };

  // Add New Node from Block Library
  const handleAddBlockToCanvas = (block: any) => {
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: block.id.toUpperCase(),
      category: "choice",
      title: `New ${block.name} Node`,
      x: 400 + Math.random() * 80,
      y: 200 + Math.random() * 80,
      text: `Enter message for ${block.name}...`,
      choices: block.id === "buttons" ? [{ id: `c_${Date.now()}`, text: "Option 1", targetNode: null }] : []
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNodeId);
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
      // Find subsequent node if target is CRM
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
      {/* ----------------------------------------------------------------- */}
      {/* TOP STUDIO CONTROL BAR */}
      {/* ----------------------------------------------------------------- */}
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
          <button className="circular-history-btn" title="Undo"><RotateCcw size={15} /></button>
          <button className="circular-history-btn" title="Redo"><RotateCw size={15} /></button>
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

      {/* ----------------------------------------------------------------- */}
      {/* MAIN STUDIO BODY (LIBRARY + CANVAS) */}
      {/* ----------------------------------------------------------------- */}
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
                <input type="text" placeholder="Search blocks..." />
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <div className="library-scroll-area">
              {blockCategories.map((cat) => {
                const isOpen = openCategories[cat.name] ?? false;
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
                        {cat.blocks.map((b) => {
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
          {/* SVG Connector Wires Layer */}
          <svg className="canvas-svg-layer">
            {/* Draw SVG Bezier Curves connecting nodes */}
            <path d={`M ${40 + 260} ${120 + 40} C ${40 + 260 + 60} ${120 + 40}, ${320 - 60} ${120 + 40}, ${320} ${120 + 40}`} />
            <path d={`M ${320 + 260} ${120 + 40} C ${320 + 260 + 60} ${120 + 40}, ${580 - 60} ${120 + 40}, ${580} ${120 + 40}`} />

            {/* Connections from Choice Options in Group 4 to Groups 9, 10, 11 */}
            <path d={`M ${580 + 260} ${120 + 175} C ${580 + 260 + 80} ${120 + 175}, ${940 - 80} ${60 + 40}, ${940} ${60 + 40}`} className="active-path" />
            <path d={`M ${580 + 260} ${120 + 205} C ${580 + 260 + 80} ${120 + 205}, ${940 - 80} ${220 + 40}, ${940} ${220 + 40}`} />
            <path d={`M ${580 + 260} ${120 + 235} C ${580 + 260 + 80} ${120 + 235}, ${940 - 80} ${380 + 40}, ${940} ${380 + 40}`} />

            {/* Connections from Groups 9 & 10 to Group 12 */}
            <path d={`M ${940 + 260} ${60 + 40} C ${940 + 260 + 80} ${60 + 40}, ${1240 - 80} ${100 + 40}, ${1240} ${100 + 40}`} />
            <path d={`M ${940 + 260} ${220 + 40} C ${940 + 260 + 80} ${220 + 40}, ${1240 - 80} ${100 + 40}, ${1240} ${100 + 40}`} />
            <path d={`M ${940 + 260} ${380 + 40} C ${940 + 260 + 80} ${380 + 40}, ${1240 - 80} ${380 + 40}, ${1240} ${380 + 40}`} />
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
                  <div style={{ display: "flex", gap: "4px" }}>
                    <Edit3 size={12} style={{ cursor: "pointer" }} onClick={() => setSelectedNodeId(node.id)} />
                  </div>
                </div>

                <div className="node-card-body">
                  {node.imageUrl && (
                    <img src={node.imageUrl} alt="Banner" className="node-banner-img" />
                  )}
                  {node.text && <p className="node-text-preview">{node.text}</p>}

                  {/* Render Choices with explicit Output Dots */}
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

          {/* Floating Zoom Controls */}
          <div className="canvas-zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} title="Zoom In"><ZoomIn size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(Math.max(0.6, zoom - 0.1))} title="Zoom Out"><ZoomOut size={16} /></button>
            <button className="zoom-btn" onClick={() => setZoom(1.0)} title="Fit Screen"><Maximize2 size={15} /></button>
          </div>

          {/* Bottom Right Minimap */}
          <div className="canvas-minimap-box">
            <div className="minimap-mini-nodes">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="minimap-dot"
                  style={{ left: `${(n.x / 1400) * 100}%`, top: `${(n.y / 600) * 100}%` }}
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
                    <input
                      key={c.id}
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
                      style={{ padding: "6px", fontSize: "12px", border: "1px solid #e2e8f0", borderRadius: "4px" }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL: LIVE WHATSAPP PHONE SIMULATOR */}
      {/* ----------------------------------------------------------------- */}
      {showSimModal && (
        <div className="phone-sim-backdrop" onClick={() => setShowSimModal(false)}>
          <div className="phone-mockup-frame" onClick={(e) => e.stopPropagation()}>
            <div className="phone-screen">
              {/* WhatsApp Header */}
              <div className="sim-wa-header">
                <div className="sim-wa-avatar">
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <strong style={{ fontSize: "13px", display: "block" }}>Espon AI Bot</strong>
                  <span style={{ fontSize: "10.5px", opacity: 0.9 }}>Online · Visual Flow Test</span>
                </div>
                <button onClick={() => setShowSimModal(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>×</button>
              </div>

              {/* Chat Stream */}
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
