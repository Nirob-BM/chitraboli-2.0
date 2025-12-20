-- Add user_id column to reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create function to check if user has placed an order
CREATE OR REPLACE FUNCTION public.user_has_ordered(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE user_id = _user_id
      AND status NOT IN ('cancelled', 'refunded')
  )
$$;

-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;

-- Create new policy that requires user to have placed an order
CREATE POLICY "Users with orders can create reviews" 
ON public.reviews 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.user_has_ordered(auth.uid())
);