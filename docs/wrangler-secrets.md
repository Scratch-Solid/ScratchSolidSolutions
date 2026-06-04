# Wrangler Secrets Setup Guide

This document lists all secrets required for the `scratchsolid-portal` project and the exact `wrangler` commands to set them.

## Prerequisites

Ensure you are authenticated with Cloudflare:

```bash
npx wrangler login
```

## Commands

All commands use the project name `scratchsolid-portal` as defined in `wrangler.jsonc`.

```bash
# ─── Zoho Books (Invoice & Payment Integration) ───
npx wrangler secret put ZOHO_CLIENT_SECRET     --name scratchsolid-portal
npx wrangler secret put ZOHO_ORG_ID              --name scratchsolid-portal
npx wrangler secret put ZOHO_REFRESH_TOKEN       --name scratchsolid-portal

# ─── Email Notifications ───
npx wrangler secret put RESEND_API_KEY           --name scratchsolid-portal

# ─── Meta Cloud API (WhatsApp Business) ───
npx wrangler secret put META_CLOUD_API_TOKEN     --name scratchsolid-portal
npx wrangler secret put META_CLOUD_APP_ID        --name scratchsolid-portal
npx wrangler secret put META_CLOUD_APP_SECRET    --name scratchsolid-portal
npx wrangler secret put META_CLOUD_PHONE_NUMBER_ID --name scratchsolid-portal

# ─── ERPNext (HR & Payroll) ───
npx wrangler secret put ERPNEXT_API_URL          --name scratchsolid-portal
npx wrangler secret put ERPNEXT_API_KEY          --name scratchsolid-portal
npx wrangler secret put ERPNEXT_API_SECRET       --name scratchsolid-portal

# ─── DocuSign (Electronic Signatures) ───
npx wrangler secret put DOCUSIGN_INTEGRATION_KEY --name scratchsolid-portal
npx wrangler secret put DOCUSIGN_ACCOUNT_ID      --name scratchsolid-portal

# ─── Internal Portal Webhook Auth ───
npx wrangler secret put INTERNAL_PORTAL_N8N_WEBHOOK_SECRET --name scratchsolid-portal
```

## Staging Environment

Replace `--name scratchsolid-portal` with `--name scratchsolid-portal-staging` for the staging environment.

## Verification

After setting secrets, verify they are available in the Worker runtime:

```bash
npx wrangler secret list --name scratchsolid-portal
```

## Notes

- **Never commit secret values** to version control.
- These are one-time infrastructure tasks — they must be executed manually by an admin with Cloudflare access.
- The `n8n` workflows depend on `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET` being configured on both sides (n8n credentials + portal environment).
