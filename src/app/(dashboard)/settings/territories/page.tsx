import React from 'react';
import { getTerritories } from '@/app/actions/territoryActions';
import { Map, Plus } from 'lucide-react';

export default async function TerritoriesSettingsPage() {
  const res = await getTerritories();
  const territories = res.success ? res.territories : [];

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title"><Map className="inline-block mr-2" /> Territory Management</h1>
          <p className="page-subtitle">Manage sales territories and pincodes</p>
        </div>
        <button className="primary-btn"><Plus size={16} /> Add Territory</button>
      </div>

      <div className="glass-panel p-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Territory Name</th>
              <th>Pincodes</th>
              <th>Customers</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {territories?.map((t: any) => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td className="text-sm text-gray-500 truncate max-w-xs">{t.pincodes || 'All'}</td>
                <td>{t._count?.customers || 0}</td>
                <td><button className="text-blue-500 text-sm">Edit</button></td>
              </tr>
            ))}
            {territories?.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">No territories defined.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
