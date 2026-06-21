-- Add inventory and variations columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sizes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sku text;

-- Create index for SKU lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_facebook_post_id ON public.products(facebook_post_id);