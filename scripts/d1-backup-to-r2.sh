#!/usr/bin/env bash
# D1 Backup to R2 — Scheduled backup script
# Usage: ./d1-backup-to-r2.sh <project-name> <db-name> <r2-bucket>
# Example: ./d1-backup-to-r2.sh scratchsolid-portal scratchsolid-portal-db scratchsolid-backups

set -euo pipefail

PROJECT_NAME="${1:-scratchsolid-portal}"
DB_NAME="${2:-scratchsolid-portal-db}"
R2_BUCKET="${3:-scratchsolid-backups}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="d1_${DB_NAME}_${TIMESTAMP}.sql"
LOCAL_PATH="/tmp/${BACKUP_FILE}"

echo "[D1 Backup] Starting backup of ${DB_NAME} for project ${PROJECT_NAME}..."

# Dump D1 database using Wrangler
npx wrangler d1 export "${DB_NAME}" --output "${LOCAL_PATH}" --remote --project-name "${PROJECT_NAME}"

# Compress backup
gzip "${LOCAL_PATH}"
LOCAL_GZ="${LOCAL_PATH}.gz"

echo "[D1 Backup] Uploading ${BACKUP_FILE}.gz to R2 bucket ${R2_BUCKET}..."

# Upload to R2 using Wrangler R2 API
npx wrangler r2 object put "${R2_BUCKET}/${BACKUP_FILE}.gz" --file "${LOCAL_GZ}" --project-name "${PROJECT_NAME}"

# Clean up local file
rm -f "${LOCAL_GZ}"

echo "[D1 Backup] Backup completed: ${BACKUP_FILE}.gz"

# Optional: list recent backups
echo "[D1 Backup] Recent backups in ${R2_BUCKET}:"
npx wrangler r2 object list "${R2_BUCKET}" --prefix "d1_${DB_NAME}_" --limit 5 || true
