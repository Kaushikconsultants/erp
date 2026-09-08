"use client";

import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Users, 
  Building2, 
  Package, 
  BookOpen, 
  UserPlus, 
  Link as LinkIcon, 
  Globe, 
  Loader2,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { 
  validateImportData, 
  executeBulkImport, 
  fetchGoogleSheetData, 
  ImportValidationResult 
} from '@/app/actions/importExportActions';

interface DataImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityType?: 'CUSTOMERS' | 'LEADS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS';
  onSuccess?: () => void;
}

export type EntityType = 'CUSTOMERS' | 'LEADS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS';

interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  sampleValue: string;
  aliases: string[];
}

const ENTITY_SCHEMAS: Record<EntityType, { title: string; icon: any; fields: FieldDefinition[] }> = {
  CUSTOMERS: {
    title: 'Customers Master',
    icon: Users,
    fields: [
      { key: 'businessName', label: 'Company / Business Name', required: true, sampleValue: 'Sharma Textiles Pvt Ltd', aliases: ['name', 'company', 'business', 'customer name', 'party name'] },
      { key: 'contactPerson', label: 'Contact Person', required: false, sampleValue: 'Rajesh Sharma', aliases: ['contact', 'person', 'owner'] },
      { key: 'mobile', label: 'Mobile Number', required: true, sampleValue: '9876543210', aliases: ['phone', 'whatsapp', 'contact no', 'mobile no'] },
      { key: 'email', label: 'Email Address', required: false, sampleValue: 'rajesh@sharmatex.com', aliases: ['email id', 'mail'] },
      { key: 'gstNumber', label: 'GSTIN', required: false, sampleValue: '06AAACS1234F1Z5', aliases: ['gst', 'gstin', 'gst no'] },
      { key: 'pan', label: 'PAN', required: false, sampleValue: 'AAACS1234F', aliases: ['pan no', 'pan number'] },
      { key: 'billingAddress', label: 'Billing Address', required: false, sampleValue: '124, Cloth Market, Rohtak', aliases: ['address', 'street'] },
      { key: 'city', label: 'City', required: false, sampleValue: 'Rohtak', aliases: ['district', 'town'] },
      { key: 'state', label: 'State', required: false, sampleValue: 'Haryana', aliases: ['province'] },
      { key: 'pincode', label: 'Pincode', required: false, sampleValue: '124001', aliases: ['pin', 'postal code', 'zip'] },
      { key: 'openingBalance', label: 'Opening Balance (₹)', required: false, sampleValue: '25000', aliases: ['balance', 'opening bal', 'op bal'] },
      { key: 'creditLimit', label: 'Credit Limit (₹)', required: false, sampleValue: '100000', aliases: ['credit limit', 'credit max'] },
      { key: 'creditDays', label: 'Credit Days', required: false, sampleValue: '30', aliases: ['credit period', 'payment days', 'terms'] }
    ]
  },
  LEADS: {
    title: 'Leads CRM Master',
    icon: UserPlus,
    fields: [
      { key: 'name', label: 'Lead Contact Name', required: true, sampleValue: 'Amit Kumar', aliases: ['name', 'lead name', 'contact', 'person', 'buyer'] },
      { key: 'whatsappNumber', label: 'WhatsApp / Phone Number', required: true, sampleValue: '9876543210', aliases: ['phone', 'mobile', 'whatsapp', 'contact no', 'mobile no'] },
      { key: 'shopName', label: 'Shop / Business Name', required: false, sampleValue: 'Kumar Garments', aliases: ['shop', 'store', 'firm', 'company', 'business'] },
      { key: 'status', label: 'Lead Stage', required: false, sampleValue: 'New', aliases: ['stage', 'status', 'lead stage'] },
      { key: 'city', label: 'City', required: false, sampleValue: 'Delhi', aliases: ['district', 'town'] },
      { key: 'state', label: 'State', required: false, sampleValue: 'Delhi', aliases: ['province'] }
    ]
  },
  VENDORS: {
    title: 'Vendors / Suppliers',
    icon: Building2,
    fields: [
      { key: 'companyName', label: 'Vendor Company Name', required: true, sampleValue: 'Apex Yarn Mills', aliases: ['name', 'vendor', 'supplier', 'company', 'vendor name'] },
      { key: 'contactPerson', label: 'Contact Person', required: false, sampleValue: 'Vikram Mehta', aliases: ['contact', 'person'] },
      { key: 'mobile', label: 'Mobile Number', required: false, sampleValue: '9812345678', aliases: ['phone', 'contact no', 'mobile no'] },
      { key: 'email', label: 'Email Address', required: false, sampleValue: 'orders@apexyarn.com', aliases: ['email id', 'mail'] },
      { key: 'gstNumber', label: 'GSTIN', required: false, sampleValue: '07BBBPV9876C1Z1', aliases: ['gst', 'gstin', 'gst no'] },
      { key: 'address', label: 'Address', required: false, sampleValue: 'Industrial Area Phase 2, Panipat', aliases: ['street', 'vendor address'] },
      { key: 'city', label: 'City', required: false, sampleValue: 'Panipat', aliases: ['district'] },
      { key: 'state', label: 'State', required: false, sampleValue: 'Haryana', aliases: ['province'] },
      { key: 'paymentTerms', label: 'Payment Terms', required: false, sampleValue: 'Net 30', aliases: ['terms', 'credit days'] }
    ]
  },
  PRODUCTS: {
    title: 'Products & Inventory',
    icon: Package,
    fields: [
      { key: 'name', label: 'Product Name', required: true, sampleValue: "Men's Polo T-Shirt DryFit", aliases: ['item', 'product', 'item name', 'title', 'description'] },
      { key: 'sku', label: 'SKU / Item Code', required: false, sampleValue: 'POLO-DRY-BLK-L', aliases: ['code', 'item code', 'barcode', 'item no'] },
      { key: 'category', label: 'Category', required: false, sampleValue: 'T-Shirts', aliases: ['group', 'item group', 'dept'] },
      { key: 'hsnCode', label: 'HSN Code', required: false, sampleValue: '6109', aliases: ['hsn', 'sac'] },
      { key: 'sellingPrice', label: 'Selling Price (₹)', required: true, sampleValue: '499', aliases: ['rate', 'price', 'sale price', 'unit price'] },
      { key: 'purchasePrice', label: 'Purchase / Cost Price (₹)', required: false, sampleValue: '280', aliases: ['cost', 'cost price', 'buy price'] },
      { key: 'mrp', label: 'MRP (₹)', required: false, sampleValue: '799', aliases: ['max retail price'] },
      { key: 'stockQuantity', label: 'Opening Stock Qty', required: false, sampleValue: '150', aliases: ['stock', 'opening stock', 'qty', 'quantity'] },
      { key: 'minimumStock', label: 'Min Alert Stock', required: false, sampleValue: '20', aliases: ['min stock', 'reorder level'] },
      { key: 'size', label: 'Size', required: false, sampleValue: 'L', aliases: ['dimension'] },
      { key: 'color', label: 'Color', required: false, sampleValue: 'Black', aliases: ['shade'] },
      { key: 'fabric', label: 'Fabric / Material', required: false, sampleValue: '100% Cotton Poly', aliases: ['material'] }
    ]
  },
  LEDGERS: {
    title: 'Chart of Accounts & Opening Ledgers',
    icon: BookOpen,
    fields: [
      { key: 'name', label: 'Ledger Name', required: true, sampleValue: 'HDFC Bank Current A/c', aliases: ['ledger', 'account name', 'particulars'] },
      { key: 'groupName', label: 'Account Group', required: true, sampleValue: 'Bank Accounts', aliases: ['group', 'parent group', 'account group'] },
      { key: 'nature', label: 'Nature (ASSET/LIABILITY/INCOME/EXPENSE)', required: false, sampleValue: 'ASSET', aliases: ['type', 'account type'] },
      { key: 'openingBalance', label: 'Opening Balance (₹)', required: false, sampleValue: '150000', aliases: ['op balance', 'balance', 'amount'] },
      { key: 'openingType', label: 'Balance Type (DEBIT/CREDIT)', required: false, sampleValue: 'DEBIT', aliases: ['dr/cr', 'type', 'balance type'] },
      { key: 'gstin', label: 'Party GSTIN', required: false, sampleValue: '', aliases: ['gst', 'gstin'] }
    ]
  }
};

