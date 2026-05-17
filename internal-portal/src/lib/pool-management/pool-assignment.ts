// Pool-Based Assignment Logic
// Phase 3: Pool-Based Assignment Logic & Time Slot Implementation

export type PoolType = 'INDIVIDUAL' | 'BUSINESS';
export type ServiceType = 'RESIDENTIAL' | 'LEKKESLAAP' | 'POST_CONSTRUCTION' | 'OFFICE' | 'COMMERCIAL';
export type TimeSlot = '08:00' | '11:00' | '12:00' | '14:00' | null;
export type AssignmentStatus = 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled';

export interface PoolAssignment {
  poolType: PoolType;
  serviceType: ServiceType;
  reason: string;
}

export interface AssignmentCandidate {
  staffId: number;
  staffName: string;
  score: number;
  poolType: PoolType;
  serviceType: ServiceType;
  availableSlots: TimeSlot[];
}

/**
 * Determines the appropriate pool type based on service type
 */
export function determinePoolFromServiceType(serviceType: ServiceType): PoolType {
  if (serviceType === 'OFFICE' || serviceType === 'COMMERCIAL') {
    return 'BUSINESS';
  }
  return 'INDIVIDUAL';
}

/**
 * Validates if a time slot is valid
 */
export function isValidTimeSlot(slot: string): slot is TimeSlot {
  return ['08:00', '11:00', '12:00', '14:00'].includes(slot);
}

/**
 * Gets available time slots for a given date
 */
export function getAvailableTimeSlots(assignmentDate: string): TimeSlot[] {
  const slots: TimeSlot[] = ['08:00', '11:00', '12:00', '14:00'];
  // In a real implementation, you would check existing assignments to filter out taken slots
  return slots;
}

/**
 * Calculates pool capacity for a given pool type and date
 */
export async function calculatePoolCapacity(
  db: D1Database,
  poolType: PoolType,
  assignmentDate: string
): Promise<number> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count
    FROM staff
    WHERE pool_type = ? AND is_active = 1
  `).bind(poolType).first<{ count: number }>();
  
  return result?.count || 0;
}

/**
 * Scores assignment candidates based on various factors
 */
export async function scoreAssignmentCandidates(
  db: D1Database,
  poolType: PoolType,
  serviceType: ServiceType,
  assignmentDate: string,
  timeSlot: TimeSlot
): Promise<AssignmentCandidate[]> {
  // Get staff in the appropriate pool
  const staffResult = await db.prepare(`
    SELECT s.id, s.first_name, s.last_name, s.pool_type, s.service_type
    FROM staff s
    WHERE s.pool_type = ? AND s.is_active = 1
  `).bind(poolType).all<{ id: number; first_name: string; last_name: string; pool_type: PoolType; service_type: ServiceType }>();
  
  const staff = staffResult.results || [];
  
  const candidates: AssignmentCandidate[] = [];
  
  for (const s of staff) {
    // Check if staff is already assigned at this time slot
    const existingAssignment = await db.prepare(`
      SELECT COUNT(*) as count
      FROM booking_assignments
      WHERE staff_id = ? AND assignment_date = ? AND time_slot = ? AND status != 'cancelled'
    `).bind(s.id, assignmentDate, timeSlot).first<{ count: number }>();
    
    if (existingAssignment?.count === 0) {
      // Calculate score based on service type match, performance, etc.
      let score = 0;
      
      // Service type match bonus
      if (s.service_type === serviceType) {
        score += 50;
      }
      
      // Pool type match bonus
      if (s.pool_type === poolType) {
        score += 30;
      }
      
      candidates.push({
        staffId: s.id,
        staffName: `${s.first_name} ${s.last_name}`,
        score,
        poolType: s.pool_type,
        serviceType: s.service_type,
        availableSlots: getAvailableTimeSlots(assignmentDate)
      });
    }
  }
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  
  return candidates;
}

/**
 * Automatically assigns a booking to the best available staff
 */
export async function autoAssignBooking(
  db: D1Database,
  bookingId: number,
  serviceType: ServiceType,
  assignmentDate: string,
  timeSlot: TimeSlot
): Promise<{ success: boolean; assignedStaffId?: number; message: string }> {
  const poolType = determinePoolFromServiceType(serviceType);
  
  // Get available candidates
  const candidates = await scoreAssignmentCandidates(db, poolType, serviceType, assignmentDate, timeSlot);
  
  if (candidates.length === 0) {
    return {
      success: false,
      message: 'No available staff found for this booking'
    };
  }
  
  // Assign to the best candidate
  const bestCandidate = candidates[0];
  
  // Create booking assignment
  await db.prepare(`
    INSERT INTO booking_assignments (booking_id, staff_id, pool_type, service_type, time_slot, assignment_date, status, assigned_at, reason)
    VALUES (?, ?, ?, ?, ?, ?, 'assigned', CURRENT_TIMESTAMP, 'Auto-assigned by system')
  `).bind(bookingId, bestCandidate.staffId, poolType, serviceType, timeSlot, assignmentDate).run();
  
  // Update booking
  await db.prepare(`
    UPDATE bookings
    SET assigned_staff_id = ?, assignment_status = 'assigned', assigned_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(bestCandidate.staffId, bookingId).run();
  
  return {
    success: true,
    assignedStaffId: bestCandidate.staffId,
    message: `Successfully assigned to ${bestCandidate.staffName}`
  };
}

