import { POST } from './route';
import { NextRequest } from 'next/server';

const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(),
};

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn(() =>
    Promise.resolve({ user: { user_id: 1, role: 'cleaner' }, db: mockDb })
  ),
  withTracing: jest.fn(() => 'trace-id'),
  withSecurityHeaders: jest.fn((res: any) => res),
}));

jest.mock('@/lib/active-assignment', () => ({
  findActiveAssignment: jest.fn(),
}));

jest.mock('@/lib/geocoding', () => ({
  geocodeAddress: jest.fn(),
}));

import { findActiveAssignment } from '@/lib/active-assignment';
import { geocodeAddress } from '@/lib/geocoding';

// Bellville coordinates, used for both the "job location" and the "cleaner
// is right there" test cases so distance comes out near zero.
const BELLVILLE_LAT = -33.8986;
const BELLVILLE_LONG = 18.6319;

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/cleaner/gps-ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/cleaner/gps-ping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
  });

  test('returns confirmed: false when the cleaner has no active job today', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue(null);

    const req = createRequest({ lat: BELLVILLE_LAT, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(body.confirmed).toBe(false);
    expect(body.reason).toBe('no_active_job');
  });

  test('does not attempt GPS confirmation for legacy booking-table assignments', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue({
      entity_id: 10,
      entity_type: 'booking',
      time_slot: '09:00',
    });

    const req = createRequest({ lat: BELLVILLE_LAT, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(body.confirmed).toBe(false);
    expect(body.reason).toBe('no_active_job');
  });

  test('confirms arrival and backfills the canonical timestamp when WhatsApp never reported it', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue({
      entity_id: 'job-1',
      entity_type: 'job',
      time_slot: '09:00',
    });
    mockDb.first
      .mockResolvedValueOnce({ paysheet_code: 'ABC123' }) // cleaner_profiles lookup
      .mockResolvedValueOnce({
        id: 'job-1',
        property_address: '1 Main Rd, Bellville',
        suburb: 'Bellville',
        geocoded_lat: BELLVILLE_LAT,
        geocoded_long: BELLVILLE_LONG,
        arrived_at: null,
        arrived_at_gps: null,
        completed_at: null,
        completed_at_gps: null,
      });

    const req = createRequest({ lat: BELLVILLE_LAT, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(body.confirmed).toBe(true);
    expect(body.event).toBe('arrived');
    expect(mockDb.run).toHaveBeenCalled();
  });

  test('does not re-confirm arrival once GPS has already recorded it', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue({
      entity_id: 'job-1',
      entity_type: 'job',
      time_slot: '09:00',
    });
    mockDb.first
      .mockResolvedValueOnce({ paysheet_code: 'ABC123' })
      .mockResolvedValueOnce({
        id: 'job-1',
        property_address: '1 Main Rd, Bellville',
        suburb: 'Bellville',
        geocoded_lat: BELLVILLE_LAT,
        geocoded_long: BELLVILLE_LONG,
        arrived_at: '2026-07-16T08:00:00.000Z',
        arrived_at_gps: '2026-07-16T08:00:00.000Z',
        completed_at: null,
        completed_at_gps: null,
      });

    const req = createRequest({ lat: BELLVILLE_LAT, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(body.confirmed).toBe(false);
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  test('confirms completion once the cleaner leaves the geofence after the minimum dwell time', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue({
      entity_id: 'job-1',
      entity_type: 'job',
      time_slot: '09:00',
    });
    const arrivedAt = new Date(Date.now() - 20 * 60000).toISOString(); // 20 min ago
    mockDb.first
      .mockResolvedValueOnce({ paysheet_code: 'ABC123' })
      .mockResolvedValueOnce({
        id: 'job-1',
        property_address: '1 Main Rd, Bellville',
        suburb: 'Bellville',
        geocoded_lat: BELLVILLE_LAT,
        geocoded_long: BELLVILLE_LONG,
        arrived_at: arrivedAt,
        arrived_at_gps: arrivedAt,
        completed_at: null,
        completed_at_gps: null,
      });

    // Cleaner is now ~11km away (well outside the 150m radius)
    const req = createRequest({ lat: BELLVILLE_LAT + 0.1, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(body.confirmed).toBe(true);
    expect(body.event).toBe('completed');
  });

  test('does not confirm completion before the minimum dwell time has passed', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue({
      entity_id: 'job-1',
      entity_type: 'job',
      time_slot: '09:00',
    });
    const arrivedAt = new Date(Date.now() - 2 * 60000).toISOString(); // 2 min ago
    mockDb.first
      .mockResolvedValueOnce({ paysheet_code: 'ABC123' })
      .mockResolvedValueOnce({
        id: 'job-1',
        property_address: '1 Main Rd, Bellville',
        suburb: 'Bellville',
        geocoded_lat: BELLVILLE_LAT,
        geocoded_long: BELLVILLE_LONG,
        arrived_at: arrivedAt,
        arrived_at_gps: arrivedAt,
        completed_at: null,
        completed_at_gps: null,
      });

    const req = createRequest({ lat: BELLVILLE_LAT + 0.1, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(body.confirmed).toBe(false);
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  test('self-heals a job with no geocode by geocoding it on the fly', async () => {
    (findActiveAssignment as jest.Mock).mockResolvedValue({
      entity_id: 'job-1',
      entity_type: 'job',
      time_slot: '09:00',
    });
    (geocodeAddress as jest.Mock).mockResolvedValue({ lat: BELLVILLE_LAT, long: BELLVILLE_LONG });
    mockDb.first
      .mockResolvedValueOnce({ paysheet_code: 'ABC123' })
      .mockResolvedValueOnce({
        id: 'job-1',
        property_address: '1 Main Rd, Bellville',
        suburb: 'Bellville',
        geocoded_lat: null,
        geocoded_long: null,
        arrived_at: null,
        arrived_at_gps: null,
        completed_at: null,
        completed_at_gps: null,
      });

    const req = createRequest({ lat: BELLVILLE_LAT, long: BELLVILLE_LONG });
    const res = await POST(req);
    const body = await (res as any).json();

    expect(geocodeAddress).toHaveBeenCalled();
    expect(body.confirmed).toBe(true);
    expect(body.event).toBe('arrived');
  });

  test('rejects a request with no lat/long', async () => {
    const req = createRequest({});
    const res = await POST(req);
    expect((res as any).status).toBe(400);
  });
});
