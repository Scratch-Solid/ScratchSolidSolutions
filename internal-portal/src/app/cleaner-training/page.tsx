'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CleanerTrainingPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    status: 'locked' | 'active' | 'completed';
    completed: boolean;
  }>>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingModuleId, setSubmittingModuleId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function fetchTraining() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.push('/auth/cleaner-login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/cleaner/training', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/cleaner-login');
          return;
        }
        throw new Error('Failed to load training modules');
      }

      const data = await response.json() as {
        data?: {
          modules?: Array<{
            id: string;
            title: string;
            description: string;
            duration: string;
            status: 'locked' | 'active' | 'completed';
            completed: boolean;
          }>;
          progress?: { completed: number; total: number; percentage: number };
        };
      };

      setModules(data.data?.modules || []);
      setProgress(data.data?.progress || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTraining();
  }, []);

  async function handleCompleteModule(moduleId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.push('/auth/cleaner-login');
      return;
    }

    setSubmittingModuleId(moduleId);
    setError('');

    try {
      const response = await fetch(`/api/cleaner/training/${moduleId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json() as {
        error?: { message?: string };
        data?: { can_transition_to_cleaner_dashboard?: boolean };
      };

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to complete module');
      }

      if (data.data?.can_transition_to_cleaner_dashboard) {
        localStorage.setItem('cleanerRedirectTo', '/cleaner-dashboard');
        router.push('/cleaner-dashboard');
        return;
      }

      await fetchTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete module');
    } finally {
      setSubmittingModuleId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-3xl font-bold text-slate-900">Cleaner Training</h1>
          <p className="text-slate-600 mt-2">Complete each module in order to finish onboarding.</p>

          <div className="mt-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Progress</span>
              <span>{progress?.completed || 0}/{progress?.total || 0} modules</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${progress?.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {modules.map((module) => {
            const disabled = module.status !== 'active' || submittingModuleId === module.id;
            return (
              <div key={module.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-slate-900">{module.title}</h2>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        module.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : module.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {module.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{module.description}</p>
                    <p className="text-sm text-slate-500 mt-2">Duration: {module.duration}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {module.status === 'completed' ? (
                      <button disabled className="px-5 py-3 rounded-lg bg-green-50 text-green-700 font-medium cursor-not-allowed">
                        Completed
                      </button>
                    ) : (
                      <button
                        disabled={disabled}
                        onClick={() => handleCompleteModule(module.id)}
                        className="px-5 py-3 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {submittingModuleId === module.id ? 'Saving...' : module.status === 'active' ? 'Mark Complete' : 'Locked'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => router.push('/cleaner-pre-dashboard')}
            className="px-5 py-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
          >
            Back to Onboarding
          </button>
        </div>
      </div>
    </div>
  );
}
