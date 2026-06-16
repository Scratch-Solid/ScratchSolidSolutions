# Cron Scheduler Setup

## Overview

The internal portal exposes two cron endpoints for automated maintenance tasks. These endpoints are protected by a `CRON_SECRET` Bearer token.

## Endpoints

### 1. Data Retention Cleanup (POPIA 48h purge)

**URL:** `POST https://portal.scratchsolidsolutions.org/api/cron/data-retention`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**What it does:**
- Deletes expired sessions (30 days)
- Deletes expired refresh tokens (30 days)
- Archives old audit logs (7 years)
- Deletes WhatsApp session metadata after 48 hours (POPIA compliance)
- Deletes job tracking metadata after 48 hours (POPIA compliance)

**Recommended schedule:** Every hour (`0 * * * *`)

### 2. Overdue Invoice Cancellation

**URL:** `POST https://portal.scratchsolidsolutions.org/api/cron/overdue-invoices`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**What it does:**
- Checks all bookings with Zoho invoices
- Cancels invoices that are overdue by more than 30 days
- Updates booking status to `cancelled`

**Recommended schedule:** Daily at 2 AM (`0 2 * * *`)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes | Bearer token secret for cron endpoint authentication |

## Scheduling Options

### Option A: n8n Workflow

Create an n8n HTTP Request node with:
- Method: POST
- URL: `https://portal.scratchsolidsolutions.org/api/cron/data-retention`
- Header: `Authorization = Bearer {{$env.CRON_SECRET}}`
- Schedule: Every hour

### Option B: GitHub Actions

```yaml
name: Data Retention Cleanup
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://portal.scratchsolidsolutions.org/api/cron/data-retention
```

### Option C: Cloudflare Worker Cron Trigger

Deploy the included `workers/cron-scheduler.ts` worker with your cron schedule. It will call both endpoints using the configured secrets.

## Testing

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://portal.scratchsolidsolutions.org/api/cron/data-retention
```
