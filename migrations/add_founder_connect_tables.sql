-- Migration: Add Founder Connect tables
-- Date: 2024
-- Description: Adds tables for Founder Connect feature: FounderProfile, IdeaListing, ConnectionRequest, ConnectionCreditLedger
-- Also adds monthly_connections_used column to users table

-- Add monthly_connections_used to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_connections_used INTEGER DEFAULT 0;

-- Create founder_profiles table
CREATE TABLE IF NOT EXISTS founder_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    bio TEXT,
    skills JSONB,
    experience_summary TEXT,
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    website_url VARCHAR(500),
    primary_skills JSONB,
    industries_of_interest JSONB,
    looking_for TEXT,
    commitment_level VARCHAR(50),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id ON founder_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_is_public ON founder_profiles(is_public);

-- Create idea_listings table
CREATE TABLE IF NOT EXISTS idea_listings (
    id SERIAL PRIMARY KEY,
    founder_profile_id INTEGER NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    brief_description TEXT,
    source_type VARCHAR(50) NOT NULL, -- 'validation' or 'advisor'
    source_id INTEGER NOT NULL, -- References user_validations.id or user_runs.id
    industry VARCHAR(255),
    stage VARCHAR(50), -- 'idea', 'mvp', 'launched', etc.
    skills_needed JSONB,
    commitment_level VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idea_listings_founder_profile_id ON idea_listings(founder_profile_id);
CREATE INDEX IF NOT EXISTS idx_idea_listings_source ON idea_listings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_idea_listings_is_active ON idea_listings(is_active);

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
    id SERIAL PRIMARY KEY,
    sender_profile_id INTEGER NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
    recipient_profile_id INTEGER NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
    idea_listing_id INTEGER REFERENCES idea_listings(id) ON DELETE SET NULL,
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (sender_profile_id != recipient_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_connection_requests_sender ON connection_requests(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_recipient ON connection_requests(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_idea_listing ON connection_requests(idea_listing_id);

-- Create connection_credit_ledger table (optional audit table)
CREATE TABLE IF NOT EXISTS connection_credit_ledger (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_request_id INTEGER REFERENCES connection_requests(id) ON DELETE SET NULL,
    credit_type VARCHAR(50) NOT NULL, -- 'used', 'reset', 'granted'
    amount INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connection_credit_ledger_user_id ON connection_credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_credit_ledger_connection_request ON connection_credit_ledger(connection_request_id);
CREATE INDEX IF NOT EXISTS idx_connection_credit_ledger_created_at ON connection_credit_ledger(created_at);

