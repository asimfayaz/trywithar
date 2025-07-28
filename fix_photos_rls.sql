-- Fix RLS policies for photos table to allow proper updates

-- First, let's check the current RLS policies on photos table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'photos';

-- Check if RLS is enabled on photos table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'photos';

-- Drop existing problematic policies if they exist (use exact names)
DROP POLICY IF EXISTS "Users can update own photos" ON photos;
DROP POLICY IF EXISTS "Users can read own photos" ON photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
DROP POLICY IF EXISTS "Users can insert photos" ON photos;
DROP POLICY IF EXISTS "Users can read own photos" ON photos;
DROP POLICY IF EXISTS "Users can update own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;

-- Create new, more permissive policies that should work
-- Allow users to insert photos (they own them by setting user_id)
CREATE POLICY "Users can insert photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to read their own photos
CREATE POLICY "Users can read own photos" ON photos
  FOR SELECT USING (auth.uid() = user_id::uuid);

-- Allow users to update their own photos
CREATE POLICY "Users can update own photos" ON photos
  FOR UPDATE USING (auth.uid() = user_id::uuid)
  WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id::uuid);

-- Verify the new policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'photos';

-- Alternative: If RLS is still causing issues, we can temporarily disable it
-- (uncomment the line below if the above policies don't work)
-- ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
