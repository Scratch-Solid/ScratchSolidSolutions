# ScratchSolidSolutions

Professional cleaning services platform with client booking, business management, and internal portal for admin and cleaner operations.

## Project Structure

- `marketing-site/` — Public-facing website for client and business signups, booking services
- `internal-portal/` — Internal admin and cleaner portal for managing operations
- `schema.sql` — Shared database schema for D1 database

## Deployment

### Marketing Site
- **Production URL**: https://scratchsolidsolutions.org
- **Preview URL**: https://7dce0237.scratchsolidsolutions.pages.dev
- **Project Name**: scratchsolidsolutions (Cloudflare Pages)
- **Environment Variables**: JWT_SECRET, CSRF_SECRET, RESEND_API_KEY, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL, ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN

### Internal Portal
- **Production URL**: https://portal.scratchsolidsolutions.org
- **Preview URL**: https://ee3685da.scratchsolid-portal.pages.dev
- **Project Name**: scratchsolid-portal (Cloudflare Pages)
- **Environment Variables**: JWT_SECRET, CSRF_SECRET, RESEND_API_KEY, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL, ZOHO_ORG_ID, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, WHATSAPP_*

## Technology Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API routes with edge runtime
- **Database**: Cloudflare D1
- **Hosting**: Cloudflare Pages
- **Authentication**: JWT with role-based access control (RBAC)
- **Payment Integration**: Zoho Books
- **Email**: Resend API

## Security

- Role-based access control (RBAC) applied to internal portal only
- Marketing site APIs are public (no RBAC for client/business logic)
- Rate limiting on all API endpoints
- Security headers and CORS protection
- Input sanitization and validation
- CSRF protection

## Local Development

### Marketing Site
```bash
cd marketing-site
npm install
npm run dev
```

### Internal Portal
```bash
cd internal-portal
npm install
npm run dev
```

## Deployment

Both projects use direct upload to Cloudflare Pages:

```bash
# Marketing Site
cd marketing-site
npm run build
npx wrangler pages deploy .next --project-name=scratchsolidsolutions

# Internal Portal
cd internal-portal
npm run build
npx wrangler pages deploy .next --project-name=scratchsolid-portal
```

Environment variables must be set in Cloudflare Dashboard for each project (not in wrangler.toml for Pages projects).
