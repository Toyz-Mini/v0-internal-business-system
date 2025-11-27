-- =====================================================
-- OPENING/CLOSING STOCK COUNT & SHIFTS TABLES
-- Run this migration to enable stock tally feature
-- =====================================================

-- 1. Create shifts table (if staff clocking is per-shift)
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid, -- nullable for single-outlet setup
  opened_by uuid REFERENCES public.users(id),
  opened_at timestamp with time zone DEFAULT now(),
  closed_by uuid REFERENCES public.users(id),
  closed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_stock_count_id uuid, -- will reference stock_counts after creation
  closing_stock_count_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create stock_counts table
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid, -- nullable for single-outlet setup
  type text NOT NULL CHECK (type IN ('opening', 'closing')),
  shift_id uuid REFERENCES public.shifts(id),
  counted_by uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  notes text,
  photos jsonb DEFAULT '[]'::jsonb, -- array of image URLs
  total_expected_value numeric(12,2) DEFAULT 0,
  total_counted_value numeric(12,2) DEFAULT 0,
  total_variance_value numeric(12,2) DEFAULT 0,
  variance_percentage numeric(5,2) DEFAULT 0,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid REFERENCES public.users(id),
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create stock_count_items table
CREATE TABLE IF NOT EXISTS public.stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  unit text NOT NULL,
  quantity_counted numeric(10,3),
  expected_quantity numeric(10,3) DEFAULT 0,
  variance_qty numeric(10,3) DEFAULT 0,
  unit_cost numeric(10,2) DEFAULT 0, -- snapshot from ingredients.cost_per_unit at submit
  variance_value numeric(12,2) DEFAULT 0, -- variance_qty × unit_cost
  not_counted boolean DEFAULT false, -- staff skipped this item
  photo_url text, -- item-specific photo
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Add foreign keys to shifts after stock_counts exists
ALTER TABLE public.shifts 
  ADD CONSTRAINT fk_shifts_opening_count 
  FOREIGN KEY (opening_stock_count_id) REFERENCES public.stock_counts(id);

ALTER TABLE public.shifts 
  ADD CONSTRAINT fk_shifts_closing_count 
  FOREIGN KEY (closing_stock_count_id) REFERENCES public.stock_counts(id);

-- 5. Add shift_id to orders for tracking
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id);

