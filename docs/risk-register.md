# Risk Register — ScratchSolid 2.0

| ID | Risk | Likelihood | Impact | Risk Score | Mitigation | Owner | Status |
|----|------|------------|--------|------------|------------|-------|--------|
| R-01 | Origin IP exposed via unproxied DNS records | Medium | Critical | High | Enable Cloudflare proxy on all records; server hardening | DevOps | In Progress |
| R-02 | Hardcoded/dev secrets in source code | Low | Critical | Medium | Remove fallbacks; inject all secrets via Wrangler | Engineering | In Progress |
| R-03 | Privilege escalation via role manipulation | Low | Critical | Medium | RBAC enforcement; audit logging; MFA for admins | Engineering | In Progress |
| R-04 | In-memory rate limiting ineffective in serverless | Medium | High | Medium | KV-backed rate limiting; Cloudflare WAF | Engineering | In Progress |
| R-05 | PII stored unencrypted at rest | Medium | Critical | High | Field-level AES-256-GCM encryption; encryption key in Wrangler | Engineering | In Progress |
| R-06 | No external error tracking / blind to failures | Medium | Medium | Medium | Sentry integration with PII scrubbing | Engineering | In Progress |
| R-07 | Dependency vulnerabilities | Medium | High | Medium | npm audit fix; Dependabot; SBOM tracking | Engineering | Pending |
| R-08 | D1 data loss (no off-site backups) | Low | Critical | Medium | Automated D1 → R2 backups; 30-day retention | DevOps | Pending |
| R-09 | Insider threat / unauthorized admin action | Low | Critical | Medium | MFA enforcement; audit logs; least privilege | Engineering | In Progress |
| R-10 | POPIA non-compliance (consent/retention) | Medium | High | Medium | Cookie consent; data retention policies; DSAR endpoint | Compliance | Pending |
| R-11 | Session hijacking / token theft | Low | High | Low | httpOnly cookies; refresh token rotation; short-lived access tokens | Engineering | Complete |
| R-12 | Supply chain attack (npm dependency) | Low | Critical | Medium | Lockfile audit; signed commits; restricted npm registry | Engineering | Pending |
| R-13 | Cloudflare account takeover | Low | Critical | Medium | 2FA on Cloudflare account; API token least privilege | DevOps | Pending |
| R-14 | Server compromise (SSH/Docker) | Low | Critical | Medium | UFW fail2ban; key-only SSH; Docker daemon hardening | DevOps | In Progress |
| R-15 | Ransomware / data encryption attack | Low | Critical | Medium | Immutable R2 backups; least privilege; AV scanning | DevOps | Pending |

---
## Legend

- **Likelihood**: Rare / Low / Medium / High / Certain
- **Impact**: Negligible / Minor / Moderate / Major / Critical
- **Risk Score**: Low / Medium / High / Critical
- **Status**: Pending / In Progress / Complete / Accepted / Transferred

Last updated: 2026-06-05
