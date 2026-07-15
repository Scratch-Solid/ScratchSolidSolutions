// Pool-Based Assignment Logic
//
// AUTO pool: cleaners eligible for automatic, system-driven assignment to
// smaller jobs (standard/maintenance cleans) a single cleaner can complete
// within the booking window.
// MANUAL pool: cleaners the admin assigns by hand, usually multiple to one
// booking, for bigger jobs (deep clean, commercial, move-in/move-out) that
// don't fit in a single cleaner's window.
//
// Which pool a booking needs is a property of the *service* booked
// (`services.requires_manual_pool`), not something inferred from a
// free-text service type string - see migration 054 for why.

export type AssignmentPool = 'AUTO' | 'MANUAL';
export type TimeSlot = '08:00' | '11:00' | '12:00' | '14:00' | null;
export type AssignmentStatus = 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled';

export interface AssignmentCandidate {
  cleanerId: number;
  cleanerName: string;
  score: number;
  availableSlots: TimeSlot[];
}

/**
 * Looks up whether a booking's service requires the MANUAL pool. Falls back
 * to AUTO (the common case) if the service can't be resolved, rather than
 * failing the booking outright.
 */
export async function resolveAssignmentPool(db: D1Database, serviceName: string | null | undefined): Promise<AssignmentPool> {
  if (!serviceName) return 'AUTO';
  const service = await db.prepare(
    'SELECT requires_manual_pool FROM services WHERE name = ?'
  ).bind(serviceName).first<{ requires_manual_pool: number }>();
  return service?.requires_manual_pool ? 'MANUAL' : 'AUTO';
}

export function isValidTimeSlot(slot: string): slot is TimeSlot {
  return ['08:00', '11:00', '12:00', '14:00'].includes(slot);
}

export function getAvailableTimeSlots(assignmentDate: string): TimeSlot[] {
  const slots: TimeSlot[] = ['08:00', '11:00', '12:00', '14:00'];
  return slots;
}

/**
 * Scores AUTO-pool candidates for a single-cleaner assignment. Only cleaners
 * with assignment_pool = 'AUTO', not already booked at this slot, and with
 * completed training are eligible.
 */
export async function scoreAssignmentCandidates(
  db: D1Database,
  trainingDb: D1Database,
  assignmentDate: string,
  timeSlot: TimeSlot
): Promise<AssignmentCandidate[]> {
  const cleanersResult = await db.prepare(`
    SELECT cp.id, cp.first_name, cp.last_name
    FROM cleaner_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.assignment_pool = 'AUTO' AND cp.status != 'blocked' AND u.deleted = 0
  `).all<{ id: number; first_name: string; last_name: string }>();

  const cleaners = cleanersResult.results || [];
  const candidates: AssignmentCandidate[] = [];

  for (const c of cleaners) {
    const existingAssignment = await db.prepare(`
      SELECT COUNT(*) as count
      FROM booking_assignments
      WHERE cleaner_id = ? AND assignment_date = ? AND time_slot = ? AND status != 'cancelled'
    `).bind(c.id, assignmentDate, timeSlot).first<{ count: number }>();

    if (existingAssignment?.count === 0) {
      const trainingProgress = await trainingDb.prepare(
        'SELECT training_status FROM employee_training_progress WHERE user_id = ?'
      ).bind(c.id.toString()).first<{ training_status: string }>();

      if (!trainingProgress || trainingProgress.training_status !== 'Completed') {
        continue;
      }

      candidates.push({
        cleanerId: c.id,
        cleanerName: `${c.first_name} ${c.last_name}`,
        score: 100,
        availableSlots: getAvailableTimeSlots(assignmentDate),
      });
    }
  }

  return candidates;
}

/**
 * Automatically assigns an AUTO-pool booking to the best available cleaner.
 */
