-- Fixes a real production bug found via static code audit (2026-07-19,
-- no live schema access available): migration 021 fixed the promo_codes
-- distribution columns and short_urls.clicks, but missed two columns
-- still used by live code paths. Every promo landing-page-view tracked
-- via src/app/api/analytics/track/route.ts, and every short-URL creation
-- (src/app/api/short-urls/route.ts) plus /p/[shortCode] redirect
-- (src/app/p/[shortCode]/page.tsx), has been throwing "no such column"
-- since 021 first ran.

ALTER TABLE promo_scans ADD COLUMN referrer TEXT;

ALTER TABLE short_urls ADD COLUMN target_url TEXT;
ALTER TABLE short_urls ADD COLUMN promo_code TEXT;
