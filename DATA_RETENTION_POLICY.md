# Data Retention Policy

**Effective Date:** May 14, 2026
**Last Updated:** May 14, 2026
**Version:** 1.0

---

## Overview

This document outlines the data retention policies for Scratch Solid Solutions platform to ensure compliance with data protection regulations (GDPR, CCPA) and maintain good data hygiene practices.

---

## Data Retention Periods

### Authentication & Session Data (30 Days)

**Data Types:**
- User sessions
- Refresh tokens
- Password reset tokens
- Email verification tokens

**Retention Period:** 30 days after creation or last use

**Rationale:**
- Sessions are temporary authentication mechanisms
- Refresh tokens beyond 30 days indicate potential security risks
- Password reset tokens should expire quickly for security

**Cleanup Method:** Automatic deletion after 30 days

---

### Audit Logs (7 Years)

**Data Types:**
- Admin actions
- User activity logs
- Permission changes
- Data modifications
- Login/logout events

**Retention Period:** 7 years from creation

**Rationale:**
- Legal and regulatory requirements
- Security incident investigation
- Compliance auditing
- Dispute resolution

**Cleanup Method:** Archive after 1 year, delete after 7 years

---

### Business Transaction Data (7 Years)

**Data Types:**
- Bookings
- Quotes
- Invoices
- Contracts
- Payment records

**Retention Period:** 7 years from transaction completion

**Rationale:**
- Tax compliance requirements
- Legal dispute resolution
- Financial auditing
- Customer service support

**Cleanup Method:** Archive after 2 years, delete after 7 years

---

### User Profile Data (Indefinite Until Account Deletion)

**Data Types:**
- User profiles
- Contact information
- Preferences
- Employment contracts (active)

**Retention Period:** Until account deletion request

**Rationale:**
- Ongoing business relationship
- Service delivery requirements
- Legal compliance for employment records

**Cleanup Method:** Delete 30 days after account deletion request (with exceptions for legal requirements)

---

### Marketing & Analytics Data (2 Years)

**Data Types:**
- Website analytics
- Marketing campaign data
- AI knowledge base entries
- Content management data

**Retention Period:** 2 years from creation

**Rationale:**
- Marketing effectiveness analysis
- Business intelligence
- Limited long-term value

**Cleanup Method:** Automatic deletion after 2 years

---

### Temporary & Cache Data (7 Days)

**Data Types:**
- Cache entries
- Temporary uploads
- Session cache
- Rate limiting data

**Retention Period:** 7 days maximum

**Rationale:**
- Performance optimization only
- No business or legal value
- Security best practices

**Cleanup Method:** Automatic deletion after 7 days

---

## Data Deletion Procedures

### Automated Cleanup

**Scheduled Jobs:**
1. **Daily Cleanup:** Temporary/cache data (7 days)
2. **Weekly Cleanup:** Authentication/session data (30 days)
3. **Monthly Cleanup:** Marketing/analytics data (2 years)
4. **Quarterly Review:** Archive old business data
5. **Annual Review:** Delete archived data beyond retention period

**Implementation:**
- Cloudflare Workers Cron Triggers
- Database cleanup scripts
- R2 bucket lifecycle policies
- KV namespace TTL policies

### Manual Cleanup

**Triggers:**
- User account deletion requests
- Legal deletion orders
- Data subject access requests (DSAR)
- Security incident response

**Procedure:**
1. Verify deletion authority
2. Identify all data locations
3. Execute deletion across all systems
4. Confirm deletion completion
5. Document deletion for compliance

---

## Data Archiving

### Archive Criteria

Data should be archived when:
- Retention period is > 2 years
- Data is no longer actively accessed
- Legal requirements mandate retention
- Business value is historical only

### Archive Storage

**Primary Archive:** Cloudflare R2 (cold storage tier)
**Backup Archive:** Separate geographic region
**Format:** Compressed JSON or SQL dumps
**Encryption:** AES-256 at rest
**Access:** Restricted to authorized personnel

### Archive Retention

- Archived data retained until final deletion date
- Archive metadata includes original deletion date
- Archive index maintained for search capability

---

## Data Subject Rights

### Right to Access

Users can request access to their personal data through:
- Internal portal data rights endpoint
- Email request to privacy@scratchsolidsolutions.org
- Written request via postal mail

**Response Time:** 30 days from request receipt

### Right to Deletion

Users can request deletion of their personal data:
- Via internal portal account deletion
- Via email to privacy@scratchsolidsolutions.org
- Via written request

**Exceptions:**
- Active contracts (until contract expiration)
- Legal requirements (tax, regulatory)
- Dispute resolution (until resolution)

**Response Time:** 30 days from request receipt

### Right to Correction

Users can request correction of inaccurate data:
- Via internal portal profile editing
- Via email request
- Via written request

**Response Time:** 30 days from request receipt

---

## Compliance Considerations

### GDPR Compliance

- **Legal Basis:** Legitimate interest, contract fulfillment
- **Data Minimization:** Collect only necessary data
- **Purpose Limitation:** Use data only for stated purposes
- **Storage Limitation:** Enforce retention periods
- **Right to be Forgotten:** Implement deletion procedures

### CCPA Compliance

- **Notice at Collection:** Inform users of data collection
- **Right to Know:** Provide data access
- **Right to Delete:** Implement deletion procedures
- **Right to Opt-Out:** Marketing opt-out mechanisms
- **Non-Discrimination:** No penalties for exercising rights

### Tax & Financial Compliance

- **7-Year Retention:** Financial transaction records
- **Audit Trail:** Maintain modification history
- **Immutable Records:** Contract and invoice integrity

---

## Implementation Status

### Completed ✅

- Database indexes for cleanup queries
- Data retention policy documentation

### In Progress 🔄

- Automated cleanup scripts
- Cloudflare Workers cron triggers
- R2 lifecycle policies

### Pending ⏳

- Archive storage implementation
- Data subject request automation
- Compliance audit procedures

---

## Monitoring & Reporting

### Metrics to Track

- Data volume by retention category
- Cleanup job success/failure rates
- Data subject request response times
- Compliance audit results

### Reports

- **Monthly:** Data retention compliance report
- **Quarterly:** Data volume and storage analysis
- **Annually:** Full compliance audit

---

## Policy Review

This policy will be reviewed annually or when:
- New regulations are enacted
- Business practices change significantly
- Security incidents occur
- Technology capabilities change

**Next Review Date:** May 14, 2027

---

## Contact

**Data Protection Officer:** privacy@scratchsolidsolutions.org
**Technical Implementation:** engineering@scratchsolidsolutions.org
**Legal Counsel:** legal@scratchsolidsolutions.org

---

**Approved By:** Jason (Owner)
**Effective Date:** May 14, 2026
