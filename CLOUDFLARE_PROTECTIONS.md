# Cloudflare-Specific Protections

**Date:** May 14, 2026
**Status:** ✅ COMPLETED

---

## Overview

This document outlines the Cloudflare-specific protections and configurations for the Scratch Solid Solutions platform.

---

## Environment Configuration

### Production Environment

**Marketing Site:**
- Worker Name: scratchsolidsolutions
- URL: https://scratchsolidsolutions.org
- API URL: https://api.scratchsolidsolutions.org
- D1 Database: scratchsolid-db
- KV Namespace: RATE_LIMIT_KV
- R2 Bucket: scratchsolid-uploads

**Internal Portal:**
- Worker Name: scratchsolid-portal
- URL: https://portal.scratchsolidsolutions.org
- D1 Database: scratchsolid-db-portal
- KV Namespace: RATE_LIMIT_KV_PORTAL
- R2 Bucket: scratchsolid-uploads-portal

**Backend Worker:**
- Worker Name: cleaning-service-backend
- URL: https://api.scratchsolidsolutions.org
- D1 Database: scratchsolid-db
- KV Namespace: RATE_LIMIT_KV
- R2 Bucket: scratchsolid-uploads

### Staging Environment

**Marketing Site:**
- Worker Name: scratchsolidsolutions-staging
- URL: https://staging.scratchsolidsolutions.org
- API URL: https://api-staging.scratchsolidsolutions.org
- D1 Database: scratchsolid-db-staging (ID: 6b6f139b-7a19-4d44-9e21-b85c0c0da42b)
- KV Namespace: RATE_LIMIT_KV_STAGING (ID: 7555bd20132346a8a9bf3cf67ea9a949)
- R2 Bucket: scratchsolid-uploads-staging

**Internal Portal:**
- Worker Name: scratchsolid-portal-staging
- URL: https://portal-staging.scratchsolidsolutions.org
- D1 Database: scratchsolid-db-portal-staging (ID: cc0bb727-585b-40c9-8afa-77947e725813)
- KV Namespace: RATE_LIMIT_KV_PORTAL_STAGING (ID: 918298e91aec470ba7f8d800b2f8f124)
- R2 Bucket: scratchsolid-uploads-portal-staging

**Backend Worker:**
- Worker Name: cleaning-service-backend-staging
- URL: https://cleaning-service-backend-staging.sparkling-darkness-405f.workers.dev
- D1 Database: scratchsolid-db-backend-staging (ID: 67e66542-486a-442b-bbf6-9c3d4a503f4c)
- KV Namespace: RATE_LIMIT_KV_BACKEND_STAGING (ID: f077cd7dd76843e680853ffe41bdbdaa)
- R2 Bucket: scratchsolid-uploads-backend-staging

---

## Cloudflare Security Features

### Web Application Firewall (WAF)

**Status:** Enabled via Cloudflare

**Rules:**
- Block known malicious IPs
- Rate limiting per IP
- SQL injection protection
- XSS protection
- File upload validation

### DDoS Protection

**Status:** Enabled via Cloudflare

**Features:**
- Automatic DDoS mitigation
- Layer 3/4 protection
- Layer 7 protection
- Rate limiting
- Challenge pages

### Edge Security

**Status:** Enabled via Cloudflare Workers

**Features:**
- Edge TLS termination
- HTTP/3 support
- Brotli compression
- Cache headers
- Security headers

---

## Cloudflare Workers Protections

### Authentication

**JWT Verification:**
- JWT_SECRET environment variable
- Token expiration: 24 hours
- Signature verification using HMAC-SHA256

**CSRF Protection:**
- CSRF_SECRET environment variable
- CSRF tokens for state-changing operations
- Double-submit cookie pattern

### Rate Limiting

**Implementation:** KV namespace-based rate limiting

**Rate Limits:**
- Authentication endpoints: 5 requests per minute
- API endpoints: 100 requests per minute
- Public endpoints: 1000 requests per minute

**Configuration:**
```javascript
// KV namespace: RATE_LIMIT_KV
// Key pattern: rate_limit:{ip}:{endpoint}
// TTL: 60 seconds
```

### CORS Configuration