export async function autoAssignBooking(
  db: D1Database,
  trainingDb: D1Database,
  bookingId: number,
  assignmentDate: string,
  timeSlot: TimeSlot
): Promise<{ success: boolean; assignedCleanerId?: number; message: string }> {
  const candidates = await scoreAssignmentCandidates(db, trainingDb, assignmentDate, timeSlot);

  if (candidates.length === 0) {
    return { success: false, message: 'No available AUTO-pool cleaners found for this booking' };
  }

  const best = candidates[0];

  await db.prepare(`
    INSERT INTO booking_assignments (booking_id, cleaner_id, time_slot, assignment_date, status, assignment_status, assigned_at, reason, role)
    VALUES (?, ?, ?, ?, 'assigned', 'assigned', CURRENT_TIMESTAMP, 'Auto-assigned by system', 'primary')
  `).bind(bookingId, best.cleanerId, timeSlot, assignmentDate).run();

  await db.prepare(`
    UPDATE bookings SET cleaner_id = ?, assignment_status = 'assigned', assigned_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(best.cleanerId, bookingId).run();

  return { success: true, assignedCleanerId: best.cleanerId, message: `Successfully assigned to ${best.cleanerName}` };
}

/**
 * Manually assigns one cleaner to a booking (AUTO or MANUAL pool). For a
 * MANUAL-pool job needing multiple cleaners, call this once per cleaner -
 * booking_assignments has no unique constraint on booking_id, so multiple
 * rows for the same booking is expected and supported.
 */
export async function manualAssignBooking(
  db: D1Database,
  trainingDb: D1Database,
  bookingId: number,
  cleanerId: number,
  assignmentDate: string,
  timeSlot: TimeSlot,
  assignedBy: number,
  role: 'primary' | 'support' = 'primary',
  overrideTraining: boolean = false
): Promise<{ success: boolean; message: string }> {
  const existingAssignment = await db.prepare(`
    SELECT COUNT(*) as count
    FROM booking_assignments
    WHERE cleaner_id = ? AND assignment_date = ? AND time_slot = ? AND status != 'cancelled'
  `).bind(cleanerId, assignmentDate, timeSlot).first<{ count: number }>();

  if (existingAssignment?.count && existingAssignment.count > 0) {
    return { success: false, message: 'Cleaner is already assigned at this time slot' };
  }

  if (!overrideTraining) {
    const trainingProgress = await trainingDb.prepare(
      'SELECT training_status FROM employee_training_progress WHERE user_id = ?'
    ).bind(cleanerId.toString()).first<{ training_status: string }>();

    if (!trainingProgress || trainingProgress.training_status !== 'Completed') {
      return { success: false, message: 'Cleaner has not completed training. Use override to assign anyway.' };
    }
  }

  await db.prepare(`
    INSERT INTO booking_assignments (booking_id, cleaner_id, time_slot, assignment_date, status, assignment_status, assigned_at, assigned_by, reason, role)
    VALUES (?, ?, ?, ?, 'assigned', 'assigned', CURRENT_TIMESTAMP, ?, ?, ?)
  `).bind(
    bookingId, cleanerId, timeSlot, assignmentDate, assignedBy,
    `Manually assigned by admin${overrideTraining ? ' (training override)' : ''}`,
    role
  ).run();

  // Keep bookings.cleaner_id pointing at the primary cleaner for anything
  // that only reads a single assignee; the full list always lives in
  // booking_assignments.
  if (role === 'primary') {
    await db.prepare(`
      UPDATE bookings SET cleaner_id = ?, assignment_status = 'assigned', assigned_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(cleanerId, bookingId).run();
  }

  return { success: true, message: 'Successfully assigned booking to cleaner' };
}

/**
 * Assigns multiple cleaners to one MANUAL-pool booking in a single call -
 * the first is 'primary', the rest 'support'. Used when a job needs 2+
 * people to finish inside the booking window.
 */
export async function assignMultipleCleaners(
  db: D1Database,
  trainingDb: D1Database,
  bookingId: number,
  cleanerIds: number[],
  assignmentDate: string,
  timeSlot: TimeSlot,
  assignedBy: number,
  overrideTraining: boolean = false
): Promise<{ success: boolean; message: string; results: { cleanerId: number; success: boolean; message: string }[] }> {
  const results: { cleanerId: number; success: boolean; message: string }[] = [];

  for (let i = 0; i < cleanerIds.length; i++) {
    const role = i === 0 ? 'primary' : 'support';
    const result = await manualAssignBooking(
      db, trainingDb, bookingId, cleanerIds[i], assignmentDate, timeSlot, assignedBy, role, overrideTraining
    );
    results.push({ cleanerId: cleanerIds[i], success: result.success, message: result.message });
  }

  const allSucceeded = results.every(r => r.success);
  return {
    success: allSucceeded,
    message: allSucceeded
      ? `Successfully assigned ${cleanerIds.length} cleaner(s) to booking`
      : 'Some cleaners could not be assigned - see results for details',
    results,
  };
}

/**
 * Moves a cleaner between the AUTO and MANUAL pools, recording the change.
 */
export async function transitionCleanerPool(
  db: D1Database,
  cleanerId: number,
  toPool: AssignmentPool,
  reason: string,
  transitionedBy: number
): Promise<{ success: boolean; message: string }> {
  const cleaner = await db.prepare(
    'SELECT assignment_pool FROM cleaner_profiles WHERE id = ?'
  ).bind(cleanerId).first<{ assignment_pool: AssignmentPool }>();

  if (!cleaner) {
    return { success: false, message: 'Cleaner not found' };
  }

  await db.prepare(`
    INSERT INTO staff_pool_transitions (staff_id, from_pool, to_pool, reason, transitioned_by, transitioned_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(cleanerId, cleaner.assignment_pool, toPool, reason, transitionedBy).run();

  await db.prepare(
    'UPDATE cleaner_profiles SET assignment_pool = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(toPool, cleanerId).run();

  return { success: true, message: `Successfully moved cleaner from ${cleaner.assignment_pool} to ${toPool}` };
}

/**
 * Pool headcount/capacity summary for the admin Pool Management page.
 */
export async function getPoolCapacity(db: D1Database): Promise<{ pool: AssignmentPool; totalCleaners: number; activeCleaners: number }[]> {
  const results = await db.prepare(`
    SELECT cp.assignment_pool as pool,
           COUNT(*) as total_cleaners,
           SUM(CASE WHEN cp.status != 'blocked' THEN 1 ELSE 0 END) as active_cleaners
    FROM cleaner_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE u.deleted = 0
    GROUP BY cp.assignment_pool
  `).all<{ pool: AssignmentPool; total_cleaners: number; active_cleaners: number }>();

  return (results.results || []).map(r => ({
    pool: r.pool,
    totalCleaners: r.total_cleaners,
    activeCleaners: r.active_cleaners || 0,
  }));
}
