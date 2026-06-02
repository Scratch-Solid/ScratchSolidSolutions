export type CleanerOnboardingState =
  | 'profile_missing'
  | 'training_record_missing'
  | 'consent_pending'
  | 'contract_pending'
  | 'training_pending'
  | 'active';

export type CleanerOnboardingStatus = {
  onboarding_state: CleanerOnboardingState;
  redirect_to: '/cleaner-pre-dashboard' | '/cleaner-dashboard';
  next_step: 'background_check_consent' | 'contract_sign' | 'training' | 'complete' | 'contact_support';
  can_transition_to_cleaner_dashboard: boolean;
};

export async function getCleanerOnboardingStatus(
  db: D1Database,
  userId: number
): Promise<CleanerOnboardingStatus> {
  const cleanerRecord = await db.prepare(
    `SELECT
      cp.paysheet_code,
      tp.background_check_consent,
      tp.contract_signed,
      tp.completed,
      tp.completion_percentage
    FROM cleaner_profiles cp
    LEFT JOIN training_progress tp ON cp.paysheet_code = tp.employee_id
    WHERE cp.user_id = ?`
  ).bind(userId).first();

  if (!cleanerRecord) {
    return {
      onboarding_state: 'profile_missing',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'contact_support',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  const cleaner = cleanerRecord as {
    background_check_consent?: number | null;
    contract_signed?: number | null;
    completed?: number | null;
    completion_percentage?: number | null;
  };

  if (
    cleaner.background_check_consent == null &&
    cleaner.contract_signed == null &&
    cleaner.completed == null &&
    cleaner.completion_percentage == null
  ) {
    return {
      onboarding_state: 'training_record_missing',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'contact_support',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  if (cleaner.background_check_consent !== 1) {
    return {
      onboarding_state: 'consent_pending',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'background_check_consent',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  if (cleaner.contract_signed !== 1) {
    return {
      onboarding_state: 'contract_pending',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'contract_sign',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  if (cleaner.completed !== 1) {
    return {
      onboarding_state: 'training_pending',
      redirect_to: '/cleaner-pre-dashboard',
      next_step: 'training',
      can_transition_to_cleaner_dashboard: false,
    };
  }

  return {
    onboarding_state: 'active',
    redirect_to: '/cleaner-dashboard',
    next_step: 'complete',
    can_transition_to_cleaner_dashboard: true,
  };
}
