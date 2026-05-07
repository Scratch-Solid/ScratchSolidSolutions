# Security Checklist for Production Deployment

## Critical (Must Complete Before Launch)

- [ ] Remove `.env.local` from git history (use BFG Repo-Cleaner or git filter-repo)
- [ ] Set strong JWT_SECRET (min 32 random characters) in production environment
- [ ] Set strong CSRF_SECRET (min 32 random characters) in production environment
- [ ] Set all required environment variables in Cloudflare secrets manager
- [ ] Remove any hardcoded credentials from code
- [ ] Enable HTTPS only (Cloudflare Pages does this by default)
- [ ] Verify password policy is enforced consistently across all endpoints

## High Priority (Complete Within First Week)

- [ ] Implement httpOnly cookies for JWT tokens instead of localStorage
- [ ] Add CSRF token validation to all POST/PUT/DELETE endpoints
- [ ] Implement consistent rate limiting across all API endpoints
- [ ] Add input validation middleware to all API routes
- [ ] Implement refresh token pattern for session management
- [ ] Add centralized error monitoring (Sentry, DataDog, etc.)
- [ ] Add security event logging for authentication failures
- [ ] Implement API key rotation strategy
- [ ] Add API documentation (Swagger/OpenAPI)

## Medium Priority (Complete Within First Month)

- [ ] Write automated tests (unit, integration, E2E)
- [ ] Implement blue/green deployment strategy
- [ ] Document backup and disaster recovery procedures
- [ ] Conduct penetration testing
- [ ] Implement 2FA for admin accounts
- [ ] Add IP whitelisting for admin endpoints
- [ ] Implement database connection pooling
- [ ] Add caching strategy for frequently accessed data
- [ ] Implement request/response compression
- [ ] Add performance monitoring

## Compliance (GDPR/POPIA)

- [ ] Document data retention policy for all data types
- [ ] Implement granular consent tracking
- [ ] Add data breach notification procedure
- [ ] Verify automated cleanup of soft-deleted accounts
- [ ] Add privacy policy page with detailed information
- [ ] Implement cookie consent manager with granular options
- [ ] Add data export functionality for users
- [ ] Verify right to be forgotten is fully implemented

## Monitoring & Alerting

- [ ] Set up uptime monitoring
- [ ] Configure error alerting
- [ ] Set up performance monitoring
- [ ] Configure security event alerts
- [ ] Implement log aggregation
- [ ] Set up database backup monitoring
- [ ] Configure rate limit breach alerts
- [ ] Add anomaly detection

## Deployment Checklist

- [ ] Staging environment configured and tested
- [ ] Production secrets configured
- [ ] Database migrations tested
- [ ] Rollback procedure documented
- [ ] Post-deployment smoke tests
- [ ] Health check endpoints monitored
- [ ] CDN configured and tested
- [ ] DNS records verified
- [ ] SSL certificates valid
- [ ] Backup procedures tested

## Post-Launch

- [ ] Monitor error rates
- [ ] Review security logs daily
- [ ] Check rate limit effectiveness
- [ ] Verify all endpoints are secured
- [ ] Test password reset flow
- [ ] Verify data retention policies
- [ ] Review access logs
- [ ] Conduct security review after 30 days
