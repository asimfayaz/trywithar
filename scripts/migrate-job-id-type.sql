-- Migration script to fix job_id type mismatch
-- This changes the models.job_id column from UUID to TEXT to accept Replicate job IDs

ALTER TABLE public.models 
ALTER COLUMN job_id TYPE TEXT;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'models' AND column_name = 'job_id';
