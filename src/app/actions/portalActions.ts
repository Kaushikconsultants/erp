"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getCustomerPortalData(targetCustomerId?: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const userOrgId = (session?.user as any)?.organizationId;
  const userRole = (session?.user as any)?.role;
  
  let customer: any = null;

  const invoiceInclude = {
    where: { status: { not: "Cancelled" } },
    orderBy: { invoiceDate: 'desc' as const },
    take: 20
  };

  // 1. If explicit customerId is provided (e.g. previewing from CRM dashboard or direct customer link)
  if (targetCustomerId) {
    if (!session?.user) {
      return { success: false, error: "Authentication required to view customer portal." };
    }

    customer = await prisma.customer.findUnique({
      where: { id: targetCustomerId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 20 },
        invoices: invoiceInclude,
        quotations: { orderBy: { createdAt: 'desc' }, take: 20 },
        proformaInvoices: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!customer) {
      return { success: false, error: "Customer profile not found." };
    }

    // Tenant check: If accessed by CRM staff, ensure same organization
    const isStaff = userRole && userRole !== "PORTAL_USER";
    if (isStaff && customer.organizationId && userOrgId && customer.organizationId !== userOrgId) {
      return { success: false, error: "Access denied. Customer belongs to another organization." };
    }

    // Portal user check: If accessed by portal customer, ensure it's their own account
    if (!isStaff && customer.portalUserId !== userId) {
      return { success: false, error: "Access denied. You can only view your own portal." };
    }
  }

  // 2. If no targetCustomerId, find customer linked to current user's portal account
  if (!customer && userId) {
    customer = await prisma.customer.findUnique({
      where: { portalUserId: userId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 20 },
        invoices: invoiceInclude,
        quotations: { orderBy: { createdAt: 'desc' }, take: 20 },
        proformaInvoices: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
  }

  if (!customer) {
    return { success: false, error: "No customer account linked to your profile." };
  }

  return {
    success: true,
    customer,
    orders: customer.orders || [],
    invoices: customer.invoices || [],
    quotations: customer.quotations || [],
    proformaInvoices: customer.proformaInvoices || []
  };
}

export async function getCustomerSessionData() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { isLoggedIn: false };
  }

  const userId = (session.user as any)?.id;
  if (!userId) {
    return { isLoggedIn: false };
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { portalUserId: userId },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 5 }
      }
    });

    if (customer) {
      return {
        isLoggedIn: true,
        userRole: "PORTAL_USER",
        customer: {
          id: customer.id,
          businessName: customer.businessName,
          contactPerson: customer.contactPerson,
          mobile: customer.mobile,
          whatsappNumber: customer.whatsappNumber,
          email: customer.email,
          gstNumber: customer.gstNumber,
          billingAddress: customer.billingAddress,
          shippingAddress: customer.shippingAddress,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          orderCount: customer.orders?.length || 0
        }
      };
    }

    return {
      isLoggedIn: true,
      userRole: (session.user as any)?.role || "USER",
      userName: session.user.name,
      userEmail: session.user.email
    };
  } catch (err) {
    console.error("Failed to get customer session:", err);
    return { isLoggedIn: false };
  }
}

/**
 * Register a new wholesale customer profile and portal login credentials
 */
export async function registerCustomerPortalAccount(payload: {
  businessName: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  password: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
}) {
  const { businessName, contactPerson, mobile, email, password, shippingAddress, city, state, pincode, gstin } = payload;

  if (!businessName?.trim() || !contactPerson?.trim() || !mobile?.trim() || !password?.trim()) {
    return { success: false, error: "Business name, contact person, mobile number, and password are required." };
  }

  const cleanMobile = mobile.replace(/[^0-9]/g, "");
  const accountEmail = email?.trim() ? email.trim().toLowerCase() : `${cleanMobile}@customer.r3exports.com`;

  try {
    // 1. Resolve default Organization
    let org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: "r3-exports" },
          { name: { contains: "R3", mode: "insensitive" } }
        ]
      }
    }) || await prisma.organization.findFirst();

    if (!org) {
      return { success: false, error: "Organization not initialized in database." };
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: accountEmail },
          { customerProfile: { mobile: cleanMobile } }
        ]
      }
    });

    if (existingUser) {
      return { success: false, error: "An account with this mobile number or email already exists. Please log in instead." };
    }

    // 3. Hash password and create User with role PORTAL_USER
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: contactPerson.trim(),
        email: accountEmail,
        password: hashedPassword,
        plainPassword: password, // For easy recovery/preview
        role: "PORTAL_USER",
        isActive: true
      }
    });

    // 4. Create Customer Profile linked to this User
    const customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        portalUserId: user.id,
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        mobile: cleanMobile,
        whatsappNumber: cleanMobile,
        email: email?.trim() || accountEmail,
        gstNumber: gstin?.trim().toUpperCase() || null,
        billingAddress: shippingAddress.trim(),
        shippingAddress: shippingAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        customerType: "Wholesaler",
        source: "Storefront Registration",
        status: "Active Customer",
        leadStage: "Account Created"
      }
    });

    return {
      success: true,
      message: "Wholesale account created successfully! You can now log in and track your orders.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      customer: {
        id: customer.id,
        businessName: customer.businessName
      }
    };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { success: false, error: err.message || "Failed to create account. Please try again." };
  }
}

