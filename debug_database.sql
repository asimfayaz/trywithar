-- Debug script to check database state after migration

-- Check if user_billing table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_billing' 
ORDER BY ordinal_position;

-- Check if the trigger function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_billing';

-- Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created_billing';

-- Check if users table still exists (should be dropped)
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';
