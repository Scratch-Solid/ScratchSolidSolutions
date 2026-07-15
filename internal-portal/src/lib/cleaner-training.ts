export type CleanerTrainingModule = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
};

export const CLEANER_TRAINING_MODULES: CleanerTrainingModule[] = [
  {
    id: 'module-1',
    title: 'POPIA, Privacy & Data Protection',
    description:
      'Understand the Protection of Personal Information Act (POPIA). Learn how to handle client data, ' +
      'obtain consent, report breaches within 48 hours, and securely dispose of records. ' +
      'Includes Scratch Solid\'s data-retention and right-to-be-forgotten policies.',
    duration_minutes: 45,
  },
  {
    id: 'module-2',
    title: 'Occupational Health & Safety (OHS)',
    description:
      'South African OHS Act compliance for cleaners. Covers PPE requirements, slip-trip-fall prevention, ' +
      'hazardous chemical handling (GHS labels), emergency procedures, and incident reporting. ' +
      'Includes COID Act basics and employer/employee duties.',
    duration_minutes: 50,
  },
  {
    id: 'module-3',
    title: 'Cleaning Standards & Service Delivery',
    description:
      'Scratch Solid\'s 5-star service standard: room-by-room checklists, colour-coded cloth systems, ' +
      'cross-contamination prevention, high-touch disinfection, and post-construction clean-up protocols. ' +
      'Aligns with SANS 10049 and ISO 9001 quality principles.',
    duration_minutes: 55,
  },
  {
    id: 'module-4',
    title: 'Equipment, Chemicals & Sustainability',
    description:
      'Correct use and daily maintenance of vacuum cleaners, floor scrubbers, pressure washers, and ' +
      'micro-fibre systems. Chemical dilution ratios, SDS sheets, green-cleaning alternatives, ' +
      'and water-saving practices for the South African context.',
    duration_minutes: 40,
  },
  {
    id: 'module-5',
    title: 'Customer Relations, Complaints & WhatsApp Protocol',
    description:
      'Professional communication with residential and commercial clients. Escalation paths, ' +
      'complaint resolution within 24 hours, WhatsApp Business etiquette, photo-reporting standards, ' +
      'and maintaining a 4.8+ star review average.',
    duration_minutes: 35,
  },
  {
    id: 'module-6',
    title: 'Booking App, GPS Check-In & Shift Adherence',
    description:
      'How to use the Scratch Solid mobile portal: accept bookings, GPS check-in (START/HERE/DONE), ' +
      'adherence scoring, 13th-cheque eligibility rules, pool-transition requests, and payslip access ' +
      'via the ERPNext integration.',
    duration_minutes: 30,
  },
  {
    id: 'module-7',
    title: 'Your Pool, Your KPI, Your Bonus — How Your Pay Grows',
    description:
      'This module explains exactly how your day-to-day work turns into your annual bonus and salary increase, so you can start growing it from day one. ' +
      'Every cleaner is placed in one of two pools by the admin team. If you\'re in the AUTO pool, the system assigns you automatically to standard and maintenance cleans - jobs one person can finish inside a normal booking window. ' +
      'If you\'re in the MANUAL pool, the admin team assigns you by hand, usually together with one or more other cleaners, to bigger jobs like deep cleans, post-construction clean-ups, commercial sites, and move-in/move-out cleans - jobs that need more than one person to finish properly in the time given. ' +
      'Being in either pool is not a reward or a punishment - it\'s about matching the right team size to the right job, and you can ask your admin which pool you\'re in and why at any time. ' +
      'Once a month, your performance is scored out of 5, made up of three parts that always add up to 100%. Fifty percent comes from your client rating - the actual rating your client gives the job after it\'s done, real customer feedback rather than anyone\'s guess, so the way you treat clients and the quality you leave behind directly moves half your score. ' +
      'Twenty-five percent comes from the system score, calculated automatically from your GPS check-in against your scheduled start time - arriving on time or early keeps this score high, and it drops the later you check in, coming straight from your check-in rather than being typed in by anyone. ' +
      'The last twenty-five percent comes from your monthly admin review, where an admin rates your attendance, how well you live the company\'s values, the quality of your work, and how you communicate - this is where things that aren\'t captured automatically, like teamwork, attitude, and following procedure, get recognised. ' +
      'On a MANUAL-pool job with more than one cleaner assigned, everyone on that job shares the same client rating since there\'s only one client experience to rate, but your system score and admin score are still yours alone, so your own punctuality and your own admin review always affect your own KPI, even on a shared job. ' +
      'Your monthly scores are averaged across the year, and that average is your annual KPI, used every February to work out your bonus and salary increase for the year ahead: a KPI of 5 out of 5 pays 100% of your bonus amount and 100% of that year\'s increase budget, 4 out of 5 pays 80%, 3 out of 5 pays 60%, 2 out of 5 pays 40%, and 1 out of 5 pays 20%. ' +
      'You can check your current KPI, its three components, and an estimate of your bonus at any time on your dashboard - it updates as new ratings and reviews come in, so you always know where you stand and what to focus on. ' +
      'From day one: show up on time or early for every job to protect your system score, do careful thorough work and treat every client well to protect your client score, and follow the standards from Modules 1 through 6 and communicate professionally to protect your admin score - all three together are what grow your bonus and your increase every year.',
    duration_minutes: 40,
  },
];

