"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditUserModal from "./EditUserModal";
import EditEmployeeModal from "./EditEmployeeModal";
import ChangePasswordModal from "./ChangePasswordModal";
import { toggleUserStatus, deleteUser } from "@/app/actions/userActions";
import { 
  KeyRound, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  X,
  AlertCircle,
  Settings,
  Pencil
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  canManageSettings: boolean;
  allowedSections?: string | null;
  createdAt: Date;
  employee?: any;
}

export default function UserManagementTable({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Sync state if initialUsers changes from server
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleEditModalClose = (updatedUser?: Partial<User> & { id: string }) => {
    if (updatedUser) {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    }
    setEditingUser(null);
    router.refresh();
  };

  const handleToggleStatus = async (user: User) => {
    setLoadingUserId(user.id);
    setErrorMessage(null);
    try {
      const res = await toggleUserStatus(user.id);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: res.isActive ?? !u.isActive } : u));
        router.refresh();
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to update user status");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await deleteUser(deletingUser.id);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
        setDeletingUser(null);
        if (editingUser?.id === deletingUser.id) {
          setEditingUser(null);
        }
        router.refresh();
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

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

  const getSectionCount = (allowedSections?: string | null, userRole?: string) => {
    if (!allowedSections) {
      if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return "All 19 Sections";
      return "Role Defaults";
    }
    try {
      let parsed: string[] = [];
      const trimmed = allowedSections.trim();
      if (trimmed.startsWith('[')) {
        parsed = JSON.parse(trimmed);
      } else {
        parsed = trimmed.split(',').map(s => s.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, '')).filter(Boolean);
      }
      return `${parsed.length} Sections`;
    } catch {
      return "Custom Access";
    }
  };

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      {errorMessage && (
        <div 
          style={{
            marginBottom: '14px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)} 
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', verticalAlign: 'middle' }}>
              Name
            </th>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', verticalAlign: 'middle' }}>
              Email
            </th>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', verticalAlign: 'middle' }}>
              Role
            </th>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', verticalAlign: 'middle' }}>
              Section Access
            </th>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', verticalAlign: 'middle' }}>
              Status
            </th>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', verticalAlign: 'middle' }}>
              Joined
            </th>
            <th style={{ padding: '10px 14px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', verticalAlign: 'middle' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const badge = getRoleBadgeStyle(user.role);
            const isLoading = loadingUserId === user.id;

            return (
              <tr 
                key={user.id} 
                style={{ 
                  opacity: user.isActive ? 1 : 0.75,
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* 1. Name */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                      {user.name}
                    </span>
                    {user.canManageSettings && (
                      <span title="Can manage settings" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Settings 
                          size={13} 
                          style={{ color: '#64748b', flexShrink: 0 }} 
                        />
                      </span>
                    )}
                  </div>
                </td>

                {/* 2. Email */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#475569', fontSize: '0.84rem' }}>
                  {user.email}
                </td>

                {/* 3. Role */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '0.74rem', 
                    fontWeight: 700, 
                    backgroundColor: badge.bg, 
                    color: badge.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {badge.label}
                  </span>
                </td>

                {/* 4. Section Access */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span style={{ 
                    fontSize: '0.74rem', 
                    color: '#475569', 
                    fontWeight: 600, 
                    backgroundColor: '#f1f5f9', 
                    padding: '3px 8px', 
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {getSectionCount(user.allowedSections, user.role)}
                  </span>
                </td>

                {/* 5. Status */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: user.isActive ? '#ecfdf5' : '#fef2f2',
                      color: user.isActive ? '#059669' : '#dc2626',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: user.isActive ? '#059669' : '#dc2626',
                        display: 'inline-block'
                      }} 
                    />
                    {user.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>

                {/* 6. Joined */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#475569', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                {/* 7. Actions */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    {/* Edit Details */}
                    <button 
                      type="button"
                      onClick={() => {
                        if (user.employee) {
                          setEditingEmployee({ ...user.employee, user });
                        } else {
                          setEditingUser(user);
                        }
                      }}
                      style={{ 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        padding: '5px 9px', 
                        fontSize: '0.76rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Edit Staff Details, Base Salary, Department, Role & Access"
                    >
                      <Pencil size={13} /> Edit Details
                    </button>

                    {/* Change Password */}
                    <button 
                      type="button"
                      onClick={() => setPasswordUser(user)}
                      style={{ 
                        fontWeight: 600, 
                        cursor: 'pointer', 
                        padding: '5px 9px', 
                        fontSize: '0.76rem', 
                        backgroundColor: '#f5f3ff', 
                        color: '#7c3aed', 
                        border: '1px solid #ddd6fe',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Change User Password"
                    >
                      <KeyRound size={13} /> Change Password
                    </button>

                    {/* Deactivate / Activate Button */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleToggleStatus(user)}
                      style={{
                        fontWeight: 600,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        padding: '5px 9px',
                        fontSize: '0.76rem',
                        backgroundColor: user.isActive ? '#fff7ed' : '#f0fdf4',
                        color: user.isActive ? '#c2410c' : '#15803d',
                        border: user.isActive ? '1px solid #fed7aa' : '1px solid #86efac',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      title={user.isActive ? "Deactivate user account (block login)" : "Activate user account (allow login)"}
                    >
                      {isLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : user.isActive ? (
                        <>
                          <UserX size={13} /> Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck size={13} /> Activate
                        </>
                      )}
                    </button>

                    {/* Delete User Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingUser(user)}
                      style={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '5px 7px',
                        fontSize: '0.76rem',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title="Permanently delete user"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Edit Role & Permissions Modal (Fallback) */}
      {editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={handleEditModalClose}
          onDeleteRequest={(u) => {
            const foundUser = users.find(x => x.id === u.id) || editingUser;
            setEditingUser(null);
            setDeletingUser(foundUser);
          }}
        />
      )}

      {/* Edit Full Staff Details Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSuccess={() => {
            setEditingEmployee(null);
            router.refresh();
          }}
        />
      )}

      {/* Change Password Modal */}
      {passwordUser && (
        <ChangePasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div 
          className="modal-backdrop" 
          onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) setDeletingUser(null); }}
          style={{ 
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 16px'
          }}
        >
          <div 
            className="animate-in" 
            style={{ 
              maxWidth: '460px', 
              width: '100%', 
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #fee2e2',
              boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div 
                style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '50%', 
                  backgroundColor: '#fee2e2', 
                  color: '#dc2626',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <AlertTriangle size={28} />
              </div>

              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Delete User Account?
              </h3>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>{deletingUser.name}</strong> (<span style={{ color: '#475569' }}>{deletingUser.email}</span>)?
              </p>

              <div 
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  backgroundColor: '#fff7ed', 
                  border: '1px solid #fed7aa',
                  fontSize: '0.8rem',
                  color: '#9a3412',
                  textAlign: 'left',
                  lineHeight: 1.4,
                  marginBottom: '20px'
                }}
              >
                ⚠️ <strong>Warning:</strong> This will delete their login credentials, employee profile, and unassign any associated tasks or customer accounts. This action <strong>cannot be undone</strong>.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingUser(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isDeleting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} /> Yes, Delete User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
