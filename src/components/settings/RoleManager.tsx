"use client";

import React, { useState } from 'react';
import { Plus, Shield, Edit2 } from 'lucide-react';
import CreateRoleModal from './CreateRoleModal';
import EditRoleModal from './EditRoleModal';

interface RoleManagerProps {
  roles: any[];
}

export default function RoleManager({ roles }: RoleManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="primary-btn hover-lift"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <Plus size={16} /> Create Custom Role
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
          <table className="dashboard-table" style={{ width: '100%', minWidth: '680px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Role Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Permissions Policy</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Assigned Users</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => {
                let permissions: string[] = [];
                try {
                  permissions = JSON.parse(role.permissions || '[]');
                } catch (e) {}

                return (
                  <tr key={role.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={16} style={{ color: '#4f46e5' }} />
                        {role.name}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {permissions.slice(0, 4).map((p: string) => (
                          <span key={p} className="badge badge-neutral" style={{ fontSize: '11px', padding: '4px 8px' }}>
                            {p}
                          </span>
                        ))}
                        {permissions.length > 4 && (
                          <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '4px 8px' }}>
                            +{permissions.length - 4} more
                          </span>
                        )}
                        {permissions.length === 0 && <span className="text-muted text-sm">No permissions</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span className="badge badge-success" style={{ padding: '4px 10px', borderRadius: '12px' }}>
                        {role._count?.users || 0}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setEditingRole(role)}
                        className="text-primary hover:underline font-medium text-sm" 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary, #4f46e5)', fontWeight: 600 }}
                      >
                        <Edit2 size={13} /> Edit Permissions
                      </button>
                    </td>
                  </tr>
                );
              })}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No custom roles configured. Click "Create Custom Role" to define custom permissions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CreateRoleModal onClose={() => setIsModalOpen(false)} />
      )}

      {editingRole && (
        <EditRoleModal 
          role={editingRole} 
          onClose={() => setEditingRole(null)} 
        />
      )}
    </>
  );
}
