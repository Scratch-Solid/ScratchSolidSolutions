#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — Daily Database Backup Script
# Runs inside the backup Docker container. Dumps all databases,
# uploads to Cloudflare R2, and cleans old backups per retention.
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

TIMESTAMP=$(date +%F_%H%M%S)
DATE=$(date +%F)
BACKUP_DIR="/backups/${DATE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
FAILED=0

# ─── AWS CLI Config for R2 ───
mkdir -p ~/.aws
cat > ~/.aws/credentials <<EOF
[default]
aws_access_key_id = ${R2_ACCESS_KEY_ID}
aws_secret_access_key = ${R2_SECRET_ACCESS_KEY}
EOF

cat > ~/.aws/config <<EOF
[default]
region = auto
output = json
EOF

# ─── Helpers ───
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

check_env() {
  local VAR=$1
  if [[ -z "${!VAR:-}" ]]; then
    log "❌ ERROR: $VAR is not set"
    return 1
  fi
}

# ─── Validate Environment ───
log "🔍 Validating environment..."
REQUIRED=(
  CALCOM_DB_PASSWORD N8N_DB_PASSWORD ERPNEXT_DB_ROOT_PASSWORD
  R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_ENDPOINT
)
for VAR in "${REQUIRED[@]}"; do
  check_env "$VAR" || FAILED=$((FAILED + 1))
done

if [[ $FAILED -gt 0 ]]; then
  log "❌ Aborting: $FAILED required variables missing"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# ─── Backup Cal.com ───
log "📦 Backing up Cal.com database..."
if pg_dump \
  --host=calcom-postgres \
  --username=scratch_admin \
  --dbname=calcom \
  --format=custom \
  --file="calcom_${TIMESTAMP}.dump" \
  --no-owner \
  --no-acl; then
  log "✅ Cal.com backup complete ($(stat -c%s "calcom_${TIMESTAMP}.dump" | numfmt --to=iec))"
else
  log "❌ Cal.com backup FAILED"
  FAILED=$((FAILED + 1))
fi

# ─── Backup n8n ───
log "📦 Backing up n8n database..."
if pg_dump \
  --host=n8n-postgres \
  --username=n8n \
  --dbname=n8n \
  --format=custom \
  --file="n8n_${TIMESTAMP}.dump" \
  --no-owner \
  --no-acl; then
  log "✅ n8n backup complete ($(stat -c%s "n8n_${TIMESTAMP}.dump" | numfmt --to=iec))"
else
  log "❌ n8n backup FAILED"
  FAILED=$((FAILED + 1))
fi

# ─── Backup ERPNext (MariaDB) ───
log "📦 Backing up ERPNext database..."
if mysqldump \
  --host=erpnext-db \
  --user=root \
  --password="${ERPNEXT_DB_ROOT_PASSWORD}" \
  --all-databases \
  --single-transaction \
  --routines \
  --triggers \
  > "erpnext_${TIMESTAMP}.sql"; then
  log "✅ ERPNext backup complete ($(stat -c%s "erpnext_${TIMESTAMP}.sql" | numfmt --to=iec))"
else
  log "❌ ERPNext backup FAILED"
  FAILED=$((FAILED + 1))
fi

# ─── Compress ───
log "🗜️  Compressing backups..."
tar -czf "scratchsolid_${TIMESTAMP}.tar.gz" *.dump *.sql 2>/dev/null || true
rm -f *.dump *.sql

# ─── Upload to R2 ───
log "☁️  Uploading to Cloudflare R2..."
if aws s3 cp "scratchsolid_${TIMESTAMP}.tar.gz" \
  "s3://${R2_BUCKET_NAME}/vps/${DATE}/" \
  --endpoint-url="${R2_ENDPOINT}" \
  --storage-class STANDARD; then
  log "✅ Upload complete: s3://${R2_BUCKET_NAME}/vps/${DATE}/scratchsolid_${TIMESTAMP}.tar.gz"
else
  log "❌ Upload FAILED — backups retained locally in ${BACKUP_DIR}"
  FAILED=$((FAILED + 1))
fi

# ─── Clean Local Backups ───
log "🧹 Cleaning local backups older than ${RETENTION_DAYS} days..."
find /backups -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true
log "✅ Local cleanup complete"

# ─── Clean Remote Backups ───
log "🧹 Cleaning R2 backups older than ${RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%F)
aws s3 ls "s3://${R2_BUCKET_NAME}/vps/" \
  --endpoint-url="${R2_ENDPOINT}" \
  | awk '{print $2}' | sed 's|/||' | while read -r DIR; do
    if [[ "$DIR" < "$CUTOFF_DATE" ]]; then
      aws s3 rm "s3://${R2_BUCKET_NAME}/vps/${DIR}/" --endpoint-url="${R2_ENDPOINT}" --recursive 2>/dev/null || true
      log "🗑️  Removed s3://${R2_BUCKET_NAME}/vps/${DIR}/"
    fi
  done
log "✅ Remote cleanup complete"

# ─── Summary ───
if [[ $FAILED -eq 0 ]]; then
  log "🎉 All backups completed successfully!"
  exit 0
else
  log "⚠️  $FAILED backup step(s) failed. Check logs above."
  exit 1
fi
