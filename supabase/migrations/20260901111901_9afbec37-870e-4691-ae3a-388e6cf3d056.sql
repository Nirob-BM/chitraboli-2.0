ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS payment_note text;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('unpaid','pending_verification','verified','rejected','refunded'));

UPDATE public.orders
SET payment_status = 'pending_verification'
WHERE payment_method IN ('bkash','nagad')
  AND transaction_id IS NOT NULL
  AND payment_status = 'unpaid';