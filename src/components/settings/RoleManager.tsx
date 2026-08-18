"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import CreateRoleModal from './CreateRoleModal';

interface RoleManagerProps {
  roles: any[];
}

export default function RoleManager({ roles }: RoleManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="primary-btn hover-lift"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <Plus size={16} /> Create Role
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Role Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Permissions</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Assigned Users</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => {
              let permissions = [];
              try {
                permissions = JSON.parse(role.permissions || '[]');
              } catch (e) {}

              return (
                <tr key={role.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{role.name}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {permissions.slice(0, 3).map((p: string) => (
                        <span key={p} className="badge badge-neutral" style={{ fontSize: '11px', padding: '4px 8px' }}>{p}</span>
                      ))}
                      {permissions.length > 3 && (
                        <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '4px 8px' }}>+{permissions.length - 3} more</span>
                      )}
                      {permissions.length === 0 && <span className="text-muted text-sm">None</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span className="badge badge-success" style={{ padding: '4px 10px', borderRadius: '12px' }}>
                      {role._count?.users || 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button className="text-primary hover:underline font-medium text-sm" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      Edit Role
                    </button>
                  </td>
                </tr>
              );
            })}
            {roles.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No custom roles found. Click "Create Role" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateRoleModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