/**
 * Submit a Custom Glassware Design Request from Storefront into the ERP
 */
export async function submitCustomDesignRequest(params: {
  name: string;
  company?: string;
  mobile: string;
  email?: string;
  requestType: string;
  sku?: string;
  description: string;
  pictures?: string[];
  expectedQty?: string;
  timeline?: string;
}) {
  const { name, company, mobile, email, requestType, sku, description, pictures = [], expectedQty, timeline } = params;

  if (!name?.trim() || !mobile?.trim() || !description?.trim()) {
    return { success: false, error: "Your name, WhatsApp/phone number, and a description of your design are required." };
  }

  const cleanMobile = mobile.replace(/[^0-9]/g, "");

  try {
    // 1. Resolve Organization
    let org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: "r3-exports" },
          { slug: "tinkal-erp" },
          { name: { contains: "R3", mode: "insensitive" } }
        ]
      }
    }) || await prisma.organization.findFirst();

    const organizationId = org?.id || null;

    // 2. Generate a reference number
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `CR-${datePart}-${randomPart}`;

    // 3. Save as a Lead in ERP with Custom Design Request details (Always create lead)
    const formattedNotes = `🎨 [CUSTOM DESIGN REQUEST #${referenceNumber}]\n` +
      `• Type: ${requestType || 'New Custom Design'}\n` +
      `• Reference SKU: ${sku || 'None'}\n` +
      `• Expected Quantity: ${expectedQty || '100–500 pcs'}\n` +
      `• Required Timeline: ${timeline || 'Within 1 month'}\n` +
      `• Design Details: ${description}\n` +
      (pictures.length > 0 ? `• Uploaded Reference Pictures (${pictures.length}):\n${pictures.join('\n')}` : '');

    const lead = await prisma.lead.create({
      data: {
        organizationId: organizationId || null,
        name: `${name.trim()} (${company?.trim() || 'Custom Glassware'})`,
        whatsappNumber: cleanMobile,
        email: email?.trim() || null,
        shopName: company?.trim() || name.trim(),
        buyerType: "Custom Design / Bespoke Glassware",
        status: "New",
        isInternational: false,
        country: "India",
        currency: "INR",
        targetCapacity: `${expectedQty || '100–500 pcs'} • ${requestType || 'Custom Design'}`,
        notes: formattedNotes
      }
    });

    // 4. Send Push Notification to ERP Staff
    try {
      const { notifyNewLead } = await import("@/lib/pushNotifications");
      await notifyNewLead({
        leadId: lead.id,
        name: lead.name,
        shopName: lead.shopName,
        whatsappNumber: cleanMobile,
        source: "Storefront Custom Design",
        organizationId: organizationId || undefined
      });
    } catch (pushErr) {
      console.warn("Push notification skipped:", pushErr);
    }

    // 5. Generate WhatsApp notification message
    const factoryPhone = (org?.phone || "919958173594").replace(/[^0-9]/g, "");
    let waMsg = `*🎨 NEW CUSTOM GLASSWARE DESIGN REQUEST (#${referenceNumber})*\n\n`;
    waMsg += `*Client:* ${name} ${company ? `(${company})` : ''}\n`;
    waMsg += `*WhatsApp:* ${mobile}\n`;
    if (email) waMsg += `*Email:* ${email}\n`;
    waMsg += `*Request Type:* ${requestType || 'New Custom Design'}\n`;
    if (sku) waMsg += `*Based on SKU:* ${sku}\n`;
    waMsg += `*Expected Quantity:* ${expectedQty || '100–500 pcs'}\n`;
    waMsg += `*Timeline:* ${timeline || 'Within 1 month'}\n\n`;
    waMsg += `*Description:* ${description}\n\n`;
    if (pictures.length > 0) {
      waMsg += `*Reference Images Attached (${pictures.length}):*\n`;
      pictures.forEach((img, idx) => {
        waMsg += `${idx + 1}. ${img}\n`;
      });
      waMsg += `\n`;
    }
    waMsg += `Please review factory feasibility and share quote. Thank you!`;

    const whatsAppUrl = `https://wa.me/${factoryPhone}?text=${encodeURIComponent(waMsg)}`;

    try {
      revalidatePath("/leads");
      revalidatePath("/(dashboard)/leads");
    } catch {}

    return {
      success: true,
      leadId: lead.id,
      referenceNumber,
      whatsAppUrl,
      message: `Your design request #${referenceNumber} has been submitted! Our Agra design engineering team will review it and connect on WhatsApp.`
    };
  } catch (err: any) {
    console.error("Failed to submit custom design request:", err);
    return { success: false, error: err.message || "Failed to submit request. Please try again." };
  }
}

