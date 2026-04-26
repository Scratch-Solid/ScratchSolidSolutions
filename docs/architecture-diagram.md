# Architecture Diagram

_This is a placeholder for the system architecture diagram. Replace with a proper diagram (draw.io, mermaid, or image) as the architecture is finalized._

## System Overview

- **Frontend**: Next.js (marketing-site, internal-portal)
- **Backend**: Cloudflare Workers (OpenNext)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Accounting**: Zoho Books
- **Notifications**: WhatsApp, Email
- **CI/CD**: GitHub Actions

## High-Level Flow

1. User interacts with frontend (Next.js)
2. Frontend communicates with backend APIs (Cloudflare Workers)
3. Backend reads/writes to DB, triggers notifications, integrates with Zoho
4. Admin and business dashboards access advanced features
5. Content and assets managed via D1 and R2

---

**Update this file with a diagram as soon as one is available.**
