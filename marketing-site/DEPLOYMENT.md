# Deployment Guide — Marketing Site (Cloudflare Pages + Workers)

## Prerequisites
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`
- Logged in to Cloudflare: `wrangler login`

## Environment Variables
Set these in the Cloudflare Pages dashboard under **Settings → Environment variables**:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for signing JWT tokens (min 32 chars) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `NEXT_PUBLIC_BASE_URL` | Full site URL e.g. `https://scratchsolidsolutions.org` |
| `NEXT_PUBLIC_API_URL` | API base URL (usually same as BASE_URL) |
| `NEXT_PUBLIC_INTERNAL_PORTAL_URL` | Internal portal URL for cleaner status polling |
| `ZOHO_CLIENT_ID` | Zoho Books OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Zoho Books OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Zoho Books OAuth refresh token |
| `ZOHO_ORGANIZATION_ID` | Zoho Books organization ID |

## Database Migrations
Run migrations in order against the production D1 database:

```bash
# Initial schema
npx wrangler d1 execute scratchsolid-db --remote --file=schema.sql

# About Us tables (leaders + about_us_content)
npx wrangler d1 execute scratchsolid-db --remote --file=migrations/add_about_us_tables.sql

# Fix About Us schema (adds missing columns)
npx wrangler d1 execute scratchsolid-db --remote --file=migrations/fix_about_us_schema.sql
```

## Build & Deploy

**CI/CD Deployment (Recommended)**
This project uses CI/CD via GitHub Actions. Pushing to the main branch automatically triggers deployment to Cloudflare Workers.

```bash
# Push changes to GitHub to trigger automatic deployment
git add .
git commit -m "Your commit message"
git push origin main
```

**Note:** Due to OpenNext limitations on Windows, manual deployment via `npm run deploy` is not recommended. Use the CI/CD pipeline by pushing to GitHub instead.

**Local Development Only**
```bash
# Install dependencies
npm install

# Local development (does not deploy)
npm run dev
```

## Cache Purge After Deploy
After deploying, purge the Cloudflare cache to ensure users get the latest version:

```bash
node scripts/purge-cache.js
```

Requires `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` environment variables with Cache Purge permission.

## D1 Database Binding
The D1 database must be bound to the Pages project as `scratchsolid_db`.

In `wrangler.jsonc`, ensure:
```json
{
  "d1_databases": [
    {
      "binding": "scratchsolid_db",
      "database_name": "scratchsolid-db",
      "database_id": "<your-d1-database-id>"
    }
  ]
}
```

## Rollback
To roll back to a previous deployment, go to **Cloudflare Pages → Deployments** and click **Rollback** on the desired version.
