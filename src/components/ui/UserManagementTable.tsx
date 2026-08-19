"use client";

import React, { useState } from "react";
import EditUserModal from "./EditUserModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  canManageSettings: boolean;
  allowedSections?: string | null;
  createdAt: Date;
}

export default function UserManagementTable({ initialUsers }: { initialUsers: User[] }) {
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { bg: '#fee2e2', color: '#991b1b', label: '👑 SUPER_ADMIN' };
      case 'ADMIN':
        return { bg: '#ffedd5', color: '#9a3412', label: '🛡️ ADMIN' };
      case 'MANAGER':
        return { bg: '#e0e7ff', color: '#3730a3', label: '👔 MANAGER' };
      case 'SALES':
        return { bg: '#dcfce7', color: '#166534', label: '💼 SALES' };
      case 'DISPATCH':
        return { bg: '#fef3c7', color: '#92400e', label: '🚚 DISPATCH' };
      case 'ACCOUNTS':
        return { bg: '#f3e8ff', color: '#6b21a8', label: '💰 ACCOUNTS' };
      case 'HR':
        return { bg: '#fce7f3', color: '#9d174d', label: '👥 HR' };
      case 'WAREHOUSE':
        return { bg: '#e0f2fe', color: '#075985', label: '🏬 WAREHOUSE' };
      case 'PURCHASE':
        return { bg: '#ccfbf1', color: '#115e59', label: '🛒 PURCHASE' };
      case 'SUPPORT':
        return { bg: '#ecfeff', color: '#155e75', label: '📞 SUPPORT' };
      case 'CLIENT':
        return { bg: '#f1f5f9', color: '#475569', label: '🌐 CLIENT' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: role };
    }
  };

  const getSectionCount = (allowedSections?: string | null) => {
    if (!allowedSections) return "All Sections";
    try {
      let parsed: string[] = [];
      if (allowedSections.startsWith('[')) {
        parsed = JSON.parse(allowedSections);
      } else {
        parsed = allowedSections.split(',').map(s => s.trim());
      }
      return `${parsed.length} Sections`;
    } catch {
      return "Custom Access";
    }
  };

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Section Access</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {initialUsers.map(user => {
            const badge = getRoleBadgeStyle(user.role);
            return (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  {user.canManageSettings && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#64748b' }} title="Can manage settings">⚙️</span>}
                </td>
                <td>{user.email}</td>
                <td>
                  <span style={{ 
                    padding: '3px 10px', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    backgroundColor: badge.bg, 
                    color: badge.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {badge.label}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                    {getSectionCount(user.allowedSections)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="action-btn text-blue"
                    onClick={() => setEditingUser(user)}
                    style={{ fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit Role & Access
                  </button>
                </td>
              </tr>
            );
          })}
          {initialUsers.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  );
}
