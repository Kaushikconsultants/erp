"use client";

import React, { useState } from "react";
import { createTask } from "@/app/actions/taskActions";
import "@/components/ui/modal.css";

interface CreateTaskModalProps {
  onClose: () => void;
  employees: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}

export default function CreateTaskModal({ onClose, employees, customers }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createTask(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in">
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Task Title</label>
            <input type="text" name="title" required placeholder="Follow up with XYZ Corp..." />
          </div>

          <div className="form-group">
            <label>Assign To</label>
            <select name="assigneeId" required>
              <option value="">Select an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Related Customer (Optional)</label>
            <select name="customerId">
              <option value="">None</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select name="priority" required defaultValue="Medium">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Due Date</label>
            <input type="date" name="dueDate" />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea name="description" rows={3} placeholder="Task details..." style={{
              padding: '12px 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical'
            }}></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
