"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2 } from 'lucide-react';
import { deleteOrder } from '@/app/actions/orderActions';
import EditOrderModal from './EditOrderModal';

interface OrderDetailActionsProps {
  order: {
    id: string;
    orderNumber: string;
    customerName?: string;
    totalAmount: number;
    status: string;
    paymentType: string;
    notes?: string | null;
    awbNumber?: string | null;
    courierName?: string | null;
  };
}

export default function OrderDetailActions({ order }: OrderDetailActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete Order #${order.orderNumber}? All associated invoices and records will be deleted, and item stock will be restored.`)) {
      return;
    }

    setIsDeleting(true);
    const res = await deleteOrder(order.id);
    setIsDeleting(false);

    if (res?.error) {
      alert(`Failed to delete order: ${res.error}`);
    } else {
      router.push('/orders');
      router.refresh();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsEditOpen(true)}
        className="hover-lift"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <Edit size={15} /> Edit Order
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="hover-lift"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          opacity: isDeleting ? 0.6 : 1,
          transition: 'all 0.15s ease'
        }}
      >
        <Trash2 size={15} /> {isDeleting ? 'Deleting...' : 'Delete Order'}
      </button>

      {isEditOpen && (
        <EditOrderModal
          isOpen={isEditOpen}
          order={order}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
