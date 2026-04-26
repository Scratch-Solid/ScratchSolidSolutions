# System Architecture

## High-Level Diagram

```
+------------------+      +------------------+
|   Marketing      |      |   Internal       |
|   Site           |      |   Portal         |
|   Next.js        |<---->|   Next.js        |
|   (Cloudflare)   |      |   (Cloudflare)   |
+------------------+      +------------------+
         |                       |
         |                       |
         v                       v
+------------------+      +------------------+      +------------------+
|   Cloudflare D1  |      |   Cloudflare R2  |      |   Zoho Books     |
|   SQLite DB      |      |   File Storage   |      |   Invoices       |
+------------------+      +------------------+      +------------------+
```

## Components

### Marketing Site (`marketing-site/`)
- **Framework**: Next.js 15
- **Deployment**: Cloudflare Pages
- **Features**: Landing page, booking flow, client signup, login
- **Database**: Cloudflare D1 (shared with internal portal)

### Internal Portal (`internal-portal/`)
- **Framework**: Next.js 15
- **Deployment**: Cloudflare Pages
- **Features**: Admin dashboard, cleaner dashboard, business dashboard
- **Database**: Cloudflare D1 (shared with marketing site)

### Database (Cloudflare D1)
- **Type**: SQLite-compatible edge database
- **Tables**: users, bookings, cleaner_profiles, business_profiles, contracts, employees, pending_contracts, task_completions, sessions, audit_logs, roles, permissions, role_permissions

### File Storage (Cloudflare R2)
- **Purpose**: Profile pictures, documents, gallery images
- **Integration**: S3-compatible API

### Payments (Zoho Books)
- **Purpose**: Invoice generation, payment tracking, POP verification
- **Integration**: REST API

## Authentication Flow
```
User -> POST /api/auth/login -> D1 (verify bcrypt hash) -> JWT Token -> httpOnly Cookie
User -> Authenticated Request -> Cookie -> JWT Verify -> D1 (session check) -> API Response
```

## Data Flow
1. Client books via marketing site → D1 bookings table
2. Admin assigns cleaner via portal → D1 bookings updated
3. Cleaner updates status via dashboard → D1 cleaner_profiles + bookings updated
4. Task completion triggers payroll → D1 task_completions inserted
5. Invoice generated in Zoho → Payment tracked
