-- MilkMate ULTRA (Customer) - Database patch helpers
--
-- Run this ONLY if you are using the same schema we discussed (Supabase + tables like:
-- profiles, user_roles, customer_subscriptions, delivery_addresses, deliveries, delivery_tracking, notifications, loyalty_points).
--
-- This patch focuses on the two common blockers:
-- 1) deliveries.status check constraint mismatch ("violates check constraint deliveries_status_check")
-- 2) daily delivery generation inserting wrong farmer_id / missing address_id

begin;

-- 1) Make deliveries.status allowed values align with the app UI.
--    (Adjust if you use different names.)
DO $$
BEGIN
  -- Drop old constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deliveries_status_check'
  ) THEN
    ALTER TABLE public.deliveries DROP CONSTRAINT deliveries_status_check;
  END IF;

  -- Recreate constraint with the statuses used across the UI
  ALTER TABLE public.deliveries
    ADD CONSTRAINT deliveries_status_check
    CHECK (status IN (
      'scheduled',
      'out_for_delivery',
      'near_your_area',
      'delivered',
      'cancelled'
    ));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table public.deliveries does not exist - skipping deliveries_status_check update.';
END $$;

-- 2) Fix daily generation function (idempotent) so it:
--    - uses customer_subscriptions.farmer_id
--    - uses the customer default address if address_id is null
--
-- NOTE: If you already created a different function name, adjust below.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'generate_daily_deliveries'
      AND n.nspname = 'public'
  ) THEN

    CREATE OR REPLACE FUNCTION public.generate_daily_deliveries()
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_address_id uuid;
    BEGIN
      INSERT INTO public.deliveries (
        id,
        farmer_id,
        customer_id,
        address_id,
        subscription_id,
        delivery_date,
        time_slot,
        status,
        created_at
      )
      SELECT
        gen_random_uuid(),
        cs.farmer_id,
        cs.customer_id,
        COALESCE(
          cs.address_id,
          (
            SELECT da.id
            FROM public.delivery_addresses da
            WHERE da.customer_id = cs.customer_id
            ORDER BY COALESCE(da.is_default, false) DESC, da.created_at DESC
            LIMIT 1
          )
        ) as address_id,
        cs.id as subscription_id,
        CURRENT_DATE,
        cs.time_slot,
        'scheduled',
        NOW()
      FROM public.customer_subscriptions cs
      WHERE cs.status = 'active'
        AND cs.farmer_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.deliveries d
          WHERE d.subscription_id = cs.id
            AND d.delivery_date = CURRENT_DATE
            AND d.time_slot = cs.time_slot
        );

    END;
    $$;

  ELSE
    RAISE NOTICE 'Function public.generate_daily_deliveries() not found - skipping function patch.';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Some required tables do not exist - skipping function patch.';
END $$;

commit;

-- After running this patch:
-- 1) Ensure each customer_subscriptions row has the correct farmer_id.
--    farmer_id should be the FARMER profile/user id (role=farmer), NOT the customer id.
-- 2) Ensure each customer has at least one delivery_addresses row.
-- 3) Run: select public.generate_daily_deliveries();
