# Monitoring Setup Guide

**Created:** May 14, 2026
**Purpose:** Document health check endpoints and monitoring configuration for Scratch Solid Solutions

---

## Overview

This document provides the health check endpoints and monitoring configuration for the Scratch Solid Solutions platform. These endpoints should be monitored by an external uptime monitoring service (e.g., UptimeRobot, Pingdom, StatusCake, or Cloudflare Health Checks).

---

## Health Check Endpoints

### Marketing Site

#### 1. Basic Health Check
**Endpoint:** `https://scratchsolidsolutions.org/api/health`
**Method:** GET
**Response:**
```json
{
  "status": "healthy" | "degraded",
  "timestamp": "2026-05-14T14:23:35.000Z",
  "checks": {
    "database": true | false | "D1 binding not available"
  },
  "duration_ms": 45,
  "version": "1.0.0"
}
```
**HTTP Status:** 200 if healthy, 503 if degraded
**Check Frequency:** Every 1 minute
**Alert Threshold:** 2 consecutive failures

#### 2. Simple Health Check
**Endpoint:** `https://scratchsolidsolutions.org/api/health-check`
**Method:** GET
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-14T14:23:35.000Z",
  "message": "Worker is running and database is connected"
}
```
**HTTP Status:** 200
**Check Frequency:** Every 5 minutes
**Alert Threshold:** 3 consecutive failures

#### 3. Comprehensive Status Check
**Endpoint:** `https://scratchsolidsolutions.org/api/status`
**Method:** GET
**Response:**
```json
{
  "service": "marketing-site",
  "version": "1.0.0",
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-05-14T14:23:35.000Z",
  "startedAt": "2026-05-14T14:00:00.000Z",
  "uptimeMs": 1415000,
  "checks": {
    "database": {
      "status": "ok" | "fail" | "degraded",
      "latencyMs": 25,
      "slaMs": 50,
      "error": "error message if failed"
    },
    "kv": {
      "status": "ok" | "fail" | "degraded",
      "latencyMs": 15,
      "slaMs": 30,
      "error": "error message if failed"
    }
  },
  "alerts": [
    "database:slow_p95>50ms",
    "endpoint:p95_exceeded>200ms"
  ],
  "latencyMs": 45,
  "p95ThresholdMs": 200
}
```
**HTTP Status:** 200 if healthy/degraded, 503 if unhealthy
**Check Frequency:** Every 1 minute
**Alert Threshold:** 
- Immediate alert for status = "unhealthy"
- Warning after 5 minutes of status = "degraded"

### Internal Portal

#### 1. Basic Health Check
**Endpoint:** `https://portal.scratchsolidsolutions.org/api/health`
**Method:** GET
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-14T14:23:35.000Z",
  "message": "Basic health check working"
}
```
**HTTP Status:** 200
**Check Frequency:** Every 1 minute
**Alert Threshold:** 2 consecutive failures

#### 2. Comprehensive Status Check
**Endpoint:** `https://portal.scratchsolidsolutions.org/api/status`
**Method:** GET
**Response:**
```json
{
  "service": "internal-portal",
  "version": "1.0.0",
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-05-14T14:23:35.000Z",
  "startedAt": "2026-05-14T14:00:00.000Z",
  "uptimeMs": 1415000,
  "checks": {
    "database": {
      "status": "ok" | "fail" | "degraded",
      "latencyMs": 25,
      "slaMs": 50,
      "error": "error message if failed"
    },
    "kv": {
      "status": "ok" | "fail" | "degraded",
      "latencyMs": 15,
      "slaMs": 30,
      "error": "error message if failed"
    }
  },
  "alerts": [
    "database:slow_p95>50ms",
    "endpoint:p95_exceeded>200ms"
  ],
  "latencyMs": 45,
  "p95ThresholdMs": 200
}
```
**HTTP Status:** 200 if healthy/degraded, 503 if unhealthy
**Check Frequency:** Every 1 minute
**Alert Threshold:**
- Immediate alert for status = "unhealthy"
- Warning after 5 minutes of status = "degraded"

### Reverse Proxy

**Endpoint:** `https://scratchsolid-reverse-proxy.sparkling-darkness-405f.workers.dev`
**Method:** GET (any path)
**Response:** Proxied response from origin with X-Cache header
**Check Frequency:** Every 1 minute
**Alert Threshold:** 2 consecutive failures

---

## Service Level Agreements (SLAs)

### Database Performance
- **Target Latency:** < 50ms (P95)
- **Warning Threshold:** > 50ms
- **Critical Threshold:** > 200ms

### KV Cache Performance
- **Target Latency:** < 30ms (P95)
- **Warning Threshold:** > 30ms
- **Critical Threshold:** > 100ms

### Overall Endpoint Latency
- **Target Latency:** < 200ms (P95)
- **Warning Threshold:** > 200ms
- **Critical Threshold:** > 1000ms

### Error Rate
- **Target Error Rate:** < 1%
- **Warning Threshold:** > 5%
- **Critical Threshold:** > 10%

---

## Recommended Monitoring Services

### 1. Cloudflare Health Checks (Recommended)
**Why:** Already integrated with Cloudflare infrastructure
**Setup:**
1. Go to Cloudflare Dashboard > Monitoring > Health Checks
2. Create health checks for each endpoint
3. Configure alert thresholds
4. Set up notifications (email, Slack, PagerDuty)

