"use client";

import { useState } from "react";
import TwoFactorSetup from "@/components/auth/TwoFactorSetup";
import SessionManager from "@/components/auth/SessionManager";
import RoleManager from "@/components/auth/RoleManager";

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'2fa' | 'sessions' | 'roles'>('2fa');
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  const tabs = [
    { id: '2fa', label: 'Two-Factor Authentication', icon: '🔐' },
    { id: 'sessions', label: 'Session Management', icon: '💻' },
    { id: 'roles', label: 'Role Management', icon: '👥' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Authentication, sessions, and access control.</p>
      </div>

      <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === '2fa' && (
              <div>
                {!showTwoFactorSetup ? (
                  <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
                    <p className="text-gray-600 mb-6">
                      Enable two-factor authentication to add an extra layer of security to your account.
                      You'll need to enter a verification code from your authenticator app when signing in.
                    </p>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h3 className="font-medium text-blue-900 mb-2">Benefits of 2FA:</h3>
                      <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                        <li>Extra protection against unauthorized access</li>
                        <li>Backup codes for account recovery</li>
                        <li>Compatible with popular authenticator apps</li>
                        <li>Required for admin accounts</li>
                      </ul>
                    </div>

                    <button
                      onClick={() => setShowTwoFactorSetup(true)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Enable Two-Factor Authentication
                    </button>
                  </div>
                ) : (
                  <TwoFactorSetup
                    onSuccess={() => {
                      setShowTwoFactorSetup(false);
                      // Show success message or redirect
                    }}
                    onCancel={() => setShowTwoFactorSetup(false)}
                  />
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <SessionManager />
            )}

            {activeTab === 'roles' && (
              <RoleManager />
            )}
          </div>
  );
}
