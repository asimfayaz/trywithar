-- Fix RLS policies for user_billing table

-- Enable RLS on user_billing table
ALTER TABLE user_billing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_billing table
-- Users can read their own billing data
CREATE POLICY "Users can read own billing data" ON user_billing
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own billing data  
CREATE POLICY "Users can update own billing data" ON user_billing
  FOR UPDATE USING (auth.uid() = id);

-- Allow the trigger function to insert billing records (bypasses RLS)
-- This is needed for the signup trigger to work
CREATE POLICY "Allow trigger to insert billing records" ON user_billing
  FOR INSERT WITH CHECK (true);

-- Alternatively, if the above doesn't work, we can disable RLS entirely on user_billing
-- (uncomment the line below if you prefer this approach)
-- ALTER TABLE user_billing DISABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_billing';