**Allowed Origins:**
- https://scratchsolidsolutions.org
- https://portal.scratchsolidsolutions.org
- https://staging.scratchsolidsolutions.org
- https://portal-staging.scratchsolidsolutions.org
- http://localhost:3000 (development)

**Allowed Methods:**
- GET
- POST
- PUT
- DELETE
- OPTIONS

**Allowed Headers:**
- Content-Type
- Authorization

---

## Preview Deployments

### Preview Environment Strategy

**Implementation:** Cloudflare Workers Preview Deployments

**Trigger:** Pull request creation

**Configuration:**
- Automatic preview deployment on PR
- Preview URL generated for each PR
- Preview environment isolated from production
- Preview data isolated from production

### Preview URL Format

**Marketing Site:**
- Format: https://preview-{pr-number}.scratchsolidsolutions-staging.workers.dev

**Internal Portal:**
- Format: https://preview-{pr-number}.portal-staging.workers.dev

**Backend Worker:**
- Format: https://preview-{pr-number}.backend-staging.workers.dev

### Preview Environment Data

**Isolation Strategy:**
- Separate D1 database for preview (optional)
- Separate KV namespace for preview (optional)
- Separate R2 bucket for preview (optional)
- Environment-specific secrets

**Current Implementation:**
- Preview deployments use staging environment
- Staging data used for preview testing
- No dedicated preview database (cost optimization)

---

## Environment Variables

### Production Variables

**Marketing Site:**
```
NEXT_PUBLIC_BASE_URL=https://scratchsolidsolutions.org
NEXT_PUBLIC_API_URL=https://api.scratchsolidsolutions.org/api
R2_BUCKET=scratchsolid-uploads
R2_PUBLIC_BASE=https://uploads.scratchsolidsolutions.org
NODE_ENV=production
```

**Internal Portal:**
```
ALLOWED_ORIGINS=https://portal.scratchsolidsolutions.org
NODE_ENV=production
```

**Backend Worker:**
```
ENVIRONMENT=production
NEXT_PUBLIC_BASE_URL=https://scratchsolidsolutions.org
NEXT_PUBLIC_API_URL=https://api.scratchsolidsolutions.org/api
```

### Staging Variables

**Marketing Site:**
```
NEXT_PUBLIC_BASE_URL=https://staging.scratchsolidsolutions.org
NEXT_PUBLIC_API_URL=https://api-staging.scratchsolidsolutions.org/api
R2_BUCKET=scratchsolid-uploads-staging
R2_PUBLIC_BASE=https://uploads-staging.scratchsolidsolutions.org
NODE_ENV=staging
```

**Internal Portal:**
```
ALLOWED_ORIGINS=https://portal-staging.scratchsolidsolutions.org
NODE_ENV=staging
```

**Backend Worker:**
```
ENVIRONMENT=staging
NEXT_PUBLIC_BASE_URL=https://staging.scratchsolidsolutions.org
NEXT_PUBLIC_API_URL=https://api-staging.scratchsolidsolutions.org/api
```

---

## Secrets Management

### Wrangler Secrets

**Production Secrets:**
- JWT_SECRET
- CSRF_SECRET
- RESEND_API_KEY
- ZOHO_CLIENT_SECRET
- ZOHO_ORG_ID
- ZOHO_REFRESH_TOKEN

**Staging Secrets:**
- JWT_SECRET (separate from production)
- CSRF_SECRET (separate from production)
- RESEND_API_KEY (separate from production)
- ZOHO_CLIENT_SECRET (separate from production)
- ZOHO_ORG_ID (separate from production)
- ZOHO_REFRESH_TOKEN (separate from production)

### Secret Management Best Practices

- Never commit secrets to repository
- Use Wrangler CLI to manage secrets
- Rotate secrets regularly
- Use separate secrets for each environment
- Document secret rotation procedures

---

## Cloudflare Access (Optional Future Enhancement)

### Access Control

**Authentication Methods:**
- Email OTP
- Hardware keys (YubiKey)
- One-time PIN
- SSO integration

**Access Policies:**
- IP allowlisting for admin access
- Geographic restrictions
- Time-based access
- Device-based access

### Implementation Status

