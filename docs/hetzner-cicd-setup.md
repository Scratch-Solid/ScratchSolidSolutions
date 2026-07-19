# Hetzner CI/CD Setup

`.github/workflows/deploy-hetzner.yml` automates what was previously a manual
SSH deploy: rsync the `infra/` directory to the server, `docker compose pull`,
`docker compose up -d --remove-orphans`, then smoke-test the public endpoints.

It runs on any tag matching `hetzner-v*` (e.g. `hetzner-v1.0.0`) or via
`workflow_dispatch`. This is a **separate tag prefix from the Workers apps'
`v*` tags** — ERPNext/Cal.com/n8n change far less often and ship on their own
cadence.

## One-time setup

1. Create a GitHub Environment named `hetzner-production` (repo Settings →
   Environments), and add these secrets to it:

   | Secret | Value |
   |---|---|
   | `HETZNER_HOST` | The server's public IP or hostname |
   | `HETZNER_SSH_USER` | `root` (or a dedicated deploy user) |
   | `HETZNER_SSH_KEY` | Private key for a dedicated CI deploy keypair — **do not reuse a human's personal key** |
   | `HETZNER_SSH_KNOWN_HOSTS` | Output of `ssh-keyscan <host>` run once, so the workflow doesn't blindly trust-on-first-use |

2. Generate a dedicated deploy keypair rather than reusing any admin's
   personal SSH key:
   ```bash
   ssh-keygen -t ed25519 -f hetzner_ci_deploy -C "github-actions-deploy" -N ""
   ```
   Append `hetzner_ci_deploy.pub` to `/root/.ssh/authorized_keys` on the
   server, then put the contents of `hetzner_ci_deploy` (private key) into
   the `HETZNER_SSH_KEY` secret.

3. Get the known-hosts entry:
   ```bash
   ssh-keyscan <HETZNER_HOST> > known_hosts_output
   ```
   Paste its contents into `HETZNER_SSH_KNOWN_HOSTS`.

## Releasing

```bash
git tag -a hetzner-v1.0.0 -m "describe what changed in infra/"
git push origin hetzner-v1.0.0
```

## What's intentionally NOT automated

- **n8n workflow JSON sync** (`infra/scripts/n8n-setup.js` importing
  `infra/n8n-workflows/*.json`) — that script isn't yet safe to re-run
  blindly against an existing n8n instance (see its own notes on
  already-exists behavior for credentials/workflows). Keep running it by
  hand after a deploy until it's been audited for idempotency and wired in
  as its own step.
- **ERPNext first-time site creation** and other one-time setup steps in
  `infra/scripts/deploy-stack.sh` — this workflow only handles the
  pull-latest-and-restart path for an already-provisioned server, not
  initial provisioning.

## Rollback

Container images in `infra/docker-compose.yml` are pinned to specific
version tags (not `:latest`), so a bad deploy can be rolled back by
reverting the offending commit and re-running the workflow (either
`workflow_dispatch` or pushing a new `hetzner-v*` tag against the reverted
commit) — `docker compose up -d` will pull the previously-pinned image
versions again.
