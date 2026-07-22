'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type DocumentContent = { title?: string; content?: string } | null;

export default function PreCleanerDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docContent, setDocContent] = useState<DocumentContent>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        router.push('/auth/cleaner-login');
        return;
      }

      try {
        const response = await fetch('/api/cleaner/pre-dashboard', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/cleaner-login');
            return;
          }
          throw new Error('Failed to fetch status');
        }

        const data = await response.json() as {
          data?: {
            can_transition_to_cleaner_dashboard?: boolean;
            progress_tracker?: {
              background_check_consent?: { completed?: boolean };
              contract_signed?: { completed?: boolean };
              training?: { completed?: boolean };
            };
          };
        };
        setStatus(data.data);
        localStorage.setItem('cleanerRedirectTo', data.data?.can_transition_to_cleaner_dashboard ? '/cleaner-dashboard' : '/cleaner-pre-dashboard');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [router]);

  useEffect(() => {
    const progressTracker = status?.progress_tracker;
    if (!progressTracker) return;

    const stepKey = !progressTracker.background_check_consent?.completed
      ? 'background_check'
      : !progressTracker.contract_signed?.completed
      ? 'contract'
      : null;

    if (!stepKey) return;

    const endpoint = stepKey === 'background_check' ? '/api/admin/consent-content' : '/api/admin/contract-content';
    const token = localStorage.getItem('authToken');

    setDocLoading(true);
    setDocError(false);
    setAcknowledged(false);

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('Failed to load document'))))
      .then(data => setDocContent(data))
      .catch(() => setDocError(true))
      .finally(() => setDocLoading(false));
  }, [status]);

  const handleBackgroundCheckConsent = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/cleaner/background-check-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (err) {
      setError('Failed to submit consent');
    }
  };

  const handleContractSign = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/cleaner/contract-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const data = await response.json() as {
          data?: {
            signing_url?: string;
            redirect_to_docusign?: boolean;
          };
        };
        if (data.data?.redirect_to_docusign && data.data?.signing_url) {
          window.location.href = data.data.signing_url;
          return;
        }
        window.location.reload();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error?.message || 'Failed to sign contract');
      }
    } catch (err) {
      setError('Failed to sign contract');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F2EA] to-[#F0E6D6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E1F16]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F2EA] to-[#F0E6D6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const progressTracker = status?.progress_tracker;
  const onboardingComplete = status?.can_transition_to_cleaner_dashboard === true;
  const steps = [
    { key: 'background_check', label: 'Background Check Consent', completed: progressTracker?.background_check_consent?.completed === true },
    { key: 'contract', label: 'Contract Signing', completed: progressTracker?.contract_signed?.completed === true },
    { key: 'training', label: 'Training Modules', completed: progressTracker?.training?.completed === true },
  ];

  const currentStep = steps.find(s => !s.completed) || steps[steps.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F2EA] to-[#F0E6D6] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Onboarding Dashboard</h1>
          <p className="text-stone-600 mb-8">Complete the following steps to start working</p>

          <div className="space-y-4 mb-8">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center p-4 rounded-lg border-2 ${
                  step.completed
                    ? 'border-green-500 bg-green-50'
                    : index === steps.indexOf(currentStep)
                    ? 'border-[#B08A5E] bg-[#F7F2EA]'
                    : 'border-stone-200 bg-stone-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  step.completed ? 'bg-green-500 text-white' : 'bg-stone-300 text-stone-600'
                }`}>
                  {step.completed ? '✓' : index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-800">{step.label}</h3>
                  <p className="text-sm text-stone-600">
                    {step.completed ? 'Completed' : index === steps.indexOf(currentStep) ? 'In Progress' : 'Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {!onboardingComplete && (
            <div className="bg-[#F7F2EA] border border-[#E9E0D3] rounded-lg p-6">
              <h2 className="text-xl font-semibold text-stone-800 mb-4">Current Step: {currentStep.label}</h2>
              
              {currentStep.key === 'background_check' && (
                <div className="space-y-4">
                  <p className="text-stone-600">Please review and sign the background check consent form.</p>
                  {docLoading ? (
                    <div className="h-32 bg-white border border-stone-200 rounded-lg animate-pulse" />
                  ) : docError || !docContent ? (
                    <p className="text-sm text-stone-500 italic">Document text unavailable - contact support if you'd like to review it before signing.</p>
                  ) : (
                    <div className="bg-white border border-stone-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <h3 className="font-semibold text-stone-800 mb-2">{docContent.title}</h3>
                      <p className="text-sm text-stone-600 whitespace-pre-wrap">{docContent.content}</p>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    I have read and understood this consent form
                  </label>
                  <button
                    onClick={() => handleBackgroundCheckConsent()}
                    disabled={!acknowledged}
                    className="px-6 py-3 bg-[#2E1F16] text-white rounded-lg font-semibold hover:bg-[#241811] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sign Consent Form
                  </button>
                </div>
              )}

              {currentStep.key === 'contract' && (
                <div className="space-y-4">
                  <p className="text-stone-600">Please review and sign your employment contract.</p>
                  {docLoading ? (
                    <div className="h-32 bg-white border border-stone-200 rounded-lg animate-pulse" />
                  ) : docError || !docContent ? (
                    <p className="text-sm text-stone-500 italic">Document text unavailable - contact support if you'd like to review it before signing.</p>
                  ) : (
                    <div className="bg-white border border-stone-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <h3 className="font-semibold text-stone-800 mb-2">{docContent.title}</h3>
                      <p className="text-sm text-stone-600 whitespace-pre-wrap">{docContent.content}</p>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    I have read and agree to this employment contract
                  </label>
                  <button
                    onClick={() => handleContractSign()}
                    disabled={!acknowledged}
                    className="px-6 py-3 bg-[#2E1F16] text-white rounded-lg font-semibold hover:bg-[#241811] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sign Contract
                  </button>
                </div>
              )}

              {currentStep.key === 'training' && (
                <div className="space-y-4">
                  <p className="text-stone-600">Complete all training modules to finish onboarding.</p>
                  <button
                    onClick={() => router.push('/cleaner-training')}
                    className="px-6 py-3 bg-[#2E1F16] text-white rounded-lg font-semibold hover:bg-[#241811] transition"
                  >
                    Start Training
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {onboardingComplete && (
          <div className="bg-green-50 border border-green-200 rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-4">🎉 Onboarding Complete!</h2>
            <p className="text-green-700 mb-6">You have completed all onboarding steps.</p>
            <button
              onClick={() => router.push('/cleaner-dashboard')}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Go to Cleaner Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
