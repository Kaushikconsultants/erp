"use client";

import React, { useState } from "react";
import { X, Plus, Edit2, Check, Scale, Tag, Trash2 } from "lucide-react";
import { upsertCategory, editCategory, deleteCategory } from "@/app/actions/categoryActions";
import "@/components/ui/modal.css";

interface CategoryItem {
  id?: string;
  name: string;
  weight: number;
  description?: string | null;
}

interface ManageCategoriesModalProps {
  categories: CategoryItem[];
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ManageCategoriesModal({ categories, onClose, onRefresh }: ManageCategoriesModalProps) {
  const [categoryList, setCategoryList] = useState<CategoryItem[]>(categories || []);
  const [editingOldName, setEditingOldName] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editWeight, setEditWeight] = useState<number>(0);
  
  const [newCatName, setNewCatName] = useState("");
  const [newCatWeight, setNewCatWeight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingOldName(cat.name);
    setEditName(cat.name);
    setEditWeight(cat.weight || 0);
  };

  const handleCancelEdit = () => {
    setEditingOldName(null);
    setEditName("");
    setEditWeight(0);
  };

  const handleSaveEdit = async (oldName: string) => {
    if (!editName.trim()) {
      setError("Category name cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");
    
    const res = await editCategory(oldName, editName.trim(), editWeight);
    if (res.error) {
      setError(res.error);
    } else {
      setCategoryList(prev => prev.map(c => c.name === oldName ? { ...c, name: editName.trim(), weight: editWeight } : c));
      setEditingOldName(null);
      setSuccessMsg(`Category "${editName.trim()}" updated successfully.`);
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"? Products in this category will be reassigned to "General".`)) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await deleteCategory(name);
    if (res.error) {
      setError(res.error);
    } else {
      setCategoryList(prev => prev.filter(c => c.name !== name));
      setSuccessMsg(`Category "${name}" deleted.`);
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("name", newCatName.trim());
    formData.append("weight", newCatWeight || "0");

    const res = await upsertCategory(formData);
    if (res.error) {
      setError(res.error);
    } else {
      const addedWeight = parseFloat(newCatWeight || "0");
      setCategoryList(prev => {
        const exists = prev.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
        if (exists) {
          return prev.map(c => c.name.toLowerCase() === newCatName.trim().toLowerCase() ? { ...c, weight: addedWeight } : c);
        }
        return [...prev, { name: newCatName.trim(), weight: addedWeight }];
      });
      setNewCatName("");
      setNewCatWeight("");
      setSuccessMsg(`Category "${newCatName.trim()}" added/updated.`);
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '650px', width: '92%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="#4f46e5" />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Manage Categories & Weights</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {error && <div className="error-message" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}
          {successMsg && <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', fontSize: '0.875rem' }}>{successMsg}</div>}

          {/* ADD NEW CATEGORY FORM */}
          <form onSubmit={handleAddCategory} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add New Category
            </h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: '2', minWidth: '160px' }}>
                <input
                  type="text"
                  placeholder="Category Name (e.g. T-Shirts)"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '120px' }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Weight (kg)"
                  value={newCatWeight}
                  onChange={e => setNewCatWeight(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="primary-btn"
                style={{ padding: '8px 16px', fontSize: '0.875rem', height: '36px', alignSelf: 'flex-end' }}
              >
                {loading ? 'Saving...' : 'Add Category'}
              </button>
            </div>
          </form>

          {/* CATEGORIES LIST */}
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569' }}>Existing Categories ({categoryList.length})</h4>
          <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Category Name</th>
                  <th style={{ padding: '10px 14px' }}>Unit Weight (kg)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoryList.length > 0 ? categoryList.map((cat) => (
                  <tr key={cat.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>
                      {editingOldName === cat.name ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #4f46e5', fontSize: '0.875rem' }}
                          autoFocus
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Tag size={14} style={{ marginRight: '6px', color: '#6366f1' }} />
                          {cat.name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {editingOldName === cat.name ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editWeight}
                          onChange={e => setEditWeight(parseFloat(e.target.value) || 0)}
                          style={{ width: '90px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #4f46e5', fontSize: '0.875rem' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 500, color: cat.weight > 0 ? '#059669' : '#94a3b8' }}>
                          {cat.weight > 0 ? `${cat.weight} kg` : '0.00 kg'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {editingOldName === cat.name ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleSaveEdit(cat.name)}
                            disabled={loading}
                            style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                          >
                            <Check size={14} /> Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleStartEdit(cat)}
                            style={{ background: '#fff', color: '#4f46e5', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cat.name)}
                            disabled={loading}
                            style={{ background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            title="Delete category"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No categories found. Add your first category above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
