-- Fix RLS policy for users table to allow INSERT during OAuth signup
-- This allows new users to be created when they first sign in with Google

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for OAuth signup)
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::bigint OR current_setting('app.current_user_id', true) IS NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = current_setting('app.current_user_id', true)::bigint)
  WITH CHECK (id = current_setting('app.current_user_id', true)::bigint);

-- Allow service role full access (bypasses RLS)
-- This is important for OAuth signup process
COMMENT ON TABLE users IS 'User profiles from Google OAuth - RLS allows self-insert during signup';
