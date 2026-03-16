
-- Fix security definer view - recreate with security_invoker
DROP VIEW IF EXISTS public.delivery_tracking_customer;
CREATE VIEW public.delivery_tracking_customer 
WITH (security_invoker = true) AS
SELECT id, order_id, rider_name, current_distance_km, eta_mins, updated_at
FROM public.delivery_tracking;

GRANT SELECT ON public.delivery_tracking_customer TO authenticated;
