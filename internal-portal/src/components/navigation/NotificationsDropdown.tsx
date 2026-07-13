'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, ChevronDown } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Booking Assigned',
      message: 'You have been assigned to a new cleaning job on June 5th.',
      timestamp: new Date(),
      read: false,
      type: 'info'
    },
    {
      id: '2',
      title: 'Payment Processed',
      message: 'Your payment for May has been processed.',
      timestamp: new Date(Date.now() - 86400000),
      read: false,
      type: 'success'
    },
    {
      id: '3',
      title: 'Training Reminder',
      message: 'Complete Module 3 training by Friday.',
      timestamp: new Date(Date.now() - 172800000),
      read: true,
      type: 'warning'
    }
  ]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-[#F0E6D6] text-[#241811]';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-stone-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-stone-100 flex justify-between items-center">
            <h3 className="font-semibold text-stone-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#2E1F16] hover:text-[#241811]"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-stone-50 hover:bg-stone-50 transition-colors ${!notification.read ? 'bg-[#F7F2EA]/50' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-[#B08A5E] rounded-full" />
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-stone-900">{notification.title}</h4>
                      <p className="text-xs text-stone-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-stone-400 mt-2">
                        {notification.timestamp.toLocaleDateString()} {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 hover:bg-stone-200 rounded transition-colors"
                          aria-label="Mark as read"
                        >
                          <Check className="w-4 h-4 text-stone-500" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="p-1 hover:bg-stone-200 rounded transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4 text-stone-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
