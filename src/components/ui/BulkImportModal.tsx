"use client";

import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { bulkImportCustomers } from '@/app/actions/customerActions';
import Papa from 'papaparse';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV: " + results.errors[0].message);
          setLoading(false);
          return;
        }

        try {
          const response = await bulkImportCustomers(results.data);
          if (response.success) {
            setSuccess(`Successfully imported ${response.count} customers.`);
            setTimeout(() => {
              onSuccess();
            }, 1500);
          } else {
            setError(response.error || "Failed to import customers.");
            setLoading(false);
          }
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred.");
          setLoading(false);
        }
      },
      error: (error) => {
        setError(error.message);
        setLoading(false);
      }
    });
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="modal-content glass-panel" style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={20} className="text-primary" />
            Bulk Import Customers
          </h2>
          <button onClick={onClose} style={{ color: '#64748b' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px' }}>
          
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', marginBottom: '24px' }}>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              id="csv-upload" 
              style={{ display: 'none' }}
            />
            <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={24} />
              </div>
              <div>
                <span style={{ color: '#4f46e5', fontWeight: 600 }}>Click to upload</span>
                <span style={{ color: '#64748b' }}> or drag and drop</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>CSV format only. Headers required: BusinessName, ContactPerson, Mobile.</p>
            </label>
            {file && (
              <div style={{ marginTop: '16px', padding: '8px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '0.875rem' }}>
                Selected: {file.name}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Expected CSV Format:</h4>
            <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem' }}>
              <table className="dashboard-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>BusinessName</th>
                    <th>ContactPerson</th>
                    <th>Mobile</th>
                    <th>State</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Savant Readymade</td>
                    <td>Savant</td>
                    <td>8999125030</td>
                    <td>Delhi</td>
                    <td>New Lead</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '12px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {success}
            </div>
          )}

        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button onClick={onClose} className="action-btn" style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}>Cancel</button>
          <button 
            onClick={handleImport} 
            disabled={!file || loading}
            className="primary-btn" 
            style={{ opacity: (!file || loading) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? 'Importing...' : 'Import Customers'}
          </button>
        </div>

      </div>
    </div>
  );
}
