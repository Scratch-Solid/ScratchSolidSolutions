#!/usr/bin/env node
// Cloudflare Cache Purge Script
// Usage: node scripts/purge-cache.js
// Requires env vars: CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN

const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!zoneId || !apiToken) {
  console.error('Missing required env vars: CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN');
  process.exit(1);
}

async function purgeCache() {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ purge_everything: true }),
  });

  const data = await response.json();

  if (data.success) {
    console.log('Cache purged successfully.');
  } else {
    console.error('Cache purge failed:', JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
}

purgeCache().catch((err) => {
  console.error('Unexpected error during cache purge:', err);
  process.exit(1);
});