⏳ Not yet implemented
⏳ Recommended for admin dashboard protection
⏳ Recommended for internal portal

---

## Cloudflare Analytics

### Web Analytics

**Status:** Enabled

**Metrics Tracked:**
- Page views
- Unique visitors
- Geographic distribution
- Device types
- Referrers
- Bounce rate

### Workers Analytics

**Status:** Enabled

**Metrics Tracked:**
- Request count
- Error rate
- Response time
- CPU usage
- Memory usage
- Edge location performance

### R2 Analytics

**Status:** Enabled

**Metrics Tracked:**
- Storage usage
- Request count
- Bandwidth usage
- Error rate

---

## Cloudflare Cache Configuration

### Cache Rules

**Static Assets:**
- Cache duration: 1 year
- Cache key: URL + file hash
- Bypass cache on: Purge

**API Responses:**
- Cache duration: 5 minutes (GET requests only)
- Cache key: URL + authentication
- Bypass cache on: POST, PUT, DELETE

### Cache Purging

**Manual Purge:**
- Via Cloudflare dashboard
- Via API call
- Via Wrangler CLI

**Automatic Purge:**
- On deployment
- On content update
- On cache invalidation event

---

## Cloudflare SSL/TLS Configuration

### SSL Mode

**Mode:** Full (strict)

**Certificate:**
- Automatic certificate management
- Wildcard certificate for subdomains
- Automatic renewal

### TLS Version

**Minimum TLS Version:** 1.2
**Supported Versions:** 1.2, 1.3

### HTTP/3 Support

**Status:** Enabled
**QUIC Protocol:** Enabled

---

## Cloudflare DNS Configuration

### DNS Records

**Marketing Site:**
```
scratchsolidsolutions.org A 192.0.2.1
www.scratchsolidsolutions.org CNAME scratchsolidsolutions.org
api.scratchsolidsolutions.org CNAME scratchsolidsolutions.org
staging.scratchsolidsolutions.org CNAME scratchsolidsolutions-staging.workers.dev
api-staging.scratchsolidsolutions.org CNAME scratchsolidsolutions-staging.workers.dev
```

**Internal Portal:**
```
portal.scratchsolidsolutions.org CNAME scratchsolid-portal.workers.dev
portal-staging.scratchsolidsolutions.org CNAME scratchsolid-portal-staging.workers.dev
```

---

## Monitoring and Alerts

### Cloudflare Monitoring

**Tools:**
- Cloudflare Analytics Dashboard
- Workers Analytics
- R2 Analytics
- Uptime monitoring

**Alerts:**
- High error rate
- High latency
- Worker failures
- DDoS attacks

### Integration with Monitoring Setup

**Status:** Documented in MONITORING_SETUP.md
**Integration Point:** Cloudflare Analytics data available for custom monitoring

---

## Backup and Disaster Recovery

### D1 Database Backups

**Backup Frequency:** Daily
**Retention:** 7 days
**Location:** Cloudflare-managed

### KV Namespace Backups

**Backup Strategy:** Not applicable (KV is ephemeral)
**Mitigation:** Rebuild from database on restart

### R2 Bucket Backups

**Backup Frequency:** Daily
**Retention:** 30 days
**Location:** Separate geographic region

---

## Compliance Considerations

### Data Residency

**Current:** Cloudflare global network
**Regions:** WEUR (Western Europe) for databases
**Compliance:** GDPR compatible

### Data Encryption

**In Transit:** TLS 1.2+
**At Rest:** AES-256
**Key Management:** Cloudflare-managed

### Audit Logging

**Status:** Available via Cloudflare dashboard
**Retention:** 90 days
**Export:** Available for compliance audits

---

## Configuration Files

### Wrangler Configuration Files

**Marketing Site:** `marketing-site/wrangler.jsonc`
**Internal Portal:** `internal-portal/wrangler.jsonc`
**Backend Worker:** `backend-worker/wrangler.toml`

### Status

- ✅ Production environment configured
- ✅ Staging environment configured
- ✅ Environment variables set
- ✅ Secrets configured
- ✅ CORS restrictions implemented
- ✅ Rate limiting implemented

---

**Document Created:** May 14, 2026
**Status:** COMPLETED
