-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  free_models_used INTEGER DEFAULT 0,
  credits DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create jobs table to track 3D model generation jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_job_id TEXT UNIQUE NOT NULL, -- The job_id from Hunyuan3D API
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  
  -- Detailed status tracking from the generation API
  api_status TEXT NOT NULL DEFAULT 'queued' CHECK (api_status IN ('queued', 'processing', 'completed', 'failed')),
  api_stage TEXT DEFAULT 'queued', -- e.g., 'initializing', 'preprocessing', 'shape_generation', etc.
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Job lifecycle timestamps
  started_at TIMESTAMPTZ, -- When job actually started processing (not queued)
  completed_at TIMESTAMPTZ, -- When job finished (success or failure)
  
  -- Results and error handling
  model_url TEXT,
  error_message TEXT,
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update photos table to reference users properly and simplify status
ALTER TABLE photos 
  ADD CONSTRAINT fk_photos_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update photos table to use simplified status (processing/ready/failed)
-- The generation_status should be simple for UI purposes
-- Detailed status tracking happens in the jobs table
ALTER TABLE photos 
  DROP CONSTRAINT IF EXISTS photos_generation_status_check;

ALTER TABLE photos 
  ADD CONSTRAINT photos_generation_status_check 
  CHECK (generation_status IN ('processing', 'ready', 'failed'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_jobs_external_job_id ON jobs(external_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_photo_id ON jobs(photo_id);
CREATE INDEX IF NOT EXISTS idx_jobs_api_status ON jobs(api_status);
CREATE INDEX IF NOT EXISTS idx_jobs_started_at ON jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
  BEFORE UPDATE ON jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, avatar, free_models_used, credits)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    0,
    0.0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert a default user for development/testing
INSERT INTO users (id, email, name, avatar, free_models_used, credits)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'john.doe@example.com',
  'John Doe',
  '/placeholder.svg?height=40&width=40',
  2,
  5.00
) ON CONFLICT (id) DO NOTHING;
