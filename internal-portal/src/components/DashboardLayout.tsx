"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role?: 'admin' | 'cleaner' | 'digital' | 'transport';
}

export default function DashboardLayout({ children, title, role = 'admin' }: DashboardLayoutProps) {
  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    window.location.href = '/auth/login';
  };

  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { href: '/admin-dashboard', label: 'Overview' },
          { href: '/admin-dashboard?tab=new-joiners', label: 'New Joiners' },
          { href: '/admin-dashboard?tab=employees', label: 'Employees' },
          { href: '/admin-dashboard?tab=services-banking', label: 'Services & Banking' },
          { href: '/admin-dashboard?tab=content', label: 'Content' },
        ];
      case 'cleaner':
        return [
          { href: '/CleanerDashboard', label: 'Profile' },
          { href: '/CleanerDashboard?tab=tasks', label: 'Tasks' },
          { href: '/CleanerDashboard?tab=earnings', label: 'Earnings' },
        ];
      case 'digital':
        return [
          { href: '/digital-dashboard', label: 'Tasks' },
        ];
      case 'transport':
        return [
          { href: '/transport-dashboard', label: 'Deliveries' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Glassified Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">{title}</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg border border-red-500/30 transition-all duration-200 backdrop-blur-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Glassified Navigation */}
      <nav className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Glassified Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-6">
          {children}
        </div>
      </main>

      {/* Glassified Footer */}
      <footer className="bg-white/5 backdrop-blur-lg border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-white/60 text-sm">
            © 2024 Scratch Solid Solutions. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
