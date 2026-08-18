"use client";
import React, { useState } from "react";
import { processSalary, markSalaryPaid, updateEmployeeSalary } from "@/app/actions/hrmsActions";

interface EmployeeData {
  id: string;
  salary: number | null;
  department: string | null;
  designation: string | null;
  user: { name: string; email: string };
  salaries: any[];
  incentives: any[];
  orders: { subtotal: number, totalValue?: number }[];
  dynamicIncentive?: number;
}

export default function PayrollClient({ employees, month, isAdmin }: { employees: EmployeeData[]; month: string; isAdmin: boolean }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipModal, setSlipModal] = useState<any | null>(null);
  const [baseSalaryModal, setBaseSalaryModal] = useState<EmployeeData | null>(null);
  const [salaryForm, setSalaryForm] = useState<Record<string, any>>({});
  const [newBaseSalary, setNewBaseSalary] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  async function handleProcessSalary(emp: EmployeeData) {
    setLoading(true);
    const base = salaryForm[emp.id]?.basic ?? (emp.salary || 0);
    const hra = salaryForm[emp.id]?.hra ?? Math.round(base * 0.4);
    const allowances = salaryForm[emp.id]?.allowances ?? 0;
    const deductions = salaryForm[emp.id]?.deductions ?? 0;
    const bonus = salaryForm[emp.id]?.bonus ?? 0;
    const advance = salaryForm[emp.id]?.advance ?? 0;

    const res = await processSalary(emp.id, month, { basicSalary: base, hra, allowances, deductions, bonus, advance });
    setLoading(false);
    if (res.error) { alert(res.error); return; }
    setProcessingId(null);
    window.location.reload();
  }

  async function handleSaveBaseSalary() {
    if (!baseSalaryModal) return;
    setLoading(true);
    const res = await updateEmployeeSalary(baseSalaryModal.id, newBaseSalary);
    setLoading(false);
    if (res.error) { alert(res.error); return; }
    setBaseSalaryModal(null);
    window.location.reload();
  }

  const monthDisplay = new Date(`${month}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Payroll — {monthDisplay}</h1>
          <p className="page-subtitle">Process salaries, incentives and generate salary slips.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Basic Salary</th>
                <th>MTD Sales</th>
                <th>Incentive</th>
                <th>Net Salary</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const salaryRecord = emp.salaries?.[0];
                const incentiveRecord = emp.incentives?.[0];
                const totalSales = emp.orders.reduce((s, o) => s + (o.subtotal || o.totalValue || 0), 0);
                const netSalary = salaryRecord?.netSalary ?? (emp.salary || 0);
                const incentiveEarned = incentiveRecord?.incentiveEarned ?? emp.dynamicIncentive ?? 0;

                return (
                  <React.Fragment key={emp.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600 }}>{emp.user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.designation || 'Sales Rep'}</div>
                      </td>
                      <td>{emp.department || 'Sales'}</td>
                      <td>₹{(salaryRecord?.basicSalary ?? emp.salary ?? 0).toLocaleString()}</td>
                      <td>₹{totalSales.toLocaleString()}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>+ ₹{incentiveEarned.toLocaleString()}</td>
                      <td style={{ fontWeight: 700 }}>₹{(netSalary + incentiveEarned).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${salaryRecord?.status === 'Paid' ? 'active' : salaryRecord?.status === 'Processed' ? 'warning' : 'inactive'}`}>
                          {salaryRecord?.status || 'Pending'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="action-btn text-blue" onClick={() => setProcessingId(emp.id)}>
                              {salaryRecord ? 'Edit' : 'Process'}
                            </button>
                            <button className="action-btn text-purple" onClick={() => { setBaseSalaryModal(emp); setNewBaseSalary(emp.salary || 0); }}>
                              Set Base Salary
                            </button>
                            <button className="action-btn" onClick={() => setSlipModal({ emp, salaryRecord, incentiveRecord, totalSales, incentiveEarned })}>
                              Slip
                            </button>
                            {salaryRecord?.status === 'Processed' && (
                              <button className="action-btn text-green" onClick={async () => { await markSalaryPaid(salaryRecord.id); window.location.reload(); }}>
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Inline salary edit form */}
                    {processingId === emp.id && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7}>
                          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '12px' }}>
                              {[
                                { label: 'Basic (₹)', key: 'basic', default: emp.salary || 0 },
                                { label: 'HRA (₹)', key: 'hra', default: Math.round((emp.salary || 0) * 0.4) },
                                { label: 'Allowances (₹)', key: 'allowances', default: 0 },
                                { label: 'Deductions (₹)', key: 'deductions', default: 0 },
                                { label: 'Bonus (₹)', key: 'bonus', default: 0 },
                                { label: 'Advance (₹)', key: 'advance', default: 0 },
                              ].map(field => (
                                <div key={field.key} className="form-group" style={{ margin: 0 }}>
                                  <label style={{ fontSize: '0.75rem' }}>{field.label}</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    defaultValue={field.default}
                                    onChange={e => setSalaryForm(f => ({
                                      ...f,
                                      [emp.id]: { ...(f[emp.id] || {}), [field.key]: parseFloat(e.target.value) || 0 }
                                    }))}
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="primary-btn" disabled={loading} onClick={() => handleProcessSalary(emp)}>
                                {loading ? 'Processing...' : 'Save & Process'}
                              </button>
                              <button className="action-btn" onClick={() => setProcessingId(null)}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Slip Modal */}
      {slipModal && (
        <div className="modal-overlay" onClick={() => setSlipModal(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Salary Slip — {monthDisplay}</h2>
              <button className="modal-close" onClick={() => setSlipModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{slipModal.emp.user.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{slipModal.emp.designation || 'Sales Rep'} | {slipModal.emp.department || 'Sales'}</div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', fontWeight: 600 }}>
                  Earnings
                </div>
                {[
                  ['Basic Salary', slipModal.salaryRecord?.basicSalary ?? slipModal.emp.salary ?? 0],
                  ['HRA', slipModal.salaryRecord?.hra ?? 0],
                  ['Allowances', slipModal.salaryRecord?.allowances ?? 0],
                  ['Bonus', slipModal.salaryRecord?.bonus ?? 0],
                  ['Sales Incentive', slipModal.incentiveEarned ?? 0],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span>{label}</span>
                    <span>₹{(value as number).toLocaleString()}</span>
                  </div>
                ))}

                <div style={{ background: 'var(--bg-secondary)', padding: '10px 16px', fontWeight: 600, marginTop: '4px' }}>
                  Deductions
                </div>
                {[
                  ['Deductions', slipModal.salaryRecord?.deductions ?? 0],
                  ['Advance', slipModal.salaryRecord?.advance ?? 0],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--border)', color: 'var(--danger)' }}>
                    <span>{label}</span>
                    <span>- ₹{(value as number).toLocaleString()}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontWeight: 700, fontSize: '1.1rem', background: 'var(--bg-secondary)' }}>
                  <span>Net Salary</span>
                  <span style={{ color: 'var(--success)' }}>
                    ₹{((slipModal.salaryRecord?.netSalary ?? slipModal.emp.salary ?? 0) + (slipModal.incentiveEarned ?? 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                MTD Sales: ₹{slipModal.totalSales.toLocaleString()} | Status: {slipModal.salaryRecord?.status || 'Pending'}
              </div>

              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button className="action-btn" onClick={() => setSlipModal(null)}>Close</button>
                <button className="primary-btn" onClick={() => window.print()}>Print Slip</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Base Salary Modal */}
      {baseSalaryModal && (
        <div className="modal-overlay" onClick={() => setBaseSalaryModal(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Set Base Salary — {baseSalaryModal.user.name}</h2>
              <button className="modal-close" onClick={() => setBaseSalaryModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Monthly Base Salary (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  className="form-input"
                  value={newBaseSalary}
                  onChange={e => setNewBaseSalary(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 35000"
                />
                <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  This will update {baseSalaryModal.user.name}'s default base salary in their profile.
                </small>
              </div>
              <div className="modal-footer">
                <button className="action-btn" onClick={() => setBaseSalaryModal(null)}>Cancel</button>
                <button className="primary-btn" disabled={loading} onClick={handleSaveBaseSalary}>
                  {loading ? "Saving..." : "Save Base Salary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
