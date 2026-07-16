'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CleanerSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    id_number: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    emergency_contact: '',
    bank_name: '',
    account_holder: '',
    account_number: '',
    branch_code: '',
    popia_consent: false,
    background_check_consent: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate consents
    if (!formData.popia_consent) {
      setError('You must consent to the POPIA privacy policy to proceed');
      setLoading(false);
      return;
    }

    // Validate bank details before submission
    if (!formData.bank_name || !formData.account_holder || !formData.account_number || !formData.branch_code) {
      setError('All bank detail fields are required');
      setLoading(false);
      return;
    }
    if (!/^\d{6,12}$/.test(formData.account_number.replace(/\s/g, ''))) {
      setError('Please enter a valid bank account number (6-12 digits)');
      setLoading(false);
      return;
    }
    if (!/^\d{4,6}$/.test(formData.branch_code.replace(/\s/g, ''))) {
      setError('Please enter a valid branch code (4-6 digits)');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/signup/cleaner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bank_details: `${formData.bank_name} | ${formData.account_holder} | ${formData.account_number} | ${formData.branch_code}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as {
          error?: string | { code?: string; message?: string; suggestion?: string; details?: any };
          details?: string[];
        };

        let errorMsg = 'Failed to submit application';
        if (typeof data.error === 'string') {
          errorMsg = data.details ? `${data.error}: ${data.details.join(', ')}` : data.error;
        } else if (data.error && typeof data.error === 'object') {
          const errObj = data.error as { message?: string; suggestion?: string };
          errorMsg = errObj.message || 'Failed to submit application';
          if (errObj.suggestion) {
            errorMsg += `. ${errObj.suggestion}`;
          }
        }
        throw new Error(errorMsg);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F2EA] to-[#F0E6D6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        <h1 className="text-3xl font-bold text-center text-stone-800 mb-2">Cleaner Application</h1>
        <p className="text-center text-stone-600 mb-2">Submit your application to join our cleaning team</p>
        <p className="text-center text-sm mb-8">
          Already have an account?{' '}
          <a href="/auth/login" className="text-[#2E1F16] underline">Back to Login</a>
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            Application submitted successfully! We will review your application and contact you shortly.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">Full Name *</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="id_number" className="block text-sm font-medium text-stone-700 mb-2">ID Number / Passport *</label>
                <input
                  id="id_number"
                  type="text"
                  required
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">Email *</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-2">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-stone-700 mb-2">WhatsApp Number</label>
                <input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-stone-700 mb-2">Address *</label>
                <input
                  id="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="emergency_contact" className="block text-sm font-medium text-stone-700 mb-2">Emergency Contact *</label>
                <input
                  id="emergency_contact"
                  type="text"
                  required
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-stone-700 mb-2">Bank Details *</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bank_name" className="block text-xs font-medium text-stone-600 mb-1">Bank Name</label>
                    <input
                      id="bank_name"
                      type="text"
                      required
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="account_holder" className="block text-xs font-medium text-stone-600 mb-1">Account Holder Name</label>
                    <input
                      id="account_holder"
                      type="text"
                      required
                      value={formData.account_holder}
                      onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="account_number" className="block text-xs font-medium text-stone-600 mb-1">Account Number</label>
                    <input
                      id="account_number"
                      type="text"
                      required
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label htmlFor="branch_code" className="block text-xs font-medium text-stone-600 mb-1">Branch Code</label>
                    <input
                      id="branch_code"
                      type="text"
                      required
                      value={formData.branch_code}
                      onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.popia_consent}
                  onChange={(e) => setFormData({ ...formData, popia_consent: e.target.checked })}
                  className="mt-1 h-4 w-4 text-[#2E1F16] border-stone-300 rounded focus:ring-[#B08A5E]"
                />
                <span className="text-sm text-stone-600">
                  I consent to Scratch Solid Solutions collecting and processing my personal information in accordance with the
                  {' '}<a href="/privacy-policy" target="_blank" className="text-[#2E1F16] underline">POPIA Privacy Policy</a>.
                  I understand my data will be stored securely and I may request deletion at any time.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.background_check_consent}
                  onChange={(e) => setFormData({ ...formData, background_check_consent: e.target.checked })}
                  className="mt-1 h-4 w-4 text-[#2E1F16] border-stone-300 rounded focus:ring-[#B08A5E]"
                />
                <span className="text-sm text-stone-600">
                  I consent to a background check (criminal record, credit, and reference verification) being conducted
                  should my application proceed to the final stage. I understand this is optional at application time and
                  may be requested later.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2E1F16] text-white py-3 rounded-lg font-semibold hover:bg-[#241811] transition duration-200 disabled:bg-stone-400"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
