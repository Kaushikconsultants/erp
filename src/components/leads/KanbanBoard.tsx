"use client";

import React, { useState, useEffect } from 'react';
import { updateLeadStage, updateLeadValue } from '@/app/actions/leadActions';
import Link from 'next/link';

const STAGES = [
  { id: 'New Lead', title: 'New Lead', color: 'bg-blue-100 border-blue-200 text-blue-800' },
  { id: 'Contacted', title: 'Contacted', color: 'bg-indigo-100 border-indigo-200 text-indigo-800' },
  { id: 'Qualified', title: 'Qualified', color: 'bg-purple-100 border-purple-200 text-purple-800' },
  { id: 'Opportunity', title: 'Opportunity', color: 'bg-orange-100 border-orange-200 text-orange-800' },
  { id: 'Won', title: 'Won', color: 'bg-green-100 border-green-200 text-green-800' },
  { id: 'Lost', title: 'Lost', color: 'bg-red-100 border-red-200 text-red-800' },
];

export default function KanbanBoard({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Derive pipeline value and win rate
  const pipelineValue = leads
    .filter(l => l.leadStage !== 'Lost' && l.leadStage !== 'Won')
    .reduce((sum, l) => sum + (l.expectedValue || 0), 0);
  
  const wonCount = leads.filter(l => l.leadStage === 'Won').length;
  const lostCount = leads.filter(l => l.leadStage === 'Lost').length;
  const closedTotal = wonCount + lostCount;
  const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingId(leadId);
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    // Optimistic update
    const previousLeads = [...leads];
    setLeads(leads.map(l => l.id === leadId ? { ...l, leadStage: targetStage } : l));
    setDraggingId(null);

    // Call server action
    let newStatus = undefined;
    if (targetStage === 'Won') newStatus = 'Active Lead';
    if (targetStage === 'Lost') newStatus = 'Inactive';
    
    const res = await updateLeadStage(leadId, targetStage, newStatus);
    if (res?.error) {
      alert(res.error);
      setLeads(previousLeads);
    }
  };

  return (
    <div>
      {/* Analytics Header */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Total Leads</div>
          <div className="text-2xl font-bold">{leads.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Pipeline Value</div>
          <div className="text-2xl font-bold text-indigo-700">₹{pipelineValue.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Win Rate</div>
          <div className="text-2xl font-bold text-green-600">{winRate}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Lost</div>
          <div className="text-2xl font-bold text-red-600">{lostCount}</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => (l.leadStage || 'New Lead') === stage.id);
          const stageValue = stageLeads.reduce((sum, l) => sum + (l.expectedValue || 0), 0);

          return (
            <div 
              key={stage.id} 
              className="flex-shrink-0 w-80 flex flex-col bg-gray-50 rounded-xl border border-gray-200"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className={`p-3 rounded-t-xl border-b font-semibold flex justify-between items-center ${stage.color}`}>
                <span>{stage.title}</span>
                <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded-full">{stageLeads.length}</span>
              </div>
              
              {/* Stage Value */}
              <div className="px-3 py-2 text-xs text-gray-500 font-medium text-right border-b border-gray-200 bg-white">
                ₹{stageValue.toLocaleString()}
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2">
                {stageLeads.map(lead => (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors ${draggingId === lead.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/customers/${lead.id}`} className="font-semibold text-gray-800 hover:text-indigo-600">
                        {lead.businessName}
                      </Link>
                      {lead.healthScore && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${lead.healthScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {lead.healthScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {lead.contactPerson}
                    </div>

                    <div className="flex justify-between items-center text-xs mt-3 pt-2 border-t border-gray-100">
                      <span className="text-gray-500">{lead.assignedSalesperson?.user?.name || 'Unassigned'}</span>
                      <span className="font-bold text-gray-700">₹{(lead.expectedValue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                
                {stageLeads.length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg m-2">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
