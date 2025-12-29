-- ============================================
-- Timber Game - Supabase Database Schema
-- ============================================
-- Run this SQL in the Supabase SQL Editor to set up the leaderboard.
--
-- This creates:
--   1. scores table for storing game scores
--   2. Indexes for fast leaderboard queries
--   3. Row Level Security (RLS) policies
--   4. Rate limiting function (optional)
-- ============================================

-- 1. Create the scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(20) NOT NULL DEFAULT 'Anonymous',
  score INTEGER NOT NULL CHECK (score >= 0),
  session_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
-- Index for fetching top scores (leaderboard)
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(score DESC);

-- Index for session-based queries (rate limiting, user history)
CREATE INDEX IF NOT EXISTS idx_scores_session_created ON scores(session_id, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies

-- Allow anyone to read scores (for leaderboard)
CREATE POLICY "Scores are viewable by everyone"
ON scores FOR SELECT
USING (true);

-- Allow anyone to submit scores
CREATE POLICY "Anyone can submit scores"
ON scores FOR INSERT
WITH CHECK (true);

-- Note: No UPDATE or DELETE policies = scores are immutable

-- 5. (Optional) Rate limiting function
-- Checks if a session has submitted fewer than 10 scores in the last hour
CREATE OR REPLACE FUNCTION check_rate_limit(p_session_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 10
    FROM scores
    WHERE session_id = p_session_id
    AND created_at > NOW() - INTERVAL '1 hour'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification Queries (run these to test)
-- ============================================

-- Check table exists:
-- SELECT * FROM scores LIMIT 5;

-- Check indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'scores';

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'scores';

-- Test rate limit function:
-- SELECT check_rate_limit('test-session-id');
