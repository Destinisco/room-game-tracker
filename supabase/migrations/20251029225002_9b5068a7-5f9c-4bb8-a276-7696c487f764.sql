-- Fix RLS policy for bootstrap - allow first insert without authentication check
DROP POLICY IF EXISTS "Allow bootstrap insert or admin insert" ON public.user_roles;

-- Allow first user to insert their role (bootstrap) - no TO clause restriction
CREATE POLICY "Allow first user bootstrap"
ON public.user_roles
FOR INSERT
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1)
);

-- Allow admins to insert roles for other users
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);