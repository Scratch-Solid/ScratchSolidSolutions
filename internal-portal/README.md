# Scratch Solid Solutions - Internal Portal

Internal admin and cleaner portal for managing operations, bookings, payroll, and administrative tasks.

## Deployment

- **Production URL**: https://portal.scratchsolidsolutions.org
- **Preview URL**: https://ee3685da.scratchsolid-portal.pages.dev
- **Project Name**: scratchsolid-portal (Cloudflare Pages)
- **Environment Variables**: JWT_SECRET, CSRF_SECRET, RESEND_API_KEY, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL, ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, WHATSAPP_*

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
