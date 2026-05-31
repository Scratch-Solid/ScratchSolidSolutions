'use client';

import { useState } from 'react';
import { LayoutDashboard, Users, DollarSign, Wrench, FileText, Settings, Eye, UserCheck, GraduationCap, BarChart3, Menu, X, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: 'admin' | 'cleaner';
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const adminNavItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'employees', label: 'Employees', icon: <Users className="w-5 h-5" /> },
  { id: 'services-banking', label: 'Services', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'cleaners', label: 'Cleaners', icon: <UserCheck className="w-5 h-5" /> },
  { id: 'content', label: 'Content', icon: <FileText className="w-5 h-5" /> },
  { id: 'pricing', label: 'Pricing', icon: <Wrench className="w-5 h-5" /> },
  { id: 'proxy-observer', label: 'Proxy', icon: <Eye className="w-5 h-5" /> },
  { id: 'pool-management', label: 'Pools', icon: <Settings className="w-5 h-5" /> },
  { id: 'staff-reviews', label: 'Reviews', icon: <UserCheck className="w-5 h-5" /> },
  { id: 'training', label: 'Training', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'cleaner-analytics', label: 'Cleaner Analytics', icon: <BarChart3 className="w-5 h-5" /> },
];

const cleanerNavItems: NavItem[] = [
  { id: 'profile', label: 'Personal Details', icon: <UserCheck className="w-5 h-5" /> },
  { id: 'status', label: 'Status', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'tasks', label: 'Tasks', icon: <FileText className="w-5 h-5" /> },
  { id: 'earnings', label: 'Earnings', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'performance', label: 'Performance', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'training', label: 'Training', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'geolocation', label: 'Geolocation', icon: <Eye className="w-5 h-5" /> },
  { id: 'payslips', label: 'Payslips', icon: <FileText className="w-5 h-5" /> },
];

export default function Sidebar({ activeTab, onTabChange, role }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = role === 'admin' ? adminNavItems : cleanerNavItems;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Main navigation"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {!isCollapsed && (
              <h1 className="text-lg font-bold text-gray-900">
                {role === 'admin' ? 'Admin Portal' : 'Cleaner Portal'}
              </h1>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2" role="navigation">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      transition-colors duration-200
                      ${activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            {!isCollapsed && (
              <div className="text-xs text-gray-500">
                <p>Scratch Solid Solutions</p>
                <p>v1.0.0</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
