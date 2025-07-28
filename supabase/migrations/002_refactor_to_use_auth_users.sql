-- Migration to refactor from custom users table to using auth.users + user_profiles

-- First, drop the trigger and function that creates users automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create user_billing table for usage and billing data
CREATE TABLE IF NOT EXISTS user_billing (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  free_models_used INTEGER DEFAULT 0,
  credits DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No user data migration needed - new users will be created through Supabase Auth signup
-- and the trigger will automatically create their billing records

-- Drop RLS policies that depend on user_id column for both tables
-- Photos table policies
DROP POLICY IF EXISTS "Users can read own photos" ON photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
DROP POLICY IF EXISTS "Users can update own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;

-- Jobs table policies
DROP POLICY IF EXISTS "Users can read own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;

-- Drop the old foreign key constraints that reference the users table
ALTER TABLE photos DROP CONSTRAINT IF EXISTS fk_photos_user_id;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_user_id_fkey;

-- Note: user_id columns are already UUID type, no need to alter them

-- Add new foreign key constraints pointing to auth.users
ALTER TABLE photos 
  ADD CONSTRAINT fk_photos_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE jobs 
  ADD CONSTRAINT fk_jobs_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recreate RLS policies for photos table (pointing to auth.users)
CREATE POLICY "Users can read own photos" ON photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos" ON photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Recreate RLS policies for jobs table (pointing to auth.users)
CREATE POLICY "Users can read own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_billing_id ON user_billing(id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id_auth ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_auth ON jobs(user_id);

-- Create updated_at trigger for user_billing
CREATE TRIGGER update_user_billing_updated_at 
  BEFORE UPDATE ON user_billing 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation (creates billing record)
CREATE OR REPLACE FUNCTION handle_new_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_billing (id, free_models_used, credits)
  VALUES (NEW.id, 0, 0.0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user billing record when someone signs up
CREATE OR REPLACE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_billing();

-- Drop the old users table (after data migration)
DROP TABLE IF EXISTS users CASCADE;
