-- Migration: Add tool_cache table for Discovery endpoint optimization (Phase 1)
-- This table stores cached tool results to speed up repeated queries
-- Created: 2024

CREATE TABLE IF NOT EXISTS tool_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_params TEXT,  -- JSON string of parameters (for debugging/verification)
    result TEXT NOT NULL,  -- Cached tool result
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tool_cache_key ON tool_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_tool_cache_expires ON tool_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_tool_cache_tool_name ON tool_cache(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_cache_hit_count ON tool_cache(hit_count);

-- Add comment to table
COMMENT ON TABLE tool_cache IS 'Cache for tool results to speed up Discovery endpoint. Results expire based on TTL (7-30 days depending on tool type).';

