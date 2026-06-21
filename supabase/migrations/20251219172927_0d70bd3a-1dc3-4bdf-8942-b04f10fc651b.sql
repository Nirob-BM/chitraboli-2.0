-- Drop existing track_order function and create a more secure version
DROP FUNCTION IF EXISTS public.track_order(text, text);

-- Create secure track_order that requires BOTH order ID AND phone number for verification
CREATE OR REPLACE FUNCTION public.track_order(order_id text, phone_number text)
RETURNS TABLE(
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
  -- Validate inputs - require both values
  IF order_id IS NULL OR length(trim(order_id)) < 10 THEN
    RAISE EXCEPTION 'Valid order ID is required';
  END IF;
  
  IF phone_number IS NULL OR length(trim(phone_number)) < 10 THEN
    RAISE EXCEPTION 'Valid phone number (10+ digits) is required';
  END IF;

  -- Require BOTH order ID AND phone number match for security
  RETURN QUERY
  SELECT 
    o.id,
    o.status,
    o.created_at,
    o.total_amount,
    o.items,
    o.customer_name
  FROM orders o
  WHERE o.id::text = trim(order_id)
    AND o.customer_phone = trim(phone_number);
END;
$$;

-- Grant execute to public roles
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO authenticated;