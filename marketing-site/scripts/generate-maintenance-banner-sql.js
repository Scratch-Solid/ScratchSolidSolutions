#!/usr/bin/env node
// Generates a .sql file that upserts the maintenance-banner row into the
// `content` table (collection 'settings', slug 'maintenance-banner'), read
// by src/lib/maintenance.ts. Used by the "Announce Maintenance" workflow.
//
// Usage: node scripts/generate-maintenance-banner-sql.js <output-file>
// Requires env vars: BANNER_MESSAGE, HOURS_AFTER (hours from now the banner
// should remain visible)

const fs = require('fs');

const outputFile = process.argv[2];
if (!outputFile) {
  console.error('Usage: node generate-maintenance-banner-sql.js <output-file>');
  process.exit(1);
}

const message = process.env.BANNER_MESSAGE;
const hoursAfter = parseFloat(process.env.HOURS_AFTER || '2');

if (!message) {
  console.error('Missing required env var: BANNER_MESSAGE');
  process.exit(1);
}
if (!Number.isFinite(hoursAfter) || hoursAfter <= 0) {
  console.error(`Invalid HOURS_AFTER value: ${process.env.HOURS_AFTER}`);
  process.exit(1);
}

const end = new Date(Date.now() + hoursAfter * 3600 * 1000).toISOString();
const payload = JSON.stringify({ enabled: true, message, end });

// Escape single quotes for the SQL string literal (SQL standard: double them up)
const sqlSafePayload = payload.replace(/'/g, "''");

const sql = `INSERT INTO content (collection, slug, title, text)
VALUES ('settings', 'maintenance-banner', 'Maintenance Banner', '${sqlSafePayload}')
ON CONFLICT(collection, slug) DO UPDATE SET
  text = excluded.text,
  updated_at = datetime('now');
`;

fs.writeFileSync(outputFile, sql);
console.log(`Wrote maintenance banner SQL to ${outputFile} (end: ${end})`);
