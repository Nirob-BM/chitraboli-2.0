CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('bkash','nagad')),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','initiated','succeeded','failed','cancelled')),
  gateway_payment_id text,
  gateway_transaction_id text,
  payer_reference text,
  invoice_number text NOT NULL,
  return_url text,
  failure_reason text,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payment_transactions_invoice_number_key ON public.payment_transactions (invoice_number);
CREATE INDEX payment_transactions_order_id_idx ON public.payment_transactions (order_id);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment transactions"
ON public.payment_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_gateway text;