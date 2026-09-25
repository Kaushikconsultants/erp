"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import DatePicker from "@/components/ui/DatePicker";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import { 
  submitExpense, 
  updateExpense, 
  deleteExpense, 
  approveExpense, 
  rejectExpense, 
  markExpensePaid,
  ParsedExpense 
} from "@/app/actions/expenseActions";
import { 
  Receipt, 
  Search, 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Wallet, 
  ChevronDown,
  UploadCloud,
  FileText,
  Eye,
  Car,
  DollarSign,
  FileCheck
} from "lucide-react";
import "@/components/ui/modal.css";
import "./expenses.css";

// Standard Zoho Books Indian States list
const INDIAN_STATES = [
  { code: "HR", name: "Haryana" },
  { code: "DL", name: "Delhi" },
  { code: "PB", name: "Punjab" },
  { code: "CH", name: "Chandigarh" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "RJ", name: "Rajasthan" },
  { code: "MH", name: "Maharashtra" },
  { code: "GJ", name: "Gujarat" },
  { code: "KA", name: "Karnataka" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "WB", name: "West Bengal" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "BR", name: "Bihar" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "JK", name: "Jammu & Kashmir" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "OD", name: "Odisha" },
  { code: "UK", name: "Uttarakhand" },
  { code: "AS", name: "Assam" }
];

// Standard Zoho Books Grouped Expense Accounts
const DEFAULT_EXPENSE_ACCOUNTS = {
  "Cost Of Goods Sold": [
    "Cost of Goods Sold",
    "Job Costing",
    "Labor",
    "Materials",
    "Subcontractor",
    "Freight & Shipping",
    "Packaging & Raw Materials",
    "Direct Factory Expenses",
    "Inward Logistics"
  ],
  "Expense": [
    "Advertising & Marketing",
    "Automobile Expense",
    "Bad Debt",
    "Bank Fees & Charges",
    "Consultancy & Professional Fees",
    "Depreciation Expense",
    "Dues & Subscriptions",
    "Electricity & Utilities",
    "Entertainment",
    "Fuel / Petrol / Diesel",
    "Insurance",
    "IT & Internet Expenses",
    "Janitorial & Cleaning",
    "Meals & Entertainment",
    "Office Supplies",
    "Postage & Courier",
    "Printing & Stationery",
    "Rent Expense",
    "Repair & Maintenance",
    "Salaries & Wages",
    "Staff Welfare",
    "Telephone & Mobile Expenses",
    "Travel Expense",
    "Warehouse Storage",
    "Other Expenses"
  ]
};

const PAID_THROUGH_ACCOUNTS = [
  "Petty Cash",
  "Undeposited Funds",
  "Cash in Hand",
  "ICICI Bank Current A/c",
  "HDFC Bank Current A/c",
  "State Bank of India",
  "Axis Bank A/c",
  "Company Credit Card",
  "UPI / QR Payment",
  "Director / Partner Capital A/c"
];

const GST_TREATMENTS = [
  "Registered Business - Regular",
  "Registered Business - Composition",
  "Unregistered Business",
  "Consumer",
  "Overseas / Import",
  "Special Economic Zone (SEZ)",
  "Deemed Export"
];

const TAX_RATES = [
  { label: "Select a Tax", rate: 0 },
  { label: "Non-Taxable / Exempt (0%)", rate: 0 },
  { label: "GST 5% [2.5% CGST + 2.5% SGST / 5% IGST]", rate: 5 },
  { label: "GST 12% [6% CGST + 6% SGST / 12% IGST]", rate: 12 },
  { label: "GST 18% [9% CGST + 9% SGST / 18% IGST]", rate: 18 },
  { label: "GST 28% [14% CGST + 14% SGST / 28% IGST]", rate: 28 },
  { label: "Nil Rated (0%)", rate: 0 },
  { label: "Non-GST Supply", rate: 0 }
];

const STATUS_BADGES: Record<string, { bg: string; color: string; border: string }> = {
  Pending: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
  Approved: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  Paid: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
};

interface ExpensesClientProps {
  initialExpenses: ParsedExpense[];
  isAdmin: boolean;
  currentUserId?: string;
  vendors?: Array<{ id: string; companyName: string; contactPerson?: string; gstNumber?: string; state?: string }>;
  customers?: Array<{ id: string; businessName: string; contactPerson?: string; state?: string }>;
  companyState?: string;
  employees?: Array<{ id: string; user?: { name?: string | null; email?: string | null } }>;
}

