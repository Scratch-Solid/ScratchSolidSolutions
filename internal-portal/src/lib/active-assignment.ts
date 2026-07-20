// Shared "what is this staff member's active job right now" resolver.
// Originally lived only inside the WhatsApp status-keyword webhook; pulled
// out so the GPS confirmation endpoint can resolve the same active job
// without duplicating the bookings/jobs fallback logic.

export interface ActiveAssignment {
  assignment_id?: number;
  entity_id: string | number;
  entity_type: 'booking' | 'job';
  time_slot: string;
}

export async function resolveStaff(
  db: any,
  phone: string
): Promise<{ id: number; first_name: string; paysheet_code?: string } | null> {
  const normalizedPhone = phone.replace(/\s+/g, '');

  // Migrated (2026-07-20 consolidation, migrations/067_consolidate_cleaner_profiles_into_staff.sql):
  // paysheet_code now lives directly on staff (renamed from staff's old,
  // dead employee_id column and backfilled from cleaner_profiles), so the
  // LEFT JOIN cleaner_profiles this used to need is gone, and so is the
  // separate "check cleaner_profiles by cellphone" fallback query that used
  // to exist below it - every cleaner_profiles cellphone is now also on
  // staff after the backfill, so that fallback would only ever have been
  // reached in an environment where migration 067 hasn't been applied yet.
  const staff = await db
    .prepare(
      `SELECT id, first_name, paysheet_code
       FROM staff
       WHERE REPLACE(cellphone, ' ', '') = ? AND is_active = 1
       LIMIT 1`
    )
    .bind(normalizedPhone)
    .first() as { id: number; first_name: string; paysheet_code: string | null } | null;

  if (!staff) return null;
  return { ...staff, paysheet_code: staff.paysheet_code || undefined };
}

export async function findActiveAssignment(
  db: any,
  staffId: number,
  paysheetCode: string | undefined
): Promise<ActiveAssignment | null> {
  const today = new Date().toISOString().split('T')[0];

  const bookingAssignment = await db
    .prepare(
      `SELECT ba.id AS assignment_id, ba.booking_id AS entity_id,
              'booking' AS entity_type, b.booking_time AS time_slot
       FROM booking_assignments ba
       JOIN bookings b ON b.id = ba.booking_id
       WHERE ba.staff_id = ?
         AND b.booking_date = ?
         AND ba.assignment_status NOT IN ('completed', 'cancelled')
       ORDER BY b.booking_time ASC
       LIMIT 1`
    )
    .bind(staffId, today)
    .first();

  if (bookingAssignment) return bookingAssignment as ActiveAssignment;

  if (paysheetCode) {
    const safeCode = paysheetCode.replace(/"/g, '""');
    const pattern = `%"${safeCode}"%`;
    const jobAssignment = await db
      .prepare(
        `SELECT j.id AS entity_id, 'job' AS entity_type,
                j.scheduled_at AS time_slot
         FROM jobs j
         WHERE j.team_members LIKE ?
           AND date(j.scheduled_at) = ?
           AND j.status NOT IN ('completed', 'cancelled')
         ORDER BY j.scheduled_at ASC
         LIMIT 1`
      )
      .bind(pattern, today)
      .first();

    if (jobAssignment) return jobAssignment as ActiveAssignment;
  }

  return null;
}
