'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, User, Bell, Shield, Palette, ChevronDown } from 'lucide-react';

export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Settings menu"
        aria-expanded={isOpen}
      >
        <Settings className="w-5 h-5" />
        <span className="text-sm font-medium">Settings</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
          <button
            onClick={() => window.location.href = '/auth/change-password'}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3"
          >
            <User className="w-4 h-4" />
            Account Settings
          </button>
          <button
            onClick={() => window.location.href = '/settings/notifications'}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3"
          >
            <Bell className="w-4 h-4" />
            Notification Preferences
          </button>
          <button
            onClick={() => window.location.href = '/settings/security'}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3"
          >
            <Shield className="w-4 h-4" />
            Security & Privacy
          </button>
          <button
            onClick={() => window.location.href = '/settings/appearance'}
            className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3"
          >
            <Palette className="w-4 h-4" />
            Appearance
          </button>
        </div>
      )}
    </div>
  );
}