export async function acceptQuotationFromPortal(quotationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const userId = (session.user as any)?.id;
    const userOrgId = (session.user as any)?.organizationId;

    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { customer: true }
    });
    if (!quote) return { success: false, error: "Quotation not found" };

    // Verify access: caller must be linked customer or staff in same org
    const isCustomerOwner = quote.customer?.portalUserId === userId;
    const isStaffSameOrg = quote.customer?.organizationId === userOrgId || quote.organizationId === userOrgId;
    if (!isCustomerOwner && !isStaffSameOrg) {
      return { success: false, error: "Access denied to this quotation." };
    }

    const updated = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Approved",
        activities: {
          create: {
            userId: userId || null,
            userName: quote.customer?.businessName || "Client Portal",
            action: "Quotation Accepted",
            details: `Approved via Client Self-Service Portal by ${quote.customer?.contactPerson || 'Client'}`
          }
        }
      }
    });

    return { success: true, quotation: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Automatically create or link Portal User credentials for a Customer/Lead
 */
export async function createOrLinkPortalUserForCustomer(params: {
  customerId: string;
  organizationId?: string | null;
  mobile: string;
  email?: string | null;
  name: string;
  customPassword?: string;
}) {
  try {
    const { customerId, organizationId, mobile, email, name, customPassword } = params;
    const cleanMobile = (mobile || "").replace(/\D/g, "");
    
    // Auto-generate password if not provided (e.g. R3@8921)
    const lastDigits = cleanMobile.length >= 4 ? cleanMobile.slice(-4) : "8921";
    const generatedPassword = customPassword?.trim() || `R3@${lastDigits}`;
    const accountEmail = email?.trim() ? email.trim().toLowerCase() : (cleanMobile ? `${cleanMobile}@customer.r3exports.com` : `client_${customerId.slice(-6)}@customer.r3exports.com`);

    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: accountEmail },
          ...(cleanMobile.length >= 10 ? [{ email: `${cleanMobile}@customer.r3exports.com` }] : []),
          ...(cleanMobile.length >= 10 ? [{ customerProfile: { mobile: cleanMobile } }] : [])
        ]
      }
    });

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    if (user) {
      // Update password & ensure role is PORTAL_USER (preserve admin if staff)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          plainPassword: generatedPassword,
          role: user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? user.role : "PORTAL_USER",
          isActive: true
        }
      });
    } else {
      // Create new portal user
      user = await prisma.user.create({
        data: {
          organizationId: organizationId || null,
          name: name || "Valued Client",
          email: accountEmail,
          password: hashedPassword,
          plainPassword: generatedPassword,
          role: "PORTAL_USER",
          isActive: true
        }
      });
    }

    // Link customer to portal user
    await prisma.customer.update({
      where: { id: customerId },
      data: { portalUserId: user.id }
    });

    return {
      success: true,
      portalUserId: user.id,
      loginId: cleanMobile || email || accountEmail,
      password: generatedPassword,
      name: name
    };
  } catch (err: any) {
    console.error("Error creating portal user for customer:", err);
    return { success: false, error: err.message };
  }
}
