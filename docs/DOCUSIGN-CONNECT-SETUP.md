# DocuSign Connect Configuration

## Webhook Endpoint

**URL:** `https://portal.scratchsolidsolutions.org/api/webhooks/docusign`

## Setup Steps

1. Log in to DocuSign Admin Console
2. Navigate to **Settings → Connect → Add Configuration**
3. Enter the webhook URL above
4. Configure as follows:

### Basic Settings

| Setting | Value |
|---------|-------|
| Name | Scratch Solid Solutions — Portal |
| URL | `https://portal.scratchsolidsolutions.org/api/webhooks/docusign` |
| Format | XML (recommended) or RESTv21 JSON |
| Include Documents | No |
| Require Acknowledgement | Yes |
| Enable Log | Yes |

### Event Settings

Include these envelope events:
- `Envelope Sent`
- `Envelope Delivered`
- `Envelope Signed/Completed`
- `Envelope Declined`
- `Envelope Voided`

Include these recipient events:
- `Recipient Sent`
- `Recipient Delivered`
- `Recipient Signed`
- `Recipient Declined`

### HMAC Security

1. In DocuSign Connect settings, enable **Include HMAC Signature**
2. Set the HMAC Secret Key in your environment:
   ```
   DOCUSIGN_CONNECT_SECRET=<your-secret>
   ```
3. The webhook will verify every payload using `X-DocuSign-Signature-1` header

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DOCUSIGN_CONNECT_SECRET` | Recommended | HMAC-SHA256 secret for payload verification |
| `DOCUSIGN_INTEGRATION_KEY` | Yes | DocuSign app integration key |
| `DOCUSIGN_SECRET_KEY` | Yes | DocuSign app secret |
| `DOCUSIGN_ACCOUNT_ID` | Yes | DocuSign account GUID |
| `DOCUSIGN_PRIVATE_KEY` | Yes | RSA private key for JWT grant |
| `DOCUSIGN_USER_ID` | Yes | DocuSign user GUID for impersonation |
| `DOCUSIGN_BASE_URL` | No | Defaults to `https://demo.docusign.net/restapi` |

## What Happens on Envelope Completion

When DocuSign sends a `completed` event:

1. Webhook parses XML (or JSON) payload
2. Verifies HMAC signature if `DOCUSIGN_CONNECT_SECRET` is configured
3. Looks up the envelope ID in:
   - `training_progress.contract_signature_id`
   - `training_progress.consent_signature_id`
   - `new_joiners.contract_signature_id`
   - `new_joiners.consent_signature_id`
4. Updates records:
   - `training_progress.contract_signed = 1`
   - `training_progress.background_check_consent = 1` (for consent envelopes)
   - `staff.onboarding_stage = 'contract_signed'`
   - `users.onboarding_stage = 'contract_signed'`
   - `new_joiners.status = 'approved'`
5. Inserts audit log into `onboarding_audit`

## Testing

```bash
curl -X GET https://portal.scratchsolidsolutions.org/api/webhooks/docusign
# Expected: { "status": "ok", "endpoint": "/api/webhooks/docusign", ... }
```
