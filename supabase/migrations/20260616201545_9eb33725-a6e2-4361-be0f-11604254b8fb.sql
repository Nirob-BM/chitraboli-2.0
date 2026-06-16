
-- Consolidate duplicate cart_items INSERT policies; keep the one that supports guest carts
DROP POLICY IF EXISTS "Cart items insertable by owner" ON public.cart_items;
DROP POLICY IF EXISTS "Cart items insertable" ON public.cart_items;
CREATE POLICY "Cart items insertable"
  ON public.cart_items FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow public/guest contact form submissions
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Simplify has_role to remove fragile dual-branch logic
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;
