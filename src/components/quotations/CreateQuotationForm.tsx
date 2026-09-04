"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Trash2, Save, Send, ArrowLeft, FileText, 
  CheckCircle2, Building, Calendar, Package, DollarSign, 
  Sparkles, Info, HelpCircle, Scale, Truck, X, ChevronDown, Check, UserPlus, MapPin,
  Phone, Mail, Copy, CheckCheck, Tag, ShieldCheck, Layers
} from 'lucide-react';
import Link from 'next/link';
import { createQuotation, updateQuotationFull } from '@/app/actions/quotationActions';
import { lookupBarcode } from '@/app/actions/scannerActions';
import AddCustomerModal from '@/components/ui/AddCustomerModal';
import ShippingRateCalculator from '@/components/ui/ShippingRateCalculator';
import QuickBarcodeScannerBar from '@/components/scanner/QuickBarcodeScannerBar';
import GarmentMatrixModal from '@/components/quotations/GarmentMatrixModal';
import { getCustomerTierDiscount, calculateTieredRate } from '@/lib/pricingUtils';
import { numberToWordsINR } from '@/lib/gstUtils';

import { useSearchParams } from 'next/navigation';

export const INDIAN_GST_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" }
];

export default function CreateQuotationForm({ 
  customers, 
  products, 
  employees, 
  categoriesData = [], 
  defaultQuotationNumber = 'QT-1001', 
  initialQuotation = null,
  companyState = 'Haryana'
}: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showGarmentMatrix, setShowGarmentMatrix] = useState(false);
  const [matrixTargetIndex, setMatrixTargetIndex] = useState<number | null>(null);
  const [showShippingCalculator, setShowShippingCalculator] = useState(false);
  const [showShippingAddress, setShowShippingAddress] = useState(
    initialQuotation?.shippingAddress && initialQuotation.shippingAddress !== initialQuotation.billingAddress ? true : false
  );
  const [localCustomers, setLocalCustomers] = useState(customers || []);

  useEffect(() => {
    if (customers) {
      setLocalCustomers(customers);
    }
  }, [customers]);

  useEffect(() => {
    if (!initialQuotation && defaultQuotationNumber) {
      setFormData(prev => ({
        ...prev,
        quotationNumber: defaultQuotationNumber
      }));
    }
  }, [defaultQuotationNumber, initialQuotation]);

  const getDestinationPincode = () => {
    if (selectedCustomer?.pincode) return selectedCustomer.pincode;
    const addr = formData.shippingAddress || formData.billingAddress || "";
    const match = addr.match(/\b\d{6}\b/);
    return match ? match[0] : "";
  };
  
  const [formData, setFormData] = useState({
    customerId: initialQuotation?.customerId || '',
    customerPhone: initialQuotation?.customer?.mobile || '',
    customerEmail: initialQuotation?.customer?.email || '',
    customerGst: initialQuotation?.customer?.gstNumber || '',
    placeOfSupply: initialQuotation?.placeOfSupply || '',
    quotationNumber: initialQuotation?.quotationNumber || defaultQuotationNumber,
    referenceNumber: initialQuotation?.referenceNumber || '',
    quoteDate: initialQuotation?.date ? new Date(initialQuotation.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expiryDate: initialQuotation?.expiryDate ? new Date(initialQuotation.expiryDate).toISOString().split('T')[0] : new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    salespersonId: initialQuotation?.salespersonId || '',
    subject: initialQuotation?.subject || '',
    billingAddress: initialQuotation?.billingAddress || '',
    shippingAddress: initialQuotation?.shippingAddress || '',
    currency: initialQuotation?.currency || 'INR',
    paymentTerms: initialQuotation?.paymentTerms || 'Net 15',
    priceList: initialQuotation?.priceList || '',
    expectedDeliveryDate: initialQuotation?.expectedDeliveryDate ? new Date(initialQuotation.expectedDeliveryDate).toISOString().split('T')[0] : '',
    shippingCharges: initialQuotation?.shippingCharges || 0,
    additionalDiscount: initialQuotation?.additionalDiscount || 0,
    adjustment: initialQuotation?.adjustment || 0,
    receivedAmount: initialQuotation?.receivedAmount !== undefined ? Number(initialQuotation.receivedAmount) : 0,
    discountSlab: initialQuotation?.discountSlab || '1-15',
    notes: initialQuotation?.notes || 'Thank you for your business! Please reach out if you have any questions regarding this quotation.',
    internalNotes: initialQuotation?.internalNotes || '',
    termsConditions: initialQuotation?.termsConditions || "1. Goods once sold cannot be taken back or exchanged.\n2. 50% advance payment required for custom orders.\n3. Quotation valid for 15 days from date of issue.\n4. Subject to local jurisdiction."
  });

  const [items, setItems] = useState<any[]>(
    initialQuotation?.items && initialQuotation.items.length > 0
      ? initialQuotation.items.map((i: any) => ({
          productId: i.productId,
          productName: i.product?.name || i.product?.articleNumber || '',
          sku: i.sku || '',
          description: i.description || '',
          hsnCode: i.hsnCode || '6109',
          quantity: i.quantity,
          rate: i.rate,
          unitWeight: i.unitWeight || 0,
          discountType: i.discountPercent > 0 ? 'percent' : 'amount',
          discountPercent: i.discountPercent || 0,
          discountAmount: i.discountAmount || 0,
          gstRate: i.gstRate || 5,
          availableStock: i.product?.stockQuantity || 0
        }))
      : [
          {
            productId: '',
            productName: '',
            sku: '',
            description: '',
            hsnCode: '6109',
            quantity: 1,
            rate: 0,
            unitWeight: 0,
            discountType: 'percent',
            discountPercent: 0,
            discountAmount: 0,
            gstRate: 5,
            availableStock: 0
          }
        ]
  );

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const [customerDropdownCoords, setCustomerDropdownCoords] = useState<{ top: number; left: number; width: number; placeAbove?: boolean } | null>(null);

  const [showProductSearch, setShowProductSearch] = useState(-1);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number; placeAbove?: boolean } | null>(null);
  const desktopInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const mobileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const activeProductInputRef = useRef<HTMLElement | null>(null);

  const updateCustomerDropdownCoords = () => {
    if (customerInputRef.current) {
      const rect = customerInputRef.current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < 280 && rect.top > 280;
      
      setCustomerDropdownCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 440)),
        width: Math.max(rect.width, 380),
        placeAbove
      });
    }
  };

  useEffect(() => {
    if (showCustomerSearch) {
      const handleScrollOrResize = () => {
        if (showCustomerSearch) {
          updateCustomerDropdownCoords();
        }
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [showCustomerSearch]);

  const updateDropdownCoords = (target?: HTMLElement | number | null) => {
    let el: HTMLElement | null = null;
    if (typeof target === 'number') {
      const dEl = desktopInputRefs.current[target];
      const mEl = mobileInputRefs.current[target];
      if (dEl && dEl.getBoundingClientRect().width > 0) {
        el = dEl;
      } else if (mEl && mEl.getBoundingClientRect().width > 0) {
        el = mEl;
      }
    } else if (target && typeof target === 'object' && 'getBoundingClientRect' in target) {
      el = target as HTMLElement;
    }

    if (!el && activeProductInputRef.current) {
      const r = activeProductInputRef.current.getBoundingClientRect();
      if (r.width > 0) el = activeProductInputRef.current;
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      // Guard against hidden elements with 0 width / 0 height
      if (rect.width === 0 && rect.height === 0) return;

      activeProductInputRef.current = el;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < 280 && rect.top > 280;
      const dropdownWidth = Math.max(rect.width, 380);
      const maxLeft = window.innerWidth - dropdownWidth - 16;
      const left = Math.max(12, Math.min(rect.left, Math.max(12, maxLeft)));

      setDropdownCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left,
        width: Math.min(dropdownWidth, window.innerWidth - 24),
        placeAbove
      });
    }
  };

  useEffect(() => {
    if (showProductSearch !== -1) {
      const handleScrollOrResize = () => {
        if (showProductSearch !== -1) {
          updateDropdownCoords(showProductSearch);
        }
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [showProductSearch]);

  const selectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerSearchTerm(cust.businessName || cust.companyName || '');
    setShowCustomerSearch(false);
    
    let billing = cust.billingAddress || cust.address || `${cust.businessName || cust.companyName}\n${cust.city || ''}, ${cust.state || ''}`;
    if (cust.pincode && !billing.includes(cust.pincode)) {
       billing += ` - ${cust.pincode}`;
    }
    
    let shipping = cust.shippingAddress || cust.billingAddress || cust.address || `${cust.businessName || cust.companyName}\n${cust.city || ''}, ${cust.state || ''}`;
    if (cust.pincode && !shipping.includes(cust.pincode)) {
       shipping += ` - ${cust.pincode}`;
    }

    // Resolve place of supply: customer state, or derived from GSTIN, or retain existing
    let resolvedState = cust.state || '';
    if (!resolvedState && cust.gstNumber && cust.gstNumber.length >= 2) {
      const code = cust.gstNumber.substring(0, 2);
      const match = INDIAN_GST_STATES.find(s => s.code === code);
      if (match) resolvedState = match.name;
    }

    setFormData((prev: any) => ({
      ...prev,
      customerId: cust.id,
      customerPhone: cust.mobile || cust.phone || prev.customerPhone || '',
      customerEmail: cust.email || prev.customerEmail || '',
      customerGst: cust.gstNumber || prev.customerGst || '',
      placeOfSupply: resolvedState || prev.placeOfSupply || '',
      billingAddress: billing,
      shippingAddress: shipping,
      salespersonId: cust.assignedSalespersonId || prev.salespersonId
    }));
  };

  useEffect(() => {
    const custParam = searchParams?.get('customer') || searchParams?.get('search');
    if (custParam && localCustomers.length > 0 && !formData.customerId) {
      const qLower = custParam.toLowerCase().trim();
      const matchedCust = localCustomers.find((c: any) => {
        const bName = (c.businessName || c.contactPerson || '').toLowerCase();
        return bName.includes(qLower) || qLower.includes(bName);
      });
      if (matchedCust) {
        selectCustomer(matchedCust);
      }
    }
  }, [searchParams, localCustomers, formData.customerId]);

  useEffect(() => {
    const addProductParam = searchParams?.get('add_product');
    // Only auto-add if products are loaded and we have exactly 1 empty default item
    if (addProductParam && products?.length > 0 && items.length === 1 && !items[0].productId) {
      handleBarcodeScan(addProductParam);
      // Remove it from URL to prevent adding again on re-renders
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('add_product');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, products, items.length]);

  useEffect(() => {
    if (formData.customerId && localCustomers.length > 0) {
      const cust = localCustomers.find((c: any) => c.id === formData.customerId);
      if (cust) {
        setSelectedCustomer(cust);
        if (!customerSearchTerm || customerSearchTerm !== (cust.businessName || cust.companyName)) {
          setCustomerSearchTerm(cust.businessName || cust.companyName || '');
        }
      }
    }
  }, [formData.customerId, localCustomers]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    const newIdx = items.length;
    setItems([
      ...items,
      {
        productId: '',
        productName: '',
        sku: '',
        description: '',
        hsnCode: '6109',
        quantity: 1,
        rate: 0,
        unitWeight: 0,
        discountType: 'percent',
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 5,
        availableStock: 0
      }
    ]);
    setShowProductSearch(newIdx);
    setProductSearchTerm('');
    setTimeout(() => {
      updateDropdownCoords(newIdx);
      const input = desktopInputRefs.current[newIdx] || mobileInputRefs.current[newIdx];
      input?.focus();
    }, 50);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{
        productId: '',
        productName: '',
        sku: '',
        description: '',
        hsnCode: '6109',
        quantity: 1,
        rate: 0,
        unitWeight: 0,
        discountType: 'percent',
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 5,
        availableStock: 0
      }]);
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const selectProduct = (index: number, product: any) => {
    const catWeight = categoriesData?.find((c: any) => c.name.toLowerCase() === (product.category || '').toLowerCase())?.weight || 0;
    const resolvedWeight = (product.weight && Number(product.weight) > 0) 
      ? Number(product.weight) 
      : (catWeight > 0 ? catWeight : 0.25);

    const tierInfo = getCustomerTierDiscount(selectedCustomer);
    const basePrice = product.sellingPrice || 0;
    const effectiveRate = calculateTieredRate(basePrice, tierInfo.discountPercent);

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      productName: product.name,
      sku: product.articleNumber || product.sku || '',
      rate: effectiveRate,
      unitWeight: resolvedWeight,
      availableStock: product.stockQuantity || 0,
      description: product.description || ''
    };
    setItems(newItems);
    setShowProductSearch(-1);
    setProductSearchTerm("");
  };

  const handleBarcodeScan = async (code: string) => {
    if (!code || !code.trim()) return;
    const q = code.trim().toLowerCase();

    // 1. Check local products
    let matchedProduct = products?.find((p: any) =>
      (p.sku && p.sku.toLowerCase() === q) ||
      (p.articleNumber && p.articleNumber.toLowerCase() === q) ||
      (p.barcode && p.barcode.toLowerCase() === q) ||
      (p.id && p.id.toLowerCase() === q) ||
      (p.name && p.name.toLowerCase() === q)
    );

    // 1.5. Partial match (useful for Voice AI e.g. "iPhone 15" matching "Apple iPhone 15 Pro")
    if (!matchedProduct) {
      matchedProduct = products?.find((p: any) => p.name && p.name.toLowerCase().includes(q));
    }

    // 2. Query lookupBarcode if not found locally
    if (!matchedProduct) {
      const res = await lookupBarcode(code);
      if (res.type === "PRODUCT" && res.product) {
        matchedProduct = res.product;
      }
    }

    if (matchedProduct) {
      const existingIndex = items.findIndex((i: any) => i.productId === matchedProduct.id);
      if (existingIndex !== -1) {
        const newItems = [...items];
        newItems[existingIndex].quantity = (Number(newItems[existingIndex].quantity) || 1) + 1;
        setItems(newItems);
      } else {
        const emptyIndex = items.findIndex((i: any) => !i.productId);
        const catWeight = categoriesData?.find((c: any) => c.name.toLowerCase() === (matchedProduct.category || '').toLowerCase())?.weight || 0;
        const resolvedWeight = (matchedProduct.weight && Number(matchedProduct.weight) > 0)
          ? Number(matchedProduct.weight)
          : (catWeight > 0 ? catWeight : 0.25);

        const newItemData = {
          productId: matchedProduct.id,
          productName: matchedProduct.name,
          sku: matchedProduct.articleNumber || matchedProduct.sku || '',
          description: matchedProduct.description || '',
          hsnCode: matchedProduct.hsnCode || '6109',
          quantity: 1,
          rate: matchedProduct.sellingPrice || matchedProduct.price || 0,
          unitWeight: resolvedWeight,
          discountType: 'percent',
          discountPercent: 0,
          discountAmount: 0,
          gstRate: matchedProduct.gstRate || 5,
          availableStock: matchedProduct.stockQuantity || 0
        };

        if (emptyIndex !== -1) {
          const newItems = [...items];
          newItems[emptyIndex] = newItemData;
          setItems(newItems);
        } else {
          setItems([...items, newItemData]);
        }
      }
    } else {
      // If product not found in database, still add a customized line item with the scanned code
      const emptyIndex = items.findIndex((i: any) => !i.productId && !i.productName);
      const customItem = {
        productId: '',
        productName: `Scanned Item (${code})`,
        sku: code,
        description: `Barcode: ${code}`,
        hsnCode: '6109',
        quantity: 1,
        rate: 0,
        unitWeight: 0.25,
        discountType: 'percent',
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 5,
        availableStock: 0
      };

      if (emptyIndex !== -1) {
        const newItems = [...items];
        newItems[emptyIndex] = customItem;
        setItems(newItems);
      } else {
        setItems([...items, customItem]);
      }
    }
  };

  // Calculations
  const calculateTotals = () => {
    let grossSubtotal = 0;
    let itemDiscount = 0;
    let taxableAmount = 0;
    let taxTotal = 0;
    let totalWeight = 0;
    let totalRateWeighted = 0;

    items.forEach(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const gross = rate * qty;
      let disc = 0;
      if (item.discountType === 'amount') {
        disc = Number(item.discountAmount) || 0;
      } else {
        disc = gross * ((Number(item.discountPercent) || 0) / 100);
      }
      const taxable = Math.max(0, gross - disc);
      const gstRate = Number(item.gstRate) || 0;
      const tax = taxable * (gstRate / 100);
      
      grossSubtotal += gross;
      itemDiscount += disc;
      taxableAmount += taxable;
      taxTotal += tax;
      totalWeight += (Number(item.unitWeight) || 0) * qty;
      totalRateWeighted += taxable * gstRate;
    });

    const pos = (formData.placeOfSupply || '').trim().toLowerCase();
    const orgState = (companyState || 'Haryana').trim().toLowerCase();
    const isIntrastate = Boolean(pos)
      ? (pos === orgState || pos.startsWith(orgState) || orgState.startsWith(pos) || pos.includes(orgState) || orgState.includes(pos))
      : true;
    const cgst = isIntrastate ? taxTotal / 2 : 0;
    const sgst = isIntrastate ? taxTotal / 2 : 0;
    const igst = isIntrastate ? 0 : taxTotal;

    const effectiveGstRate = taxableAmount > 0 ? (totalRateWeighted / taxableAmount) : 5;

    const additionalDiscount = Number(formData.additionalDiscount) || 0;
    const netTaxableAmount = Math.max(0, taxableAmount - additionalDiscount);
    const shippingCharges = Number(formData.shippingCharges) || 0;
    const adjustment = Number(formData.adjustment) || 0;

    const rawTotal = netTaxableAmount + taxTotal + shippingCharges + adjustment;
    const finalTotal = Math.round(rawTotal);
    const roundOff = Math.round((finalTotal - rawTotal) * 100) / 100;

    return { 
      grossSubtotal, 
      itemDiscount, 
      subtotal: taxableAmount, // In Image 2: "Sub Total: 5,525.00"
      taxableAmount: netTaxableAmount, 
      taxTotal, 
      cgst, 
      sgst, 
      igst, 
      isIntrastate,
      hasPlaceOfSupply: Boolean(formData.placeOfSupply), 
      effectiveGstRate,
      shippingCharges, 
      rawTotal, 
      roundOff, 
      finalTotal, 
      totalWeight 
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent, status: string = 'Draft') => {
    e.preventDefault();
    if (!formData.customerId) {
      alert("Please select a customer before saving.");
      return;
    }
    if (items.length === 0 || !items[0].productId) {
      alert("Please select at least one product for this quotation.");
      return;
    }

    setLoading(true);
    try {
      // Preserve Confirmed / Converted status when editing — never downgrade
      const originalStatus = initialQuotation?.status;
      let resolvedStatus: string;
      if (initialQuotation && (originalStatus === 'Confirmed' || originalStatus === 'Converted')) {
        resolvedStatus = originalStatus;
      } else {
        resolvedStatus = status || 'Draft';
      }

      const payload = {
        customerId: formData.customerId,
        quotationNumber: formData.quotationNumber || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        quoteDate: formData.quoteDate,
        expiryDate: formData.expiryDate,
        placeOfSupply: formData.placeOfSupply || undefined,
        salespersonId: formData.salespersonId || undefined,
        status: resolvedStatus,
        subject: formData.subject || undefined,
        billingAddress: formData.billingAddress || undefined,
        shippingAddress: (showShippingAddress ? formData.shippingAddress : formData.billingAddress) || undefined,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
        shippingCharges: Number(formData.shippingCharges) || 0,
        additionalDiscount: Number(formData.additionalDiscount) || 0,
        adjustment: Number(formData.adjustment) || 0,
        roundOff: totals.roundOff,
        receivedAmount: Number(formData.receivedAmount || 0),
        discountSlab: formData.discountSlab || '1-15',
        totalWeight: totals.totalWeight,
        notes: formData.notes,
        internalNotes: formData.internalNotes,
        termsConditions: formData.termsConditions,
        items: items.map(i => {
          const gross = (Number(i.rate) || 0) * (Number(i.quantity) || 1);
          let discAmt = Number(i.discountAmount) || 0;
          let discPct = Number(i.discountPercent) || 0;

          if (i.discountType === 'amount' && gross > 0) {
            discPct = (discAmt / gross) * 100;
          } else if (i.discountType === 'percent') {
            discAmt = gross * (discPct / 100);
          }

          return {
            productId: i.productId,
            sku: i.sku,
            description: i.description,
            hsnCode: i.hsnCode,
            quantity: Number(i.quantity) || 1,
            rate: Number(i.rate) || 0,
            unitWeight: Number(i.unitWeight) || 0,
            discountPercent: discPct,
            discountAmount: discAmt,
            gstRate: Number(i.gstRate) || 0,
            availableStock: i.availableStock
          };
        })
      };

      const res = initialQuotation 
        ? await updateQuotationFull(initialQuotation.id, payload) 
        : await createQuotation(payload);


      if (res.error) {
        alert(res.error);
      } else {
        const savedId = res.quotation?.id || initialQuotation?.id;
        if (savedId) {
          router.refresh();
          router.push(`/quotations/${savedId}`);
        } else {
          router.push('/quotations');
        }
      }
    } catch (err: any) {
      alert("Error: " + (err?.message || "An unexpected error occurred"));
    }
    setLoading(false);
  };

  const numberToWords = (num: number) => {
    return numberToWordsINR(num);
  };

  const filteredCustomers = localCustomers.filter((c: any) => {
    if (!customerSearchTerm) return true;
    
    // If the search term exactly matches the selected customer's name, show all customers 
    // so the user can see the full list when they click the input.
    if (selectedCustomer && customerSearchTerm === (selectedCustomer.businessName || selectedCustomer.companyName)) {
      return true;
    }

    const term = customerSearchTerm.toLowerCase().trim();
    const bName = (c.businessName || c.companyName || '').toLowerCase();
    const cPerson = (c.contactPerson || '').toLowerCase();
    const phone = (c.mobile || c.phone || '').toLowerCase();
    const city = (c.city || '').toLowerCase();
    const state = (c.state || '').toLowerCase();
    const gst = (c.gstNumber || '').toLowerCase();
    return (
      bName.includes(term) ||
      cPerson.includes(term) ||
      phone.includes(term) ||
      city.includes(term) ||
      state.includes(term) ||
      gst.includes(term)
    );
  }).slice(0, 30);

  const filteredProducts = products.filter((p: any) => {
    if (!productSearchTerm) return true;
    const term = productSearchTerm.toLowerCase().trim();
    return (
      (p.name && p.name.toLowerCase().includes(term)) || 
      (p.articleNumber && p.articleNumber.toLowerCase().includes(term)) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.fabric && p.fabric.toLowerCase().includes(term)) ||
      (p.color && p.color.toLowerCase().includes(term))
    );
  }).slice(0, 30);

  return (
    <div className="quotation-form-wrapper" style={{ padding: '24px 16px' }}>
      
      {showAddCustomerModal && (
        <AddCustomerModal 
          employees={employees} 
          onClose={(newCustomer) => {
            setShowAddCustomerModal(false);
            if (newCustomer) {
              setLocalCustomers((prev: any[]) => [...prev, newCustomer]);
              setSelectedCustomer(newCustomer);
              
              let billing = newCustomer.billingAddress || newCustomer.address || `${newCustomer.businessName || newCustomer.companyName}\n${newCustomer.city || ''}, ${newCustomer.state || ''}`;
              if (newCustomer.pincode && !billing.includes(newCustomer.pincode)) {
                 billing += ` - ${newCustomer.pincode}`;
              }
              
              let shipping = newCustomer.shippingAddress || newCustomer.billingAddress || newCustomer.address || `${newCustomer.businessName || newCustomer.companyName}\n${newCustomer.city || ''}, ${newCustomer.state || ''}`;
              if (newCustomer.pincode && !shipping.includes(newCustomer.pincode)) {
                 shipping += ` - ${newCustomer.pincode}`;
              }

              let resolvedState = newCustomer.state || '';
              if (!resolvedState && newCustomer.gstNumber && newCustomer.gstNumber.length >= 2) {
                const code = newCustomer.gstNumber.substring(0, 2);
                const match = INDIAN_GST_STATES.find(s => s.code === code);
                if (match) resolvedState = match.name;
              }

              setFormData((prev: any) => ({ 
                ...prev, 
                customerId: newCustomer.id,
                customerPhone: newCustomer.mobile || newCustomer.phone || prev.customerPhone || '',
                customerEmail: newCustomer.email || prev.customerEmail || '',
                customerGst: newCustomer.gstNumber || prev.customerGst || '',
                placeOfSupply: resolvedState || prev.placeOfSupply || '',
                billingAddress: billing,
                shippingAddress: shipping,
                salespersonId: newCustomer.assignedSalespersonId || prev.salespersonId
              }));
            }
          }} 
        />
      )}

      {/* ─── STANDARD ZOHO PAGE HEADER ─── */}
      <div className="quotation-header-bar" style={{ maxWidth: '1200px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/quotations" style={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {initialQuotation ? `Edit Quotation #${initialQuotation.quotationNumber}` : 'New Quotation'}
              </h1>
              <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{initialQuotation?.status || 'Draft'}</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {initialQuotation ? 'Modify items, quantities, pricing, and customer details.' : 'Fill in customer and pricing details to issue a formal quote.'}
            </p>
          </div>
        </div>

        <div className="quotation-header-actions" style={{ display: 'flex', gap: '10px', width: 'auto' }}>
          <Link href="/quotations" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center' }}>
            Cancel
          </Link>
          {/* Only show Save Draft button if status is NOT already Confirmed/Converted */}
          {(!initialQuotation || (initialQuotation?.status !== 'Confirmed' && initialQuotation?.status !== 'Converted')) && (
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, 'Draft')} 
              disabled={loading} 
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} /> Save Draft
            </button>
          )}
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, initialQuotation?.status === 'Confirmed' || initialQuotation?.status === 'Converted' ? initialQuotation.status : 'Sent')} 
            disabled={loading} 
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: initialQuotation?.status === 'Confirmed' ? '#10b981' : '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}
          >
            <Send size={15} /> {loading ? "Saving..." : initialQuotation ? (initialQuotation?.status === 'Confirmed' ? "Update Confirmed Quote" : "Update Quotation") : "Save & Send"}
          </button>
        </div>
      </div>

      {/* ─── ZOHO DIGITAL SHEET CANVAS ─── */}
      <div className="quotation-canvas-card" style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)', padding: '32px 36px' }}>
        
        {/* TOP SECTION: CUSTOMER & QUOTATION SPECIFICATIONS */}
        <div className="quotation-top-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.18fr) minmax(0, 1fr)', gap: '32px', paddingBottom: '28px', borderBottom: '1px solid #e2e8f0' }}>
          
          {/* LEFT: CUSTOMER & BILLING PROFILE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Customer Search & Quick Add */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                  <Building size={15} color="#2563eb" />
                  Customer Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <UserPlus size={13} /> Add New Customer
                </button>
              </div>

              {/* Searchable Customer Input Box */}
              <div style={{ position: 'relative', width: '100%' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    border: showCustomerSearch ? '2px solid #2563eb' : '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '8px 12px', 
                    backgroundColor: '#ffffff',
                    boxShadow: showCustomerSearch ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : '0 1px 2px 0 rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    cursor: 'text'
                  }}
                  onClick={() => {
                    setShowCustomerSearch(true);
                    updateCustomerDropdownCoords();
                    customerInputRef.current?.focus();
                  }}
                >
                  <Search size={16} color={showCustomerSearch ? "#2563eb" : "#64748b"} style={{ flexShrink: 0 }} />
                  <input 
                    ref={customerInputRef}
                    type="text" 
                    placeholder="Search customer by name, contact, mobile, GSTIN..." 
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerSearch(true);
                      updateCustomerDropdownCoords();
                    }}
                    onFocus={(e) => {
                      e.target.select();
                      setShowCustomerSearch(true);
                      updateCustomerDropdownCoords();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowCustomerSearch(false);
                      }
                    }}
                    style={{ 
                      border: 'none', 
                      outline: 'none', 
                      marginLeft: '8px', 
                      width: '100%', 
                      fontSize: '0.88rem', 
                      color: '#0f172a',
                      fontWeight: selectedCustomer && customerSearchTerm === (selectedCustomer.businessName || selectedCustomer.companyName) ? 600 : 400,
                      backgroundColor: 'transparent' 
                    }}
                  />
                  {customerSearchTerm ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomerSearchTerm('');
                        setSelectedCustomer(null);
                        setFormData((prev: any) => ({
                          ...prev,
                          customerId: '',
                          customerPhone: '',
                          customerEmail: '',
                          customerGst: '',
                          placeOfSupply: '',
                          billingAddress: '',
                          shippingAddress: ''
                        }));
                        updateCustomerDropdownCoords();
                        customerInputRef.current?.focus();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <ChevronDown size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                  )}
                </div>
              </div>
            </div>

            {/* CUSTOMER PROFILE CARD (EDITABLE METADATA) */}
            <div style={{ 
              padding: '16px 18px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Customer Details
                  </span>
                  {selectedCustomer && (() => {
                    const tier = getCustomerTierDiscount(selectedCustomer);
                    return (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: tier.badgeBg,
                        color: tier.badgeColor,
                        border: `1px solid ${tier.badgeColor}33`
                      }}>
                        🏷️ {tier.tierName}
                      </span>
                    );
                  })()}
                </div>

                {/* Tax Treatment Status Pill */}
                {formData.placeOfSupply ? (
                  <span style={{
                    fontSize: '0.74rem',
                    backgroundColor: totals.isIntrastate ? '#ecfdf5' : '#eff6ff',
                    color: totals.isIntrastate ? '#047857' : '#1d4ed8',
                    border: `1px solid ${totals.isIntrastate ? '#a7f3d0' : '#bfdbfe'}`,
                    padding: '3px 10px',
                    borderRadius: '16px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: totals.isIntrastate ? '#10b981' : '#3b82f6' }} />
                    {totals.isIntrastate ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.74rem',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
                    Place of Supply (Select Below)
                  </span>
                )}
              </div>

              {/* Row 1: Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={formData.customerPhone} 
                      onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                      placeholder="e.g. +91 98765 43210" 
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    value={formData.customerEmail} 
                    onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                    placeholder="e.g. customer@company.com" 
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', color: '#0f172a', backgroundColor: '#ffffff', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Row 2: GSTIN & Place of Supply (Dropdown) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>
                      GSTIN / Tax ID
                    </label>
                    {formData.customerGst && formData.customerGst.length >= 2 && (() => {
                      const code = formData.customerGst.substring(0, 2);
                      const matched = INDIAN_GST_STATES.find(s => s.code === code);
                      return matched ? (
                        <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600 }}>
                          Code {matched.code}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <input 
                    type="text" 
                    value={formData.customerGst} 
                    onChange={e => {
                      const upper = e.target.value.toUpperCase();
                      let nextState = formData.placeOfSupply;
                      if (upper.length >= 2 && !nextState) {
                        const code = upper.substring(0, 2);
                        const matched = INDIAN_GST_STATES.find(s => s.code === code);
                        if (matched) nextState = matched.name;
                      }
                      setFormData(prev => ({
                        ...prev,
                        customerGst: upper,
                        placeOfSupply: nextState
                      }));
                    }}
                    placeholder="e.g. 06AAHCE7721Q1Z4" 
                    maxLength={15}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', color: '#0f172a', fontFamily: 'monospace', fontWeight: 600, backgroundColor: '#ffffff', outline: 'none' }}
                  />
                </div>

                {/* Place of Supply (Indian State Dropdown) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>
                      Place of Supply (State)
                    </label>
                    {formData.placeOfSupply && (
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, placeOfSupply: '' }))}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={formData.placeOfSupply} 
                      onChange={e => setFormData({...formData, placeOfSupply: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '7px 28px 7px 10px', 
                        borderRadius: '6px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.84rem', 
                        color: formData.placeOfSupply ? '#0f172a' : '#64748b', 
                        fontWeight: formData.placeOfSupply ? 600 : 400, 
                        backgroundColor: '#ffffff',
                        appearance: 'none',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Select State / UT --</option>
                      {INDIAN_GST_STATES.map((st) => {
                        const isOrgHome = st.name.toLowerCase() === (companyState || 'haryana').toLowerCase();
                        return (
                          <option key={st.code} value={st.name}>
                            {st.code} - {st.name} {isOrgHome ? '(Home - Intra)' : ''}
                          </option>
                        );
                      })}
                      {/* Fallback for custom state value */}
                      {formData.placeOfSupply && !INDIAN_GST_STATES.some(s => s.name.toLowerCase() === formData.placeOfSupply.toLowerCase()) && (
                        <option value={formData.placeOfSupply}>{formData.placeOfSupply}</option>
                      )}
                    </select>
                    <ChevronDown size={15} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ADDRESS BOXES */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: showShippingAddress ? '1fr 1fr' : '1fr', gap: '14px' }}>
                {/* Billing Address */}
                <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={15} color="#2563eb" />
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                        Billing Address
                      </label>
                    </div>
                    {!showShippingAddress && (
                      <button 
                        type="button"
                        onClick={() => setShowShippingAddress(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #dbeafe', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        <Plus size={13} /> Add Shipping Address
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={formData.billingAddress}
                    onChange={e => setFormData({...formData, billingAddress: e.target.value})}
                    rows={3}
                    style={{ width: '100%', minHeight: '72px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', color: '#0f172a', lineHeight: '1.4', resize: 'vertical', backgroundColor: '#ffffff', fontFamily: 'inherit', outline: 'none' }}
                    placeholder="Enter complete billing address..."
                  />
                </div>

                {/* Shipping Address */}
                {showShippingAddress && (
                  <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={15} color="#7c3aed" />
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>
                          Shipping Address
                        </label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, shippingAddress: prev.billingAddress }))}
                          style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 600, color: '#475569', background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Copy billing address"
                        >
                          <Copy size={11} /> Same as Billing
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowShippingAddress(false)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                          title="Remove shipping address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <textarea 
                      value={formData.shippingAddress}
                      onChange={e => setFormData({...formData, shippingAddress: e.target.value})}
                      rows={3}
                      style={{ width: '100%', minHeight: '72px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem', color: '#0f172a', lineHeight: '1.4', resize: 'vertical', backgroundColor: '#ffffff', fontFamily: 'inherit', outline: 'none' }}
                      placeholder="Enter complete shipping address..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: QUOTATION SPECIFICATIONS & LOGISTICS */}
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '20px 22px', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '14px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="#059669" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Document Specifications
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} /> Auto-increment
              </span>
            </div>

            {/* Row 1: Quotation # & Reference # */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Quotation # <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. QT-1001" 
                  value={formData.quotationNumber} 
                  onChange={e => setFormData({...formData, quotationNumber: e.target.value})} 
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 600, color: '#0f172a', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Reference # (PO/Order)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. PO-2026-089" 
                  value={formData.referenceNumber} 
                  onChange={e => setFormData({...formData, referenceNumber: e.target.value})} 
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }} 
                />
              </div>
            </div>

            {/* Row 2: Quote Date & Expiry Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Quote Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <DatePicker 
                  value={formData.quoteDate} 
                  onChange={e => setFormData({...formData, quoteDate: e.target.value})} 
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Expiry Date
                </label>
                <DatePicker 
                  value={formData.expiryDate} 
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }} 
                />
              </div>
            </div>

            {/* Row 3: Payment Terms & Salesperson */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Payment Terms
                </label>
                <select 
                  value={formData.paymentTerms} 
                  onChange={e => setFormData({...formData, paymentTerms: e.target.value})} 
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                  <option value="50% Advance">50% Advance</option>
                  <option value="100% Advance">100% Advance</option>
                  <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Salesperson
                </label>
                <select 
                  value={formData.salespersonId} 
                  onChange={e => setFormData({...formData, salespersonId: e.target.value})} 
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">Select Salesperson</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Subject / Headline */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Subject / Headline
              </label>
              <input 
                type="text" 
                placeholder="e.g. Bulk Order Quotation for Festive Season 2026" 
                value={formData.subject} 
                onChange={e => setFormData({...formData, subject: e.target.value})} 
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none' }} 
              />
            </div>
          </div>

        </div>

        {/* MIDDLE SECTION: LINE ITEMS TABLE WITH % OR ₹ DISCOUNT */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Item Details</h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>All prices in INR (₹)</span>
          </div>

          {/* Quick Barcode, Camera & Mobile Wireless Scanner Bar */}
          <QuickBarcodeScannerBar
            onScan={handleBarcodeScan}
            label="Quotation Barcode Scanner"
            placeholder="Scan product barcode / SKU to auto-add item into quotation..."
          />

          {/* ── DESKTOP TABLE ── hidden on mobile via CSS */}
          <div className="quot-items-desktop" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', overflowY: 'visible' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '30px' }}>#</th>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '36%' }}>Item / Product</th>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '10%' }}>Quantity</th>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '12%' }}>Rate (₹)</th>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '14%' }}>Discount (% / ₹)</th>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '10%' }}>Tax (% GST)</th>
                  <th style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '14%', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 12px', width: '36px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const gross = (item.rate || 0) * (item.quantity || 1);
                  let disc = 0;
                  if (item.discountType === 'amount') {
                    disc = Number(item.discountAmount) || 0;
                  } else {
                    disc = gross * ((Number(item.discountPercent) || 0) / 100);
                  }
                  const taxable = Math.max(0, gross - disc);
                  const tax = taxable * ((Number(item.gstRate) || 0) / 100);
                  const amount = taxable;

                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 12px', verticalAlign: 'top', color: '#94a3b8', fontSize: '0.85rem' }}>{index + 1}</td>
                      <td style={{ padding: '14px 12px', verticalAlign: 'top', position: 'relative' }}>
                        {!item.productId ? (
                          <div style={{ position: 'relative', width: '100%' }}>
                            <div 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                border: showProductSearch === index ? '2px solid #2563eb' : '1px solid #cbd5e1', 
                                borderRadius: '6px', 
                                padding: '7px 10px', 
                                backgroundColor: '#ffffff',
                                boxShadow: showProductSearch === index ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
                                transition: 'all 0.15s ease',
                                cursor: 'text'
                              }}
                              onClick={(e) => {
                                setShowProductSearch(index);
                                const input = desktopInputRefs.current[index];
                                updateDropdownCoords(input || e.currentTarget);
                                input?.focus();
                              }}
                            >
                              <Search size={15} color={showProductSearch === index ? "#2563eb" : "#64748b"} style={{ flexShrink: 0 }} />
                              <input 
                                ref={(el) => { desktopInputRefs.current[index] = el; }}
                                type="text" 
                                placeholder="Search by name, article #, SKU..." 
                                value={showProductSearch === index ? productSearchTerm : ''}
                                onChange={(e) => {
                                  setProductSearchTerm(e.target.value);
                                  setShowProductSearch(index);
                                  updateDropdownCoords(e.currentTarget);
                                }}
                                onFocus={(e) => {
                                  setShowProductSearch(index);
                                  updateDropdownCoords(e.currentTarget);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setShowProductSearch(-1);
                                    setProductSearchTerm('');
                                  }
                                }}
                                style={{ 
                                  border: 'none', 
                                  outline: 'none', 
                                  marginLeft: '8px', 
                                  width: '100%', 
                                  fontSize: '0.84rem', 
                                  color: '#0f172a',
                                  backgroundColor: 'transparent' 
                                }}
                              />
                              {showProductSearch === index && productSearchTerm ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProductSearchTerm('');
                                    const input = desktopInputRefs.current[index];
                                    updateDropdownCoords(input || e.currentTarget);
                                    input?.focus();
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              ) : (
                                <ChevronDown size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{item.productName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                                    Article #: {item.sku || 'N/A'}
                                  </span>
                                  <span>|</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#4f46e5', fontWeight: 600 }}>
                                    <Scale size={12} /> Unit Wt: 
                                    <input 
                                       type="number" 
                                       step="0.01" 
                                       value={item.unitWeight !== undefined && item.unitWeight !== null ? item.unitWeight : ''} 
                                       onChange={e => handleItemChange(index, 'unitWeight', parseFloat(e.target.value) || 0)} 
                                       style={{ width: '60px', padding: '2px 6px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#4f46e5', backgroundColor: '#ffffff' }} 
                                     /> kg
                                  </span>
                                  <span>|</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMatrixTargetIndex(index);
                                      setShowGarmentMatrix(true);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: '#f5f3ff',
                                      border: '1px solid #ddd6fe',
                                      color: '#7c3aed',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title="Open Garment Size & Color Ratio Matrix for this item"
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ede9fe'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                                  >
                                    📦 Matrix
                                  </button>
                                  <span>|</span>
                                  <span>Stock: <span style={{ color: item.availableStock > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{item.availableStock} pcs</span></span>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newItems = [...items];
                                  newItems[index].productId = '';
                                  setItems(newItems);
                                  setShowProductSearch(index);
                                  setProductSearchTerm('');
                                  setTimeout(() => {
                                    updateDropdownCoords(index);
                                    const input = desktopInputRefs.current[index] || mobileInputRefs.current[index];
                                    input?.focus();
                                  }, 50);
                                }}
                                style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#2563eb', 
                                  backgroundColor: '#eff6ff', 
                                  border: '1px solid #bfdbfe', 
                                  borderRadius: '4px', 
                                  padding: '3px 8px', 
                                  cursor: 'pointer', 
                                  fontWeight: 600,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Change
                              </button>
                            </div>
                            {item.description && item.description.includes('\n') ? (
                              <textarea
                                rows={Math.min(5, (item.description.match(/\n/g) || []).length + 1)}
                                placeholder="Add item description / specifications (optional)..."
                                value={item.description || ''}
                                onChange={e => handleItemChange(index, 'description', e.target.value)}
                                style={{ marginTop: '6px', width: '100%', fontSize: '0.74rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', resize: 'vertical', lineHeight: 1.4 }}
                              />
                            ) : (
                              <input 
                                type="text" 
                                placeholder="Add item description / specifications (optional)..." 
                                value={item.description || ''} 
                                onChange={e => handleItemChange(index, 'description', e.target.value)}
                                style={{ marginTop: '6px', width: '100%', fontSize: '0.78rem', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                              />
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                        <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                      </td>
                      <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                        <input type="number" step="0.01" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                      </td>
                      
                      {/* MANUAL DISCOUNT (% OR ₹ FIXED AMOUNT) */}
                      <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                          <select
                            value={item.discountType || 'percent'}
                            onChange={e => handleItemChange(index, 'discountType', e.target.value)}
                            style={{ padding: '4px 6px', border: 'none', borderRight: '1px solid #cbd5e1', fontSize: '0.78rem', backgroundColor: '#f8fafc', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                          >
                            <option value="percent">%</option>
                            <option value="amount">₹</option>
                          </select>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={item.discountType === 'amount' ? (item.discountAmount !== undefined && item.discountAmount !== null ? item.discountAmount : '') : (item.discountPercent !== undefined && item.discountPercent !== null ? item.discountPercent : '')} 
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              if (item.discountType === 'amount') {
                                handleItemChange(index, 'discountAmount', val);
                              } else {
                                handleItemChange(index, 'discountPercent', val);
                              }
                            }} 
                            style={{ width: '100%', padding: '6px 8px', border: 'none', outline: 'none', fontSize: '0.85rem', backgroundColor: '#ffffff' }} 
                          />
                        </div>
                      </td>

                      <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                        <select value={item.gstRate} onChange={e => handleItemChange(index, 'gstRate', e.target.value)} style={{ width: '100%', padding: '6px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                        {tax > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', textAlign: 'right', fontWeight: 600 }}>
                            +₹{tax.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', verticalAlign: 'top', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', textAlign: 'right' }}>
                        ₹{amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE ITEM CARDS ── shown only on mobile, hidden on desktop via CSS */}
          <div className="quot-items-mobile" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
            {items.map((item, index) => {
              const gross = (item.rate || 0) * (item.quantity || 1);
              let disc = 0;
              if (item.discountType === 'amount') {
                disc = Number(item.discountAmount) || 0;
              } else {
                disc = gross * ((Number(item.discountPercent) || 0) / 100);
              }
              const taxable = Math.max(0, gross - disc);
              const tax = taxable * ((Number(item.gstRate) || 0) / 100);
              const lineAmount = taxable;

              return (
                <div key={index} style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  position: 'relative'
                }}>
                  {/* Item header: number + delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: '#f1f5f9', color: '#475569',
                      fontSize: '0.78rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{index + 1}</span>
                    <button type="button" onClick={() => removeItem(index)} style={{
                      background: '#fee2e2', border: 'none', color: '#ef4444',
                      cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
                      fontSize: '0.75rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  {/* Product selector / selected product */}
                  {!item.productId ? (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>Product</label>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center',
                          border: showProductSearch === index ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          borderRadius: '8px', padding: '10px 12px',
                          backgroundColor: '#ffffff',
                          boxShadow: showProductSearch === index ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
                        }}
                        onClick={(e) => {
                          setShowProductSearch(index);
                          const input = mobileInputRefs.current[index];
                          updateDropdownCoords(input || e.currentTarget);
                          input?.focus();
                        }}
                      >
                        <Search size={16} color={showProductSearch === index ? "#2563eb" : "#94a3b8"} style={{ flexShrink: 0 }} />
                        <input
                          ref={(el) => { mobileInputRefs.current[index] = el; }}
                          type="text"
                          placeholder="Search product..."
                          value={showProductSearch === index ? productSearchTerm : ''}
                          onChange={(e) => {
                            setProductSearchTerm(e.target.value);
                            setShowProductSearch(index);
                            updateDropdownCoords(e.currentTarget);
                          }}
                          onFocus={(e) => {
                            setShowProductSearch(index);
                            updateDropdownCoords(e.currentTarget);
                          }}
                          style={{ border: 'none', outline: 'none', marginLeft: '8px', width: '100%', fontSize: '0.9rem', color: '#0f172a', backgroundColor: 'transparent' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '12px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{item.productName}</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', color: '#475569', fontWeight: 500 }}>
                              SKU: {item.sku || 'N/A'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: item.availableStock > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                              Stock: {item.availableStock} pcs
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index].productId = '';
                            setItems(newItems);
                            setShowProductSearch(index);
                            setProductSearchTerm('');
                            setTimeout(() => {
                              updateDropdownCoords(index);
                              const input = mobileInputRefs.current[index] || desktopInputRefs.current[index];
                              input?.focus();
                            }, 50);
                          }}
                          style={{
                            fontSize: '0.72rem', color: '#2563eb',
                            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                            borderRadius: '6px', padding: '4px 10px',
                            cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap'
                          }}
                        >
                          Change
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Description (optional)..."
                        value={item.description || ''}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        style={{ marginTop: '8px', width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  )}

                  {/* Qty + Rate row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Quantity</label>
                      <input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Rate (₹)</label>
                      <input
                        type="number" step="0.01"
                        value={item.rate}
                        onChange={e => handleItemChange(index, 'rate', e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  {/* Discount + GST row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>Discount</label>
                      <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                        <select
                          value={item.discountType || 'percent'}
                          onChange={e => handleItemChange(index, 'discountType', e.target.value)}
                          style={{ padding: '9px 6px', border: 'none', borderRight: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                        >
                          <option value="percent">%</option>
                          <option value="amount">₹</option>
                        </select>
                        <input
                          type="number" step="0.01"
                          value={item.discountType === 'amount' ? (item.discountAmount !== undefined && item.discountAmount !== null ? item.discountAmount : '') : (item.discountPercent !== undefined && item.discountPercent !== null ? item.discountPercent : '')}
                          onChange={e => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            if (item.discountType === 'amount') {
                              handleItemChange(index, 'discountAmount', val);
                            } else {
                              handleItemChange(index, 'discountPercent', val);
                            }
                          }}
                          style={{ width: '100%', padding: '9px 8px', border: 'none', outline: 'none', fontSize: '0.95rem', backgroundColor: '#ffffff', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>GST %</label>
                      <select
                        value={item.gstRate}
                        onChange={e => handleItemChange(index, 'gstRate', e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: '#ffffff' }}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>

                  {/* Line total */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: '10px', borderTop: '1px dashed #e2e8f0'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Taxable Amount</span>
                      {tax > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                          GST ({item.gstRate}%): +₹{tax.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>₹{lineAmount.toFixed(2)}</span>
                  </div>

                  {/* Garment matrix button */}
                  {item.productId && (
                    <button
                      type="button"
                      onClick={() => { setMatrixTargetIndex(index); setShowGarmentMatrix(true); }}
                      style={{
                        marginTop: '10px', width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '8px', borderRadius: '8px',
                        backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe',
                        color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      📦 Open Size / Color Matrix
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={addItem} 
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '6px', 
                padding: '8px 14px', border: '1px dashed #2563eb', 
                color: '#2563eb', backgroundColor: '#eff6ff', 
                borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' 
              }}
            >
              <Plus size={14} /> Add single line item
            </button>
          </div>
        </div>


        {/* BOTTOM SECTION: NOTES & DYNAMIC GST / IGST SUMMARY BREAKDOWN */}
        <div className="quotation-bottom-grid" style={{ marginTop: '36px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', paddingTop: '28px', borderTop: '1px solid #e2e8f0' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Customer Notes (Printed on PDF)</label>
              <textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Terms & Conditions</label>
              <textarea 
                value={formData.termsConditions}
                onChange={e => setFormData({...formData, termsConditions: e.target.value})}
                rows={4}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Internal Notes (Private / Not Printed)</label>
              <textarea 
                value={formData.internalNotes}
                onChange={e => setFormData({...formData, internalNotes: e.target.value})}
                placeholder="Keep confidential internal admin notes here..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* SUMMARY TOTALS BOX WITH CLEAN ALIGNMENT */}
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Summary & Calculations
              </h3>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: totals.isIntrastate ? '#059669' : '#4f46e5', backgroundColor: totals.isIntrastate ? '#ecfdf5' : '#eef2ff', padding: '2px 8px', borderRadius: '9999px', border: totals.isIntrastate ? '1px solid #a7f3d0' : '1px solid #c7d2fe' }}>
                {totals.isIntrastate ? 'Intra-State (GST)' : 'Inter-State (IGST)'}
              </span>
            </div>

            {/* TOTAL WEIGHT DISPLAY SECTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eef2ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#3730a3', fontSize: '0.84rem' }}>
                <Scale size={16} color="#4f46e5" /> Total Weight:
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#4f46e5' }}>
                {totals.totalWeight.toFixed(2)} kg
              </span>
            </div>

            {/* ROWS TABLE / KEY-VALUE LIST WITH UNIFORM ALIGNMENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Sub Total (Taxable subtotal of items after line discounts, exactly like Image 2) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '32px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Sub Total</span>
                  {totals.itemDiscount > 0 && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      (Gross: ₹{totals.grossSubtotal.toFixed(2)} | Disc: -₹{totals.itemDiscount.toFixed(2)})
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{totals.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Additional Discount Input (if applicable) */}
              {formData.additionalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 500 }}>Additional Discount</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                    - ₹{Number(formData.additionalDiscount).toFixed(2)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '34px' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Additional Discount (₹)</span>
                <div style={{ display: 'flex', alignItems: 'center', width: '130px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                  <span style={{ padding: '0 8px', fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f1f5f9', borderRight: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', height: '32px' }}>₹</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00"
                    value={formData.additionalDiscount === 0 ? '' : formData.additionalDiscount} 
                    onChange={e => setFormData({...formData, additionalDiscount: Number(e.target.value) || 0})} 
                    style={{ width: '100%', height: '32px', padding: '0 8px', textAlign: 'right', border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', backgroundColor: 'transparent' }} 
                  />
                </div>
              </div>

              {/* Tax Divider */}
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '2px 0' }} />

              {/* DYNAMIC GST / IGST METRICS MATCHING IMAGE 2 */}
              {totals.isIntrastate ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                      CGST {totals.effectiveGstRate > 0 ? `(${(totals.effectiveGstRate / 2).toFixed(1)}%)` : ''}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{totals.cgst.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                      SGST {totals.effectiveGstRate > 0 ? `(${(totals.effectiveGstRate / 2).toFixed(1)}%)` : ''}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{totals.sgst.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    IGST {totals.effectiveGstRate > 0 ? `(${Math.round(totals.effectiveGstRate)}%)` : ''}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{totals.igst.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Shipping charge (₹) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '34px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Shipping charge (₹)</span>
                  <div style={{ display: 'flex', alignItems: 'center', width: '130px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                    <span style={{ padding: '0 8px', fontSize: '0.8rem', color: '#64748b', backgroundColor: '#f1f5f9', borderRight: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', height: '32px' }}>₹</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      value={formData.shippingCharges === 0 ? '' : formData.shippingCharges} 
                      onChange={e => setFormData({...formData, shippingCharges: Number(e.target.value) || 0})} 
                      style={{ width: '100%', height: '32px', padding: '0 8px', textAlign: 'right', border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', backgroundColor: 'transparent' }} 
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShippingCalculator(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px dashed #6366f1',
                    backgroundColor: '#f5f3ff',
                    color: '#4f46e5',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Truck size={13} color="#6366f1" /> Calculate Shipping Rates
                </button>
              </div>

              {/* Rounding like Image 2 */}
              {totals.roundOff !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '26px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Rounding</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: totals.roundOff < 0 ? '#dc2626' : '#059669', fontVariantNumeric: 'tabular-nums' }}>
                    {totals.roundOff > 0 ? `+${totals.roundOff.toFixed(2)}` : totals.roundOff.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* TOTAL BLUE BOX */}
            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>Total</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{totals.finalTotal.toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#1e40af', textAlign: 'right', marginTop: '6px', fontStyle: 'italic', fontWeight: 600 }}>
                {numberToWords(totals.finalTotal)}
              </div>
            </div>

            {/* DISCOUNT & PRICING STRUCTURE (SLABS) */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Discount & Pricing Structure
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: '0', title: '0% Discount (Bonus)' },
                  { id: '1-15', title: '1 - 15% (Standard)' },
                  { id: '>15', title: 'Above 15% Discount' },
                  { id: 'credit', title: 'Credit Customer' }
                ].map((option) => {
                  const isSelected = (formData.discountSlab || '1-15') === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setFormData({ ...formData, discountSlab: option.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #059669' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="radio"
                        name="quotationFormDiscountSlab"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setFormData({ ...formData, discountSlab: option.id })}
                        style={{ accentColor: '#059669', width: '14px', height: '14px', cursor: 'pointer', margin: 0 }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#065f46' : '#334155' }}>
                        {option.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOKEN / ADVANCE PAYMENT SECTION */}
            <div style={{
              backgroundColor: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #86efac',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🪙 Token / Advance Received (₹)
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receivedAmount: totals.finalTotal })}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid #86efac', backgroundColor: '#ffffff', color: '#059669', cursor: 'pointer', fontWeight: 700 }}
                  >
                    100% Full
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receivedAmount: 0 })}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ₹0 Credit
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #86efac', borderRadius: '6px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                <span style={{ padding: '0 10px', fontSize: '0.85rem', color: '#059669', backgroundColor: '#ecfdf5', borderRight: '1px solid #86efac', display: 'flex', alignItems: 'center', height: '36px', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.receivedAmount === 0 ? '' : formData.receivedAmount}
                  onChange={e => setFormData({ ...formData, receivedAmount: Number(e.target.value) || 0 })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', textAlign: 'right', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 800, color: '#0f172a', backgroundColor: 'transparent' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', paddingTop: '4px', borderTop: '1px dashed #a7f3d0' }}>
                <span style={{ color: '#065f46', fontWeight: 600 }}>Remaining Due Balance:</span>
                <span style={{ color: Math.max(0, totals.finalTotal - (Number(formData.receivedAmount) || 0)) > 0 ? '#b45309' : '#059669', fontWeight: 800, fontSize: '0.9rem' }}>
                  ₹{Math.max(0, totals.finalTotal - (Number(formData.receivedAmount) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {showShippingCalculator && (
        <ShippingRateCalculator
          isModal={true}
          orderValue={totals.subtotal}
          initialDestinationPincode={getDestinationPincode()}
          initialWeight={totals.totalWeight}
          onClose={() => setShowShippingCalculator(false)}
          onSelectRate={(rate: any) => {
            setFormData(prev => ({ ...prev, shippingCharges: rate.charge }));
            setShowShippingCalculator(false);
          }}
        />
      )}

      {/* FLOATING PRODUCT SEARCH RESULTS DROPDOWN (AVOIDS TABLE OVERFLOW CLIPPING) */}
      {showProductSearch !== -1 && dropdownCoords && (
        <>
          {/* Transparent Backdrop to dismiss on outside click */}
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }} 
            onClick={() => {
              setShowProductSearch(-1);
              setProductSearchTerm('');
            }} 
          />

          {/* Floating Dropdown Card */}
          <div
            style={{
              position: 'fixed',
              ...(dropdownCoords.placeAbove 
                ? { bottom: `${window.innerHeight - dropdownCoords.top}px` } 
                : { top: `${dropdownCoords.top}px` }),
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
              maxHeight: '300px',
              backgroundColor: '#ffffff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 99999,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Dropdown status header */}
            <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              <span>{productSearchTerm ? `Matching "${productSearchTerm}"` : `All Products (${products.length})`}</span>
              <span>{filteredProducts.length} results</span>
            </div>

            {filteredProducts.length > 0 ? (
              filteredProducts.map((p: any) => (
                <div 
                  key={p.id} 
                  onClick={() => selectProduct(showProductSearch, p)}
                  style={{ 
                    padding: '10px 14px', 
                    borderBottom: '1px solid #f1f5f9', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    transition: 'background-color 0.12s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ flex: 1, marginRight: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', lineHeight: '1.3' }}>{p.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>
                        Art #: {p.articleNumber || p.sku || 'N/A'}
                      </span>
                      {p.category && <span>• {p.category}</span>}
                      {p.fabric && <span>• {p.fabric}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#2563eb' }}>₹{Number(p.sellingPrice || 0).toLocaleString('en-IN')}</div>
                    <div style={{ marginTop: '2px' }}>
                      <span style={{ 
                        fontSize: '0.68rem', 
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: (p.stockQuantity || 0) > 0 ? '#dcfce7' : '#fee2e2',
                        color: (p.stockQuantity || 0) > 0 ? '#15803d' : '#b91c1c',
                        display: 'inline-block'
                      }}>
                        {(p.stockQuantity || 0) > 0 ? `${p.stockQuantity} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                <Package size={28} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                No products found matching "<strong>{productSearchTerm}</strong>"
              </div>
            )}
          </div>
        </>
      )}

      {/* FLOATING CUSTOMER SEARCH DROPDOWN */}
      {showCustomerSearch && customerDropdownCoords && (
        <>
          {/* Backdrop */}
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }} 
            onClick={() => {
              setShowCustomerSearch(false);
              if (selectedCustomer && customerSearchTerm !== (selectedCustomer.businessName || selectedCustomer.companyName)) {
                setCustomerSearchTerm(selectedCustomer.businessName || selectedCustomer.companyName || '');
              } else if (!selectedCustomer) {
                setCustomerSearchTerm('');
              }
            }} 
          />

          {/* Floating Dropdown Card */}
          <div
            style={{
              position: 'fixed',
              ...(customerDropdownCoords.placeAbove 
                ? { bottom: `${window.innerHeight - customerDropdownCoords.top}px` } 
                : { top: `${customerDropdownCoords.top}px` }),
              left: `${customerDropdownCoords.left}px`,
              width: `${customerDropdownCoords.width}px`,
              maxHeight: '320px',
              backgroundColor: '#ffffff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 99999,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Action Bar / Add Customer */}
            <div 
              onClick={() => {
                setShowCustomerSearch(false);
                setShowAddCustomerModal(true);
              }}
              style={{ 
                padding: '10px 14px', 
                backgroundColor: '#eff6ff', 
                borderBottom: '1px solid #dbeafe', 
                color: '#2563eb', 
                fontWeight: 600, 
                fontSize: '0.84rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.12s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
            >
              <UserPlus size={16} /> Add New Customer
            </div>

            {/* Header info */}
            <div style={{ padding: '6px 14px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              <span>{customerSearchTerm ? `Matching "${customerSearchTerm}"` : `All Customers (${localCustomers.length})`}</span>
              <span>{filteredCustomers.length} found</span>
            </div>

            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((c: any) => {
                const isSelected = formData.customerId === c.id;
                return (
                  <div 
                    key={c.id} 
                    onClick={() => selectCustomer(c)}
                    style={{ 
                      padding: '10px 14px', 
                      borderBottom: '1px solid #f1f5f9', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {c.businessName || c.companyName}
                        {isSelected && <span style={{ fontSize: '0.68rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>Selected</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {c.contactPerson && <span>👤 {c.contactPerson}</span>}
                        {(c.mobile || c.phone) && <span>📞 {c.mobile || c.phone}</span>}
                        {c.city && <span>📍 {c.city}{c.state ? `, ${c.state}` : ''}</span>}
                        {c.gstNumber && <span style={{ fontFamily: 'monospace', backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>GST: {c.gstNumber}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                <Building size={28} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                No customer found matching "<strong>{customerSearchTerm}</strong>"
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerSearch(false);
                      setShowAddCustomerModal(true);
                    }}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + Create "{customerSearchTerm}" as New Customer
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showGarmentMatrix && (
        <GarmentMatrixModal
          products={products}
          initialProductId={matrixTargetIndex !== null && items[matrixTargetIndex] ? items[matrixTargetIndex].productId : undefined}
          initialRate={matrixTargetIndex !== null && items[matrixTargetIndex] ? items[matrixTargetIndex].rate : undefined}
          initialDescription={matrixTargetIndex !== null && items[matrixTargetIndex] ? items[matrixTargetIndex].description : undefined}
          initialGarmentMatrix={matrixTargetIndex !== null && items[matrixTargetIndex] ? items[matrixTargetIndex].garmentMatrix : undefined}
          onAddItems={(newItems) => {
            if (matrixTargetIndex !== null && matrixTargetIndex >= 0 && matrixTargetIndex < items.length) {
              setItems(prev => {
                const updated = [...prev];
                if (newItems.length === 1) {
                  const ni = newItems[0];
                  updated[matrixTargetIndex] = {
                    ...updated[matrixTargetIndex],
                    productId: ni.productId || updated[matrixTargetIndex].productId,
                    productName: ni.productName,
                    sku: ni.sku,
                    description: ni.description,
                    quantity: ni.quantity,
                    rate: ni.rate,
                    unitWeight: ni.unitWeight,
                    hsnCode: ni.hsnCode || updated[matrixTargetIndex].hsnCode,
                    garmentMatrix: ni.garmentMatrix
                  };
                } else {
                  updated.splice(matrixTargetIndex, 1, ...newItems);
                }
                return updated;
              });
            } else {
              setItems(prev => {
                const filteredPrev = prev.filter(p => p.productId || p.productName);
                return [...filteredPrev, ...newItems];
              });
            }
            setMatrixTargetIndex(null);
            setShowGarmentMatrix(false);
          }}
          onClose={() => {
            setMatrixTargetIndex(null);
            setShowGarmentMatrix(false);
          }}
        />
      )}
    </div>
  );
}
