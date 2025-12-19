-- ==========================================
-- FIX 1 & 3: Orders table - Remove header-based access, use proper auth
-- ==========================================

-- Drop the vulnerable policy that uses HTTP headers
DROP POLICY IF EXISTS "Orders readable by owner or admin" ON public.orders;

-- Create secure policy: Only authenticated users can see their own orders, or admins can see all
CREATE POLICY "Orders readable by owner or admin" 
ON public.orders 
FOR SELECT 
USING (
  -- User can see their own orders
  user_id = auth.uid()
  -- Or admin can see all
  OR has_role(auth.uid(), 'admin')
);

-- ==========================================
-- FIX 2: Cart items table - Replace 'true' policies with proper restrictions
-- ==========================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Cart items deletable by session" ON public.cart_items;
DROP POLICY IF EXISTS "Cart items insertable" ON public.cart_items;
DROP POLICY IF EXISTS "Cart items readable by session" ON public.cart_items;
DROP POLICY IF EXISTS "Cart items updatable by session" ON public.cart_items;

-- Create proper SELECT policy - users can only see their own cart items
CREATE POLICY "Cart items readable by owner" 
ON public.cart_items 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- Create proper INSERT policy - users can only insert their own cart items
CREATE POLICY "Cart items insertable by owner" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL -- Allow anonymous cart creation initially
);

-- Create proper UPDATE policy - users can only update their own cart items
CREATE POLICY "Cart items updatable by owner" 
ON public.cart_items 
FOR UPDATE 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- Create proper DELETE policy - users can only delete their own cart items
CREATE POLICY "Cart items deletable by owner" 
ON public.cart_items 
FOR DELETE 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

-- ==========================================
-- Create secure RPC function for order tracking (public access)
-- This allows looking up orders by ID or phone without exposing all data
-- ==========================================

CREATE OR REPLACE FUNCTION public.track_order(
  search_type text,
  search_value text
)
RETURNS TABLE (
  id uuid,
  status text,
  created_at timestamptz,
  total_amount numeric,
  items jsonb,
  customer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF search_type NOT IN ('id', 'phone') THEN
    RAISE EXCEPTION 'Invalid search type';
  END IF;
  
  IF length(search_value) < 3 THEN
    RAISE EXCEPTION 'Search value too short';
  END IF;

  IF search_type = 'id' THEN
    -- Search by exact order ID (UUID)
    RETURN QUERY
    SELECT 
      o.id,
      o.status,
      o.created_at,
      o.total_amount,
      o.items,
      o.customer_name
    FROM orders o
    WHERE o.id::text = search_value;
  ELSE
    -- Search by exact phone number
    RETURN QUERY
    SELECT 
      o.id,
      o.status,
      o.created_at,
      o.total_amount,
      o.items,
      o.customer_name
    FROM orders o
    WHERE o.customer_phone = search_value;
  END IF;
END;
$$;

-- Grant execute permission to anonymous users for order tracking
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO authenticated;