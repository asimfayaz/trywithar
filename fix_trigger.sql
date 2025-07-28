-- Fix script to create the missing trigger function and trigger

-- Create the trigger function to handle new user billing records
CREATE OR REPLACE FUNCTION handle_new_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_billing (id, free_models_used, credits)
  VALUES (NEW.id, 0, 0.0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger to automatically create billing records on signup
CREATE OR REPLACE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_billing();

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created_billing';
