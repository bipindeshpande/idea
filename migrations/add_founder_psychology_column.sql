-- Migration: Add founder_psychology JSONB column to users table
-- This column stores the founder psychology assessment data
-- Created: 2024

-- For PostgreSQL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'founder_psychology'
    ) THEN
        ALTER TABLE users ADD COLUMN founder_psychology JSONB NOT NULL DEFAULT '{}';
        
        -- Create GIN index for JSONB queries (PostgreSQL only)
        CREATE INDEX IF NOT EXISTS idx_users_founder_psychology ON users USING GIN (founder_psychology);
        
        COMMENT ON COLUMN users.founder_psychology IS 'Founder psychology assessment data stored as JSONB. Contains motivation, fears, decision style, energy pattern, constraints, success definition, and archetype.';
    END IF;
END $$;

-- For SQLite (if using SQLite, uncomment and run separately)
-- Note: SQLite doesn't support JSONB, so we use TEXT with JSON
-- ALTER TABLE users ADD COLUMN founder_psychology TEXT NOT NULL DEFAULT '{}';
-- CREATE INDEX IF NOT EXISTS idx_users_founder_psychology ON users(founder_psychology);


