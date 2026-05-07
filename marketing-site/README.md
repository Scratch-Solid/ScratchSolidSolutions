# Scratch Solid Solutions - Marketing Site

Public-facing website for client and business signups, booking services, and information about cleaning services.

## Deployment

- **Production URL**: https://scratchsolidsolutions.org
- **Preview URL**: https://7dce0237.scratchsolidsolutions.pages.dev
- **Project Name**: scratchsolidsolutions (Cloudflare Pages)
- **Environment Variables**: JWT_SECRET, CSRF_SECRET, RESEND_API_KEY, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL, ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN

## Security Notice

**CRITICAL**: Never commit `.env.local` files to version control. These contain sensitive credentials including R2 access keys. Use Cloudflare secrets manager or environment variables for production secrets.

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
npx wrangler pages deploy .next --project-name=scratchsolidsolutions
```

Environment variables must be set in Cloudflare Dashboard for the project (not in wrangler.toml for Pages projects).

## Technology Stack

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **Runtime**: Edge runtime
- **Database**: Cloudflare D1
- **Hosting**: Cloudflare Pages
- **Authentication**: JWT (public APIs, no RBAC)

## Key Features

- Client and business signups
- Booking system
- Pricing information
- Gallery and reviews
- Contact form
- Responsive design with glassmorphism UI