export default function ExpensesClient({
  initialExpenses,
  isAdmin,
  currentUserId,
  vendors = [],
  customers = [],
  companyState = "Haryana",
  employees = []
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<ParsedExpense[]>(initialExpenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal & Form States
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"expense" | "mileage">("expense");
  const [editingExpense, setEditingExpense] = useState<ParsedExpense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ParsedExpense | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Custom Accounts State
  const [customAccounts, setCustomAccounts] = useState<{ "Cost Of Goods Sold": string[]; "Expense": string[] }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crm_custom_expense_accounts");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_EXPENSE_ACCOUNTS;
  });

  // Account Dropdown Search & New Account Popover
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCategory, setNewAccountCategory] = useState<"Cost Of Goods Sold" | "Expense">("Expense");

  // Form Fields State
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedAccount, setSelectedAccount] = useState<string>("Cost of Goods Sold");
  const [selectedAccountCategory, setSelectedAccountCategory] = useState<string>("Cost Of Goods Sold");
  const [amount, setAmount] = useState<string>("");
  const [paidThrough, setPaidThrough] = useState<string>("ICICI Bank Current A/c");
  const [expenseType, setExpenseType] = useState<"Goods" | "Services" | "Capital Expenditure">("Services");
  const [sacCode, setSacCode] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [vendorName, setVendorName] = useState<string>("");
  const [gstTreatment, setGstTreatment] = useState<string>("Registered Business - Regular");
  const [sourceOfSupply, setSourceOfSupply] = useState<string>(companyState || "Haryana");
  const [destinationOfSupply, setDestinationOfSupply] = useState<string>(companyState || "Haryana");
  const [reverseCharge, setReverseCharge] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [isBillable, setIsBillable] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);

  // Mileage Specific Fields
  const [mileageVehicle, setMileageVehicle] = useState<"Car" | "Motorbike" | "Commercial">("Car");
  const [mileageDistance, setMileageDistance] = useState<string>("");
  const [mileageRate, setMileageRate] = useState<string>("10");
  const [mileageFrom, setMileageFrom] = useState<string>("");
  const [mileageTo, setMileageTo] = useState<string>("");

  // Drag and Drop Upload State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update mileage calculated amount
  useEffect(() => {
    if (activeTab === "mileage") {
      const dist = parseFloat(mileageDistance) || 0;
      const rate = parseFloat(mileageRate) || 0;
      if (dist > 0 && rate > 0) {
        setAmount((dist * rate).toFixed(2));
      }
    }
  }, [mileageDistance, mileageRate, activeTab]);

  // Handle vehicle change for mileage rate
  const handleVehicleChange = (v: "Car" | "Motorbike" | "Commercial") => {
    setMileageVehicle(v);
    if (v === "Car") setMileageRate("10");
    else if (v === "Motorbike") setMileageRate("5");
    else if (v === "Commercial") setMileageRate("15");
  };

  // Tax calculations
  const parsedAmount = parseFloat(amount) || 0;
  const isInterstate = sourceOfSupply !== destinationOfSupply;
  
  let calculatedTaxAmount = 0;
  let netSubtotal = parsedAmount;
  let grossTotal = parsedAmount;

  if (taxRate > 0 && parsedAmount > 0) {
    if (taxInclusive) {
      netSubtotal = parsedAmount / (1 + taxRate / 100);
      calculatedTaxAmount = parsedAmount - netSubtotal;
      grossTotal = parsedAmount;
    } else {
      netSubtotal = parsedAmount;
      calculatedTaxAmount = (parsedAmount * taxRate) / 100;
      grossTotal = netSubtotal + calculatedTaxAmount;
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setError("");
    setActiveTab("expense");
    setFormDate(new Date().toISOString().split("T")[0]);
    setSelectedAccount("Cost of Goods Sold");
    setSelectedAccountCategory("Cost Of Goods Sold");
    setAmount("");
    setPaidThrough("ICICI Bank Current A/c");
    setExpenseType("Services");
    setSacCode("");
    setVendorId("");
    setVendorName("");
    setGstTreatment("Registered Business - Regular");
    setSourceOfSupply(companyState || "Haryana");
    setDestinationOfSupply(companyState || "Haryana");
    setReverseCharge(false);
    setTaxRate(18);
    setTaxInclusive(false);
    setReferenceNumber("");
    setCustomerId("");
    setCustomerName("");
    setIsBillable(false);
    setNotes("");
    setReceiptUrl(null);
    setReceiptFileName(null);
    setMileageDistance("");
    setMileageFrom("");
    setMileageTo("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp: ParsedExpense) => {
    setEditingExpense(exp);
    setError("");
    setActiveTab(exp.details?.mileageData ? "mileage" : "expense");
    setFormDate(new Date(exp.date).toISOString().split("T")[0]);
    setSelectedAccount(exp.details?.account || exp.category || "Cost of Goods Sold");
    setSelectedAccountCategory(exp.details?.accountCategory || "Cost Of Goods Sold");
    setAmount(String(exp.amount || ""));
    setPaidThrough(exp.details?.paidThrough || "ICICI Bank Current A/c");
    setExpenseType(exp.details?.expenseType || "Services");
    setSacCode(exp.details?.sacCode || "");
    setVendorId(exp.details?.vendorId || "");
    setVendorName(exp.details?.vendorName || "");
    setGstTreatment(exp.details?.gstTreatment || "Registered Business - Regular");
    setSourceOfSupply(exp.details?.sourceOfSupply || companyState || "Haryana");
    setDestinationOfSupply(exp.details?.destinationOfSupply || companyState || "Haryana");
    setReverseCharge(!!exp.details?.reverseCharge);
    setTaxRate(exp.details?.taxRate !== undefined ? exp.details.taxRate : 18);
    setTaxInclusive(!!exp.details?.taxInclusive);
    setReferenceNumber(exp.details?.referenceNumber || "");
    setCustomerId(exp.details?.customerId || "");
    setCustomerName(exp.details?.customerName || "");
    setIsBillable(!!exp.details?.isBillable);
    setNotes(exp.details?.notes || exp.description || "");
    setReceiptUrl(exp.receiptUrl || null);
    setReceiptFileName(exp.receiptUrl ? "Uploaded Receipt" : null);

    if (exp.details?.mileageData) {
      setMileageVehicle((exp.details.mileageData.vehicleType as any) || "Car");
      setMileageDistance(String(exp.details.mileageData.distance || ""));
      setMileageRate(String(exp.details.mileageData.ratePerKm || "10"));
      setMileageFrom(exp.details.mileageData.fromLocation || "");
      setMileageTo(exp.details.mileageData.toLocation || "");
    }
    setModalOpen(true);
  };

  // Handle Receipt Upload via Base64
  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please upload a smaller receipt.");
      return;
    }
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle Add New Custom Account
  const handleSaveNewAccount = () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) return;

    setCustomAccounts(prev => {
      const updated = {
        ...prev,
        [newAccountCategory]: prev[newAccountCategory].includes(trimmed)
          ? prev[newAccountCategory]
          : [...prev[newAccountCategory], trimmed]
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("crm_custom_expense_accounts", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setSelectedAccount(trimmed);
    setSelectedAccountCategory(newAccountCategory);
    setNewAccountName("");
    setShowNewAccountModal(false);
    setAccountDropdownOpen(false);
  };

  // Handle Form Submission (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError("Please select an Expense Account.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.append("account", selectedAccount);
    fd.append("accountCategory", selectedAccountCategory);
    fd.append("amount", amount);
    fd.append("date", formDate);
    fd.append("paidThrough", paidThrough);
    fd.append("expenseType", expenseType);
    fd.append("sacCode", sacCode);
    fd.append("vendorId", vendorId);
    fd.append("vendorName", vendorName);
    fd.append("gstTreatment", gstTreatment);
    fd.append("sourceOfSupply", sourceOfSupply);
    fd.append("destinationOfSupply", destinationOfSupply);
    fd.append("reverseCharge", String(reverseCharge));
    fd.append("taxRate", String(taxRate));
    fd.append("taxAmount", String(calculatedTaxAmount));
    fd.append("taxInclusive", String(taxInclusive));
    fd.append("referenceNumber", referenceNumber);
    fd.append("customerId", customerId);
    fd.append("customerName", customerName);
    fd.append("isBillable", String(isBillable));
    fd.append("notes", notes);
    if (receiptUrl) {
      fd.append("receiptUrl", receiptUrl);
    }

    if (activeTab === "mileage") {
      fd.append("mileageData", JSON.stringify({
        vehicleType: mileageVehicle,
        distance: parseFloat(mileageDistance) || 0,
        ratePerKm: parseFloat(mileageRate) || 0,
        fromLocation: mileageFrom,
        toLocation: mileageTo
      }));
    }

    let res: any;
    if (editingExpense) {
      res = await updateExpense(editingExpense.id, fd);
    } else {
      res = await submitExpense(fd);
    }

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setModalOpen(false);
      window.location.reload();
    }
  };

  // Handle Delete
  const handleDelete = async (exp: ParsedExpense) => {
    if (!confirm(`Are you sure you want to delete expense claim ${exp.expenseNumber}?`)) return;

    setActionLoadingId(exp.id);
    const res = await deleteExpense(exp.id);
    setActionLoadingId(null);
    if (res.error) alert(res.error);
    else window.location.reload();
  };

  // Handle Status Action (Approve / Reject / Settle)
  const handleStatusAction = async (fn: (id: string) => Promise<any>, id: string) => {
    setActionLoadingId(id);
    const res = await fn(id);
    setActionLoadingId(null);
    if (res.error) alert(res.error);
    else window.location.reload();
  };

  // KPI calculations
  const totalPending = expenses.filter(e => e.status === "Pending").reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
  const totalPaid = expenses.filter(e => e.status === "Paid").reduce((s, e) => s + e.amount, 0);
  const totalExpenseValue = expenses.reduce((s, e) => s + e.amount, 0);

  // Filtered List
  const filteredExpenses = expenses.filter(exp => {
    if (filterStatus !== "All" && exp.status !== filterStatus) return false;
    if (filterCategory !== "All" && (exp.details?.accountCategory !== filterCategory && exp.category !== filterCategory)) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const num = (exp.expenseNumber || "").toLowerCase();
    const acc = (exp.details?.account || exp.category || "").toLowerCase();
    const ven = (exp.details?.vendorName || "").toLowerCase();
    const ref = (exp.details?.referenceNumber || "").toLowerCase();
    const desc = (exp.details?.notes || exp.description || "").toLowerCase();
    const emp = (exp.employee?.user?.name || "").toLowerCase();
    const amt = exp.amount.toString();

    return num.includes(q) || acc.includes(q) || ven.includes(q) || ref.includes(q) || desc.includes(q) || emp.includes(q) || amt.includes(q);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterCategory, pageSize]);

  const paginatedExpenses = useMemo(() => {
    return paginate(filteredExpenses, currentPage, pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  const formatCurrency = (amt: number) => {
    return "₹" + (amt || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="expenses-container">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="expenses-header">
        <div className="expenses-header-left">
          <div className="expenses-header-icon">
            <Receipt size={22} />
          </div>
          <div>
            <h1 className="expenses-header-title">
              Expenses & Claims
            </h1>
            <p className="expenses-header-desc">
              Zoho Books integrated expense accounts, GST input tax credits, mileage tracking, and receipt archives.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="primary-btn"
          >
            <Plus size={16} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI METRIC STATS ─── */}
      <div className="expenses-kpi-grid">
        {/* Total Expenses */}
        <div className="expenses-kpi-card recorded">
          <div className="expenses-kpi-header">
            <span className="expenses-kpi-label">Total Recorded</span>
            <div className="expenses-kpi-icon-wrap" style={{ backgroundColor: "#eef2ff", color: "#4f46e5" }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="expenses-kpi-value">{formatCurrency(totalExpenseValue)}</div>
          <div className="expenses-kpi-sub">{expenses.length} claims registered</div>
        </div>

        {/* Pending Approval */}
        <div className="expenses-kpi-card pending">
          <div className="expenses-kpi-header">
            <span className="expenses-kpi-label">Pending Approval</span>
            <div className="expenses-kpi-icon-wrap" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="expenses-kpi-value" style={{ color: "#d97706" }}>{formatCurrency(totalPending)}</div>
          <div className="expenses-kpi-sub">
            {expenses.filter(e => e.status === "Pending").length} pending claims
          </div>
        </div>

        {/* Approved (Unpaid) */}
        <div className="expenses-kpi-card approved">
          <div className="expenses-kpi-header">
            <span className="expenses-kpi-label">Approved (Unsettled)</span>
            <div className="expenses-kpi-icon-wrap" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="expenses-kpi-value" style={{ color: "#2563eb" }}>{formatCurrency(totalApproved)}</div>
          <div className="expenses-kpi-sub">
            {expenses.filter(e => e.status === "Approved").length} ready for payout
          </div>
        </div>

        {/* Settled / Paid */}
        <div className="expenses-kpi-card settled">
          <div className="expenses-kpi-header">
            <span className="expenses-kpi-label">Settled / Paid</span>
            <div className="expenses-kpi-icon-wrap" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
              <Wallet size={16} />
            </div>
          </div>
          <div className="expenses-kpi-value" style={{ color: "#16a34a" }}>{formatCurrency(totalPaid)}</div>
          <div className="expenses-kpi-sub">
            {expenses.filter(e => e.status === "Paid").length} reimbursed
          </div>
        </div>
      </div>

      {/* ─── 3. FILTER BAR ─── */}
      <div className="expenses-toolbar">
        <div className="expenses-toolbar-row1">
          <div className="expenses-search-wrap">
            <Search size={15} className="expenses-search-icon" />
            <input
              type="text"
              placeholder="Search by account, vendor, ref #, claim #..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="expenses-search-input"
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="expenses-select"
          >
            <option value="All">All Account Categories</option>
            <option value="Cost Of Goods Sold">Cost Of Goods Sold</option>
            <option value="Expense">Operating Expenses</option>
          </select>

          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
            Showing <strong>{filteredExpenses.length}</strong> of {expenses.length} records
          </div>
        </div>

        {/* Horizontal Status Chips Bar */}
        <div className="expenses-status-chips-bar">
          {[
            { key: "All", label: "All Claims", count: expenses.length },
            { key: "Pending", label: "Pending Approval", count: expenses.filter(e => e.status === "Pending").length },
            { key: "Approved", label: "Approved", count: expenses.filter(e => e.status === "Approved").length },
            { key: "Paid", label: "Settled / Paid", count: expenses.filter(e => e.status === "Paid").length },
            { key: "Rejected", label: "Rejected", count: expenses.filter(e => e.status === "Rejected").length },
          ].map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilterStatus(s.key)}
              className={`expenses-status-chip ${filterStatus === s.key ? "active" : ""}`}
            >
              <span>{s.label}</span>
              <span className="expenses-chip-count">{s.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. DESKTOP TABLE VIEW (> 768px) ─── */}
      <div className="expenses-desktop-table">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 16px" }}>Date</th>
                <th style={{ padding: "12px 16px" }}>Expense #</th>
                <th style={{ padding: "12px 16px" }}>Expense Account</th>
                <th style={{ padding: "12px 16px" }}>Vendor / Payee</th>
                <th style={{ padding: "12px 16px" }}>Paid Through</th>
                <th style={{ padding: "12px 16px" }}>GST / Tax</th>
                <th style={{ padding: "12px 16px" }}>Amount</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.map((exp, idx) => {
                const bStyle = STATUS_BADGES[exp.status] || STATUS_BADGES.Pending;
                const isCOGS = exp.details?.accountCategory === "Cost Of Goods Sold";
                return (
                  <tr 
                    key={exp.id} 
                    style={{ 
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc"
                    }}
                  >
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "#334155" }}>
                      {new Date(exp.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{exp.expenseNumber}</span>
                        {exp.receiptUrl && (
                          <span 
                            title="Receipt attached"
                            onClick={() => setViewingExpense(exp)}
                            style={{ cursor: "pointer", color: "#2563eb", display: "inline-flex" }}
                          >
                            <Receipt size={14} />
                          </span>
                        )}
                      </div>
                      {exp.details?.referenceNumber && (
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                          Ref: {exp.details.referenceNumber}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>
                        {exp.details?.account || exp.category}
                      </div>
                      <span style={{ 
                        fontSize: "0.68rem", 
                        padding: "1px 6px", 
                        borderRadius: "4px", 
                        backgroundColor: isCOGS ? "#e0e7ff" : "#f1f5f9", 
                        color: isCOGS ? "#4338ca" : "#475569",
                        fontWeight: 600
                      }}>
                        {exp.details?.accountCategory || "Expense"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, color: "#334155" }}>
                        {exp.details?.vendorName || "—"}
                      </div>
                      {exp.details?.isBillable && (
                        <span style={{ fontSize: "0.68rem", color: "#059669", backgroundColor: "#ecfdf5", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>
                          Billable
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", color: "#475569", fontSize: "0.8rem" }}>
                      {exp.details?.paidThrough || "Petty Cash"}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {exp.details?.taxRate ? (
                        <div>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{exp.details.taxRate}%</span>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            {exp.details.taxInclusive ? "Tax Incl." : "Tax Excl."}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Exempt</span>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                      {formatCurrency(exp.amount)}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 650,
                        backgroundColor: bStyle.bg,
                        color: bStyle.color,
                        border: `1px solid ${bStyle.border}`
                      }}>
                        {exp.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setViewingExpense(exp)}
                          style={{
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            color: "#475569",
                            cursor: "pointer"
                          }}
                          title="View Details & Receipt"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #c7d2fe",
                            backgroundColor: "#eef2ff",
                            color: "#4f46e5",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600
                          }}
                          title="Edit Claim"
                        >
                          <Edit3 size={12} /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(exp)}
                          disabled={actionLoadingId === exp.id}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            opacity: actionLoadingId === exp.id ? 0.5 : 1
                          }}
                          title="Delete Claim"
                        >
                          <Trash2 size={12} /> Delete
                        </button>

                        {isAdmin && exp.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(approveExpense, exp.id)}
                            disabled={actionLoadingId === exp.id}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "none",
                              backgroundColor: "#4f46e5",
                              color: "#ffffff",
                              fontWeight: 600,
                              fontSize: "0.72rem",
                              cursor: "pointer"
                            }}
                          >
                            Approve
                          </button>
                        )}

                        {isAdmin && exp.status === "Approved" && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(markExpensePaid, exp.id)}
                            disabled={actionLoadingId === exp.id}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "none",
                              backgroundColor: "#16a34a",
                              color: "#ffffff",
                              fontWeight: 600,
                              fontSize: "0.72rem",
                              cursor: "pointer"
                            }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    <Receipt size={30} style={{ color: "#cbd5e1", marginBottom: "6px" }} />
                    <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.85rem" }}>No expense records found</div>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem" }}>
                      Click <strong>"Record Expense"</strong> to log your first business expense.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredExpenses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="expenses"
        />
      </div>

      {/* ─── 5. MOBILE EXPENSE CARDS FEED (<= 768px) ─── */}
      <div className="expenses-mobile-feed">
        {filteredExpenses.length === 0 ? (
          <div className="exp-empty-state">
            <Receipt size={36} style={{ color: "#cbd5e1", marginBottom: "10px" }} />
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>No expense records found</div>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Click <strong>"Record Expense"</strong> to log your first business expense.
            </p>
          </div>
        ) : (
          paginatedExpenses.map(exp => {
            const bStyle = STATUS_BADGES[exp.status] || STATUS_BADGES.Pending;
            const isCOGS = exp.details?.accountCategory === "Cost Of Goods Sold";
            const mileage = exp.details?.mileageData;

            return (
              <div key={exp.id} className="expense-mobile-card">
                {/* Header: Expense # & Status */}
                <div className="exp-card-header">
                  <div className="exp-card-num-group">
                    <span className="exp-card-num">{exp.expenseNumber}</span>
                    {exp.receiptUrl && (
                      <span
                        title="Receipt attached"
                        onClick={() => setViewingExpense(exp)}
                        style={{ cursor: "pointer", color: "#2563eb", display: "inline-flex" }}
                      >
                        <Receipt size={14} />
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      className="exp-status-pill"
                      style={{
                        backgroundColor: bStyle.bg,
                        color: bStyle.color,
                        border: `1px solid ${bStyle.border}`
                      }}
                    >
                      {exp.status}
                    </span>
                    <span className="exp-card-date">
                      {new Date(exp.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>

                {/* Body: Account Name & Tags */}
                <div className="exp-card-body">
                  <div className="exp-account-title">
                    {exp.details?.account || exp.category}
                  </div>

                  <div className="exp-tags-row">
                    <span
                      className="exp-category-tag"
                      style={{
                        backgroundColor: isCOGS ? "#e0e7ff" : "#f1f5f9",
                        color: isCOGS ? "#4338ca" : "#475569"
                      }}
                    >
                      {exp.details?.accountCategory || "Expense"}
                    </span>

                    {exp.details?.vendorName && (
                      <span className="exp-vendor-name">
                        • {exp.details.vendorName}
                      </span>
                    )}

                    {exp.details?.isBillable && (
                      <span className="exp-billable-tag">Billable</span>
                    )}

                    {exp.details?.referenceNumber && (
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        (Ref: {exp.details.referenceNumber})
                      </span>
                    )}
                  </div>

                  {mileage && (
                    <div className="exp-mileage-badge">
                      <Car size={12} color="#4f46e5" />
                      <span>{mileage.vehicleType || "Car"} • {mileage.distance} km @ ₹{mileage.ratePerKm}/km</span>
                      {mileage.fromLocation && mileage.toLocation && (
                        <span style={{ color: "#64748b" }}>({mileage.fromLocation} → {mileage.toLocation})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Breakdown Box */}
                <div className="exp-fin-box">
                  <div>
                    <div className="exp-fin-amount">{formatCurrency(exp.amount)}</div>
                    <div className="exp-fin-sub">{exp.details?.paidThrough || "Petty Cash"}</div>
                  </div>

                  <div className="exp-fin-tax">
                    {exp.details?.taxRate ? (
                      <>
                        <div className="exp-tax-rate">{exp.details.taxRate}% GST</div>
                        <div>{exp.details.taxInclusive ? "Tax Incl." : "Tax Excl."}</div>
                      </>
                    ) : (
                      <div style={{ color: "#94a3b8" }}>Exempt Tax</div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="exp-card-actions">
                  <div className="exp-action-group">
                    <button
                      type="button"
                      onClick={() => setViewingExpense(exp)}
                      className="exp-btn-action exp-btn-view"
                      title="View Details & Receipt"
                    >
                      <Eye size={13} /> Details
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(exp)}
                      className="exp-btn-action exp-btn-edit"
                      title="Edit Claim"
                    >
                      <Edit3 size={12} /> Edit
                    </button>

                    {isAdmin && exp.status === "Pending" && (
                      <button
                        type="button"
                        onClick={() => handleStatusAction(approveExpense, exp.id)}
                        disabled={actionLoadingId === exp.id}
                        className="exp-btn-action exp-btn-approve"
                      >
                        Approve
                      </button>
                    )}

                    {isAdmin && exp.status === "Approved" && (
                      <button
                        type="button"
                        onClick={() => handleStatusAction(markExpensePaid, exp.id)}
                        disabled={actionLoadingId === exp.id}
                        className="exp-btn-action exp-btn-paid"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(exp)}
                    disabled={actionLoadingId === exp.id}
                    className="exp-btn-delete"
                    title="Delete Claim"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {filteredExpenses.length > 0 && (
          <div className="expenses-mobile-pagination">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredExpenses.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="expenses"
            />
          </div>
        )}
      </div>

      {/* ─── 5. FULLY REDESIGNED RECORD EXPENSE MODAL (APP THEME MATCHED) ─── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div 
            className="modal-content animate-in" 
            style={{ 
              maxWidth: "1060px", 
              backgroundColor: "#ffffff", 
              borderRadius: "14px", 
              border: "1px solid #e2e8f0", 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" 
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              borderRadius: "14px 14px 0 0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Clean Segmented Tab Switcher */}
                <div style={{
                  display: "inline-flex",
                  gap: "3px",
                  backgroundColor: "#e2e8f0",
                  padding: "3px",
                  borderRadius: "8px"
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab("expense")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: activeTab === "expense" ? "#4f46e5" : "transparent",
                      color: activeTab === "expense" ? "#ffffff" : "#475569",
                      boxShadow: activeTab === "expense" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    Record Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("mileage")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: activeTab === "mileage" ? "#4f46e5" : "transparent",
                      color: activeTab === "mileage" ? "#ffffff" : "#475569",
                      boxShadow: activeTab === "mileage" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    Record Mileage
                  </button>
                </div>

                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
                  {editingExpense ? `Editing Claim #${editingExpense.expenseNumber}` : "New Expense Entry"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "1.3rem",
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ maxHeight: "82vh", overflowY: "auto", padding: "22px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: "24px" }}>
                
                {/* LEFT COLUMN: FORM FIELDS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  
                  {/* Row 1: Date & Expense Account */}
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Date <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <DatePicker
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc",
                          color: "#0f172a"
                        }}
                      />
                    </div>

                    {/* Searchable Expense Account Dropdown */}
                    <div style={{ position: "relative" }} ref={accountDropdownRef}>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Expense Account <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div
                        onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: accountDropdownOpen ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                          boxShadow: accountDropdownOpen ? "0 0 0 3px rgba(79, 70, 229, 0.12)" : "none",
                          fontSize: "0.84rem",
                          backgroundColor: "#f8fafc",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          userSelect: "none"
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                          {selectedAccount || "Select an account"}
                        </span>
                        <ChevronDown size={15} color="#64748b" />
                      </div>

                      {/* Dropdown Options Box */}
                      {accountDropdownOpen && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                          zIndex: 1000,
                          marginTop: "4px",
                          overflow: "hidden"
                        }}>
                          {/* Search Box */}
                          <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#f8fafc" }}>
                            <Search size={14} color="#94a3b8" />
                            <input
                              type="text"
                              placeholder="Search account name..."
                              value={accountSearch}
                              onChange={e => setAccountSearch(e.target.value)}
                              autoFocus
                              style={{ width: "100%", border: "none", outline: "none", fontSize: "0.8rem", backgroundColor: "transparent" }}
                            />
                          </div>

                          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                            {/* Group 1: Cost Of Goods Sold */}
                            <div>
                              <div style={{ padding: "6px 12px", fontSize: "0.7rem", fontWeight: 700, color: "#475569", backgroundColor: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Cost Of Goods Sold
                              </div>
                              {customAccounts["Cost Of Goods Sold"]
                                .filter(a => a.toLowerCase().includes(accountSearch.toLowerCase()))
                                .map(acc => (
                                  <div
                                    key={acc}
                                    onClick={() => {
                                      setSelectedAccount(acc);
                                      setSelectedAccountCategory("Cost Of Goods Sold");
                                      setAccountDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: "7px 14px",
                                      fontSize: "0.82rem",
                                      cursor: "pointer",
                                      backgroundColor: selectedAccount === acc ? "#eef2ff" : "transparent",
                                      color: selectedAccount === acc ? "#4f46e5" : "#1e293b",
                                      fontWeight: selectedAccount === acc ? 600 : 400
                                    }}
                                    onMouseEnter={e => {
                                      if (selectedAccount !== acc) e.currentTarget.style.backgroundColor = "#f8fafc";
                                    }}
                                    onMouseLeave={e => {
                                      if (selectedAccount !== acc) e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    {acc}
                                  </div>
                                ))}
                            </div>

                            {/* Group 2: Expense */}
                            <div>
                              <div style={{ padding: "6px 12px", fontSize: "0.7rem", fontWeight: 700, color: "#475569", backgroundColor: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Operating Expenses
                              </div>
                              {customAccounts["Expense"]
                                .filter(a => a.toLowerCase().includes(accountSearch.toLowerCase()))
                                .map(acc => (
                                  <div
                                    key={acc}
                                    onClick={() => {
                                      setSelectedAccount(acc);
                                      setSelectedAccountCategory("Expense");
                                      setAccountDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: "7px 14px",
                                      fontSize: "0.82rem",
                                      cursor: "pointer",
                                      backgroundColor: selectedAccount === acc ? "#eef2ff" : "transparent",
                                      color: selectedAccount === acc ? "#4f46e5" : "#1e293b",
                                      fontWeight: selectedAccount === acc ? 600 : 400
                                    }}
                                    onMouseEnter={e => {
                                      if (selectedAccount !== acc) e.currentTarget.style.backgroundColor = "#f8fafc";
                                    }}
                                    onMouseLeave={e => {
                                      if (selectedAccount !== acc) e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    {acc}
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* + New Account Action */}
                          <div 
                            onClick={() => setShowNewAccountModal(true)}
                            style={{
                              padding: "9px 12px",
                              borderTop: "1px solid #e2e8f0",
                              color: "#4f46e5",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              backgroundColor: "#f8fafc"
                            }}
                          >
                            <Plus size={14} /> + New Account
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MILEAGE TAB SPECIFIC FORM */}
                  {activeTab === "mileage" && (
                    <div style={{ backgroundColor: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Car size={16} color="#4f46e5" />
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>Mileage & Distance Calculator</span>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "3px" }}>Vehicle Type</label>
                          <select
                            value={mileageVehicle}
                            onChange={e => handleVehicleChange(e.target.value as any)}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                          >
                            <option value="Car">Car (₹10/km)</option>
                            <option value="Motorbike">Motorbike (₹5/km)</option>
                            <option value="Commercial">Commercial Van (₹15/km)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "3px" }}>Distance (KM) *</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="e.g. 45"
                            value={mileageDistance}
                            onChange={e => setMileageDistance(e.target.value)}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "3px" }}>Rate / KM (₹)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={mileageRate}
                            onChange={e => setMileageRate(e.target.value)}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <input
                          type="text"
                          placeholder="From Location (e.g. Rohtak Office)"
                          value={mileageFrom}
                          onChange={e => setMileageFrom(e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                        />
                        <input
                          type="text"
                          placeholder="To Location (e.g. Delhi Site)"
                          value={mileageTo}
                          onChange={e => setMileageTo(e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Row 2: Amount & Paid Through */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#4f46e5", fontSize: "0.85rem" }}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px 8px 26px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            backgroundColor: "#f8fafc"
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Paid Through <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={paidThrough}
                        onChange={e => setPaidThrough(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc",
                          fontWeight: 600,
                          color: "#0f172a"
                        }}
                      >
                        {PAID_THROUGH_ACCOUNTS.map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Expense Type & SAC/HSN */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Expense Type <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={expenseType}
                        onChange={e => setExpenseType(e.target.value as any)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      >
                        <option value="Goods">Goods</option>
                        <option value="Services">Services</option>
                        <option value="Capital Expenditure">Capital Expenditure</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        SAC / HSN
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 998311 or 610910"
                        value={sacCode}
                        onChange={e => setSacCode(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 4: Vendor Selection */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Vendor / Payee
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <select
                        value={vendorId}
                        onChange={e => {
                          const vId = e.target.value;
                          setVendorId(vId);
                          const matched = vendors.find(v => v.id === vId);
                          if (matched) {
                            setVendorName(matched.companyName);
                            if (matched.state) setSourceOfSupply(matched.state);
                          } else {
                            setVendorName("");
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      >
                        <option value="">Select or type a Vendor...</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.companyName} {v.gstNumber ? `(${v.gstNumber})` : ""}
                          </option>
                        ))}
                      </select>

                      {!vendorId && (
                        <input
                          type="text"
                          placeholder="Or enter manual vendor name"
                          value={vendorName}
                          onChange={e => setVendorName(e.target.value)}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.82rem",
                            backgroundColor: "#f8fafc"
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Row 5: GST Treatment */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      GST Treatment <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={gstTreatment}
                      onChange={e => setGstTreatment(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        backgroundColor: "#f8fafc"
                      }}
                    >
                      {GST_TREATMENTS.map(gt => (
                        <option key={gt} value={gt}>{gt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 6: Source & Destination of Supply */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Source of Supply <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={sourceOfSupply}
                        onChange={e => setSourceOfSupply(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      >
                        {INDIAN_STATES.map(st => (
                          <option key={st.code} value={st.name}>[{st.code}] - {st.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Destination of Supply <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={destinationOfSupply}
                        onChange={e => setDestinationOfSupply(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      >
                        {INDIAN_STATES.map(st => (
                          <option key={st.code} value={st.name}>[{st.code}] - {st.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 7: Reverse Charge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="reverseChargeBox"
                      checked={reverseCharge}
                      onChange={e => setReverseCharge(e.target.checked)}
                      style={{ width: "15px", height: "15px", accentColor: "#4f46e5", cursor: "pointer" }}
                    />
                    <label htmlFor="reverseChargeBox" style={{ fontSize: "0.8rem", color: "#334155", cursor: "pointer", fontWeight: 500 }}>
                      This transaction is applicable for reverse charge (RCM)
                    </label>
                  </div>

                  {/* Row 8: Tax Rate */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Tax Rate
                    </label>
                    <select
                      value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        backgroundColor: "#f8fafc",
                        fontWeight: 600
                      }}
                    >
                      {TAX_RATES.map((t, i) => (
                        <option key={i} value={t.rate}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 9: Tax Inclusive / Exclusive */}
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Amount Is:</span>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#1e293b", fontWeight: 500 }}>
                      <input
                        type="radio"
                        name="taxCalcType"
                        checked={taxInclusive}
                        onChange={() => setTaxInclusive(true)}
                        style={{ accentColor: "#4f46e5" }}
                      />
                      Tax Inclusive
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#1e293b", fontWeight: 500 }}>
                      <input
                        type="radio"
                        name="taxCalcType"
                        checked={!taxInclusive}
                        onChange={() => setTaxInclusive(false)}
                        style={{ accentColor: "#4f46e5" }}
                      />
                      Tax Exclusive
                    </label>
                  </div>

                  {/* Live Tax Banner */}
                  {parsedAmount > 0 && taxRate > 0 && (
                    <div style={{
                      backgroundColor: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      fontSize: "0.78rem",
                      color: "#3730a3",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <span>Net Subtotal: <strong>{formatCurrency(netSubtotal)}</strong></span>
                        <span style={{ margin: "0 6px" }}>•</span>
                        <span>
                          {isInterstate ? `IGST (${taxRate}%)` : `CGST (${taxRate/2}%) + SGST (${taxRate/2}%)`}: <strong>{formatCurrency(calculatedTaxAmount)}</strong>
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                        Total: {formatCurrency(grossTotal)}
                      </div>
                    </div>
                  )}

                  {/* Row 10: Reference # & Customer Billable */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                        Invoice / Bill # / Ref #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. INV-2026-881"
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Customer</label>
                        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#059669", cursor: "pointer", fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={isBillable}
                            onChange={e => setIsBillable(e.target.checked)}
                            style={{ accentColor: "#059669" }}
                          />
                          Billable
                        </label>
                      </div>
                      <select
                        value={customerId}
                        onChange={e => {
                          const cId = e.target.value;
                          setCustomerId(cId);
                          const cust = customers.find(c => c.id === cId);
                          setCustomerName(cust ? cust.businessName : "");
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          backgroundColor: "#f8fafc"
                        }}
                      >
                        <option value="">Select customer (optional)...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.businessName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 11: Notes & Description */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      Notes / Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add expense discussion, purpose, or line item details..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        backgroundColor: "#f8fafc",
                        resize: "vertical",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: RECEIPTS DROPZONE & FINANCIAL SUMMARY */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    style={{
                      border: isDragging ? "2px dashed #4f46e5" : "1.5px dashed #cbd5e1",
                      backgroundColor: isDragging ? "#eef2ff" : "#f8fafc",
                      borderRadius: "10px",
                      padding: "24px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: "10px",
                      minHeight: "220px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {!receiptUrl ? (
                      <>
                        <div style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          background: "#eff6ff",
                          color: "#4f46e5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <UploadCloud size={24} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                            Drag or Drop your Receipts
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                            Maximum file size allowed is 10MB
                          </div>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: "none" }}
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            color: "#334155",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                          }}
                        >
                          <UploadCloud size={14} /> Upload your Files
                        </button>
                      </>
                    ) : (
                      /* Receipt Preview Card */
                      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                        <div style={{
                          position: "relative",
                          width: "100%",
                          height: "160px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {receiptUrl.startsWith("data:image") || receiptUrl.startsWith("http") ? (
                            <img
                              src={receiptUrl}
                              alt="Receipt Preview"
                              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            />
                          ) : (
                            <div style={{ color: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              <FileText size={32} />
                              <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>PDF Receipt Document</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => { setReceiptUrl(null); setReceiptFileName(null); }}
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              backgroundColor: "rgba(15, 23, 42, 0.75)",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "50%",
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title="Remove Receipt"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <Check size={13} /> Receipt Attached
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Box */}
                  <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    fontSize: "0.8rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      <FileCheck size={15} color="#4f46e5" />
                      <span>Expense Summary</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>Account:</span>
                      <strong style={{ color: "#0f172a" }}>{selectedAccount}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>Category:</span>
                      <strong style={{ color: "#0f172a" }}>{selectedAccountCategory}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>Paid Via:</span>
                      <strong style={{ color: "#0f172a" }}>{paidThrough}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: "6px", marginTop: "2px" }}>
                      <span style={{ fontWeight: 600 }}>Total Amount:</span>
                      <strong style={{ color: "#4f46e5", fontSize: "1rem", fontWeight: 800 }}>{formatCurrency(grossTotal)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: "8px 18px", fontSize: "0.82rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn"
                  style={{ padding: "8px 22px", fontSize: "0.82rem" }}
                >
                  {loading ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 6. + NEW ACCOUNT SUB-MODAL ─── */}
      {showNewAccountModal && (
        <div className="modal-backdrop" style={{ zIndex: 100050 }}>
          <div className="modal-content animate-in" style={{ maxWidth: "420px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              + Add New Expense Account
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                  Account Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inward Courier Freight..."
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#f8fafc" }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
                  Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={newAccountCategory}
                  onChange={e => setNewAccountCategory(e.target.value as any)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", backgroundColor: "#f8fafc" }}
                >
                  <option value="Cost Of Goods Sold">Cost Of Goods Sold (Direct)</option>
                  <option value="Expense">Operating Expense (Indirect)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="btn-secondary"
                  style={{ padding: "7px 14px", fontSize: "0.8rem" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewAccount}
                  className="primary-btn"
                  style={{ padding: "7px 18px", fontSize: "0.8rem" }}
                >
                  Save & Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. VIEW FULL DETAILS & RECEIPT MODAL ─── */}
      {viewingExpense && (
        <div className="modal-backdrop" onClick={() => setViewingExpense(null)}>
          <div 
            className="modal-content animate-in" 
            style={{ maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                  Expense Claim #{viewingExpense.expenseNumber}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Recorded on {new Date(viewingExpense.date).toLocaleDateString("en-GB")} by {viewingExpense.employee?.user?.name || "Employee"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Status & Amount Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Total Expense</span>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#4f46e5" }}>{formatCurrency(viewingExpense.amount)}</div>
                </div>
                <div>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: STATUS_BADGES[viewingExpense.status]?.bg || "#f1f5f9",
                    color: STATUS_BADGES[viewingExpense.status]?.color || "#334155"
                  }}>
                    {viewingExpense.status}
                  </span>
                </div>
              </div>

              {/* Grid of Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>Expense Account</span>
                  <strong>{viewingExpense.details?.account || viewingExpense.category}</strong> ({viewingExpense.details?.accountCategory || "Expense"})
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>Paid Through</span>
                  <strong>{viewingExpense.details?.paidThrough || "Petty Cash"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>Vendor</span>
                  <strong>{viewingExpense.details?.vendorName || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>GST Treatment</span>
                  <strong>{viewingExpense.details?.gstTreatment || "Registered Business - Regular"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>Place of Supply</span>
                  <span>{viewingExpense.details?.sourceOfSupply} → {viewingExpense.details?.destinationOfSupply}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block" }}>Tax Details</span>
                  <span>{viewingExpense.details?.taxRate ? `${viewingExpense.details.taxRate}% (${viewingExpense.details.taxInclusive ? "Tax Inclusive" : "Tax Exclusive"})` : "Exempt"}</span>
                </div>
              </div>

              {viewingExpense.details?.notes && (
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block", marginBottom: "3px" }}>Notes / Description</span>
                  <div style={{ backgroundColor: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", whiteSpace: "pre-line" }}>
                    {viewingExpense.details.notes}
                  </div>
                </div>
              )}

              {/* Receipt Preview */}
              {viewingExpense.receiptUrl && (
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.72rem", display: "block", marginBottom: "4px" }}>Receipt Document</span>
                  <div style={{
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#0f172a",
                    display: "flex",
                    justifyContent: "center",
                    padding: "10px"
                  }}>
                    <img
                      src={viewingExpense.receiptUrl}
                      alt="Receipt"
                      style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain" }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingExpense;
                    setViewingExpense(null);
                    handleOpenEdit(toEdit);
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #c7d2fe",
                    backgroundColor: "#eef2ff",
                    color: "#4f46e5",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <Edit3 size={13} /> Edit Expense
                </button>
                <button
                  type="button"
                  onClick={() => setViewingExpense(null)}
                  className="btn-secondary"
                  style={{ padding: "7px 16px", fontSize: "0.8rem" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