export type NormalizedCleanerTrainingProgress = {
  modules_completed: string[];
  modules_pending: string[];
  completion_percentage: number;
  completed: boolean;
  background_check_consent: boolean;
  background_check_consent_at: string | null;
  contract_signed: boolean;
  contract_signed_at: string | null;
  contract_signature_id: string | null;
};

function parseModuleList(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getDefaultPendingModules(): string[] {
  return CLEANER_TRAINING_MODULES.map((module) => module.id);
}

export function buildCleanerTrainingModules(progress: NormalizedCleanerTrainingProgress) {
  const firstPendingModuleId = progress.modules_pending[0] || null;

  return CLEANER_TRAINING_MODULES.map((module) => {
    const isCompleted = progress.modules_completed.includes(module.id);
    const isActive = !isCompleted && module.id === firstPendingModuleId;

    return {
      id: module.id,
      title: module.title,
      description: module.description,
      duration: `${module.duration_minutes} minutes`,
      duration_minutes: module.duration_minutes,
      completed: isCompleted,
      status: isCompleted ? 'completed' : isActive ? 'active' : 'locked',
    };
  });
}

function normalizeTrainingProgressRecord(record: Record<string, unknown> | null): NormalizedCleanerTrainingProgress {
  const defaultPendingModules = getDefaultPendingModules();
  const modulesCompleted = parseModuleList(record?.modules_completed);
  let modulesPending = parseModuleList(record?.modules_pending);

  if (modulesPending.length === 0 && modulesCompleted.length === 0) {
    modulesPending = defaultPendingModules;
  }

  const knownModuleIds = new Set(defaultPendingModules);
  const sanitizedCompleted = modulesCompleted.filter((moduleId) => knownModuleIds.has(moduleId));
  const remainingModules = defaultPendingModules.filter((moduleId) => !sanitizedCompleted.includes(moduleId));
  const sanitizedPending = remainingModules.filter((moduleId) => modulesPending.includes(moduleId) || !modulesPending.length);
  const finalPending = sanitizedPending.length > 0 ? sanitizedPending : remainingModules;
  const completionPercentage = defaultPendingModules.length > 0
    ? Math.round((sanitizedCompleted.length / defaultPendingModules.length) * 100)
    : 0;
  const completed = finalPending.length === 0;

  return {
    modules_completed: sanitizedCompleted,
    modules_pending: finalPending,
    completion_percentage: completed ? 100 : completionPercentage,
    completed,
    background_check_consent: record?.background_check_consent === 1,
    background_check_consent_at: typeof record?.background_check_consent_at === 'string' ? record.background_check_consent_at : null,
    contract_signed: record?.contract_signed === 1,
    contract_signed_at: typeof record?.contract_signed_at === 'string' ? record.contract_signed_at : null,
    contract_signature_id: typeof record?.contract_signature_id === 'string' ? record.contract_signature_id : null,
  };
}

export async function ensureCleanerTrainingProgress(db: D1Database, paysheetCode: string) {
  const existingRecord = await db.prepare(
    'SELECT * FROM training_progress WHERE employee_id = ?'
  ).bind(paysheetCode).first<Record<string, unknown>>();

  if (!existingRecord) {
    const defaultPendingModules = getDefaultPendingModules();
    await db.prepare(
      `INSERT INTO training_progress (
        employee_id,
        modules_completed,
        modules_pending,
        completion_percentage,
        completed,
        background_check_consent,
        contract_signed,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 0, 0, 0, 0, datetime('now'), datetime('now'))`
    ).bind(
      paysheetCode,
      JSON.stringify([]),
      JSON.stringify(defaultPendingModules)
    ).run();

    return normalizeTrainingProgressRecord({
      modules_completed: '[]',
      modules_pending: JSON.stringify(defaultPendingModules),
      completion_percentage: 0,
      completed: 0,
      background_check_consent: 0,
      contract_signed: 0,
      background_check_consent_at: null,
      contract_signed_at: null,
      contract_signature_id: null,
    });
  }

  const normalized = normalizeTrainingProgressRecord(existingRecord);
  const needsRepair =
    JSON.stringify(parseModuleList(existingRecord.modules_completed)) !== JSON.stringify(normalized.modules_completed) ||
    JSON.stringify(parseModuleList(existingRecord.modules_pending)) !== JSON.stringify(normalized.modules_pending) ||
    Number(existingRecord.completion_percentage || 0) !== normalized.completion_percentage ||
    Number(existingRecord.completed || 0) !== (normalized.completed ? 1 : 0);

  if (needsRepair) {
    await db.prepare(
      `UPDATE training_progress
       SET modules_completed = ?, modules_pending = ?, completion_percentage = ?, completed = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(
      JSON.stringify(normalized.modules_completed),
      JSON.stringify(normalized.modules_pending),
      normalized.completion_percentage,
      normalized.completed ? 1 : 0,
      paysheetCode
    ).run();
  }

  return normalized;
}

export function completeCleanerTrainingModule(
  progress: NormalizedCleanerTrainingProgress,
  moduleId: string
) {
  if (progress.modules_completed.includes(moduleId)) {
    return {
      modules_completed: progress.modules_completed,
      modules_pending: progress.modules_pending,
      completion_percentage: progress.completion_percentage,
      completed: progress.completed,
      all_completed: progress.completed,
    };
  }

  const modulesCompleted = [...progress.modules_completed, moduleId].filter((value, index, array) => array.indexOf(value) === index);
  const modulesPending = progress.modules_pending.filter((pendingModuleId) => pendingModuleId !== moduleId);
  const total = CLEANER_TRAINING_MODULES.length;
  const allCompleted = modulesPending.length === 0;
  const completionPercentage = total > 0 ? Math.round((modulesCompleted.length / total) * 100) : 0;

  return {
    modules_completed: modulesCompleted,
    modules_pending: modulesPending,
    completion_percentage: allCompleted ? 100 : completionPercentage,
    completed: allCompleted,
    all_completed: allCompleted,
  };
}

export async function setCleanerOnboardingStage(db: D1Database, userId: number, stage: string) {
  try {
    await db.prepare(
      `UPDATE users
       SET onboarding_stage = ?
       WHERE id = ?`
    ).bind(stage, userId).run();
  } catch {
  }
}
