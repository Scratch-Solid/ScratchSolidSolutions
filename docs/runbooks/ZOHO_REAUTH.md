# Runbook — Zoho Books Re-Authentication

**When to use:** the backend health check (`https://api.scratchsolidsolutions.org/api/health`)
reports `"zoho":"token_expired"`, or invoicing/quotes/payments fail with
`Zoho not configured` / 401 from Zoho.

**Impact while broken:** quote→estimate→invoice creation, payment reconciliation,
and customer statements do not sync to Zoho Books. Everything else keeps working.

**Time required:** ~10 minutes. **Access required:** Zoho admin + Cloudflare account
(to set Worker secrets).

---

## Background

Both the **marketing site** and the **backend worker** call Zoho Books using four
values (stored as Cloudflare Worker secrets):

| Secret | Notes |
|---|---|
| `ZOHO_ORG_ID` | Zoho Books organization ID (rarely changes) |
| `ZOHO_CLIENT_ID` | OAuth client ID (rarely changes) |
| `ZOHO_CLIENT_SECRET` | OAuth client secret (rarely changes) |
| `ZOHO_REFRESH_TOKEN` | **This is the one that breaks** — regenerate it below |

Token exchange uses `https://accounts.zoho.com/oauth/v2/token`. If your org is on
the EU/IN/AU data centre, replace `.com` with `.eu` / `.in` / `.com.au` in the
URLs below (must match the domain where the app was registered).

---

## Step 1 — Generate a new refresh token

1. Go to **https://api-console.zoho.com/** and open your existing client
   (Self Client, or the Server-based Application used for ScratchSolid).
   - If using a **Self Client**: open it → **Generate Code** tab.
   - Scope: `ZohoBooks.fullaccess.all`
   - Duration: `10 minutes`, then **Create**. Copy the **grant token** (`code`).
2. Within 10 minutes, exchange the grant token for a refresh token. From any
   terminal (replace the three values):
   ```bash
   curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=PASTED_GRANT_TOKEN"
   ```
3. Copy the **`refresh_token`** from the JSON response. (The `access_token` is
   short-lived and is fetched automatically by the app — you only need the
   refresh token.)

> A Zoho refresh token does not normally expire. `token_expired` usually means it
> was **revoked** (e.g. client secret rotated, too many tokens issued, or manual
> revoke). Generating a fresh one as above resolves it.

---

## Step 2 — Update the Cloudflare Worker secrets

Set the refresh token (and the other three if they ever change) on **both** Workers.

```bash
# Marketing site worker
cd marketing-site
echo "PASTE_NEW_REFRESH_TOKEN" | npx wrangler secret put ZOHO_REFRESH_TOKEN

# Backend worker
cd ../backend-worker
echo "PASTE_NEW_REFRESH_TOKEN" | npx wrangler secret put ZOHO_REFRESH_TOKEN
```

If `ZOHO_ORG_ID` / `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` are not yet set (first
time), set them the same way:
```bash
echo "VALUE" | npx wrangler secret put ZOHO_ORG_ID
echo "VALUE" | npx wrangler secret put ZOHO_CLIENT_ID
echo "VALUE" | npx wrangler secret put ZOHO_CLIENT_SECRET
```

> Setting a secret takes effect immediately — no redeploy needed. If you prefer,
> a redeploy (push a `v*` tag) also works.

---

## Step 3 — Verify

```bash
curl -s https://api.scratchsolidsolutions.org/api/health
```
Expect `"zoho":"ok"`. Then do a live smoke test:
1. Submit a quote on the marketing site → confirm a Zoho **estimate** is created.
2. Accept the quote → confirm it converts to a Zoho **invoice**.

If `zoho` still shows `token_expired`, re-check the data-centre domain (`.com` vs
`.eu`) and that the secret was set on the **backend** worker (that's the one the
health check reads).
