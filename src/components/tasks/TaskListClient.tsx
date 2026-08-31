"use client";

import React, { useState } from 'react';
import { CheckCircle2, Clock, Trash2, Edit, AlertCircle, Search, Filter, Plus, User } from 'lucide-react';
import { updateTask, deleteTask } from '@/app/actions/taskActions';

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
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setIsUpdating(taskId);
    const res = await updateTask({ taskId, status: newStatus });
    setIsUpdating(null);

    if (res.success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setIsUpdating(taskId);
    const res = await deleteTask(taskId);
    setIsUpdating(null);

    if (res.success) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (assigneeFilter !== 'ALL' && t.assigneeId !== assigneeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCust = t.customer?.businessName?.toLowerCase().includes(q);
      const matchAssignee = t.assignee?.user?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCust && !matchAssignee) return false;
    }
    return true;
  });

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* Filters Bar */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', flex: 1, minWidth: '220px', maxWidth: '320px' }}>
          <Search size={14} color="#94a3b8" style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search tasks, descriptions, accounts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8125rem', width: '100%', color: '#0f172a' }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8125rem', color: '#334155', backgroundColor: '#ffffff' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Assignee Filter (Admin) */}
        {isAdmin && (
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8125rem', color: '#334155', backgroundColor: '#ffffff' }}
          >
            <option value="ALL">All Team Members</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}

      </div>

      {/* Task Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Task</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Assignee</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Customer / Account</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Due Date</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Priority</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Status</th>
              <th style={{ padding: '10px 14px', fontWeight: 550, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task, idx) => {
              const isPastDue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

              return (
                <tr 
                  key={task.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    transition: 'background-color 0.15s ease',
                    opacity: isUpdating === task.id ? 0.5 : 1
                  }}
                >
                  {/* Title & Description */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle', maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{task.title}</div>
                    {task.description && (
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px', lineHeight: 1.3 }}>
                        {task.description}
                      </div>
                    )}
                  </td>

                  {/* Assignee */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>
                      {task.assignee?.user?.name || 'Unassigned'}
                    </span>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    {task.customer ? (
                      <span style={{ fontSize: '0.8125rem', color: '#4f46e5', fontWeight: 500 }}>
                        {task.customer.businessName}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>-</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {task.dueDate ? (
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        color: isPastDue ? '#dc2626' : '#475569'
                      }}>
                        {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isPastDue && ' (Overdue)'}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>No date</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      backgroundColor: task.priority === 'Urgent' ? '#fee2e2' : task.priority === 'High' ? '#fef3c7' : '#eff6ff',
                      color: task.priority === 'Urgent' ? '#dc2626' : task.priority === 'High' ? '#d97706' : '#2563eb'
                    }}>
                      {task.priority}
                    </span>
                  </td>

                  {/* Status Toggle */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: task.status === 'Completed' ? '#dcfce7' : task.status === 'In Progress' ? '#fef3c7' : '#f1f5f9',
                        color: task.status === 'Completed' ? '#15803d' : task.status === 'In Progress' ? '#854d0e' : '#475569',
                        border: '1px solid #cbd5e1',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.15s ease'
                      }}
                      title="Delete task"
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  No tasks found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
