// Horizon Scoping and Data Access Controls
// Phase 6: Horizon Scoping Implementation & Privacy Controls

export interface BookingScope {
  bookingId: number;
  clientId: number;
  staffId: number;
  serviceDate: string;
  isWithinHorizon: boolean;
  canViewFullDetails: boolean;
}

export class HorizonScoper {
  private horizonDays: number = 7; // Clients can see 7 days ahead
  private unlockHours: number = 24; // Full details unlock 24 hours before

  /**
   * Determines if a booking is within the client's horizon
   */
  isWithinHorizon(bookingDate: string): boolean {
    const booking = new Date(bookingDate);
    const now = new Date();
    const horizonDate = new Date();
    horizonDate.setDate(now.getDate() + this.horizonDays);

    return booking <= horizonDate;
  }

  /**
   * Determines if full booking details can be viewed
   */
  canViewFullDetails(bookingDate: string): boolean {
    const booking = new Date(bookingDate);
    const now = new Date();
    const unlockDate = new Date(booking);
    unlockDate.setHours(unlockDate.getHours() - this.unlockHours);

    return now >= unlockDate;
  }

  /**
   * Scopes booking data for client view
   */
  scopeBookingForClient(booking: any, userId: number): BookingScope {
    const isWithinHorizon = this.isWithinHorizon(booking.service_date);
    const canViewFullDetails = this.canViewFullDetails(booking.service_date);

    return {
      bookingId: booking.id,
      clientId: booking.client_id,
      staffId: booking.staff_id,
      serviceDate: booking.service_date,
      isWithinHorizon,
      canViewFullDetails
    };
  }

  /**
   * Redacts sensitive information from booking data
   */
  redactBookingData(booking: any, isClientView: boolean): any {
    if (!isClientView) return booking;

    const redacted = { ...booking };

    // Remove sensitive fields for client view
    delete redacted.staff_phone;
    delete redacted.staff_address;
    delete redacted.staff_tax_number;
    delete redacted.internal_notes;

    // If not within horizon or can't view full details
    if (!this.isWithinHorizon(redacted.service_date) || !this.canViewFullDetails(redacted.service_date)) {
      delete redacted.staff_name;
      delete redacted.staff_details;
    }

    return redacted;
  }
}

export class SuburbExtractor {
  /**
   * Extracts suburb from location string
   */
  extractSuburb(location: string): string | null {
    // Common suburb patterns in South Africa
    const patterns = [
      /,\s*([^,]+)\s*,\s*\d{4}/, // Pattern: "Street, Suburb, 1234"
      /([^,]+)\s*,\s*\d{4}/, // Pattern: "Suburb, 1234"
      /([^,]+)\s*,\s*South\s*Africa/i // Pattern: "Suburb, South Africa"
    ];

    for (const pattern of patterns) {
      const match = location.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extracts multiple suburbs from a list of locations
   */
  extractSuburbs(locations: string[]): string[] {
    const suburbs = new Set<string>();

    for (const location of locations) {
      const suburb = this.extractSuburb(location);
      if (suburb) {
        suburbs.add(suburb);
      }
    }

    return Array.from(suburbs);
  }
}

export class DataAccessControls {
  /**
   * Redacts sensitive data based on user role
   */
  redactSensitiveData(data: any, role: string, userId: number): any {
    const redacted = { ...data };

    // Admin can see everything
    if (role === 'admin') {
      return redacted;
    }

    // Staff can see their own data
    if (role === 'staff') {
      if (redacted.staff_id !== userId) {
        delete redacted.phone;
        delete redacted.address;
        delete redacted.tax_number;
      }
      return redacted;
    }

    // Client can see their own data with redactions
    if (role === 'client') {
      delete redacted.staff_phone;
      delete redacted.staff_address;
      delete redacted.staff_tax_number;
      delete redacted.internal_notes;
      return redacted;
    }

    // Default: redact all sensitive data
    delete redacted.phone;
    delete redacted.address;
    delete redacted.tax_number;
    delete redacted.internal_notes;

    return redacted;
  }

  /**
   * Logs data access for audit trail
   */
  async logAccess(
    db: D1Database,
    userId: number,
    action: string,
    resource: string,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await db.prepare(`
      INSERT INTO data_access_audit (user_id, action, resource, resource_id, ip_address, user_agent, accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(userId, action, resource, resourceId, ipAddress, userAgent).run();
  }
}

// Singleton instances
export const horizonScoper = new HorizonScoper();
export const suburbExtractor = new SuburbExtractor();
export const dataAccessControls = new DataAccessControls();
