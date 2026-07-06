import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    shortCode: string;
  };
}

export default async function ShortURLRedirect({ params }: PageProps) {
  const { shortCode } = params;

  try {
    // Try to get from KV first (if available)
    // Note: This would need to be in a server component or API route
    // For now, we'll use the database as the primary source
    
    const db = await getDb();
    if (!db) {
      redirect('/services?error=database_unavailable');
    }

    // Look up the short URL in the database
    const shortUrl = await db.prepare(
      `SELECT target_url, promo_code_id, promo_code, click_count, clicks FROM short_urls WHERE short_code = ?`
    ).bind(shortCode).first();

    if (!shortUrl) {
      redirect('/services?error=invalid_short_url');
    }

    const s = shortUrl as Record<string, unknown>;

    // Increment click count (both columns for backward/forward compatibility)
    await db.prepare(
      `UPDATE short_urls SET click_count = COALESCE(click_count, 0) + 1, clicks = COALESCE(clicks, 0) + 1 WHERE short_code = ?`
    ).bind(shortCode).run();

    // Track the scan in promo_scans table (use columns added in migration 021)
    await db.prepare(
      `INSERT INTO promo_scans (short_url_id, scanned_at, ip_address, user_agent, promo_code_id, promo_code, scan_timestamp)
       VALUES (?, datetime('now'), '', '', ?, ?, datetime('now'))`
    ).bind(s.id, s.promo_code_id, s.promo_code).run();

    // Redirect to the target URL
    redirect(s.target_url as string);

  } catch (error) {
    console.error('Error redirecting short URL:', error);
    redirect('/services?error=redirect_failed');
  }
}