/**
 * Manually assigns a booking to a specific staff member
 */
export async function manualAssignBooking(
  db: D1Database,
  bookingId: number,
  staffId: number,
  poolType: PoolType,
  serviceType: ServiceType,
  assignmentDate: string,
  timeSlot: TimeSlot,
  assignedBy: string
): Promise<{ success: boolean; message: string }> {
  // Check if staff is available at this time slot
  const existingAssignment = await db.prepare(`
    SELECT COUNT(*) as count
    FROM booking_assignments
    WHERE staff_id = ? AND assignment_date = ? AND time_slot = ? AND status != 'cancelled'
  `).bind(staffId, assignmentDate, timeSlot).first<{ count: number }>();
  
  if (existingAssignment?.count && existingAssignment.count > 0) {
    return {
      success: false,
      message: 'Staff is already assigned at this time slot'
    };
  }
  
  // Create booking assignment
  await db.prepare(`
    INSERT INTO booking_assignments (booking_id, staff_id, pool_type, service_type, time_slot, assignment_date, status, assigned_at, reason)
    VALUES (?, ?, ?, ?, ?, ?, 'assigned', CURRENT_TIMESTAMP, 'Manually assigned by ' || ?)
  `).bind(bookingId, staffId, poolType, serviceType, timeSlot, assignmentDate, assignedBy).run();
  
  // Update booking
  await db.prepare(`
    UPDATE bookings
    SET assigned_staff_id = ?, assignment_status = 'assigned', assigned_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(staffId, bookingId).run();
  
  return {
    success: true,
    message: 'Successfully assigned booking to staff'
  };
}

/**
 * Transitions a staff member between pools
 */
export async function transitionStaffPool(
  db: D1Database,
  staffId: number,
  fromPool: PoolType,
  toPool: PoolType,
  reason: string,
  transitionedBy: string
): Promise<{ success: boolean; message: string }> {
  // Get current pool
  const staff = await db.prepare(`
    SELECT pool_type FROM staff WHERE id = ?
  `).bind(staffId).first<{ pool_type: PoolType }>();
  
  if (!staff) {
    return {
      success: false,
      message: 'Staff not found'
    };
  }
  
  // Record transition
  await db.prepare(`
    INSERT INTO staff_pool_transitions (staff_id, from_pool, to_pool, reason, transitioned_by, transitioned_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(staffId, staff.pool_type, toPool, reason, transitionedBy).run();
  
  // Update staff pool
  await db.prepare(`
    UPDATE staff SET pool_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(toPool, staffId).run();
  
  return {
    success: true,
    message: `Successfully transitioned staff from ${staff.pool_type} to ${toPool}`
  };
}

/**
 * Gets pool capacity information
 */
export async function getPoolCapacity(
  db: D1Database,
  poolType?: PoolType
): Promise<{ poolType: PoolType; totalStaff: number; activeStaff: number; availableStaff: number }[]> {
  let query = `
    SELECT pool_type, COUNT(*) as total_staff
    FROM staff
  `;
  
  if (poolType) {
    query += ` WHERE pool_type = ?`;
  }
  
  query += ` GROUP BY pool_type`;
  
  const results = await db.prepare(query).bind(poolType || null).all<{ pool_type: PoolType; total_staff: number }>();
  
  return (results.results || []).map(r => ({
    poolType: r.pool_type,
    totalStaff: r.total_staff,
    activeStaff: r.total_staff, // Assuming all are active for now
    availableStaff: r.total_staff // This would need to account for current assignments
  }));
}
