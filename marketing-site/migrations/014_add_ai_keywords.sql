-- Add keywords column to ai_responses for smart keyword matching
ALTER TABLE ai_responses ADD COLUMN keywords TEXT DEFAULT '';

-- Create index for faster keyword lookups
CREATE INDEX IF NOT EXISTS idx_ai_responses_category ON ai_responses(category);