**Benefits:**
- Native integration with Cloudflare
- Real-time monitoring
- Automatic failover support
- Free tier available

### 2. UptimeRobot
**Why:** Free, reliable, easy to set up
**Setup:**
1. Create account at uptimerobot.com
2. Add monitors for each endpoint
3. Configure alert contacts (email, Slack, SMS)
4. Set check intervals (1-5 minutes)

**Benefits:**
- Free for up to 50 monitors
- Multiple alert channels
- Public status page available
- API access

### 3. Pingdom
**Why:** Comprehensive monitoring with detailed analytics
**Setup:**
1. Create account at pingdom.com
2. Add Uptime monitors
3. Configure Synthetic Transaction Monitoring
4. Set up alert integrations

**Benefits:**
- Detailed performance metrics
- Real user monitoring (RUM)
- Transaction monitoring
- Root cause analysis

### 4. StatusCake
**Why:** Affordable with good alerting features
**Setup:**
1. Create account at statuscake.com
2. Add monitors
3. Configure multi-location checks
4. Set up alert integrations

**Benefits:**
- Multi-location monitoring
- Page speed monitoring
- SSL certificate monitoring
- Domain monitoring

---

## Alert Configuration

### Critical Alerts (Immediate Notification)
- Service status = "unhealthy"
- Database connection failure
- Error rate > 10%
- Endpoint latency > 1000ms
- Any security-related alerts

**Notification Channels:**
- Email (primary)
- Slack (secondary)
- SMS (for critical incidents)
- PagerDuty (if available)

### Warning Alerts (Non-Critical)
- Service status = "degraded"
- Database latency > 50ms
- Error rate > 5%
- Endpoint latency > 200ms

**Notification Channels:**
- Email
- Slack

---

## Monitoring Dashboard Setup

### Recommended Metrics to Track

1. **Uptime**
   - Overall uptime percentage
   - Downtime incidents
   - Response time trends

2. **Performance**
   - Average response time
   - P50, P95, P99 latency
   - Database query latency
   - KV cache latency

3. **Errors**
   - Error rate percentage
   - Error types breakdown
   - Failed requests count

4. **Alerts**
   - Alert history
   - Alert resolution time
   - False positive rate

### Dashboard Tools

1. **Grafana** (with Cloudflare Analytics)
2. **Datadog** (comprehensive monitoring)
3. **New Relic** (APM + monitoring)
4. **Cloudflare Dashboard** (built-in)

---

## Status Page

### Public Status Page
Recommended to set up a public status page for customers:
- **UptimeRobot Status Pages:** Free
- **StatusGator:** Paid, more features
- **Statuspage.io:** Paid, Atlassian integration
- **Custom:** Build with Next.js

### Status Page Content
- Overall system status
- Individual service status
- Incident history
- Maintenance schedules
- Contact information

---

## Log Monitoring

### Current Logging
- Structured logging implemented
- Trace ID correlation
- Error classification
- Security event logging

### Log Aggregation Services
1. **Logtail** (Cloudflare integration)
2. **Datadog Logs**
3. **Loggly**
4. **Papertrail**

### Log Alerts
- Error rate spikes
- Security events
- Failed authentication attempts
- Database errors

---

## Next Steps

### Immediate Actions
1. **Set up Cloudflare Health Checks** for critical endpoints
2. **Configure email alerts** for critical failures
3. **Create public status page** for customers

### Week 1-2
1. **Set up UptimeRobot** as backup monitoring
2. **Configure Slack integration** for team notifications
3. **Implement log aggregation** service

### Month 1
1. **Set up comprehensive monitoring dashboard** (Grafana/Datadog)
2. **Implement performance monitoring** (APM)
3. **Set up synthetic transaction monitoring**

### Month 2-3
1. **Implement real user monitoring** (RUM)
2. **Set up automated alerting** for SLA breaches
3. **Create runbooks** for common incidents

---

## Monitoring Checklist

- [ ] Set up Cloudflare Health Checks for all endpoints
- [ ] Configure critical alert notifications
- [ ] Set up backup monitoring (UptimeRobot)
- [ ] Create public status page
- [ ] Implement log aggregation
- [ ] Set up monitoring dashboard
- [ ] Configure performance monitoring
- [ ] Document incident response procedures
- [ ] Create monitoring runbooks
- [ ] Set up regular monitoring reviews

---

## Contact Information

**Monitoring Service Contacts:**
- Primary: [your email]
- Secondary: [team email]
- On-call: [on-call phone]

**Cloudflare Account:**
- Account ID: [your account ID]
- API Token: [your API token]

---

## Appendix: Monitoring Service Configuration Examples

### Cloudflare Health Check Configuration

```yaml
# Example Cloudflare Health Check configuration
name: "Marketing Site Health"
check_regions: ["WEU", "EUS"]
check_interval: 60
timeout: 10
method: "GET"
path: "/api/health"
expected_codes: [200]
expected_body: "healthy"
alert_sensitivity: "high"
```

### UptimeRobot API Configuration

```json
{
  "type": 1,
  "friendly_name": "Marketing Site Health",
  "url": "https://scratchsolidsolutions.org/api/health",
  "monitor_interval": 60,
  "alert_contacts": [123456],
  "status": 1
}
```

---

**Document Version:** 1.0
**Last Updated:** May 14, 2026
**Next Review:** August 14, 2026
