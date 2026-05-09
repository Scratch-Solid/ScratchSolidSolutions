"use client";

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface TwoFactorSetupProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TwoFactorSetup({ onSuccess, onCancel }: TwoFactorSetupProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodeSaved, setBackupCodeSaved] = useState(false);

  useEffect(() => {
    setupTwoFactor();
  }, []);

  const setupTwoFactor = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setQrCodeUrl(data.data.qrCodeUrl);
        setSecret(data.data.secret);
        setBackupCodes(data.data.backupCodes);
        setStep('verify');
      } else {
        setError(data.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      setError('Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
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
        body: JSON.stringify({ token: verificationCode })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Failed to verify 2FA');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setBackupCodeSaved(true);
    setTimeout(() => setBackupCodeSaved(false), 3000);
  };

  if (step === 'setup') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Setup Two-Factor Authentication</h2>
        
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Setting up 2FA...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Setup Two-Factor Authentication</h2>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Step 1: Scan QR Code</h3>
            <p className="text-gray-600 mb-4">
              Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
            </p>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 border border-gray-200 rounded">
                {qrCodeUrl && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Or manually enter this secret:</p>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm break-all">{secret}</code>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Step 2: Save Backup Codes</h3>
            <p className="text-gray-600 mb-4">
              Save these backup codes in a secure location. You can use them if you lose access to your authenticator app:
            </p>
            <div className="bg-gray-50 p-4 rounded border">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((code, index) => (
                  <code key={index} className="text-sm bg-white px-2 py-1 rounded border">
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadBackupCodes}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={copyBackupCodes}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  {backupCodeSaved ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Step 3: Verify Setup</h3>
            <p className="text-gray-600 mb-4">
              Enter the 6-digit code from your authenticator app to complete setup:
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={verifyTwoFactor}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Enable 2FA'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
