# WAF Rules & Security Documentation

## Cloudflare WAF Configuration

### Managed Rulesets (Enable in Cloudflare Dashboard)
- **Cloudflare Managed Ruleset**: ON (Block mode)
- **OWASP Core Ruleset**: ON (Block mode)
- **Cloudflare Exposed Credentials Check**: ON

### Custom WAF Rules

#### Rule 1: Block SQL Injection Patterns
```
(http.request.uri.path contains "/api/" and 
  (http.request.body.raw contains "UNION SELECT" or 
   http.request.body.raw contains "OR 1=1" or
   http.request.body.raw contains "DROP TABLE" or
   http.request.body.raw contains "--"))
Action: Block
```

#### Rule 2: Block XSS in API Routes
```
(http.request.uri.path contains "/api/" and 
  (http.request.body.raw contains "<script>" or 
   http.request.body.raw contains "javascript:" or
   http.request.body.raw contains "onerror="))
Action: Block
```

#### Rule 3: Rate Limit Auth Endpoints
```
(http.request.uri.path contains "/api/auth/" and 
  cf.threat_score gt 10 and
  rate_limit.requests_per_minute gt 20)
Action: Block for 10 minutes
```

#### Rule 4: Block Requests Without User-Agent
```
(http.request.uri.path contains "/api/" and 
  not http.request.headers["user-agent"])
Action: Block
```

#### Rule 5: Block Suspicious HTTP Methods on API
```
(http.request.uri.path contains "/api/" and 
  http.request.method in {"TRACE" "TRACK" "OPTIONS" "CONNECT"})
Action: Block
```

#### Rule 6: Geographic Restrictions (if applicable)
```
(ip.src.country not in {"ZA"} and 
  http.request.uri.path contains "/api/admin/")
Action: Block
```

## Security Headers (Applied via Middleware)

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Content-Security-Policy` | `default-src 'self'; ...` | Resource loading policy |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Feature restrictions |
| `X-Request-ID` | UUID | Distributed tracing |
| `X-Trace-ID` | UUID | Request correlation |

## Rate Limiting Strategy

### Tier 1: In-Memory (per-worker)
- Default: 100 req/min per IP
- Applied via `withRateLimit()` middleware

### Tier 2: KV-Based (distributed)
- Auth endpoints: 20 req/min per IP
- Write endpoints: 30 req/min per IP  
- Read endpoints: 60 req/min per IP
- Applied via `withKVRateLimit()` middleware

### Tier 3: Cloudflare Edge
- Global rate limiting via Cloudflare dashboard
- 1000 req/min per IP for the entire domain

## Authentication & Authorization

- **JWT tokens** with bcrypt password hashing
- **RBAC roles**: `admin`, `business`, `client`, `cleaner`
- All API endpoints require auth via `withAuth()` middleware
- Role-based access enforced via `allowedRoles` parameter
- Session validation against D1 database on every request

## Data Protection

- All database queries use **parameterized statements** (no string interpolation)
- Input validation on all POST/PUT endpoints
- PII fields (email, phone, ID number) encrypted at rest in D1
- HTTPS enforced via HSTS preload

## Monitoring & Alerting

### Health Check Endpoints
- `/api/status` — Readiness probe with DB/KV latency checks, P95 SLA thresholds, and alert array
  - Returns `503` if any check status is `fail`, `200` for `healthy` or `degraded`
  - Includes `alerts[]` array with specific degradation reasons (e.g. `database:slow_p95>50ms`)
  - Tracks `uptimeMs`, `version`, `startedAt` for 99.9%+ uptime tracking

### P95 Latency SLA Thresholds
| Component | SLA | Alert Trigger |
|-----------|-----|---------------|
| D1 Database | 50ms | `database:slow_p95>50ms` |
| KV Namespace | 30ms | `kv:slow_p95>30ms` |
| Full endpoint | 200ms | `endpoint:p95_exceeded>200ms` |

### Cloudflare Health Check Configuration
Configure in Cloudflare Dashboard → Health Checks:
```
Endpoint: https://scratchsolid.com/api/status
Interval: 60 seconds
Timeout: 10 seconds
Retries: 2
Expected Status: 200
Failure Threshold: 3 consecutive failures
Notification: Email + Webhook to incident channel
```

Configure for portal:
```
Endpoint: https://portal.scratchsolid.com/api/status
Interval: 60 seconds
Timeout: 10 seconds
Retries: 2
Expected Status: 200
Failure Threshold: 3 consecutive failures
```

### Alerting Rules
- **P1 Critical**: `/api/status` returns 503 for >2 consecutive checks → immediate page
- **P2 Warning**: Any `alerts[]` entry present on 3+ consecutive checks → Slack notification
- **P3 Info**: `latencyMs` exceeds P95 threshold on single check → log only
- **Uptime SLA**: 99.9% = max 43.2 min downtime/month; tracked via Cloudflare Analytics

### Structured Logging
All API routes emit structured JSON logs with:
```json
{
  "timestamp": "2026-04-23T15:00:00.000Z",
  "traceId": "uuid",
  "method": "GET",
  "path": "/api/bookings",
  "status": 200,
  "durationMs": 45,
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/5.0..."
}
```

### Cloudflare Analytics
- Edge-level request metrics, bandwidth, and threat analytics
- Real-time error rate monitoring via dashboard
- Cache hit/miss ratio for reverse proxy optimization
