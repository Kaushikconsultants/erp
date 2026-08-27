"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Trash2, Save, Send, ArrowLeft, FileText, 
  CheckCircle2, Building, Calendar, Package, DollarSign, 
  Sparkles, Info, HelpCircle, Scale, Truck, X, ChevronDown, Check, UserPlus, MapPin
} from 'lucide-react';
import Link from 'next/link';
import { createQuotation, updateQuotationFull } from '@/app/actions/quotationActions';
import { lookupBarcode } from '@/app/actions/scannerActions';
import AddCustomerModal from '@/components/ui/AddCustomerModal';
import ShippingRateCalculator from '@/components/ui/ShippingRateCalculator';
import QuickBarcodeScannerBar from '@/components/scanner/QuickBarcodeScannerBar';
import GarmentMatrixModal from '@/components/quotations/GarmentMatrixModal';
import { getCustomerTierDiscount, calculateTieredRate } from '@/lib/pricingUtils';

import { useSearchParams } from 'next/navigation';

export default function CreateQuotationForm({ customers, products, employees, categoriesData = [], defaultQuotationNumber = 'QT-1001', initialQuotation = null }: any) {
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
    placeOfSupply: initialQuotation?.placeOfSupply || 'Haryana',
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
  const searchInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const updateCustomerDropdownCoords = () => {
    if (customerInputRef.current) {
      const rect = customerInputRef.current.getBoundingClientRect();
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

  const updateDropdownCoords = (index: number) => {
    const el = searchInputRefs.current[index];
    if (el) {
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < 280 && rect.top > 280;
      
      setDropdownCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 400)),
        width: Math.max(rect.width, 360),
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

    setFormData((prev: any) => ({
      ...prev,
      customerId: cust.id,
      customerPhone: cust.mobile || cust.phone || prev.customerPhone || '',
      customerEmail: cust.email || prev.customerEmail || '',
      customerGst: cust.gstNumber || prev.customerGst || '',
      placeOfSupply: cust.state || prev.placeOfSupply || 'Haryana',
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
      searchInputRefs.current[newIdx]?.focus();
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
      alert(`No product found matching barcode "${code}"`);
    }
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscount = 0;
    let taxTotal = 0;
    let totalWeight = 0;

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
      const tax = taxable * ((Number(item.gstRate) || 0) / 100);
      
      subtotal += gross;
      itemDiscount += disc;
      taxTotal += tax;
      totalWeight += (Number(item.unitWeight) || 0) * qty;
    });

    const isIntrastate = (formData.placeOfSupply || 'Haryana').trim().toLowerCase() === 'haryana';
    const cgst = isIntrastate ? taxTotal / 2 : 0;
    const sgst = isIntrastate ? taxTotal / 2 : 0;
    const igst = isIntrastate ? 0 : taxTotal;

    const taxableAmount = Math.max(0, subtotal - itemDiscount - (Number(formData.additionalDiscount) || 0));
    const finalTotal = taxableAmount + taxTotal + (Number(formData.shippingCharges) || 0) + (Number(formData.adjustment) || 0);

    return { subtotal, itemDiscount, taxableAmount, taxTotal, cgst, sgst, igst, isIntrastate, finalTotal, totalWeight };
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
      const payload = {
        customerId: formData.customerId,
        quotationNumber: formData.quotationNumber || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        quoteDate: formData.quoteDate,
        expiryDate: formData.expiryDate,
        salespersonId: formData.salespersonId || undefined,
        status: status || 'Draft',
        subject: formData.subject || undefined,
        billingAddress: formData.billingAddress || undefined,
        shippingAddress: (showShippingAddress ? formData.shippingAddress : formData.billingAddress) || undefined,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
        shippingCharges: Number(formData.shippingCharges) || 0,
        additionalDiscount: Number(formData.additionalDiscount) || 0,
        adjustment: Number(formData.adjustment) || 0,
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
    if (num === 0) return 'Zero Only';
    return `Rupees ${num.toLocaleString('en-IN')} Only`; 
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

              setFormData((prev: any) => ({ 
                ...prev, 
                customerId: newCustomer.id,
                customerPhone: newCustomer.mobile || newCustomer.phone || prev.customerPhone || '',
                customerEmail: newCustomer.email || prev.customerEmail || '',
                customerGst: newCustomer.gstNumber || prev.customerGst || '',
                placeOfSupply: newCustomer.state || prev.placeOfSupply || 'Haryana',
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
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, 'Draft')} 
            disabled={loading} 
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={15} /> Save Draft
          </button>
          <button 
            type="button" 
            onClick={(e) => handleSubmit(e, 'Sent')} 
            disabled={loading} 
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}
          >
            <Send size={15} /> {loading ? "Saving..." : initialQuotation ? "Update Quotation" : "Save & Send"}
          </button>
        </div>
      </div>

      {/* ─── ZOHO DIGITAL SHEET CANVAS ─── */}
      <div className="quotation-canvas-card" style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', padding: '36px 40px' }}>
        
        {/* TOP SECTION: CUSTOMER & QUOTATION META */}
        <div className="quotation-top-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', paddingBottom: '32px', borderBottom: '1px solid #e2e8f0' }}>
          
          {/* LEFT: CUSTOMER INFORMATION (EDITABLE) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0 }}>
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
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                <UserPlus size={14} /> Add New Customer
              </button>
            </div>

            {/* SEARCHABLE CUSTOMER INPUT */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  border: showCustomerSearch ? '2px solid #2563eb' : '1px solid #cbd5e1', 
                  borderRadius: '6px', 
                  padding: '8px 12px', 
                  backgroundColor: '#ffffff',
                  boxShadow: showCustomerSearch ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
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
                  placeholder="Type to search customer by name, contact, mobile, GST..." 
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
                    marginLeft: '10px', 
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

            {/* EDITABLE CUSTOMER DETAILS CARD */}
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Customer Details</span>
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
                <span style={{ fontSize: '0.75rem', backgroundColor: totals.isIntrastate ? '#dcfce7' : '#e0e7ff', color: totals.isIntrastate ? '#15803d' : '#3730a3', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {totals.isIntrastate ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={formData.customerPhone} 
                    onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="Mobile number" 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', backgroundColor: '#ffffff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email Address</label>
                  <input 
                    type="email" 
                    value={formData.customerEmail} 
                    onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                    placeholder="Email" 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>GSTIN / Tax ID</label>
                  <input 
                    type="text" 
                    value={formData.customerGst} 
                    onChange={e => setFormData({...formData, customerGst: e.target.value})}
                    placeholder="GSTIN" 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', fontFamily: 'monospace', fontWeight: 600, backgroundColor: '#ffffff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Place of Supply (State)</label>
                  <input 
                    type="text" 
                    value={formData.placeOfSupply} 
                    onChange={e => setFormData({...formData, placeOfSupply: e.target.value})}
                    placeholder="e.g. Haryana, Delhi, Punjab" 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
            </div>

            {/* ADDRESS BOXES */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: showShippingAddress ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} color="#3b82f6" />
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Billing Address</label>
                    </div>
                    {!showShippingAddress && (
                      <button 
                        type="button"
                        onClick={() => setShowShippingAddress(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <Plus size={14} /> Add Shipping Address
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={formData.billingAddress}
                    onChange={e => setFormData({...formData, billingAddress: e.target.value})}
                    rows={4}
                    style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', lineHeight: '1.5', resize: 'vertical', backgroundColor: '#f8fafc', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                    placeholder="Enter complete billing address..."
                  />
                </div>

                {showShippingAddress && (
                  <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} color="#8b5cf6" />
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Shipping Address</label>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowShippingAddress(false)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea 
                      value={formData.shippingAddress}
                      onChange={e => setFormData({...formData, shippingAddress: e.target.value})}
                      rows={4}
                      style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', lineHeight: '1.5', resize: 'vertical', backgroundColor: '#f8fafc', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                      placeholder="Enter complete shipping address..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: QUOTATION DATES & TERMS */}
          <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', margin: 0 }}>Quotation #</label>
                  <span style={{ fontSize: '0.68rem', color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #a7f3d0' }}>Auto-increment</span>
                </div>
                <input type="text" placeholder="Auto-generated (e.g. QT-1001)" value={formData.quotationNumber} onChange={e => setFormData({...formData, quotationNumber: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 600, color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Reference #</label>
                <input type="text" placeholder="PO / Ref Number" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quote Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="date" value={formData.quoteDate} onChange={e => setFormData({...formData, quoteDate: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Expiry Date</label>
                <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Payment Terms</label>
                <select value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="50% Advance">50% Advance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Salesperson</label>
                <select value={formData.salespersonId} onChange={e => setFormData({...formData, salespersonId: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}>
                  <option value="">Select Salesperson</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Subject / Headline</label>
              <input type="text" placeholder="e.g. Bulk Order Quotation for Festive Season" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }} />
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

          <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}>
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
                  const amount = taxable + tax;

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
                              onClick={() => {
                                setShowProductSearch(index);
                                updateDropdownCoords(index);
                                searchInputRefs.current[index]?.focus();
                              }}
                            >
                              <Search size={15} color={showProductSearch === index ? "#2563eb" : "#64748b"} style={{ flexShrink: 0 }} />
                              <input 
                                ref={(el) => { searchInputRefs.current[index] = el; }}
                                type="text" 
                                placeholder="Search by name, article #, SKU..." 
                                value={showProductSearch === index ? productSearchTerm : ''}
                                onChange={(e) => {
                                  setProductSearchTerm(e.target.value);
                                  setShowProductSearch(index);
                                  updateDropdownCoords(index);
                                }}
                                onFocus={() => {
                                  setShowProductSearch(index);
                                  updateDropdownCoords(index);
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
                                    updateDropdownCoords(index);
                                    searchInputRefs.current[index]?.focus();
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
                                    searchInputRefs.current[index]?.focus();
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
                            value={item.discountType === 'amount' ? (item.discountAmount || 0) : (item.discountPercent || 0)} 
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
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

          {/* SUMMARY TOTALS BOX WITH CGST / SGST / IGST BREAKDOWN */}
          <div style={{ backgroundColor: '#f8fafc', padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 14px 0', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Summary & Calculations
            </h3>

            {/* TOTAL WEIGHT DISPLAY SECTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.85rem', backgroundColor: '#eef2ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#3730a3' }}>
                <Scale size={16} color="#4f46e5" /> Total Weight:
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#4f46e5' }}>
                {totals.totalWeight.toFixed(2)} kg
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', color: '#475569' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{totals.subtotal.toFixed(2)}</span>
            </div>

            {totals.itemDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', color: '#dc2626' }}>
                <span>Line Discounts</span>
                <span>- ₹{totals.itemDiscount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem', alignItems: 'center' }}>
              <span style={{ color: '#475569' }}>Additional Discount (₹)</span>
              <input type="number" step="0.01" value={formData.additionalDiscount} onChange={e => setFormData({...formData, additionalDiscount: Number(e.target.value)})} style={{ width: '80px', padding: '4px 6px', textAlign: 'right', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Shipping / Freight (₹)</span>
                <input type="number" step="0.01" value={formData.shippingCharges} onChange={e => setFormData({...formData, shippingCharges: Number(e.target.value)})} style={{ width: '85px', padding: '4px 6px', textAlign: 'right', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }} />
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
                  border: '1px solid #6366f1',
                  backgroundColor: '#eef2ff',
                  color: '#4f46e5',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <Truck size={14} color="#4f46e5" /> Calculate Shipping via Shipmozo
              </button>
            </div>

            {/* DYNAMIC GST / IGST METRICS */}
            {totals.isIntrastate ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem', color: '#475569' }}>
                  <span>CGST (Central Tax)</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.82rem', color: '#475569', borderBottom: '1px dashed #cbd5e1', paddingBottom: '14px' }}>
                  <span>SGST (State Tax)</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{totals.sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.85rem', color: '#475569', borderBottom: '1px dashed #cbd5e1', paddingBottom: '14px' }}>
                <span>IGST (Integrated Tax)</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{totals.igst.toFixed(2)}</span>
              </div>
            )}
            
            <div style={{ backgroundColor: '#eff6ff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>Grand Total</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>₹{totals.finalTotal.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6', textAlign: 'right', marginTop: '4px', fontStyle: 'italic', fontWeight: 500 }}>
                {numberToWords(Math.round(totals.finalTotal))}
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
              <UserPlus size={16} /> + Add New Customer
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
