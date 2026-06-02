export type CleanerTrainingModule = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
};

export const CLEANER_TRAINING_MODULES: CleanerTrainingModule[] = [
  {
    id: 'module-1',
    title: 'Introduction to Cleaning Services',
    description: 'Learn about our cleaning standards and procedures',
    duration_minutes: 30,
  },
  {
    id: 'module-2',
    title: 'Safety Protocols',
    description: 'Essential safety guidelines and procedures',
    duration_minutes: 45,
  },
  {
    id: 'module-3',
    title: 'Customer Service Excellence',
    description: 'How to provide exceptional customer service',
    duration_minutes: 40,
  },
  {
    id: 'module-4',
    title: 'Equipment Handling',
    description: 'Proper use and maintenance of cleaning equipment',
    duration_minutes: 35,
  },
  {
    id: 'module-5',
    title: 'Chemical Safety',
    description: 'Safe handling of cleaning chemicals',
    duration_minutes: 30,
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
