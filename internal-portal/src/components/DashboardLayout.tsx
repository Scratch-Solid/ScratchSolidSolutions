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
    <div className="min-h-screen" style={{ background: 'var(--bg)', backgroundAttachment: 'fixed' }}>
      {/* Glassified Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-h)' }}>{title}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="secondary-button"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Glassified Navigation */}
      <nav className="glass-panel mb-6">
        <div className="app-header-inner py-3">
          <div className="flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/10"
                style={{ color: 'var(--text)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Glassified Content Area */}
      <main className="app-main">
        <div className="glass-panel">
          {children}
        </div>
      </main>

      {/* Glassified Footer */}
      <footer className="glass-panel mt-8">
        <div className="text-center py-4" style={{ color: 'var(--text)', opacity: 0.6 }}>
          © 2024 Scratch Solid Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
