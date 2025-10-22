-- Admin Dashboard Database Update
-- Run this SQL in your Supabase SQL Editor to add the credits table for admin dashboard

-- Create credits table for better credit tracking
CREATE TABLE IF NOT EXISTS credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_remaining INTEGER DEFAULT 0,
    credits_used_this_month INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- One record per user
);

-- Enable RLS on credits table
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credits table
DROP POLICY IF EXISTS "Users can view own credits" ON credits;
DROP POLICY IF EXISTS "Users can update own credits" ON credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON credits;

CREATE POLICY "Users can view own credits" ON credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON credits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON credits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Migrate existing credit data from profiles to credits table
INSERT INTO credits (user_id, credits_remaining, credits_used_this_month)
SELECT id, credits_balance, 0
FROM profiles
WHERE credits_balance IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_id);

-- Function to reset monthly credits (run this monthly)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
    -- Reset credits_used_this_month to 0 for all users
    UPDATE credits SET credits_used_this_month = 0, last_reset_date = CURRENT_DATE;

    -- Update updated_at timestamp
    UPDATE credits SET updated_at = NOW() WHERE last_reset_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create credit record when profile is created
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Create credits record for new user (free tier gets 5 credits)
    INSERT INTO credits (user_id, credits_remaining, credits_used_this_month)
    VALUES (NEW.id, 5, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create credits for new users
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_credits();

-- Update existing profiles that don't have credits records
INSERT INTO credits (user_id, credits_remaining, credits_used_this_month)
SELECT p.id, 5, 0
FROM profiles p
LEFT JOIN credits c ON p.id = c.user_id
WHERE c.user_id IS NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON credits TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;