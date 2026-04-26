# Repository Roadmap

## Monorepo Structure

```
ScratchSolidSolutions/
├── marketing-site/          # Public marketing website
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # Shared & page-specific components
│   │   └── lib/             # Utils, db.ts helper
│   ├── public/              # Static assets
│   └── package.json
│
├── internal-portal/         # Admin, cleaner, business dashboards
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   │   ├── api/         # API routes (auth, booking, admin, etc.)
│   │   ├── components/      # Dashboard components
│   │   └── lib/             # Utils, db.ts
│   ├── public/
│   └── package.json
│
├── backend-worker/          # (Future) Cloudflare Workers for background jobs
│   ├── src/
│   │   └── worker.js
│   └── wrangler.toml
│
├── docs/                    # Documentation
│   ├── product-requirements.md
│   ├── feature-matrix.md
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── glossary.md
│   └── repo-roadmap.md
│
├── infra/                   # Infrastructure as code
│   ├── github-actions/        # CI/CD workflows
│   └── cloudflare/            # Wrangler configs, R2 buckets
│
├── schema.sql               # Shared D1 database schema
└── README.md                # Root project readme
```

## Directory Responsibilities

### `marketing-site/`
- Landing page, About Us, Services, Promotions
- Booking flow (individual vs business, calendar, indemnity, payment)
- Client signup and login
- Public-facing only

### `internal-portal/`
- **Admin Dashboard**: User management, booking assignment, payroll, contracts, audit logs
- **Cleaner Dashboard**: Task list, status workflow, earnings, profile
- **Business Dashboard**: Contract view, recurring bookings, settings, profile delete/restore
- **API Routes**: All backend logic (auth, CRUD, business logic)

### `backend-worker/`
- Background jobs: notification sending, payroll calculation, data cleanup
- Scheduled triggers: daily/weekly tasks

### `docs/`
- Product requirements, architecture decisions, API documentation
- Setup guides for new developers

### `infra/`
- GitHub Actions workflows for deployment
- Cloudflare D1, R2, Pages configuration
- Environment variable templates

## Key Files

| File | Purpose |
|------|---------|
| `schema.sql` | Single source of truth for D1 schema |
| `internal-portal/src/lib/db.ts` | D1 database connection helper |
| `marketing-site/src/lib/db.ts` | Shared D1 helper (copy) |
