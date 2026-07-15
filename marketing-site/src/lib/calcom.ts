// Cal.com v2 booking client (server-side).
//
// Purpose: when a client books on the marketing site, we create a matching
// Cal.com booking. Cal.com then fires the BOOKING_CREATED webhook to n8n,
// which calls the internal-portal webhook
// (/api/webhooks/n8n/booking-ingested) to create the job + checklist and
// auto-assign a cleaner. This is the bridge between the (isolated) marketing
// database and the portal workforce.
//
// Everything here is CONFIG-GATED: if CALCOM_API_KEY / event-type config is
// missing, isCalcomConfigured() returns false and callers skip the hand-off
// without breaking the local booking flow.

import { getCloudflareContext } from '@/lib/runtime-context';
import { logger } from '@/lib/logger';

// Cal.com v2 API version pin. The 2024-08-13 bookings API uses the
// { start, eventTypeId, attendee, bookingFieldsResponses } request shape.
const CAL_API_VERSION = '2024-08-13';

// Business timezone used to interpret the booking date/time the client picked.
const DEFAULT_TIMEZONE = 'Africa/Johannesburg';
const DEFAULT_TZ_OFFSET = '+02:00';

export interface CalcomConfig {
  apiKey: string;
  apiUrl: string;
  defaultEventTypeId: number | null;
  eventTypeMap: Record<string, number>;
  timeZone: string;
}

export interface CalcomBookingInput {
  name: string;
  email: string;
  phone?: string;
  serviceType: string;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // "08:00" or "08:00-12:00"
  location?: string;
  suburb?: string;
  specialInstructions?: string;
  // Free-form reference back to the local marketing booking row.
  marketingBookingId?: number | string;
}

export interface CalcomBookingResult {
  success: boolean;
  uid?: string;
  error?: string;
  skipped?: boolean; // true when Cal.com is not configured
}

async function readEnv(): Promise<Record<string, string | undefined>> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as {
      env: Record<string, string | undefined>;
    };
    return env || {};
  } catch {
    return (process.env as unknown as Record<string, string | undefined>) || {};
  }
}

function parseEventTypeMap(raw: string | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (Number.isFinite(n)) out[key] = n;
    }
    return out;
  } catch {
    logger.warn('[calcom] CALCOM_EVENT_TYPE_MAP is not valid JSON; ignoring');
    return {};
  }
}

export async function getCalcomConfig(): Promise<CalcomConfig | null> {
  const env = await readEnv();
  const apiKey = env.CALCOM_API_KEY || env.CAL_API_KEY;
  if (!apiKey) return null;

  const apiUrl = (env.CALCOM_API_URL || 'https://api.cal.com/v2').replace(/\/$/, '');
  const defaultEventTypeIdRaw = env.CALCOM_DEFAULT_EVENT_TYPE_ID;
  const defaultEventTypeId = defaultEventTypeIdRaw ? Number(defaultEventTypeIdRaw) : null;
  const eventTypeMap = parseEventTypeMap(env.CALCOM_EVENT_TYPE_MAP);
  const timeZone = env.CALCOM_TIMEZONE || DEFAULT_TIMEZONE;

  // Need at least one way to resolve an event type, otherwise the booking
  // cannot be created.
  if ((defaultEventTypeId === null || !Number.isFinite(defaultEventTypeId)) && Object.keys(eventTypeMap).length === 0) {
    logger.warn('[calcom] CALCOM_API_KEY set but no event type configured (CALCOM_DEFAULT_EVENT_TYPE_ID / CALCOM_EVENT_TYPE_MAP)');
    return null;
  }

  return {
    apiKey,
    apiUrl,
    defaultEventTypeId: Number.isFinite(defaultEventTypeId as number) ? (defaultEventTypeId as number) : null,
    eventTypeMap,
    timeZone,
  };
}

export async function isCalcomConfigured(): Promise<boolean> {
  return (await getCalcomConfig()) !== null;
}

function resolveEventTypeId(config: CalcomConfig, serviceType: string): number | null {
  if (serviceType && config.eventTypeMap[serviceType] !== undefined) {
    return config.eventTypeMap[serviceType];
  }
  return config.defaultEventTypeId;
}

// Build an ISO 8601 start timestamp from the date + (possibly ranged) time the
// client selected, interpreted in the business timezone.
export function buildStartIso(bookingDate: string, bookingTime: string, tzOffset: string = DEFAULT_TZ_OFFSET): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) return null;
  const start = (bookingTime || '').split('-')[0].trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(start);
  if (!match) return null;
  const hh = match[1].padStart(2, '0');
  const mm = match[2];
  return `${bookingDate}T${hh}:${mm}:00${tzOffset}`;
}

interface CalcomApiResponse {
  status?: string;
  data?: { uid?: string };
  error?: { message?: string } | string;
  message?: string;
}

/**
 * Create a Cal.com booking that mirrors a marketing-site booking, so the
 * Cal.com -> n8n -> portal pipeline can ingest it as a job.
 *
 * Returns { skipped: true } when Cal.com is not configured (non-error), so the
 * caller can record calcom_status = 'not_sent' and continue.
 */
export async function createCalcomBooking(input: CalcomBookingInput): Promise<CalcomBookingResult> {
  const config = await getCalcomConfig();
  if (!config) {
    return { success: false, skipped: true, error: 'Cal.com not configured' };
  }

  const eventTypeId = resolveEventTypeId(config, input.serviceType);
  if (eventTypeId === null) {
    return { success: false, error: `No Cal.com event type for service "${input.serviceType}"` };
  }

  const start = buildStartIso(input.bookingDate, input.bookingTime, DEFAULT_TZ_OFFSET);
  if (!start) {
    return { success: false, error: `Invalid booking date/time: ${input.bookingDate} ${input.bookingTime}` };
  }

  // Booking field responses are keyed by Cal.com booking-question slugs. These
  // match what the n8n transform reads (address, notes, unit-name, access-code).
  const bookingFieldsResponses: Record<string, string> = {};
  if (input.location) bookingFieldsResponses.address = input.location;
  if (input.suburb) bookingFieldsResponses.suburb = input.suburb;
  if (input.specialInstructions) bookingFieldsResponses.notes = input.specialInstructions;

  const body: Record<string, unknown> = {
    start,
    eventTypeId,
    attendee: {
      name: input.name,
      email: input.email,
      timeZone: config.timeZone,
      language: 'en',
      ...(input.phone ? { phoneNumber: input.phone } : {}),
    },
    bookingFieldsResponses,
    metadata: {
      source: 'marketing-site',
      ...(input.marketingBookingId !== undefined
        ? { marketing_booking_id: String(input.marketingBookingId) }
        : {}),
    },
  };

  try {
    const res = await fetch(`${config.apiUrl}/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'cal-api-version': CAL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    let json: CalcomApiResponse = {};
    try {
      json = (await res.json()) as CalcomApiResponse;
    } catch {
      // non-JSON response
    }

    if (!res.ok || json.status === 'error') {
      const errMsg =
        (typeof json.error === 'object' ? json.error?.message : json.error) ||
        json.message ||
        `Cal.com API returned ${res.status}`;
      logger.error('[calcom] Booking creation failed', new Error(errMsg));
      return { success: false, error: errMsg };
    }

    const uid = json.data?.uid;
    if (!uid) {
      logger.error('[calcom] Booking response missing uid', new Error(JSON.stringify(json)));
      return { success: false, error: 'Cal.com response missing booking uid' };
    }

    return { success: true, uid };
  } catch (error) {
    logger.error('[calcom] Booking request threw', error as Error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
