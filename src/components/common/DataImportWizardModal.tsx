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
  FileText,
  Users,
  Building2,
  Package,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { validateImportData, executeBulkImport, ImportValidationResult } from '@/app/actions/importExportActions';

interface DataImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityType?: 'CUSTOMERS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS';
  onSuccess?: () => void;
}

type EntityType = 'CUSTOMERS' | 'VENDORS' | 'PRODUCTS' | 'LEDGERS';

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
  const [entityType, setEntityType] = useState<EntityType>(defaultEntityType);
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: boolean; insertedCount: number; skippedCount: number; errors: string[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentSchema = ENTITY_SCHEMAS[entityType];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

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
          }
        },
        error: (err) => {
          alert(`Error reading CSV: ${err.message}`);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
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
          }
        } catch (err: any) {
          alert(`Error reading Excel file: ${err.message}`);
        }
      };
      reader.readAsBinaryString(uploadedFile);
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
    // Transform raw rows based on column mappings
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
      alert(res.error || "Validation failed");
    }
  };

  const handleExecuteImport = async () => {
    if (!validationResult) return;

    // Filter only valid rows or all rows
    const validRowsToImport = validationResult.previewRows
      .filter(r => r._isValid)
      .map(r => {
        const { _isValid, _errors, ...rest } = r;
        return rest;
      });

    if (validRowsToImport.length === 0) {
      alert("No valid rows found to import.");
      return;
    }

    setImporting(true);
    const res = await executeBulkImport({
      entityType,
      rows: validRowsToImport,
      skipDuplicates: true
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
      alert(res.error || "Bulk import failed");
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
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '20px 24px',
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
                Universal Data Import Wizard
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Easily migrate from Excel, Tally, Busy, or Vyapar into your workspace
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
              transition: 'all 0.15s ease'
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
          fontSize: '0.8rem'
        }}>
          {[
            { num: 1, label: 'Upload File' },
            { num: 2, label: 'Map Columns' },
            { num: 3, label: 'Validate Data' },
            { num: 4, label: 'Import Results' }
          ].map(s => (
            <div key={s.num} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: step === s.num ? '#4f46e5' : step > s.num ? '#10b981' : '#94a3b8',
              fontWeight: step === s.num ? 700 : 500
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

        {/* MODAL BODY */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {/* STEP 1: ENTITY SELECT & FILE UPLOAD */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Select Module to Import
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {(['CUSTOMERS', 'PRODUCTS', 'VENDORS', 'LEDGERS'] as EntityType[]).map(et => {
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
                          gap: '8px',
                          padding: '14px 10px',
                          borderRadius: '12px',
                          border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                          backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={24} style={{ color: isSelected ? '#4f46e5' : '#64748b' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#4f46e5' : '#1e293b' }}>
                          {info.title.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Template Download Bar */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={20} style={{ color: '#059669' }} />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                      Don't have a file ready?
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Download our pre-formatted template with example rows.
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
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Download size={14} /> Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('csv')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Download size={14} /> CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #818cf8',
                  borderRadius: '14px',
                  backgroundColor: '#fbfbfe',
                  padding: '40px 20px',
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
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e7ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px'
                }}>
                  <Upload size={28} />
                </div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                  Click or Drag & Drop your spreadsheet here
                </h4>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
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

          {/* STEP 2: COLUMN MAPPING */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    Match Spreadsheet Columns to {currentSchema.title} Fields
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Found {rawRows.length} rows in "{file?.name}". Verify column mapping below:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => autoMapColumns(parsedHeaders, currentSchema.fields)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: '#4f46e5',
                    fontWeight: 600
                  }}
                >
                  <RefreshCw size={14} /> Auto-remap
                </button>
              </div>

              <div style={{
                maxHeight: '380px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '10px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>ERP Field Name</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Your File Column Header</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Sample Preview Value</th>
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

          {/* STEP 3: PRE-IMPORT VALIDATION PREVIEW */}
          {step === 3 && validationResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>TOTAL ROWS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {validationResult.totalRows}
                  </div>
                </div>
                <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 600 }}>READY TO IMPORT</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                    {validationResult.validCount}
                  </div>
                </div>
                <div style={{ padding: '14px', backgroundColor: validationResult.invalidCount > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '10px', border: `1px solid ${validationResult.invalidCount > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                  <div style={{ fontSize: '0.76rem', color: validationResult.invalidCount > 0 ? '#b91c1c' : '#64748b', fontWeight: 600 }}>INVALID / SKIPPED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: validationResult.invalidCount > 0 ? '#dc2626' : '#64748b', marginTop: '4px' }}>
                    {validationResult.invalidCount}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                Previewing First 50 Rows:
              </div>

              <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '10px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', width: '90px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Identifier / Name</th>
                      <th style={{ padding: '8px 12px' }}>Details</th>
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
                          {row.mobile || row.sku || row.groupName || '—'}
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
                {importSummary.skippedCount > 0 && ` (${importSummary.skippedCount} duplicate/invalid rows skipped).`}
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
                  fontSize: '0.88rem'
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
                    color: '#475569'
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
                  color: '#64748b'
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
                    cursor: validating ? 'not-allowed' : 'pointer',
                    opacity: validating ? 0.7 : 1
                  }}
                >
                  {validating ? 'Validating...' : 'Proceed to Validation'} <ArrowRight size={16} />
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
                    cursor: importing ? 'not-allowed' : 'pointer',
                    opacity: importing ? 0.7 : 1
                  }}
                >
                  {importing ? 'Importing Rows...' : `Import ${validationResult?.validCount || 0} Valid Records`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
