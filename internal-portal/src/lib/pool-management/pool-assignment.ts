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

// A cleaner already booked in the same suburb that day is strongly preferred
// (delivers the travel-reduction goal even when the client keeps their own
// chosen date), but capped so jobs don't stack indefinitely onto one person.
const SAME_SUBURB_BONUS = 50;
const MAX_SAME_DAY_ASSIGNMENTS = 2;

/**
 * Scores AUTO-pool candidates for a single-cleaner assignment. Only cleaners
 * with assignment_pool = 'AUTO', not already booked at this slot, under the
 * same-day assignment cap, and with completed training are eligible. Passing
 * `suburb` prefers a cleaner who already has a job in the same area that day,
 * so they can complete more than one job without excess travel between them.
 */
export async function scoreAssignmentCandidates(
  db: D1Database,
  trainingDb: D1Database,
  assignmentDate: string,
  timeSlot: TimeSlot,
  suburb?: string | null
): Promise<AssignmentCandidate[]> {
  // NOT MIGRATED to staff as part of the 2026-07-20 cleaner_profiles ->
  // staff consolidation (migrations/067_consolidate_cleaner_profiles_into_staff.sql):
  // the `id` returned here is fed straight into booking_assignments.cleaner_id
  // and bookings.cleaner_id below, both of which are real, already-populated
  // FKs to cleaner_profiles.id specifically (migrations 002/004). staff.id is
  // a different, independent sequence, so switching this query's source
  // table would silently start writing the wrong numeric id into every new
  // booking assignment. cleaner_profiles is not being dropped, so this stays
  // pointed at it on purpose.
  const cleanersResult = await db.prepare(`
    SELECT cp.id, cp.first_name, cp.last_name
    FROM cleaner_profiles cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.assignment_pool = 'AUTO' AND cp.status != 'blocked' AND u.deleted = 0
  `).all<{ id: number; first_name: string; last_name: string }>();

  const cleaners = cleanersResult.results || [];
  const candidates: AssignmentCandidate[] = [];

  for (const c of cleaners) {
    const sameSlot = await db.prepare(`
      SELECT COUNT(*) as count
      FROM booking_assignments
      WHERE cleaner_id = ? AND assignment_date = ? AND time_slot = ? AND status != 'cancelled'
    `).bind(c.id, assignmentDate, timeSlot).first<{ count: number }>();

    if (sameSlot?.count !== 0) continue;

    const sameDay = await db.prepare(`
      SELECT COUNT(*) as count, GROUP_CONCAT(DISTINCT b.suburb) as suburbs
      FROM booking_assignments ba
      JOIN bookings b ON b.id = ba.booking_id
      WHERE ba.cleaner_id = ? AND ba.assignment_date = ? AND ba.status != 'cancelled'
    `).bind(c.id, assignmentDate).first<{ count: number; suburbs: string | null }>();

    // Daily cap - don't keep stacking jobs onto one cleaner past the target.
    if ((sameDay?.count ?? 0) >= MAX_SAME_DAY_ASSIGNMENTS) continue;

    const trainingProgress = await trainingDb.prepare(
      'SELECT training_status FROM employee_training_progress WHERE user_id = ?'
    ).bind(c.id.toString()).first<{ training_status: string }>();

    if (!trainingProgress || trainingProgress.training_status !== 'Completed') {
      continue;
    }

    const hasSameSuburbToday = Boolean(
      suburb && sameDay?.suburbs && sameDay.suburbs.split(',').includes(suburb)
    );

    candidates.push({
      cleanerId: c.id,
      cleanerName: `${c.first_name} ${c.last_name}`,
      score: hasSameSuburbToday ? 100 + SAME_SUBURB_BONUS : 100,
      availableSlots: getAvailableTimeSlots(assignmentDate),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
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
  timeSlot: TimeSlot,
  suburb?: string | null
): Promise<{ success: boolean; assignedCleanerId?: number; message: string }> {
  const candidates = await scoreAssignmentCandidates(db, trainingDb, assignmentDate, timeSlot, suburb);

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
  // `cleanerId` here is a cleaner_profiles.id (same id space as
  // scoreAssignmentCandidates/booking_assignments.cleaner_id above) - kept
  // pointed at cleaner_profiles for the same FK reason, NOT migrated to
  // staff.id. See the note in scoreAssignmentCandidates above.
  const cleaner = await db.prepare(
    'SELECT assignment_pool, user_id FROM cleaner_profiles WHERE id = ?'
  ).bind(cleanerId).first<{ assignment_pool: AssignmentPool; user_id: number }>();

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

  // Write-through to staff.assignment_pool (backfilled from cleaner_profiles
  // by migration 067) so it doesn't silently drift out of sync now that
  // staff is the intended long-term source of truth. Best-effort: a failure
  // here shouldn't block the real, FK-safe cleaner_profiles update above.
  await db.prepare(
    'UPDATE staff SET assignment_pool = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
  ).bind(toPool, cleaner.user_id).run().catch(() => {});

  return { success: true, message: `Successfully moved cleaner from ${cleaner.assignment_pool} to ${toPool}` };
}

/**
 * Pool headcount/capacity summary for the admin Pool Management page.
 */
export async function getPoolCapacity(db: D1Database): Promise<{ pool: AssignmentPool; totalCleaners: number; activeCleaners: number }[]> {
  // Migrated to staff (2026-07-20 consolidation) - pure headcount reporting,
  // no id value from this query is used as a stored FK elsewhere, so unlike
  // scoreAssignmentCandidates/transitionCleanerPool above this one is safe
  // to move. department = 'cleaning' preserves cleaner_profiles' implicit
  // scope now that staff also holds supervisors/digital/transport.
  const results = await db.prepare(`
    SELECT s.assignment_pool as pool,
           COUNT(*) as total_cleaners,
           SUM(CASE WHEN s.status != 'blocked' THEN 1 ELSE 0 END) as active_cleaners
    FROM staff s
    JOIN users u ON s.user_id = u.id
    WHERE u.deleted = 0 AND s.department = 'cleaning'
    GROUP BY s.assignment_pool
  `).all<{ pool: AssignmentPool; total_cleaners: number; active_cleaners: number }>();

  return (results.results || []).map(r => ({
    pool: r.pool,
    totalCleaners: r.total_cleaners,
    activeCleaners: r.active_cleaners || 0,
  }));
}
