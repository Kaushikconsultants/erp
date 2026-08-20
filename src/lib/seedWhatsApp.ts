import { prisma } from "@/lib/prisma";

export async function seedWhatsAppPlatformData() {
  try {
    console.log("Checking WhatsApp Platform seed state...");
    
    // Check if account already exists
    const existingAccount = await prisma.whatsAppAccount.findFirst();
    if (existingAccount) {
      console.log("WhatsApp Platform data already initialized.");
      return;
    }

    console.log("Initializing WhatsApp Platform seed data...");

    // 1. Create Default WhatsApp Accounts
    const mainAccount = await prisma.whatsAppAccount.create({
      data: {
        name: "Espon Main Sales",
        phoneNumber: "+91 7206066678",
        phoneId: "ph_10928374659201",
        businessAccountId: "waba_991827364501",
        businessManagerId: "bm_5544332211",
        accessToken: "EAAG...meta_token_secured",
        webhookVerifyToken: "espon_whatsapp_secure_webhook_token_2026",
        status: "CONNECTED",
        dailyLimit: "10K per day",
        usedToday: 1250,
        qualityRating: "GREEN",
        isDefault: true
      }
    });

    const supportAccount = await prisma.whatsAppAccount.create({
      data: {
        name: "Espon Customer Support",
        phoneNumber: "+91 7206066679",
        phoneId: "ph_10928374659202",
        businessAccountId: "waba_991827364501",
        businessManagerId: "bm_5544332211",
        accessToken: "EAAG...meta_token_secured_support",
        webhookVerifyToken: "espon_whatsapp_secure_webhook_token_2026",
        status: "CONNECTED",
        dailyLimit: "10K per day",
        usedToday: 340,
        qualityRating: "GREEN",
        isDefault: false
      }
    });

    // 2. Fetch or Create Employees for Routing
    let employee = await prisma.employee.findFirst();
    if (!employee) {
      const user = await prisma.user.findFirst() || await prisma.user.create({
        data: {
          name: "Ikra (Sales Lead)",
          email: "ikra@espon.in",
          password: "password123",
          role: "SALES"
        }
      });
      employee = await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: "EMP-1001",
          mobile: "7206066678",
          designation: "Senior Sales Executive",
          department: "Sales"
        }
      });
    }

    // 3. Fetch or Create Customers for Deep CRM Integration
    let customer1 = await prisma.customer.findFirst({ where: { mobile: "9812034567" } });
    if (!customer1) {
      customer1 = await prisma.customer.create({
        data: {
          businessName: "Rajesh Textiles Pvt Ltd",
          contactPerson: "Rajesh Sharma",
          mobile: "9812034567",
          whatsappNumber: "9812034567",
          email: "rajesh@rajeshtextiles.com",
          city: "Surat",
          state: "Gujarat",
          customerType: "Wholesaler",
          status: "Interested",
          leadStage: "Quotation Shared",
          temperature: "HOT",
          totalPurchaseValue: 345000,
          totalOrders: 6,
          assignedSalespersonId: employee.id,
          tags: "Hot Lead, Wholesale, Catalog Shared"
        }
      });
    }

    let customer2 = await prisma.customer.findFirst({ where: { mobile: "9876543210" } });
    if (!customer2) {
      customer2 = await prisma.customer.create({
        data: {
          businessName: "Mehta Garment House",
          contactPerson: "Vikram Mehta",
          mobile: "9876543210",
          whatsappNumber: "9876543210",
          email: "vikram@mehtagarments.com",
          city: "Ahmedabad",
          state: "Gujarat",
          customerType: "Retailer",
          status: "Contacted",
          leadStage: "Negotiation",
          temperature: "WARM",
          totalPurchaseValue: 180000,
          totalOrders: 3,
          assignedSalespersonId: employee.id,
          tags: "Payment Pending, Retailer"
        }
      });
    }

    let customer3 = await prisma.customer.findFirst({ where: { mobile: "9988776655" } });
    if (!customer3) {
      customer3 = await prisma.customer.create({
        data: {
          businessName: "Kothari Hosiery & Garments",
          contactPerson: "Suresh Kothari",
          mobile: "9988776655",
          whatsappNumber: "9988776655",
          email: "suresh@kotharihosiery.in",
          city: "Ludhiana",
          state: "Punjab",
          customerType: "Distributor",
          status: "New Lead",
          leadStage: "New Enquiry",
          temperature: "HOT",
          totalPurchaseValue: 0,
          totalOrders: 0,
          assignedSalespersonId: employee.id,
          tags: "New Enquiry, Wholesale"
        }
      });
    }

    // 4. Create WhatsApp Conversations
    const conv1 = await prisma.whatsAppConversation.create({
      data: {
        accountId: mainAccount.id,
        customerId: customer1.id,
        assignedEmployeeId: employee.id,
        status: "OPEN",
        priority: "HIGH",
        leadStatus: "Quotation Shared",
        orderStatus: "Quotation Sent",
        customerType: "Wholesaler",
        aiHandled: false,
        aiConfidence: 0.95,
        unreadCount: 2,
        lastMessageText: "Please check the quotation attached. Can we dispatch by tomorrow?",
        lastMessageAt: new Date(),
        tags: "Hot Lead, Wholesale, Quotation Sent",
        slaStatus: "GREEN",
        followUpDueAt: new Date(Date.now() + 86400000)
      }
    });

    const conv2 = await prisma.whatsAppConversation.create({
      data: {
        accountId: mainAccount.id,
        customerId: customer2.id,
        assignedEmployeeId: employee.id,
        status: "OPEN",
        priority: "HIGH",
        leadStatus: "Negotiation",
        orderStatus: "Payment Pending",
        customerType: "Retailer",
        aiHandled: true,
        aiConfidence: 0.88,
        unreadCount: 0,
        lastMessageText: "Payment link sent for Order #ORD-1092 (₹45,000). Awaiting UPI payment.",
        lastMessageAt: new Date(Date.now() - 3600000),
        tags: "Payment Pending, Retailer, High Value",
        slaStatus: "ORANGE"
      }
    });

    const conv3 = await prisma.whatsAppConversation.create({
      data: {
        accountId: mainAccount.id,
        customerId: customer3.id,
        assignedEmployeeId: employee.id,
        status: "OPEN",
        priority: "MEDIUM",
        leadStatus: "New Enquiry",
        orderStatus: null,
        customerType: "Distributor",
        aiHandled: true,
        aiConfidence: 0.94,
        unreadCount: 1,
        lastMessageText: "Hi, I want wholesale price catalog for summer t-shirts and trackpants.",
        lastMessageAt: new Date(Date.now() - 7200000),
        tags: "New Enquiry, Catalog Shared",
        slaStatus: "GREEN"
      }
    });

    // 5. Create WhatsApp Messages for Conversation 1
    await prisma.whatsAppMessage.createMany({
      data: [
        {
          conversationId: conv1.id,
          senderType: "CUSTOMER",
          senderName: "Rajesh Sharma",
          messageType: "TEXT",
          content: "Hello, we need 500 pcs Cotton Polo Shirts (Article #ESP-902). Please send latest pricing and availability.",
          status: "READ",
          sentAt: new Date(Date.now() - 14400000)
        },
        {
          conversationId: conv1.id,
          senderType: "BOT",
          senderName: "Espon AI Assistant",
          messageType: "TEXT",
          content: "Hello Rajesh ji! Thank you for reaching out to Espon Clothing. We have ready stock for Article #ESP-902 in all sizes (M, L, XL). Sharing our wholesale catalog now.",
          status: "READ",
          sentAt: new Date(Date.now() - 14350000)
        },
        {
          conversationId: conv1.id,
          senderType: "AGENT",
          senderId: employee.id,
          senderName: "Ikra (Sales)",
          messageType: "DOCUMENT",
          content: "Quotation #QT-1098 for 500 pcs Polo T-Shirts. Total: ₹1,45,000 (inclusive of 12% GST).",
          mediaUrl: "/samples/Quotation-QT1098.pdf",
          mediaType: "application/pdf",
          mediaFilename: "Quotation-QT1098.pdf",
          status: "READ",
          sentAt: new Date(Date.now() - 7200000)
        },
        {
          conversationId: conv1.id,
          senderType: "AGENT",
          senderId: employee.id,
          senderName: "Ikra (Sales)",
          messageType: "TEXT",
          content: "Internal Note: Customer is ready to close if we provide 2% cash discount.",
          isInternalNote: true,
          status: "READ",
          sentAt: new Date(Date.now() - 3600000)
        },
        {
          conversationId: conv1.id,
          senderType: "CUSTOMER",
          senderName: "Rajesh Sharma",
          messageType: "TEXT",
          content: "Please check the quotation attached. Can we dispatch by tomorrow?",
          status: "RECEIVED",
          sentAt: new Date()
        }
      ]
    });

    // 6. Create Default WhatsApp Templates
    await prisma.whatsAppTemplate.createMany({
      data: [
        {
          name: "order_confirmation_v2",
          category: "UTILITY",
          language: "en_US",
          status: "APPROVED",
          headerType: "TEXT",
          headerContent: "Order Confirmed - {{company_name}}",
          bodyText: "Dear {{customer_name}},\n\nYour order {{order_number}} of amount ₹{{order_value}} has been confirmed! Assigned executive: {{salesperson_name}}.\n\nTrack your shipment using the button below.",
          footerText: "Thank you for choosing Espon Clothing.",
          buttons: JSON.stringify([{ type: "URL", text: "Track Order", url: "{{tracking_link}}" }]),
          variables: JSON.stringify(["customer_name", "company_name", "order_number", "order_value", "salesperson_name", "tracking_link"])
        },
        {
          name: "payment_request_link",
          category: "UTILITY",
          language: "en_US",
          status: "APPROVED",
          headerType: "TEXT",
          headerContent: "Payment Request - Espon Clothing",
          bodyText: "Hi {{customer_name}},\n\nYour invoice for {{order_number}} (Amount: ₹{{order_value}}) is due. Click below to pay securely via UPI, Card or NetBanking.\n\nLink: {{payment_link}}",
          footerText: "Espon Billing Department",
          buttons: JSON.stringify([{ type: "URL", text: "Pay Now", url: "{{payment_link}}" }]),
          variables: JSON.stringify(["customer_name", "order_number", "order_value", "payment_link"])
        },
        {
          name: "festive_wholesale_launch",
          category: "MARKETING",
          language: "en_US",
          status: "APPROVED",
          headerType: "IMAGE",
          headerContent: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
          bodyText: "Greetings {{customer_name}}! 🎉\n\nOur New Festive Wholesale Collection for {{company_name}} is now live! Enjoy exclusive early-bird discounts up to 15% on bulk orders.\n\nTap below to request catalog & sample swatch kit.",
          footerText: "Espon Clothing Wholesale",
          buttons: JSON.stringify([{ type: "QUICK_REPLY", text: "Send Catalog" }, { type: "QUICK_REPLY", text: "Call Sales" }]),
          variables: JSON.stringify(["customer_name", "company_name"])
        }
      ]
    });

    // 7. Create Reply Library Items
    await prisma.whatsAppReplyItem.createMany({
      data: [
        {
          title: "Send Summer Wholesale Catalog",
          category: "Catalog",
          shortcut: "/catalog",
          content: "Here is our latest 2026 Wholesale Apparel Catalog with bulk slab pricing: https://espon.in/catalog-2026.pdf. Let us know your size requirement!"
        },
        {
          title: "Standard Wholesale Tiered Price List",
          category: "Pitch",
          shortcut: "/price",
          content: "Our Wholesale Pricing Slabs:\n• 100 - 250 pcs: ₹290/pc\n• 251 - 500 pcs: ₹270/pc\n• 500+ pcs: ₹250/pc + Free Freight Shipping."
        },
        {
          title: "Bank & UPI Payment Details",
          category: "Payment",
          shortcut: "/payment",
          content: "Bank Details:\nAccount Name: ESPON CLOTHING PRIVATE LIMITED\nAccount No: 016805006415\nIFSC: ICIC0000168\nUPI ID: 7206066678@OKBIZAXIS"
        },
        {
          title: "Friendly 24-Hour Followup",
          category: "Support",
          shortcut: "/followup",
          content: "Hi {{customer_name}}, following up on our previous conversation regarding your inquiry. Please let us know if you have any questions or need samples!"
        }
      ]
    });

    // 8. Create Automation Rules
    await prisma.whatsAppAutomationRule.createMany({
      data: [
        {
          name: "Auto Lead Qualification & Tagging",
          trigger: "NEW_MESSAGE",
          conditions: JSON.stringify({ messageContains: "catalog,wholesale,price" }),
          actions: JSON.stringify({ addTag: "Hot Lead", changeStage: "Qualified Lead", assignAgent: "ROUND_ROBIN" }),
          isActive: true
        },
        {
          name: "Automatic Payment Confirmation & Invoice Send",
          trigger: "PAYMENT_RECEIVED",
          conditions: JSON.stringify({ paymentStatus: "PAID" }),
          actions: JSON.stringify({ sendTemplate: "order_confirmation_v2", changeStage: "Order Confirmed" }),
          isActive: true
        },
        {
          name: "24-Hour Inactive Follow-up Trigger",
          trigger: "NO_RESPONSE_24H",
          conditions: JSON.stringify({ leadStage: "Quotation Shared" }),
          actions: JSON.stringify({ sendMessage: "Hi! Following up on Quotation #QT-1098. Let us know if you need any adjustments.", createFollowUp: true }),
          isActive: true
        }
      ]
    });

    // 9. Create Chatbot Flow
    await prisma.whatsAppChatbotFlow.create({
      data: {
        name: "Main Lead Qualification Bot",
        triggerKeyword: "HI, HELLO, INQUIRY, CATALOG",
        nodesJson: JSON.stringify([
          { id: "node_1", type: "START", title: "Welcome & Intro" },
          { id: "node_2", type: "BUTTONS", title: "Select Inquiry Type", options: ["Wholesale Catalog", "Check Order Status", "Speak with Sales Executive"] },
          { id: "node_3", type: "CRM_ACTION", action: "CREATE_LEAD_AND_ASSIGN" }
        ]),
        isActive: true,
        executionCount: 148
      }
    });

    // 10. Create WhatsApp Form
    await prisma.whatsAppForm.create({
      data: {
        title: "Wholesale Buyer Onboarding Form",
        description: "Collect GST and business verification details for wholesale accounts",
        fieldsJson: JSON.stringify([
          { name: "companyName", label: "Business / Shop Name", type: "text", required: true },
          { name: "gstNumber", label: "GSTIN Number", type: "text", required: true },
          { name: "city", label: "City & State", type: "text", required: true },
          { name: "expectedVolume", label: "Expected Monthly Volume (pcs)", type: "select", options: ["100-250", "250-500", "500-1000", "1000+"] }
        ]),
        submitMessage: "Thank you! Your wholesale profile is verified. Our sales executive will call you in 15 minutes.",
        isActive: true
      }
    });

    // 11. Create Customer Segment & Broadcast Campaign
    const segment = await prisma.whatsAppSegment.create({
      data: {
        name: "High Value Wholesalers (Surat & Gujarat)",
        criteriaJson: JSON.stringify({ customerType: "Wholesaler", state: "Gujarat", minPurchase: 100000 }),
        contactCount: 420
      }
    });

    await prisma.whatsAppCampaign.create({
      data: {
        name: "Diwali Wholesale Pre-order Blast 2026",
        templateId: "festive_wholesale_launch",
        segmentId: segment.id,
        scheduledAt: new Date(Date.now() - 864000000),
        status: "COMPLETED",
        totalAudience: 420,
        sentCount: 420,
        deliveredCount: 412,
        readCount: 380,
        repliedCount: 94,
        failedCount: 8,
        leadsGenerated: 45,
        ordersGenerated: 28,
        revenueGenerated: 1840000,
        cost: 420.0
      }
    });

    console.log("WhatsApp Platform seed data successfully initialized!");
  } catch (error) {
    console.error("Error seeding WhatsApp Platform data:", error);
  }
}
