"use client";

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role?: 'admin' | 'cleaner' | 'digital' | 'transport';
}

export default function DashboardLayout({ children, title, role = 'admin' }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
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
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      localStorage.removeItem('user_id');
      window.location.href = '/auth/login';
    }
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
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null || 'User';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  SS
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                  <p className="text-xs text-slate-500">Internal Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'} border-b bg-white/95 backdrop-blur-xl`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden lg:block border-b bg-white/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm p-6 sm:p-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/60 backdrop-blur-xl mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-slate-500">
            © 2024 Scratch Solid Solutions. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
