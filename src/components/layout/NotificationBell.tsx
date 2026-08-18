"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { getMyNotifications, markNotificationAsRead } from '@/app/actions/notificationActions';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const res = await getMyNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    }
    load();

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button className="icon-btn hover-lift" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No notifications.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-3 border-b last:border-0 ${n.isRead ? 'bg-white' : 'bg-blue-50'} flex justify-between items-start`}>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{n.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  {!n.isRead && (
                    <button onClick={() => handleMarkAsRead(n.id)} className="text-blue-500 hover:text-blue-700" title="Mark as read">
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
