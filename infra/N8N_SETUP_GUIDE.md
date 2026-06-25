# n8n + Hetzner Setup Guide

## Current Status (Verified 2026-06-25)

| Service | URL | Status |
|---------|-----|--------|
| n8n | https://n8n.scratchsolidsolutions.org | HTTP 200 — Login required |
| Cal.com | https://booking.scratchsolidsolutions.org | HTTP 200 — Onboarded |
| ERPNext | https://erp.scratchsolidsolutions.org | **404 — Site not created** |
| SSH (Hetzner) | root@167.233.18.87 | **Password rejected — qemu-guest-agent missing** |

## Critical: The Portal Webhook Secret

**ALL n8n workflows send webhooks to the internal portal.** The portal validates the `Authorization: Bearer <token>` header against `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET`.

**This secret MUST match in two places:**
1. **Cloudflare (portal worker)** — set via wrangler
2. **n8n credential** — created as "Portal Webhook Secret"

### Generated Secret
```
1413dd0fd4bff83c47ef17a3d7fa24a18c15aef6b20bd7f7e90b7de0b1baac0d
```

### Step 1: Set the secret in Cloudflare
```bash
cd internal-portal
npx wrangler secret put INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
# Paste: 1413dd0fd4bff83c47ef17a3d7fa24a18c15aef6b20bd7f7e90b7de0b1baac0d
```

Then redeploy:
```bash
npm run deploy
```

### Step 2: Run the n8n automation script
```bash
cd infra/scripts
node n8n-setup.js
```

The script will:
1. Log into n8n (uses your credentials)
2. Create the "Portal Webhook Secret" credential
3. Import all 6 workflows from `infra/n8n-workflows/`
4. Activate them

### Step 3: Create remaining credentials manually
In n8n UI (Settings → Credentials):

| Credential | Type | What You Need |
|------------|------|---------------|
| **Cal.com API** | Cal.com API | Your Cal.com API key |
| **Zoho Books** | OAuth2 or HTTP Request | Client ID, Secret, Refresh Token |
| **WhatsApp Cloud** | WhatsApp Business Cloud | Meta Access Token, Phone Number ID |
| **Resend SMTP** | SMTP | smtp.resend.com:587, user=resend, pass=your API key |

### Step 4: Connect Cal.com → n8n
1. In n8n, open the **"Cal.com to Portal: Booking Ingestion"** workflow
2. Click the **"Cal.com Trigger"** node
3. Copy the webhook URL (e.g., `https://n8n.scratchsolidsolutions.org/webhook/calcom-bookings`)
4. In Cal.com admin → Settings → Webhooks → Add webhook
   - URL: the copied URL
   - Event: `BOOKING_CREATED`
   - Secret: leave empty (auth is handled by the trigger node)

### Step 5: Fix the Hetzner server

**Problem:** Password auth fails because `qemu-guest-agent` is missing.

**Fix via Hetzner VNC Console:**
1. Log into [Hetzner Console](https://console.hetzner.cloud)
2. Select your server → "Console" (VNC)
3. Log in as root with the password that works there
4. Install qemu-guest-agent:
   ```bash
   apt-get update && apt-get install -y qemu-guest-agent
   systemctl enable qemu-guest-agent
   systemctl start qemu-guest-agent
   ```
5. Now password resets from Hetzner dashboard will work

**Then run the server audit:**
```bash
# SSH into the server (password should now work)
ssh root@167.233.18.87

# Run the audit
cd /opt/ScratchSolidSolutions/infra  # or wherever your repo is
bash scripts/server-audit.sh
```

This will show you exactly what's running and what's broken.

### Step 6: Create the ERPNext site

If the audit shows ERPNext site missing:
```bash
cd /opt/ScratchSolidSolutions/infra
docker compose exec erpnext_backend bench new-site scratchsolid.local \
  --mariadb-root-password $(grep ERPNEXT_DB_ROOT_PASSWORD .env | cut -d= -f2) \
  --admin-password $(openssl rand -base64 24)
```

## Workflow Import Order

Import and activate in this order:

1. **calcom-booking-ingestion.json** — Entry point, receives Cal.com bookings
2. **zoho-create-invoice.json** — Creates invoices (triggered by booking workflow)
3. **create-shift.json** — Creates cleaner shifts in ERPNext
4. **send-whatsapp.json** — Sends client/cleaner notifications
5. **zoho-payment-webhook.json** — Handles payment confirmations from Zoho
6. **data-retention-cleanup.json** — Daily POPIA data purge (runs on schedule)

## Troubleshooting

### "Unauthorized" from portal webhooks
- The `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET` doesn't match between Cloudflare and n8n
- The portal worker hasn't been redeployed after setting the secret

### n8n workflows show red credential icons
- The credential referenced by the workflow doesn't exist or has a different name
- Make sure credential names exactly match: `Portal Webhook Secret`, `cal-api-creds`

### Cal.com webhook not triggering
- Check the webhook URL in Cal.com matches the n8n trigger node's URL
- Test with a test booking in Cal.com
- Check n8n execution log for the workflow

### ERPNext 404
- The site `scratchsolid.local` hasn't been created yet
- Run the `bench new-site` command above

## Files Created

- `infra/scripts/n8n-setup.js` — Automates n8n workflow import
- `infra/scripts/server-audit.sh` — Full server health check
- This guide

## What Still Needs Manual Action

1. ✅ n8n workflow import — handled by script
2. ✅ Portal webhook secret — you set in wrangler
3. ⬜ Cal.com API credential — manual in n8n UI (you have the key)
4. ⬜ Zoho Books credential — manual in n8n UI (you have the tokens)
5. ⬜ WhatsApp Cloud credential — manual in n8n UI (needs Meta dashboard)
6. ⬜ Resend SMTP credential — manual in n8n UI (needs Resend API key)
7. ⬜ ERPNext site creation — run on server once SSH works
8. ⬜ Server full audit — run `server-audit.sh` once SSH works
