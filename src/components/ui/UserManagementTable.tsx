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
  createdAt: Date;
}

export default function UserManagementTable({ initialUsers }: { initialUsers: User[] }) {
  const [editingUser, setEditingUser] = useState<User | null>(null);

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {initialUsers.map(user => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
                {user.canManageSettings && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#64748b' }} title="Can manage settings">⚙️</span>}
              </td>
              <td>{user.email}</td>
              <td><span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span></td>
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
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {initialUsers.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
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
