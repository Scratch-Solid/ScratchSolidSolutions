# Incident Response Playbook — ScratchSolid 2.0

## 1. Incident Severity Classification

| Level | Criteria | Response Time | Notification |
|-------|----------|---------------|--------------|
| SEV-1 (Critical) | Data breach, ransomware, production outage, unauthorized admin access | 15 min | CEO, CTO, Legal, Cloudflare SOC |
| SEV-2 (High) | DDoS causing degraded service, suspected account takeover, PII exposure | 30 min | CTO, DevOps Lead |
| SEV-3 (Medium) | Rate-limit exhaustion, suspicious login patterns, minor config drift | 2 hours | Engineering Lead |
| SEV-4 (Low) | Failed backup, non-critical alert fatigue, documentation gap | Next business day | On-call engineer |

## 2. Roles & Responsibilities

| Role | Responsibility |
|------|--------------|
| Incident Commander | Coordinates response, makes go/no-go decisions, external communications |
| Technical Lead | Executes technical remediation, root cause analysis |
| Communications Lead | Customer/status page updates, regulatory notifications if required |
| Legal/Compliance | POPIA breach notification, evidence preservation |

## 3. Response Procedures

### 3.1 Detect
- Monitor: Cloudflare Security Events, Sentry alerts, Uptime Kuma, server logs
- Triage: Classify severity using table above
- Create incident channel: `#inc-<YYYYMMDD>-<n>`

### 3.2 Contain
- **Origin IP exposed**: Enable Cloudflare proxy immediately; rotate origin credentials
- **Suspected breach**: Revoke all active sessions (`DELETE FROM sessions`); force password resets for affected accounts
- **DDoS/Rate-limit exhaustion**: Enable Cloudflare Under Attack mode; tighten WAF rules
- **Compromised secret**: Rotate via Wrangler immediately; redeploy affected Workers

### 3.3 Eradicate
- Patch vulnerability or remove malicious code
- Rebuild affected containers from clean base images
- Verify no persistence mechanisms remain (cron jobs, new user accounts, SSH keys)

### 3.4 Recover
- Restore from last clean D1 backup (stored in R2)
- Verify service health via `infra/verify.sh`
- Monitor for 24h post-recovery for re-infection

### 3.5 Post-Incident Review
- Within 48 hours: Document timeline, root cause, and corrective actions
- Update risk register and security controls as needed
- Share lessons learned with team

## 4. Communication Templates

### Customer Notice (SEV-1/2)
```
Subject: Security Update — ScratchSolid
We are investigating a security incident that may have affected [scope].
We have taken immediate steps to contain the issue.
We will update you within 24 hours.
```

### POPIA Breach Notification
- Notify Information Regulator within 72 hours if personal information is compromised
- Notify affected data subjects without unreasonable delay

## 5. Runbooks

### Runbook: Revoke All Sessions
```bash
# Connect to D1 via Wrangler
npx wrangler d1 execute scratchsolid-portal-db --command "DELETE FROM sessions; DELETE FROM refresh_tokens;"
```

### Runbook: Rotate All Wrangler Secrets
```bash
# See scripts/inject-secrets.sh for automated injection
./scripts/inject-secrets.sh
```

### Runbook: Restore D1 from R2 Backup
```bash
# Download latest backup from R2
# Use wrangler d1 execute with the .sql backup file
npx wrangler d1 execute scratchsolid-portal-db --file=/path/to/backup.sql
```

## 6. Contact Directory

| Service | Emergency Contact |
|---------|-----------------|
| Cloudflare | support@cloudflare.com / dashboard |
| Hetzner | support@hetzner.com |
| Resend | support@resend.dev |
| Zoho | support@zohocorp.com |

---
Last updated: 2026-06-05
