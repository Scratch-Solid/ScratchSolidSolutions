"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

interface QRCodeDisplayProps {
  promoCode: string;
  shareUrl: string;
  onClose: () => void;
}

export default function QRCodeDisplay({ promoCode, shareUrl, onClose }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQRCode = async () => {
      setLoading(true);
      setError('');
      try {
        // For now, we'll use the qrcode.react library directly
        // In the future, this could call the API endpoint
        setLoading(false);
      } catch (err) {
        setError('Failed to generate QR code');
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [promoCode]);

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `promo-${promoCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8 max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-blue-700 mb-6">QR Code for {promoCode}</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center bg-white p-4 rounded-lg border border-gray-200">
              <QRCode
                value={shareUrl}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Share URL:</p>
                <p className="text-sm font-mono text-gray-800 break-all">{shareUrl}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                >
                  Download QR Code
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Scan this QR code to apply the promo code</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
