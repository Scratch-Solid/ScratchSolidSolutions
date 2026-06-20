import { buildStartIso } from '@/lib/calcom';

describe('buildStartIso', () => {
  it('builds an ISO start from a date and a single time', () => {
    expect(buildStartIso('2026-07-01', '08:00')).toBe('2026-07-01T08:00:00+02:00');
  });

  it('uses the start of a ranged time slot', () => {
    expect(buildStartIso('2026-07-01', '08:00-12:00')).toBe('2026-07-01T08:00:00+02:00');
  });

  it('pads single-digit hours', () => {
    expect(buildStartIso('2026-12-09', '9:30')).toBe('2026-12-09T09:30:00+02:00');
  });

  it('honors a custom timezone offset', () => {
    expect(buildStartIso('2026-07-01', '13:00', '+00:00')).toBe('2026-07-01T13:00:00+00:00');
  });

  it('returns null for an invalid date', () => {
    expect(buildStartIso('01-07-2026', '08:00')).toBeNull();
  });

  it('returns null for an invalid time', () => {
    expect(buildStartIso('2026-07-01', 'morning')).toBeNull();
  });

  it('returns null for empty time', () => {
    expect(buildStartIso('2026-07-01', '')).toBeNull();
  });
});
