# Runbook — Cal.com Onboarding & Booking → n8n Wiring

**When to use:** `https://booking.scratchsolidsolutions.org` shows the Cal.com
setup wizard, or bookings are not flowing into the portal.

**Impact while broken:** customers cannot self-book, and the
booking → assignment → invoice automation never starts.

**Time required:** ~20–30 minutes. **Access required:** the Hetzner server (for env
checks) and a browser.

---

## Architecture (how a booking flows)

```
Customer books on  booking.scratchsolidsolutions.org  (Cal.com, self-hosted)
        │  Cal.com "booking.created" webhook
        ▼
n8n  (n8n.scratchsolidsolutions.org)  — workflow: booking-ingested
        │  HMAC-signed POST (INTERNAL_PORTAL_N8N_WEBHOOK_SECRET)
        ▼
Portal  /api/webhooks/n8n/booking-ingested  → creates job, triggers assignment
```

Relevant env (already produced by `infra/scripts/generate-env.js`):
`CALCOM_WEBAPP_URL`, `CALCOM_NEXTAUTH_SECRET`, `CALCOM_ENCRYPTION_KEY`,
`EMAIL_FROM` / `EMAIL_SERVER_*` (Resend), and `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET`.

---

## Step 1 — Confirm the service is healthy

On the server:
```bash
cd infra
docker compose ps calcom-engine calcom-db
docker compose logs --tail=50 calcom-engine
```
Confirm `CALCOM_WEBAPP_URL=https://booking.scratchsolidsolutions.org` and that
email vars are set (needed for login/verification emails). If `EMAIL_SERVER_PASSWORD`
is still the placeholder, set a real Resend API key in `infra/.env` and
`docker compose up -d calcom-engine`.

## Step 2 — Create the admin account (setup wizard)

1. Open **https://booking.scratchsolidsolutions.org/auth/setup**.
2. Create the first **admin** user (this becomes the org owner).
3. Complete the wizard: organization name, timezone (`Africa/Johannesburg`),
   and availability defaults.

## Step 3 — Create event types (bookable services)

Under **Event Types**, create one per bookable service, e.g.:
- `Standard Clean` (duration, buffer, price if shown)
- `Deep Clean`
- `Move-in/Move-out`

Set availability schedules and any required booking questions (address, etc.).

## Step 4 — Wire the booking webhook to n8n

1. In Cal.com: **Settings → Developer → Webhooks → New**.
2. **Subscriber URL:** the n8n production webhook for the booking-ingested
   workflow, e.g. `https://n8n.scratchsolidsolutions.org/webhook/booking-ingested`
   (use the exact path shown on the n8n Webhook node — the "Production URL").
3. **Event triggers:** `Booking Created` (add `Booking Cancelled` / `Rescheduled`
   if the workflow handles them).
4. **Secret:** set a signing secret and store the same value in n8n so the
   workflow can verify it.
5. **Save**, then use **Ping/Test** to send a sample event.

## Step 5 — Confirm the n8n workflow + portal handoff

1. In n8n, ensure the **booking-ingested** workflow (import from
   `infra/n8n-workflows/`) is **Active** and its HTTP node posts to
   `https://portal.scratchsolidsolutions.org/api/webhooks/n8n/booking-ingested`
   with the `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET` HMAC header.
2. The portal route verifies the HMAC and creates the job.

## Step 6 — End-to-end verification

1. Make a real test booking on `booking.scratchsolidsolutions.org`.
2. n8n: confirm the booking-ingested execution succeeded (green).
3. Portal: confirm a new job/booking appears in the admin dashboard.
4. (If WhatsApp/Meta configured) confirm the customer notification; otherwise the
   email fallback fires.

---

## Troubleshooting

- **No webhook received by n8n:** check the Cal.com webhook log (Settings →
  Developer → Webhooks → the entry → recent deliveries) and that the n8n workflow
  is Active with a matching Production URL path.
- **Portal returns 401:** the HMAC secret in n8n does not match
  `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET` on the portal. Align them.
- **Login emails not arriving:** `EMAIL_SERVER_PASSWORD` (Resend key) missing or
  invalid in `infra/.env`.