export default function DataImportWizardModal({
  isOpen,
  onClose,
  defaultEntityType = 'CUSTOMERS',
  onSuccess
}: DataImportWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importSource, setImportSource] = useState<'FILE' | 'SHEETS'>('FILE');
  const [entityType, setEntityType] = useState<EntityType>(defaultEntityType);
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  
  // Multi-sheet Excel support
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Google Sheets state
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [fetchingSheets, setFetchingSheets] = useState(false);

  // Validation & import state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: boolean; insertedCount: number; skippedCount: number; errors: string[] } | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentSchema = ENTITY_SCHEMAS[entityType];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFeedbackError(null);
    setFile(uploadedFile);
    const fileName = uploadedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const headers = Object.keys(results.data[0] as object);
            setParsedHeaders(headers);
            setRawRows(results.data as Record<string, any>[]);
            autoMapColumns(headers, currentSchema.fields);
            setStep(2);
          } else {
            setFeedbackError("The uploaded CSV file is empty or could not be parsed.");
          }
        },
        error: (err) => {
          setFeedbackError(`Error parsing CSV file: ${err.message}`);
        }
      });
    } else {
      // Excel handling
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          processExcelSheet(wb, firstSheet);
        } catch (err: any) {
          setFeedbackError(`Error reading Excel file: ${err.message}`);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    }
  };

  const processExcelSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (data && data.length > 1) {
      const headers: string[] = (data[0] as any[]).map(h => String(h || '').trim()).filter(Boolean);
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < data.length; i++) {
        const rowArr = data[i];
        if (!rowArr || rowArr.length === 0) continue;
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = rowArr[idx] !== undefined ? rowArr[idx] : '';
        });
        rows.push(rowObj);
      }

      setParsedHeaders(headers);
      setRawRows(rows);
      autoMapColumns(headers, currentSchema.fields);
      setStep(2);
    } else {
      setFeedbackError(`Sheet "${sheetName}" appears to be empty.`);
    }
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      processExcelSheet(workbook, newSheet);
    }
  };

  const handleSyncGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setFeedbackError("Please enter a Google Sheets share link.");
      return;
    }
    setFeedbackError(null);
    setFetchingSheets(true);

    const res = await fetchGoogleSheetData(googleSheetUrl);
    setFetchingSheets(false);

    if (res.success && res.headers && res.rows) {
      setParsedHeaders(res.headers);
      setRawRows(res.rows);
      autoMapColumns(res.headers, currentSchema.fields);
      setStep(2);
    } else {
      setFeedbackError(res.error || "Failed to load Google Sheet. Ensure 'Anyone with the link can view' is enabled.");
    }
  };

  const autoMapColumns = (fileHeaders: string[], schemaFields: FieldDefinition[]) => {
    const initialMap: Record<string, string> = {};

    schemaFields.forEach(sf => {
      const matchedHeader = fileHeaders.find(fh => {
        const cleanFh = fh.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanSf = sf.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanLabel = sf.label.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cleanFh === cleanSf || cleanFh === cleanLabel) return true;
        return sf.aliases.some(alias => cleanFh === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      });

      if (matchedHeader) {
        initialMap[sf.key] = matchedHeader;
      }
    });

    setColumnMappings(initialMap);
  };

  const handleProceedToValidation = async () => {
    setFeedbackError(null);
    const mappedRows = rawRows.map(raw => {
      const transformed: Record<string, any> = {};
      Object.entries(columnMappings).forEach(([schemaKey, fileHeader]) => {
        if (fileHeader && raw[fileHeader] !== undefined) {
          transformed[schemaKey] = raw[fileHeader];
        }
      });
      return transformed;
    });

    setValidating(true);
    const res = await validateImportData(entityType, mappedRows);
    setValidating(false);

    if (res.success && res.data) {
      setValidationResult(res.data);
      setStep(3);
    } else {
      setFeedbackError(res.error || "Validation check failed.");
    }
  };

  const handleExecuteImport = async () => {
    if (!validationResult) return;
    setFeedbackError(null);

    const validRowsToImport = validationResult.previewRows
      .filter(r => r._isValid)
      .map(r => {
        const { _isValid, _errors, ...rest } = r;
        return rest;
      });

    if (validRowsToImport.length === 0) {
      setFeedbackError("No valid rows to import. Please review validation errors.");
      return;
    }

    setImporting(true);
    const res = await executeBulkImport({
      entityType,
      rows: validRowsToImport,
      skipDuplicates
    });
    setImporting(false);

    if (res.success) {
      setImportSummary({
        success: true,
        insertedCount: res.insertedCount || 0,
        skippedCount: res.skippedCount || 0,
        errors: res.errors || []
      });
      setStep(4);
      if (onSuccess) onSuccess();
    } else {
      setFeedbackError(res.error || "Bulk import failed");
    }
  };

  const downloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const fields = currentSchema.fields;
    const headerRow = fields.map(f => f.label);
    const sampleRow = fields.map(f => f.sampleValue);

    if (format === 'csv') {
      const csvContent = Papa.unparse([headerRow, sampleRow]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${entityType.toLowerCase()}_sample_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const wsData = [headerRow, sampleRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sample_Template');
      XLSX.writeFile(wb, `${entityType.toLowerCase()}_sample_template.xlsx`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #fafafa, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Upload size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Universal Data Import & Sync Engine
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Excel (.xlsx), Google Sheets, CSV, Tally & Vyapar migration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEPPER PROGRESS */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          overflowX: 'auto'
        }}>
          {[
            { num: 1, label: 'Select & Source' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Duplicate Check & Preview' },
            { num: 4, label: 'Complete' }
          ].map(s => (
            <div key={s.num} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: step === s.num ? '#4f46e5' : step > s.num ? '#10b981' : '#94a3b8',
              fontWeight: step === s.num ? 700 : 500,
              whiteSpace: 'nowrap'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: step === s.num ? '#4f46e5' : step > s.num ? '#10b981' : '#e2e8f0',
                color: step >= s.num ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* FEEDBACK ERROR BANNER */}
        {feedbackError && (
          <div style={{
            margin: '16px 24px 0',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{feedbackError}</span>
            </div>
            <button
              onClick={() => setFeedbackError(null)}
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          
          {/* STEP 1: ENTITY SELECT & SOURCE */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Module selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Select CRM / ERP Module to Import
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {(['CUSTOMERS', 'LEADS', 'PRODUCTS', 'VENDORS', 'LEDGERS'] as EntityType[]).map(et => {
                    const info = ENTITY_SCHEMAS[et];
                    const Icon = info.icon;
                    const isSelected = entityType === et;
                    return (
                      <button
                        key={et}
                        type="button"
                        onClick={() => setEntityType(et)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '12px 8px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                          backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={22} style={{ color: isSelected ? '#4f46e5' : '#64748b' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#4f46e5' : '#1e293b' }}>
                          {info.title.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source Switcher: File vs Google Sheets */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Choose Import Source
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setImportSource('FILE')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${importSource === 'FILE' ? '#4f46e5' : '#e2e8f0'}`,
                      backgroundColor: importSource === 'FILE' ? '#eef2ff' : '#ffffff',
                      color: importSource === 'FILE' ? '#4f46e5' : '#475569',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <FileSpreadsheet size={18} />
                    <span>Upload Excel (.xlsx) / CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportSource('SHEETS')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${importSource === 'SHEETS' ? '#059669' : '#e2e8f0'}`,
                      backgroundColor: importSource === 'SHEETS' ? '#ecfdf5' : '#ffffff',
                      color: importSource === 'SHEETS' ? '#059669' : '#475569',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Globe size={18} />
                    <span>Google Sheets Live Sync</span>
                  </button>
                </div>
              </div>

              {/* Sample Template Download Bar */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={20} style={{ color: '#059669' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                      Ready-to-use template for {currentSchema.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Includes pre-built sample columns and example rows
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('xlsx')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={13} /> Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('csv')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={13} /> CSV (.csv)
                  </button>
                </div>
              </div>

              {/* FILE UPLOAD MODE */}
              {importSource === 'FILE' && (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #818cf8',
                      borderRadius: '14px',
                      backgroundColor: '#fbfbfe',
                      padding: '36px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: '#e0e7ff',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px'
                    }}>
                      <Upload size={24} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#1e293b' }}>
                      Click or Drag & Drop Excel or CSV here
                    </h4>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Supports .xlsx, .xls, and .csv files from Excel, Tally Prime, Busy or Vyapar
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* GOOGLE SHEETS MODE */}
              {importSource === 'SHEETS' && (
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '14px',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#d1fae5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#065f46' }}>
                        Sync from Google Sheets URL
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#047857' }}>
                        Paste any shared Google Sheet link to pull live leads or customer records
                      </p>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
                      Google Sheets Share Link:
                    </label>
                    <input
                      type="url"
                      value={googleSheetUrl}
                      onChange={e => setGoogleSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit#gid=0"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #86efac',
                        backgroundColor: '#ffffff',
                        fontSize: '0.84rem',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                    <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#15803d' }}>
                      💡 Tip: Open your Google Sheet → click <strong>Share</strong> → set General Access to <strong>"Anyone with the link can view"</strong>.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncGoogleSheet}
                    disabled={fetchingSheets || !googleSheetUrl.trim()}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: fetchingSheets || !googleSheetUrl.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: fetchingSheets || !googleSheetUrl.trim() ? 0.7 : 1
                    }}
                  >
                    {fetchingSheets ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Fetching Live Sheet...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} /> Fetch & Map Sheet Columns
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & SHEET SELECTOR */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    Match Columns to {currentSchema.title} Fields
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Found {rawRows.length} rows. Verify that file columns map to the correct ERP fields.
                  </p>
                </div>

                {/* Multi-sheet selector if Excel workbook has multiple tabs */}
                {sheetNames.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: '#4f46e5' }} />
                    <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>Worksheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={e => handleSheetChange(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem'
                      }}
                    >
                      {sheetNames.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => autoMapColumns(parsedHeaders, currentSchema.fields)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#4f46e5',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} /> Auto-remap
                </button>
              </div>

              <div style={{
                maxHeight: '360px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '10px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>ERP Field Name</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Your Spreadsheet Column</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>First Row Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSchema.fields.map((field, idx) => {
                      const selectedHeader = columnMappings[field.key] || '';
                      const sampleVal = selectedHeader && rawRows[0] ? rawRows[0][selectedHeader] : '—';
                      return (
                        <tr key={field.key} style={{ borderBottom: idx !== currentSchema.fields.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                            {field.label}
                            {field.required && (
                              <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={selectedHeader}
                              onChange={(e) => {
                                setColumnMappings({
                                  ...columnMappings,
                                  [field.key]: e.target.value
                                });
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: `1px solid ${field.required && !selectedHeader ? '#fca5a5' : '#cbd5e1'}`,
                                backgroundColor: selectedHeader ? '#f0fdf4' : '#ffffff',
                                fontSize: '0.82rem',
                                color: '#1e293b',
                                outline: 'none'
                              }}
                            >
                              <option value="">-- Do Not Import / Skip --</option>
                              {parsedHeaders.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace' }}>
                            {String(sampleVal).slice(0, 30)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & DUPLICATE HANDLING */}
          {step === 3 && validationResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>TOTAL ROWS</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {validationResult.totalRows}
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600 }}>VALID & READY</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                    {validationResult.validCount}
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: validationResult.invalidCount > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '10px', border: `1px solid ${validationResult.invalidCount > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                  <div style={{ fontSize: '0.74rem', color: validationResult.invalidCount > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>DUPLICATES / ERRORS</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: validationResult.invalidCount > 0 ? '#dc2626' : '#64748b', marginTop: '2px' }}>
                    {validationResult.invalidCount}
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Policy */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                  />
                  <span>Automatically skip duplicate phone/mobile numbers during import</span>
                </label>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Prevents overwriting existing client contacts
                </span>
              </div>

              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                Previewing First 50 Rows:
              </div>

              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '10px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', width: '90px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Identifier / Name</th>
                      <th style={{ padding: '8px 12px' }}>Contact Info</th>
                      <th style={{ padding: '8px 12px' }}>Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.previewRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: row._isValid ? '#ffffff' : '#fef2f2' }}>
                        <td style={{ padding: '8px 12px' }}>
                          {row._isValid ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 700 }}>
                              <CheckCircle2 size={13} /> Valid
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700 }}>
                              <AlertCircle size={13} /> Error
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {row.businessName || row.companyName || row.name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>
                          {row.mobile || row.whatsappNumber || row.sku || row.groupName || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: row._isValid ? '#059669' : '#dc2626', fontSize: '0.72rem' }}>
                          {row._isValid ? 'Passed validation' : row._errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS SUMMARY */}
          {step === 4 && importSummary && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                Import Completed Successfully!
              </h3>
              <p style={{ margin: '8px 0 24px 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '460px' }}>
                Inserted <strong style={{ color: '#059669' }}>{importSummary.insertedCount}</strong> new {entityType.toLowerCase()} into your workspace database.
                {importSummary.skippedCount > 0 && ` (${importSummary.skippedCount} duplicate/invalid rows safely skipped).`}
              </p>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close & View Records
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        {step < 4 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}>
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleProceedToValidation}
                  disabled={validating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: validating ? 'not-allowed' : 'pointer',
                    opacity: validating ? 0.7 : 1
                  }}
                >
                  {validating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Checking Duplicates...
                    </>
                  ) : (
                    <>
                      Proceed to Preview <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || (validationResult?.validCount || 0) === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    opacity: importing ? 0.7 : 1
                  }}
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Importing Records...
                    </>
                  ) : (
                    `Import ${validationResult?.validCount || 0} Valid Records`
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
