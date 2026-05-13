"use client";

import React, { useState, useEffect } from 'react';

interface PromoDistributionModalProps {
  promoCode: {
    id: number;
    code: string;
    description: string;
  };
  onClose: () => void;
  onDistribute: (data: { channel: string; recipientCount: number; notes: string }) => void;
}

export default function PromoDistributionModal({ 
  promoCode, 
  onClose, 
  onDistribute 
}: PromoDistributionModalProps) {
  const [channel, setChannel] = useState('email');
  const [recipientCount, setRecipientCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const channels = [
    { value: 'email', label: 'Email Campaign', icon: '📧' },
    { value: 'print', label: 'Print Materials', icon: '📄' },
    { value: 'social', label: 'Social Media', icon: '📱' },
    { value: 'qr', label: 'QR Code', icon: '📷' },
    { value: 'direct', label: 'Direct Share', icon: '🔗' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onDistribute({
        channel,
        recipientCount,
        notes,
      });
      onClose();
    } catch (error) {
      console.error('Distribution failed:', error);
      alert('Failed to distribute promo code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8 max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Distribute Promo Code</h2>
        <p className="text-gray-600 mb-6">
          Code: <span className="font-mono font-bold text-blue-600">{promoCode.code}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Distribution Channel
            </label>
            <div className="grid grid-cols-1 gap-3">
              {channels.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChannel(c.value)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    channel === c.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="recipientCount" className="block text-sm font-semibold text-gray-700 mb-2">
              Recipient Count
            </label>
            <input
              type="number"
              id="recipientCount"
              min="1"
              value={recipientCount}
              onChange={(e) => setRecipientCount(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Number of recipients"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about this distribution..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Distributing...' : 'Distribute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
