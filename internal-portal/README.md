# Scratch Solid Solutions - Internal Portal

Admin dashboard for managing staff, bookings, contracts, payroll, and content.

## Deployment

- **Production URL**: https://portal.scratchsolidsolutions.org
- **Preview URL**: https://ee3685da.scratchsolid-portal.pages.dev
- **Project Name**: scratchsolid-portal (Cloudflare Pages)
- **Environment Variables**: JWT_SECRET, CSRF_SECRET, RESEND_API_KEY, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL, ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, WHATSAPP_*

## Security Notice

**CRITICAL**: Never commit `.env.local` files to version control. These contain sensitive credentials. Use Cloudflare secrets manager or environment variables for production secrets. Ensure CSRF_SECRET and JWT_SECRET are set to strong random values in production (min 32 characters).

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

Deploy to Cloudflare Pages using direct upload:

```bash
npm run build
npx wrangler pages deploy .next --project-name=scratchsolid-portal
```

Environment variables must be set in Cloudflare Dashboard for the project (not in wrangler.toml for Pages projects).

## Creating an admin user (secure seeding)

We keep a protected seeding endpoint to create admins (and other roles) without hardcoding:

- Endpoint: `POST /api/seed-users`
- Guard: requires `SEED_KEY` secret in Cloudflare Worker environment

### One-time setup (already done, rotate if needed)
```
npx wrangler secret put SEED_KEY --name scratchsolid-portal
# paste a strong random string
```

### Create an admin
```
curl -X POST https://scratchsolid-portal.sparkling-darkness-405f.workers.dev/api/seed-users \
  -H "Content-Type: application/json" \
  -d '{
    "seedKey": "<YOUR_SEED_KEY>",
    "userType": "admin",
    "email": "admin@scratchsolidsolution.org",
    "password": "StrongTempPass123!",
    "name": "Portal Admin"
  }'
```

Notes:
- `userType` must be one of `admin | cleaner | digital | transport`.
- For admin, the login username is the email you pass above.
- Endpoint only accepts POST; GET returns 405.
- After creating an admin, no redeploy is required—the user is written to the DB.

## Technology Stack

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **Runtime**: Edge runtime
- **Database**: Cloudflare D1
- **Hosting**: Cloudflare Pages
- **Authentication**: JWT with role-based access control (RBAC)

## Key Features

- Admin dashboard for operations management
- Cleaner dashboard for task management
- Booking management and assignment
- Payroll processing
- Contract management
- Zoho Books integration for financial data
- WhatsApp integration for notifications
- Employee management
- Content management system

## Access Control

- **Admin Role**: Full access to all features
- **Cleaner Role**: Access to cleaner dashboard and task management
- **Business Role**: Access to business booking and contract management
- All APIs protected with RBAC middleware
