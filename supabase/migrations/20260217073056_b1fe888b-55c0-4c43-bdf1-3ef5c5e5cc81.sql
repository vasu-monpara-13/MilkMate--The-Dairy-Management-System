
-- Step 1: Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';

-- Step 2: Migrate roles from user_roles to profiles
UPDATE public.profiles p
SET role = COALESCE(
  (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.user_id LIMIT 1),
  'customer'
);

-- Step 3: Replace delivery_partner with farmer
UPDATE public.profiles SET role = 'farmer' WHERE role = 'delivery_partner';

-- Step 4: Add constraint for valid roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('customer', 'farmer', 'admin'));

-- Step 5: Update has_role function to read from profiles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role::text
  )
$$;

-- Step 6: Update get_user_role function to read from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role::app_role FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Step 7: Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Step 8: Update profiles RLS - prevent users from changing their own role
-- Drop old policies first
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate: users can update own profile but NOT role
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can update any profile (including role)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Step 9: Remove mobile_number column (not needed, simplify)
-- Actually keep it, user might need it

-- Step 10: Update app_role enum to include farmer
-- Already done in previous migration, but ensure it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'farmer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'farmer';
  END IF;
END$$;