-- 6. Add stock count settings to settings table
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS opening_variance_threshold numeric(5,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS closing_variance_threshold numeric(5,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS require_photos_for_variance_above numeric(5,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS enable_offline_counts boolean DEFAULT false;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_counts_type ON public.stock_counts(type);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON public.stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_counts_shift_id ON public.stock_counts(shift_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_counted_by ON public.stock_counts(counted_by);
CREATE INDEX IF NOT EXISTS idx_stock_counts_created_at ON public.stock_counts(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_stock_count_id ON public.stock_count_items(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_ingredient_id ON public.stock_count_items(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON public.shifts(opened_at);
CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON public.orders(shift_id);

-- 8. Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for shifts
CREATE POLICY "shifts_select_all" ON public.shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "shifts_insert_all" ON public.shifts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "shifts_update_all" ON public.shifts
  FOR UPDATE TO authenticated USING (true);

-- 10. RLS Policies for stock_counts
CREATE POLICY "stock_counts_select_all" ON public.stock_counts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_counts_insert_all" ON public.stock_counts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "stock_counts_update_all" ON public.stock_counts
  FOR UPDATE TO authenticated USING (true);

-- 11. RLS Policies for stock_count_items
CREATE POLICY "stock_count_items_select_all" ON public.stock_count_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stock_count_items_insert_all" ON public.stock_count_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "stock_count_items_update_all" ON public.stock_count_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "stock_count_items_delete_all" ON public.stock_count_items
  FOR DELETE TO authenticated USING (true);

-- 12. Function to calculate expected quantities for closing count
CREATE OR REPLACE FUNCTION public.calculate_expected_closing_quantity(
  p_shift_id uuid,
  p_ingredient_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening_qty numeric := 0;
  v_purchases_qty numeric := 0;
  v_consumption_qty numeric := 0;
  v_shift_opened_at timestamp with time zone;
BEGIN
  -- Get shift open time
  SELECT opened_at INTO v_shift_opened_at FROM shifts WHERE id = p_shift_id;
  
  -- Get opening count quantity for this ingredient
  SELECT COALESCE(sci.quantity_counted, 0) INTO v_opening_qty
  FROM stock_counts sc
  JOIN stock_count_items sci ON sci.stock_count_id = sc.id
  WHERE sc.shift_id = p_shift_id
    AND sc.type = 'opening'
    AND sc.status IN ('submitted', 'approved')
    AND sci.ingredient_id = p_ingredient_id;
  
  -- Get purchases received during shift
  SELECT COALESCE(SUM(poi.received_quantity), 0) INTO v_purchases_qty
  FROM purchase_orders po
  JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
  WHERE po.status = 'received'
    AND po.received_date >= v_shift_opened_at
    AND poi.ingredient_id = p_ingredient_id;
  
  -- Get consumption from orders during shift (via recipes)
  SELECT COALESCE(SUM(r.qty_per_unit * oi.quantity), 0) INTO v_consumption_qty
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN recipes r ON r.product_id = oi.product_id
  WHERE o.shift_id = p_shift_id
    AND o.payment_status = 'paid'
    AND r.ingredient_id = p_ingredient_id;
  
  -- Expected = Opening + Purchases - Consumption
  RETURN GREATEST(v_opening_qty + v_purchases_qty - v_consumption_qty, 0);
END;
$$;

-- 13. Function to calculate variance after submit
CREATE OR REPLACE FUNCTION public.calculate_stock_count_variances(p_stock_count_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_expected numeric := 0;
  v_total_counted numeric := 0;
  v_total_variance numeric := 0;
  v_variance_pct numeric := 0;
BEGIN
  -- Update each item's variance and unit_cost snapshot
  UPDATE stock_count_items sci
  SET 
    unit_cost = COALESCE(i.cost_per_unit, 0),
    variance_qty = COALESCE(sci.quantity_counted, 0) - COALESCE(sci.expected_quantity, 0),
    variance_value = (COALESCE(sci.quantity_counted, 0) - COALESCE(sci.expected_quantity, 0)) * COALESCE(i.cost_per_unit, 0),
    updated_at = now()
  FROM ingredients i
  WHERE sci.ingredient_id = i.id
    AND sci.stock_count_id = p_stock_count_id;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(expected_quantity * unit_cost), 0),
    COALESCE(SUM(quantity_counted * unit_cost), 0),
    COALESCE(SUM(variance_value), 0)
  INTO v_total_expected, v_total_counted, v_total_variance
  FROM stock_count_items
  WHERE stock_count_id = p_stock_count_id
    AND not_counted = false;
  
  -- Calculate variance percentage
  IF v_total_expected > 0 THEN
    v_variance_pct := ABS(v_total_variance) / v_total_expected * 100;
  END IF;
  
  -- Update stock_count totals
  UPDATE stock_counts
  SET 
    total_expected_value = v_total_expected,
    total_counted_value = v_total_counted,
    total_variance_value = v_total_variance,
    variance_percentage = v_variance_pct,
    updated_at = now()
  WHERE id = p_stock_count_id;
END;
$$;

-- 14. Function to apply approved closing count to inventory
CREATE OR REPLACE FUNCTION public.apply_closing_count_to_inventory(p_stock_count_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_user_id uuid;
BEGIN
  -- Get the user who approved
  SELECT approved_by INTO v_user_id FROM stock_counts WHERE id = p_stock_count_id;
  
  -- Loop through each counted item and adjust inventory
  FOR v_item IN 
    SELECT sci.*, i.current_stock
    FROM stock_count_items sci
    JOIN ingredients i ON i.id = sci.ingredient_id
    WHERE sci.stock_count_id = p_stock_count_id
      AND sci.not_counted = false
      AND sci.quantity_counted IS NOT NULL
  LOOP
    -- Only adjust if there's a variance
    IF v_item.variance_qty != 0 THEN
      -- Update ingredient stock to counted value
      UPDATE ingredients
      SET 
        current_stock = v_item.quantity_counted,
        updated_at = now()
      WHERE id = v_item.ingredient_id;
      
      -- Create stock log entry
      INSERT INTO stock_logs (
        ingredient_id, type, quantity, previous_stock, new_stock,
        reference_type, reference_id, notes, created_by
      ) VALUES (
        v_item.ingredient_id,
        CASE WHEN v_item.variance_qty > 0 THEN 'in' ELSE 'out' END,
        ABS(v_item.variance_qty),
        v_item.current_stock,
        v_item.quantity_counted,
        'closing_count',
        p_stock_count_id,
        'Closing stock adjustment: variance ' || v_item.variance_qty || ' ' || v_item.unit,
        v_user_id
      );
    END IF;
  END LOOP;
END;
$$;
