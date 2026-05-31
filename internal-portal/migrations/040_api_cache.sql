-- Create API cache table for external API responses
CREATE TABLE IF NOT EXISTS api_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  cache_value TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on cache_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);

-- Create index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON api_cache(expires_at);

-- Create index on expires_at for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at_cleanup ON api_cache(expires_at) WHERE expires_at < CURRENT_TIMESTAMP;
