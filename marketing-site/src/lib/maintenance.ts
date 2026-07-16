import { getDb } from '@/lib/db';

export interface MaintenanceBannerData {
  message: string;
  until: string;
}

// In-memory cache with TTL, same pattern as the background-image lookup in
// app/layout.tsx - avoids querying the DB on every request for a value that
// only an admin or the deploy pipeline changes.
let cachedBanner: MaintenanceBannerData | null | undefined = undefined;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Reads the maintenance-banner row from the `content` table (collection
 * 'settings', slug 'maintenance-banner'). The banner shows whenever it's
 * enabled and the current time is at or before `end` - so it can be
 * published ahead of the actual maintenance window as advance notice, and
 * auto-hides once the window has passed without needing an explicit
 * clear step.
 */
export async function getMaintenanceBanner(): Promise<MaintenanceBannerData | null> {
  if (cachedBanner !== undefined && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedBanner;
  }

  try {
    const db = await getDb();
    if (!db) return null;

    const row = await db
      .prepare('SELECT text FROM content WHERE collection = ? AND slug = ?')
      .bind('settings', 'maintenance-banner')
      .first();

    const raw = (row as { text?: string } | null)?.text;
    if (!raw) {
      cachedBanner = null;
      cacheTimestamp = Date.now();
      return null;
    }

    const parsed = JSON.parse(raw) as { enabled?: boolean; message?: string; end?: string };
    const withinWindow = !!parsed.end && Date.now() <= new Date(parsed.end).getTime();
    const banner = parsed.enabled && parsed.message && withinWindow
      ? { message: parsed.message, until: parsed.end! }
      : null;

    cachedBanner = banner;
    cacheTimestamp = Date.now();
    return banner;
  } catch (err) {
    // Log for diagnostics but never let a malformed/missing banner row crash the layout
    console.error('[maintenance] Banner query failed:', err);
    return null;
  }
}
