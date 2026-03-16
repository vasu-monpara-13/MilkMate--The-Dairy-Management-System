
-- Rate limits table for signup endpoint
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_key_created ON public.rate_limits (key, created_at);

-- RLS: only service role should access this table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role (used by edge functions) can access

-- Create a customer-safe view for delivery tracking (excludes rider_phone)
CREATE VIEW public.delivery_tracking_customer AS
SELECT id, order_id, rider_name, current_distance_km, eta_mins, updated_at
FROM public.delivery_tracking;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.delivery_tracking_customer TO authenticated;
