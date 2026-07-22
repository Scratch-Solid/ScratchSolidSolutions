'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  HardHat,
  Sparkles,
  FlaskConical,
  MessageCircle,
  MapPin,
  TrendingUp,
  Check,
  Lock,
  Clock,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import LessonReader from '@/components/LessonReader';
import QuizInterface from '@/components/QuizInterface';

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'module-1': ShieldCheck,
  'module-2': HardHat,
  'module-3': Sparkles,
  'module-4': FlaskConical,
  'module-5': MessageCircle,
  'module-6': MapPin,
  'module-7': TrendingUp,
};

type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; text: string };

type TrainingModule = {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessonContent: LessonBlock[];
  quiz: { question: string; options: string[] }[];
  status: 'locked' | 'active' | 'completed';
  completed: boolean;
};

export default function CleanerTrainingPage() {
  const router = useRouter();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'hub' | 'lesson' | 'quiz'>('hub');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // silent=true skips the page-level loading flag - used for background
  // refreshes (e.g. right after a quiz submit) so the active quiz/lesson
  // view doesn't get unmounted (and its result screen lost) mid-render.
  async function fetchTraining(silent = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.push('/auth/cleaner-login');
      return;
    }

    if (!silent) setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/cleaner/training', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/cleaner-login');
          return;
        }
        throw new Error('Failed to load training modules');
      }

      const data = await response.json() as { data?: { modules?: TrainingModule[]; progress?: typeof progress } };
      setModules(data.data?.modules || []);
      setProgress(data.data?.progress || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchTraining();
  }, []);

  async function submitQuiz(moduleId: string, answers: number[]) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/cleaner/training/${moduleId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json() as {
      error?: { message?: string; score?: number };
      data?: { can_transition_to_cleaner_dashboard?: boolean; percentage?: number };
    };

    if (!response.ok) {
      return { passed: false, score: data.error?.score ?? 0, message: data.error?.message };
    }

    // Silent refresh - keeps the success screen on-screen instead of
    // flashing back to a fresh, question-1 quiz mid-render.
    await fetchTraining(true);
    if (data.data?.can_transition_to_cleaner_dashboard) {
      setOnboardingComplete(true);
    }
    return { passed: true, score: 100 };
  }

  const activeModule = modules.find((m) => m.id === activeModuleId) || null;

  function returnFromQuiz() {
    if (onboardingComplete) {
      localStorage.setItem('cleanerRedirectTo', '/cleaner-dashboard');
      router.push('/cleaner-dashboard');
      return;
    }
    setView('hub');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground" />
      </div>
    );
  }

  if (view === 'quiz' && activeModule) {
    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-xl mx-auto mb-6">
          <button onClick={() => setView('lesson')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to lesson
          </button>
        </div>
        <QuizInterface
          moduleTitle={activeModule.title}
          questions={activeModule.quiz}
          onSubmit={(answers) => submitQuiz(activeModule.id, answers)}
          onCancel={returnFromQuiz}
        />
      </div>
    );
  }

  if (view === 'lesson' && activeModule) {
    const Icon = MODULE_ICONS[activeModule.id] || BookOpen;
    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <button onClick={() => setView('hub')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All modules
          </button>

          <div className="bg-card border border-border rounded-xl shadow-sm p-7">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{activeModule.title}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {activeModule.duration}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm p-7">
            <LessonReader blocks={activeModule.lessonContent} />
          </div>

          <button onClick={() => setView('quiz')} className="w-full primary-button">
            Take the quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl shadow-sm p-7">
          <h1 className="text-xl font-semibold text-foreground">Training</h1>
          <p className="text-sm text-muted-foreground mt-1">Work through each module at your own pace - open it, read through, then take the quiz.</p>

          <div className="mt-5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
              <span>Overall progress</span>
              <span>{progress?.completed || 0} of {progress?.total || 0} modules</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div className="bg-accent h-full rounded-full transition-all" style={{ width: `${progress?.percentage || 0}%` }} />
            </div>
          </div>
        </div>

        {error && (
          <div className="error-msg text-sm">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((module) => {
            const Icon = MODULE_ICONS[module.id] || BookOpen;
            const locked = module.status === 'locked';
            const completed = module.status === 'completed';
            return (
              <button
                key={module.id}
                disabled={locked}
                onClick={() => {
                  setActiveModuleId(module.id);
                  setView('lesson');
                }}
                className={`text-left bg-card border rounded-xl p-5 transition-all ${
                  locked
                    ? 'border-border opacity-60 cursor-not-allowed'
                    : 'border-border hover:border-accent/50 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    completed ? 'bg-emerald-100 text-emerald-600' : locked ? 'bg-secondary text-muted-foreground' : 'bg-accent/15 text-accent-foreground'
                  }`}>
                    {completed ? <Check className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {module.duration}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-foreground mb-1">{module.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{module.description}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/cleaner-pre-dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to onboarding
        </button>
      </div>
    </div>
  );
}
