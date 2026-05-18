# Wrangler Configuration Update Instructions

After creating the new production databases, update the wrangler configurations as follows:

## 1. Internal Portal

**File:** `internal-portal/wrangler.jsonc`

**Production (lines 13-18):**
```jsonc
"d1_databases": [
	{
		"binding": "scratchsolid_db",
		"database_name": "scratchsolid-portal-db",
		"database_id": "<INSERT_PORTAL_DB_ID_HERE>"
	}
],
```

**Staging (lines 77-82):**
```jsonc
"d1_databases": [
	{
		"binding": "scratchsolid_db",
		"database_name": "scratchsolid-db-portal-staging",
		"database_id": "cc0bb727-585b-40c9-8afa-77947e725813"
	}
],
```

## 2. Marketing Site

**File:** `marketing-site/wrangler.jsonc`

**Production (lines 12-17):**
```jsonc
"d1_databases": [
	{
		"binding": "scratchsolid_db",
		"database_name": "scratchsolid-marketing-db",
		"database_id": "<INSERT_MARKETING_DB_ID_HERE>"
	}
],
```

**Staging (lines 72-77):**
```jsonc
"d1_databases": [
	{
		"binding": "scratchsolid_db",
		"database_name": "scratchsolid-marketing-db-staging",
		"database_id": "<INSERT_MARKETING_STAGING_DB_ID_HERE>"
	}
],
```

## 3. Backend Worker

**File:** `backend-worker/wrangler.toml`

**Production (lines 14-18):**
```toml
[[d1_databases]]
binding = "DB"
database_name = "scratchsolid-backend-db"
database_id = "<INSERT_BACKEND_DB_ID_HERE>"
```

**Staging (lines 37-40):**
```toml
[[env.staging.d1_databases]]
binding = "DB"
database_name = "scratchsolid-db-backend-staging"
database_id = "67e66542-486a-442b-bbf6-9c3d4a503f4c"
```

## Steps to Execute

1. Create the 3 new production databases:
   ```bash
   npx wrangler d1 create scratchsolid-portal-db
   npx wrangler d1 create scratchsolid-marketing-db
   npx wrangler d1 create scratchsolid-backend-db
   ```

2. Copy the database IDs from the output and update the wrangler configurations above

3. Run migrations on the new databases:
   ```bash
   # Portal
   cd internal-portal
   npx wrangler d1 migrations apply scratchsolid-portal-db --remote --config=./wrangler.jsonc
   
   # Marketing
   cd ../marketing-site
   npx wrangler d1 migrations apply scratchsolid-marketing-db --remote --config=./wrangler.jsonc
   
   # Backend
   cd ../backend-worker
   npx wrangler d1 migrations apply scratchsolid-backend-db --remote --config=./wrangler.toml
   ```

4. Migrate data from the current shared database to the new isolated databases

5. Deploy the updated configurations

6. Test all applications

7. Delete the old shared database after verification
