# Confirmed Tech Stack

## Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Theme**: Glassmorphism (translucent cards, backdrop blur, subtle borders)
- **Icons**: Lucide React
- **State**: React hooks + Context (no external state library needed)

## Backend / API
- **Runtime**: Next.js API Routes (serverless)
- **Deployment**: Cloudflare Pages + Workers
- **Edge Compatibility**: All code must be Cloudflare Workers compatible (no Node.js APIs)

## Database
- **Primary**: Cloudflare D1 (SQLite-compatible)
- **ORM/Query**: Raw SQL via `db.prepare().bind().all()/run()`
- **Schema**: Defined in `schema.sql`

## CMS
- **System**: Directus
- **Deployment**: Docker (local), Railway/Render/Fly.io (production)
- **Database**: SQLite (local), PostgreSQL (production)

## File Storage
- **System**: Cloudflare R2
- **API**: S3-compatible

## Authentication
- **Password Hashing**: bcryptjs
- **Token Format**: JWT (jsonwebtoken)
- **Session Storage**: D1 sessions table + httpOnly cookies

## Payments & Invoicing
- **System**: Zoho Books
- **Integration**: REST API

## Notifications
- **Primary**: WhatsApp Business API
- **Fallback**: Email API (SendGrid/AWS SES)

## DevOps
- **CI/CD**: GitHub Actions
- **Hosting**: Cloudflare Pages (frontend), Docker (Directus)
- **Environment Management**: GitHub Secrets + Cloudflare Environment Variables

## Development Tools
- **Package Manager**: npm / pnpm
- **Linting**: ESLint + Prettier
- **Testing**: Jest (unit), Playwright (E2E)
