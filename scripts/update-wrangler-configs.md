# Wrangler Configuration Update Instructions

**Status:** COMPLETED - All wrangler configurations have been updated with new database IDs

## Database IDs

- **scratchsolid-portal-db:** a08f16f5-9d75-47f9-973c-35bade106b47
- **scratchsolid-marketing-db:** 4c282c8f-8991-49bd-9dc6-e3eab31a4869
- **scratchsolid-backend-db:** 2a0b1e08-443e-46c4-8184-86ea180d4024

## Updated Configurations

### 1. Internal Portal (COMPLETED)
**File:** `internal-portal/wrangler.jsonc`
- Production: scratchsolid-portal-db (a08f16f5-9d75-47f9-973c-35bade106b47)
- Staging: scratchsolid-db-portal-staging (cc0bb727-585b-40c9-8afa-77947e725813)

### 2. Marketing Site (COMPLETED)
**File:** `marketing-site/wrangler.jsonc`
- Production: scratchsolid-marketing-db (4c282c8f-8991-49bd-9dc6-e3eab31a4869)
- Staging: scratchsolid-db-staging (6b6f139b-7a19-4d44-9e21-b85c0c0da42b)

### 3. Backend Worker (COMPLETED)
**File:** `backend-worker/wrangler.toml`
- Production: scratchsolid-backend-db (2a0b1e08-443e-46c4-8184-86ea180d4024)
- Staging: scratchsolid-db-backend-staging (67e66542-486a-442b-bbf6-9c3d4a503f4c)

## Next Steps

### Step 1: Run Migrations on New Production Databases

```bash
# Portal migrations
cd internal-portal
npx wrangler d1 migrations apply scratchsolid-portal-db --remote

# Marketing migrations
cd ../marketing-site
npx wrangler d1 migrations apply scratchsolid-marketing-db --remote

# Backend migrations
cd ../backend-worker
npx wrangler d1 migrations apply scratchsolid-backend-db --remote
```

### Step 2: Migrate Data from Current Shared Database

Export data from current `scratchsolid-db` and import into new isolated databases using the scripts in `scripts/` directory.

### Step 3: Deploy Applications

Deploy all three applications with the new database configurations.

### Step 4: Test All Applications

Verify that all applications work correctly with the isolated databases.

### Step 5: Delete Old Shared Database

After verification, delete the old shared `scratchsolid-db` database.
