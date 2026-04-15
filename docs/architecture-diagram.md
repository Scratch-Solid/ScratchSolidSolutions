# Architecture Diagram

_This is a placeholder for the system architecture diagram. Replace with a proper diagram (draw.io, mermaid, or image) as the architecture is finalized._

## System Overview

- **Frontend**: Next.js (frontend-next, marketing-site)
- **Backend**: FastAPI (backend), Cloudflare Workers (backend-worker)
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Storage**: Cloudflare R2
- **CMS**: Directus
- **Accounting**: Zoho Books
- **Notifications**: WhatsApp, Email
- **CI/CD**: GitHub Actions

## High-Level Flow

1. User interacts with frontend (Next.js)
2. Frontend communicates with backend APIs (FastAPI, Workers)
3. Backend reads/writes to DB, triggers notifications, integrates with Directus/Zoho
4. Admin and business dashboards access advanced features
5. Content and assets managed via Directus and R2

---

**Update this file with a diagram as soon as one is available.**
