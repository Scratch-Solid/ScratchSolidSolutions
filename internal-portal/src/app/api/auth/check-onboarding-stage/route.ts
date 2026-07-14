export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getUserOnboardingStage, getRequiredStagesForPage, ONBOARDING_STAGES } from '@/lib/onboarding-middleware';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const currentStage = await getUserOnboardingStage(decoded.userId);
    
    if (!currentStage) {
      return NextResponse.json({ error: 'Unable to determine onboarding stage' }, { status: 500 });
    }

    // If user is rejected, return error with redirect
    if (currentStage === ONBOARDING_STAGES.REJECTED) {
      return NextResponse.json({ 
        error: 'Application rejected',
        redirect: '/auth/login',
        reason: 'Your application has been rejected. Please contact support.'
      }, { status: 403 });
    }

    // Get the current page path from the request
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/auth/sign-contract';
    
    const requiredStages = getRequiredStagesForPage(path);
    
    // If no stages required, allow access
    if (requiredStages.length === 0) {
      return NextResponse.json({ currentStage, allowed: true });
    }

    // Check if current stage is in required stages
    if (!requiredStages.includes(currentStage)) {
      // Find the first required stage that the user hasn't reached
      const redirectPage = getRedirectForStage(requiredStages[0]);
      
      return NextResponse.json({ 
        error: 'Invalid onboarding stage',
        currentStage,
        requiredStages,
        redirect: redirectPage,
        allowed: false
      }, { status: 403 });
    }

    return NextResponse.json({ currentStage, allowed: true });
  } catch (error) {
    console.error('Check onboarding stage error:', error);
    return NextResponse.json({ error: `Failed to check onboarding stage: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

function getRedirectForStage(stage: string): string {
  const stageToPage: Record<string, string> = {
    [ONBOARDING_STAGES.CONSENT_PENDING]: '/cleaner-pre-dashboard',
    [ONBOARDING_STAGES.CONSENT_APPROVED]: '/auth/create-profile',
    [ONBOARDING_STAGES.PROFILE_CREATED]: '/auth/sign-contract',
    [ONBOARDING_STAGES.CONTRACT_SIGNED]: '/cleaner-dashboard?training_required=true',
    [ONBOARDING_STAGES.TRAINING_COMPLETED]: '/cleaner-dashboard',
    [ONBOARDING_STAGES.ACTIVE]: '/cleaner-dashboard',
    [ONBOARDING_STAGES.REJECTED]: '/auth/login'
  };
  return stageToPage[stage] || '/auth/login';
}
