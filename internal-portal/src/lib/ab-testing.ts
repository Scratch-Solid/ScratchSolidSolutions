// A/B Testing Framework
// Simple implementation for tracking experiments and variants

export interface Experiment {
  id: string;
  name: string;
  variants: string[];
  weights?: number[]; // Optional weights for each variant (default: equal distribution)
  startDate?: string;
  endDate?: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  variant: string;
  userId?: number;
  sessionId: string;
  assignedAt: string;
}

// Active experiments configuration
const ACTIVE_EXPERIMENTS: Experiment[] = [
  // Add experiments here as needed
  // {
  //   id: 'onboarding_flow_v2',
  //   name: 'Onboarding Flow V2',
  //   variants: ['control', 'simplified'],
  //   weights: [0.5, 0.5],
  //   startDate: '2026-05-29',
  // },
];

// Get experiment assignment for a user/session
export function getExperimentAssignment(
  experimentId: string,
  userId?: number,
  sessionId?: string
): string | null {
  const experiment = ACTIVE_EXPERIMENTS.find((e) => e.id === experimentId);
  if (!experiment) return null;

  // Check if experiment is active
  const now = new Date();
  if (experiment.startDate && new Date(experiment.startDate) > now) return null;
  if (experiment.endDate && new Date(experiment.endDate) < now) return null;

  // Simple hash-based assignment for consistency
  const seed = userId ? userId.toString() : sessionId || Math.random().toString();
  const hash = simpleHash(seed + experimentId);
  const weights = experiment.weights || experiment.variants.map(() => 1 / experiment.variants.length);
  
  let cumulativeWeight = 0;
  const normalizedHash = (hash % 1000) / 1000;
  
  for (let i = 0; i < weights.length; i++) {
    cumulativeWeight += weights[i];
    if (normalizedHash <= cumulativeWeight) {
      return experiment.variants[i];
    }
  }
  
  return experiment.variants[0]; // Fallback to first variant
}

// Simple hash function for consistent assignment
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get all active experiments
export function getActiveExperiments(): Experiment[] {
  const now = new Date();
  return ACTIVE_EXPERIMENTS.filter((exp) => {
    if (exp.startDate && new Date(exp.startDate) > now) return false;
    if (exp.endDate && new Date(exp.endDate) < now) return false;
    return true;
  });
}

// Track experiment event (for analytics)
export function trackExperimentEvent(
  experimentId: string,
  variant: string,
  event: string,
  metadata?: Record<string, any>
): void {
  // This would typically send to an analytics service
  // For now, log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[A/B Test]', {
      experimentId,
      variant,
      event,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
  
  // TODO: Send to analytics database or service
}
