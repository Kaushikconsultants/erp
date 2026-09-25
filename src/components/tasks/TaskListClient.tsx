"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Trash2, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  User, 
  PhoneCall, 
  MessageCircle, 
  Building2, 
  Calendar, 
  X, 
  RotateCcw, 
  Check,
  ChevronDown
} from 'lucide-react';
import { updateTask, deleteTask } from '@/app/actions/taskActions';
import './tasks.css';

interface TaskListClientProps {
  initialTasks: any[];
  employees: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  isAdmin: boolean;
}

export default function TaskListClient({
  initialTasks,
  employees,
  customers,
  isAdmin
}: TaskListClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Helper: Extract 10-digit mobile number from customer or task text (titles often contain numbers like (8200715720))
  const extractPhoneNumber = (task: any): string | null => {
    if (task.customer?.mobile) return task.customer.mobile.replace(/\D/g, '');
    if (task.customer?.whatsappNumber) return task.customer.whatsappNumber.replace(/\D/g, '');
    
    const text = `${task.title || ''} ${task.description || ''}`;
    // Try matching standard 10 digit Indian number
    const match = text.match(/(?:\+91[\-\s]?)?([6-9]\d{9})/);
    if (match) return match[1];

    // Try matching cleaned phone numbers like (8200715720) or 70084 68785
    const clean = text.replace(/[\s\-\(\)\.]/g, '');
    const cleanMatch = clean.match(/(?:\+91|0)?([6-9]\d{9})/);
    if (cleanMatch) return cleanMatch[1];

    return null;
  };

  // Status Change Handler
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setIsUpdating(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const res = await updateTask({ taskId, status: newStatus });
    setIsUpdating(null);

    if (!res.success) {
      // Revert if failed
      setTasks(initialTasks);
    }
  };

  // Quick Checkbox Toggle: Completed <-> To Do
  const handleToggleComplete = async (task: any) => {
    const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
    await handleStatusChange(task.id, newStatus);
  };

  // Delete Handler
  const handleDelete = async (taskId: string, title?: string) => {
    const displayTitle = title ? `"${title}"` : "this task";
    if (!confirm(`Are you sure you want to delete ${displayTitle}?`)) return;
    
    setIsUpdating(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const res = await deleteTask(taskId);
    setIsUpdating(null);

    if (!res.success) {
      setTasks(initialTasks);
      alert("Failed to delete task. Please try again.");
    }
  };

  // Toggle expanded description
  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setAssigneeFilter('ALL');
  };

  // Calculate Badge Counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter(t => t.status === 'To Do').length;
  const progressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length;

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed';
    
    if (statusFilter === 'OVERDUE') {
      if (!isOverdue) return false;
    } else if (statusFilter !== 'ALL' && t.status !== statusFilter) {
      return false;
    }

    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'ALL' && t.assigneeId !== assigneeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCust = t.customer?.businessName?.toLowerCase().includes(q);
      const matchAssignee = t.assignee?.user?.name?.toLowerCase().includes(q);
      const phone = extractPhoneNumber(t);
      const matchPhone = phone?.includes(q.replace(/\D/g, ''));
      if (!matchTitle && !matchDesc && !matchCust && !matchAssignee && !matchPhone) return false;
    }
    return true;
  });

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL';

  return (
    <div className="task-list-panel">
      
      {/* ─── FILTERS & SEARCH TOOLBAR ─── */}
      <div className="task-toolbar">
        {/* Search Bar Row */}
        <div className="task-search-row">
          <div className="task-search-input-box">
            <Search size={16} className="task-search-icon" />
            <input
              type="text"
              placeholder="Search tasks, client names, phone numbers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="task-search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="task-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Status Filter Chips Bar */}
        <div className="task-status-chips-bar">
          <button
            type="button"
            className={`task-status-chip ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All <span className="task-chip-count">{totalCount}</span>
          </button>
          
          <button
            type="button"
            className={`task-status-chip ${statusFilter === 'To Do' ? 'active-todo' : ''}`}
            onClick={() => setStatusFilter('To Do')}
          >
            To Do <span className="task-chip-count">{todoCount}</span>
          </button>

          <button
            type="button"
            className={`task-status-chip ${statusFilter === 'In Progress' ? 'active-progress' : ''}`}
            onClick={() => setStatusFilter('In Progress')}
          >
            In Progress <span className="task-chip-count">{progressCount}</span>
          </button>

          <button
            type="button"
            className={`task-status-chip ${statusFilter === 'Completed' ? 'active-done' : ''}`}
            onClick={() => setStatusFilter('Completed')}
          >
            Completed <span className="task-chip-count">{completedCount}</span>
          </button>

          {overdueCount > 0 && (
            <button
              type="button"
              className={`task-status-chip ${statusFilter === 'OVERDUE' ? 'active-todo' : ''}`}
              style={{ borderColor: statusFilter === 'OVERDUE' ? '#dc2626' : '#fca5a5', color: statusFilter === 'OVERDUE' ? '#ffffff' : '#dc2626', background: statusFilter === 'OVERDUE' ? '#dc2626' : '#fef2f2' }}
              onClick={() => setStatusFilter('OVERDUE')}
            >
              Overdue <span className="task-chip-count">{overdueCount}</span>
            </button>
          )}
        </div>

        {/* Secondary Filter Dropdowns (Priority + Team + Reset) */}
        <div className="task-secondary-filters">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="task-filter-select"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          {isAdmin && (
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="task-filter-select"
            >
              <option value="ALL">All Team Members</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}

          {isFiltered && (
            <button
              type="button"
              className="btn-filter-reset-small"
              onClick={handleResetFilters}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── 1. MOBILE TASK CARD FEED (≤ 768px) ─── */}
      <div className="task-mobile-feed">
        {filteredTasks.map((task) => {
          const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
          const isDone = task.status === 'Completed';
          const phone = extractPhoneNumber(task);
          const isDescExpanded = !!expandedDescriptions[task.id];
          const isUpdatingThis = isUpdating === task.id;

          const priorityClass = 
            task.priority === 'Urgent' ? 'priority-urgent' :
            task.priority === 'High' ? 'priority-high' :
            task.priority === 'Low' ? 'priority-low' : 'priority-medium';

          const statusSelectClass = 
            task.status === 'Completed' ? 'status-completed' :
            task.status === 'In Progress' ? 'status-progress' : 'status-todo';

          const assigneeName = task.assignee?.user?.name || 'Unassigned';
          const assigneeInitial = assigneeName.charAt(0).toUpperCase();

          return (
            <div 
              key={task.id} 
              className={`task-mobile-card ${isPastDue ? 'is-overdue' : ''} ${isDone ? 'is-completed' : ''} ${isUpdatingThis ? 'is-updating' : ''}`}
            >
              {/* Card Header: Priority, Due Date & Delete */}
              <div className="task-card-header">
                <div className="task-card-badges">
                  <span className={`task-priority-pill ${priorityClass}`}>
                    {task.priority || 'Normal'}
                  </span>

                  {task.dueDate && (
                    <span className={`task-due-badge ${isPastDue ? 'overdue' : ''}`}>
                      {isPastDue ? (
                        <>
                          <AlertCircle size={11} />
                          Overdue ({new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                        </>
                      ) : (
                        <>
                          <Calendar size={11} />
                          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="task-card-header-actions">
                  <button
                    type="button"
                    className="btn-task-delete"
                    onClick={() => handleDelete(task.id, task.title)}
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Card Body: Interactive Checkbox + Title */}
              <div className="task-card-body">
                <button
                  type="button"
                  className={`task-checkbox-btn ${isDone ? 'checked' : ''}`}
                  onClick={() => handleToggleComplete(task)}
                  title={isDone ? "Mark as To Do" : "Mark as Completed"}
                >
                  <Check size={14} strokeWidth={3} />
                </button>

                <div className="task-title-wrap">
                  <div className={`task-title ${isDone ? 'completed' : ''}`}>
                    {task.title}
                  </div>

                  {task.description && (
                    <div className="task-description-box">
                      <div style={{
                        overflow: 'hidden',
                        display: isDescExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: isDescExpanded ? 'unset' : 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {task.description}
                      </div>
                      {task.description.length > 90 && (
                        <button
                          type="button"
                          onClick={() => toggleDescription(task.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 0 0 0',
                            cursor: 'pointer'
                          }}
                        >
                          {isDescExpanded ? "Show less" : "Show full note"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Call & WhatsApp Action Bar (for sales follow-up calls) */}
              {phone && (
                <div className="task-phone-actions-bar">
                  <a 
                    href={`tel:${phone}`}
                    className="btn-task-action-call"
                    title={`Call ${phone}`}
                  >
                    <PhoneCall size={13} />
                    <span>Call ({phone})</span>
                  </a>

                  <a 
                    href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi, following up regarding: ${task.title}`)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-task-action-wa"
                    title={`WhatsApp ${phone}`}
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}

              {/* Card Footer: Assignee, Customer & Status Select */}
              <div className="task-card-footer">
                <div className="task-card-meta-left">
                  {/* Assignee */}
                  <div className="task-assignee-chip" title={`Assigned to ${assigneeName}`}>
                    <div className="task-avatar-circle">{assigneeInitial}</div>
                    <span>{assigneeName}</span>
                  </div>

                  {/* Customer */}
                  {task.customer && (
                    <div className="task-customer-chip" title="Related Customer">
                      <Building2 size={12} />
                      <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.customer.businessName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(task.id, e.target.value)}
                  className={`task-status-selector-mobile ${statusSelectClass}`}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          );
        })}

        {/* Mobile Empty State */}
        {filteredTasks.length === 0 && (
          <div className="task-empty-state">
            <div className="task-empty-icon">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="task-empty-title">No tasks found</h3>
            <p className="task-empty-text">
              {isFiltered 
                ? "No tasks match your current filters or search. Try clearing filters."
                : "You don't have any tasks scheduled right now."}
            </p>
            {isFiltered && (
              <button 
                type="button" 
                className="btn-filter-reset-small"
                style={{ marginTop: '8px' }}
                onClick={handleResetFilters}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── 2. DESKTOP DATA TABLE (Visible on > 768px) ─── */}
      <div className="task-desktop-table-container">
        <table className="task-desktop-table">
          <thead>
            <tr>
              <th style={{ width: '42px', textAlign: 'center' }}>✓</th>
              <th>Task Details</th>
              <th>Assignee</th>
              <th>Customer / Account</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => {
              const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
              const isDone = task.status === 'Completed';
              const phone = extractPhoneNumber(task);
              const priorityClass = 
                task.priority === 'Urgent' ? 'priority-urgent' :
                task.priority === 'High' ? 'priority-high' :
                task.priority === 'Low' ? 'priority-low' : 'priority-medium';

              const statusSelectClass = 
                task.status === 'Completed' ? 'status-completed' :
                task.status === 'In Progress' ? 'status-progress' : 'status-todo';

              const assigneeName = task.assignee?.user?.name || 'Unassigned';
              const assigneeInitial = assigneeName.charAt(0).toUpperCase();

              return (
                <tr 
                  key={task.id}
                  style={{
                    opacity: isUpdating === task.id ? 0.5 : 1,
                    backgroundColor: isDone ? '#fafbfc' : '#ffffff'
                  }}
                >
                  {/* Quick Checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={`task-checkbox-btn ${isDone ? 'checked' : ''}`}
                      onClick={() => handleToggleComplete(task)}
                      title={isDone ? "Mark as To Do" : "Mark as Completed"}
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </td>

                  {/* Title, Description & Phone links */}
                  <td style={{ maxWidth: '320px' }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: isDone ? '#94a3b8' : '#0f172a', 
                      fontSize: '0.875rem',
                      textDecoration: isDone ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', lineHeight: 1.35 }}>
                        {task.description}
                      </div>
                    )}
                    {phone && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <a 
                          href={`tel:${phone}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                        >
                          <PhoneCall size={11} /> Call ({phone})
                        </a>
                        <a 
                          href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi, following up regarding: ${task.title}`)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#059669', fontWeight: 600, textDecoration: 'none' }}
                        >
                          <MessageCircle size={11} /> WhatsApp
                        </a>
                      </div>
                    )}
                  </td>

                  {/* Assignee */}
                  <td>
                    <div className="task-assignee-chip">
                      <div className="task-avatar-circle">{assigneeInitial}</div>
                      <span>{assigneeName}</span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td>
                    {task.customer ? (
                      <div className="task-customer-chip">
                        <Building2 size={12} />
                        <span>{task.customer.businessName}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>-</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {task.dueDate ? (
                      <span className={`task-due-badge ${isPastDue ? 'overdue' : ''}`}>
                        {isPastDue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                        {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isPastDue && ' (Overdue)'}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>No date</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td>
                    <span className={`task-priority-pill ${priorityClass}`}>
                      {task.priority || 'Normal'}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      className={`task-status-selector-mobile ${statusSelectClass}`}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn-task-delete"
                      onClick={() => handleDelete(task.id, task.title)}
                      title="Delete task"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Desktop Empty State */}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                    <CheckCircle2 size={32} style={{ color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#334155' }}>No tasks found</div>
                    <div style={{ fontSize: '0.825rem' }}>Try clearing your search query or filters.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
