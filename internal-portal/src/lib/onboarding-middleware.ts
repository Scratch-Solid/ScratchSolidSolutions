import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';
import { getDb } from './db';

// Onboarding stage transitions
export const ONBOARDING_STAGES = {
  CONSENT_PENDING: 'consent_pending',
  CONSENT_APPROVED: 'consent_approved',
  PROFILE_CREATED: 'profile_created',
  CONTRACT_SIGNED: 'contract_signed',
  TRAINING_COMPLETED: 'training_completed',
  ACTIVE: 'active',
  REJECTED: 'rejected'
} as const;

// Valid stage transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  [ONBOARDING_STAGES.CONSENT_PENDING]: [ONBOARDING_STAGES.CONSENT_APPROVED, ONBOARDING_STAGES.REJECTED],
  [ONBOARDING_STAGES.CONSENT_APPROVED]: [ONBOARDING_STAGES.PROFILE_CREATED, ONBOARDING_STAGES.REJECTED],
  [ONBOARDING_STAGES.PROFILE_CREATED]: [ONBOARDING_STAGES.CONTRACT_SIGNED, ONBOARDING_STAGES.REJECTED],
  [ONBOARDING_STAGES.CONTRACT_SIGNED]: [ONBOARDING_STAGES.TRAINING_COMPLETED, ONBOARDING_STAGES.ACTIVE],
  [ONBOARDING_STAGES.TRAINING_COMPLETED]: [ONBOARDING_STAGES.ACTIVE],
  [ONBOARDING_STAGES.ACTIVE]: [],
  [ONBOARDING_STAGES.REJECTED]: []
};

// Required stages for each onboarding page
const PAGE_REQUIREMENTS: Record<string, string[]> = {
  '/auth/employee-consent': [], // No requirement - first step
  '/auth/consent-submitted': [ONBOARDING_STAGES.CONSENT_PENDING],
  '/auth/create-profile': [ONBOARDING_STAGES.CONSENT_APPROVED],
  '/auth/sign-contract': [ONBOARDING_STAGES.PROFILE_CREATED],
  '/cleaner-dashboard': [ONBOARDING_STAGES.CONTRACT_SIGNED, ONBOARDING_STAGES.TRAINING_COMPLETED, ONBOARDING_STAGES.ACTIVE],
  '/digital-dashboard': [ONBOARDING_STAGES.CONTRACT_SIGNED, ONBOARDING_STAGES.TRAINING_COMPLETED, ONBOARDING_STAGES.ACTIVE],
  '/transport-dashboard': [ONBOARDING_STAGES.CONTRACT_SIGNED, ONBOARDING_STAGES.TRAINING_COMPLETED, ONBOARDING_STAGES.ACTIVE],
  '/admin-dashboard': [ONBOARDING_STAGES.ACTIVE]
};

/**
 * Check if a stage transition is valid
 */
export function isValidTransition(fromStage: string, toStage: string): boolean {
  const allowedTransitions = VALID_TRANSITIONS[fromStage] || [];
  return allowedTransitions.includes(toStage);
}

/**
 * Get user's current onboarding stage
 */
export async function getUserOnboardingStage(userId: number): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const user = await db.prepare('SELECT onboarding_stage FROM users WHERE id = ?').bind(userId).first();
    return (user as any)?.onboarding_stage || null;
  } catch (error) {
    console.error('Failed to get user onboarding stage:', error);
    return null;
  }
}

/**
 * Middleware to check if user is at the correct stage for the requested page
 */
export async function withOnboardingStageCheck(request: NextRequest, requiredStages: string[] = []) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);
  
  if (!token) {
    return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const currentStage = await getUserOnboardingStage(decoded.userId);
  
  if (!currentStage) {
    return NextResponse.json({ error: 'Unable to determine onboarding stage' }, { status: 500 });
  }

  // If user is rejected, redirect to appropriate page
  if (currentStage === ONBOARDING_STAGES.REJECTED) {
    return NextResponse.json({ 
      error: 'Application rejected',
      redirect: '/auth/login',
      reason: 'Your application has been rejected. Please contact support.'
    }, { status: 403 });
  }

  // If no stages required, allow access
  if (requiredStages.length === 0) {
    return null; // Allow access
  }

  // Check if current stage is in required stages
  if (!requiredStages.includes(currentStage)) {
    // Find the first required stage that the user hasn't reached
    const stageIndex = requiredStages.indexOf(currentStage);
    const redirectPage = stageIndex === -1 ? 
      getRedirectForStage(requiredStages[0]) : 
      getRedirectForStage(currentStage);
    
    return NextResponse.json({ 
      error: 'Invalid onboarding stage',
      currentStage,
      requiredStages,
      redirect: redirectPage
    }, { status: 403 });
  }

  return null; // Allow access
}

/**
 * Get the appropriate redirect page for a given stage
 */
function getRedirectForStage(stage: string): string {
  const stageToPage: Record<string, string> = {
    [ONBOARDING_STAGES.CONSENT_PENDING]: '/auth/employee-consent',
    [ONBOARDING_STAGES.CONSENT_APPROVED]: '/auth/create-profile',
    [ONBOARDING_STAGES.PROFILE_CREATED]: '/auth/sign-contract',
    [ONBOARDING_STAGES.CONTRACT_SIGNED]: '/cleaner-dashboard?training_required=true',
    [ONBOARDING_STAGES.TRAINING_COMPLETED]: '/cleaner-dashboard',
    [ONBOARDING_STAGES.ACTIVE]: '/cleaner-dashboard',
    [ONBOARDING_STAGES.REJECTED]: '/auth/login'
  };
  return stageToPage[stage] || '/auth/login';
}

/**
 * Get required stages for a given page path
 */
export function getRequiredStagesForPage(path: string): string[] {
  // Check exact matches first
  if (PAGE_REQUIREMENTS[path]) {
    return PAGE_REQUIREMENTS[path];
  }
  
  // Check partial matches for dynamic routes
  for (const [pagePath, stages] of Object.entries(PAGE_REQUIREMENTS)) {
    if (path.startsWith(pagePath)) {
      return stages;
    }
  }
  
  return [];
}
