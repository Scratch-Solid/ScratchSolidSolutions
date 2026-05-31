'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, UserPlus, Search, ChevronDown } from 'lucide-react';

export default function UsersDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock user data - in production, this would come from an API
  const users = [
    { id: '1', name: 'John Smith', role: 'Cleaner', status: 'active' },
    { id: '2', name: 'Sarah Johnson', role: 'Cleaner', status: 'active' },
    { id: '3', name: 'Mike Williams', role: 'Cleaner', status: 'inactive' },
    { id: '4', name: 'Emily Brown', role: 'Admin', status: 'active' },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Users menu"
        aria-expanded={isOpen}
      >
        <Users className="w-5 h-5" />
        <span className="text-sm font-medium">Users</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No users found
              </div>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    window.location.href = `/admin-dashboard?tab=employees&user=${user.id}`;
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => {
                window.location.href = '/admin-dashboard?tab=employees';
                setIsOpen(false);
              }}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              View All Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
