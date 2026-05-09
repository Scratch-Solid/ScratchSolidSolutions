"use client";

import React, { useState } from 'react';

interface TwoFactorVerifyProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  email?: string;
}

export default function TwoFactorVerify({ onSuccess, onCancel, email }: TwoFactorVerifyProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleVerify = async () => {
    const code = useBackupCode ? backupCode : verificationCode;
    
    if (!code) {
      setError(useBackupCode ? 'Please enter backup code' : 'Please enter verification code');
      return;
    }

    if (!useBackupCode && verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(useBackupCode ? { backupCode: code } : { token: code })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (error) {
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Two-Factor Authentication</h2>
      
      {email && (
        <p className="text-gray-600 mb-6">
          Signing in as <span className="font-medium">{email}</span>
        </p>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {!useBackupCode ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter 6-digit verification code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
              maxLength={6}
              autoFocus
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter backup code
            </label>
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono"
              maxLength={10}
              autoFocus
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setError('');
            setVerificationCode('');
            setBackupCode('');
          }}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {useBackupCode ? 'Use verification code instead' : 'Use backup code instead'}
        </button>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleVerify}
            disabled={loading || (!useBackupCode ? verificationCode.length !== 6 : !backupCode)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
