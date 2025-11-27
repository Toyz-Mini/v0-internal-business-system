/*
  # Missing Database Functions

  1. Functions
    - `update_ingredient_stock(p_ingredient_id)` - Recalculate ingredient stock from logs
    - `add_stock_movement()` - Add stock with proper logging and cost calculation

  2. Purpose
    - Support inventory recompute functionality
    - Enable proper stock movement tracking with weighted average cost
*/

-- Function to recalculate ingredient stock from stock_logs
CREATE OR REPLACE FUNCTION public.update_ingredient_stock(p_ingredient_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_in NUMERIC := 0;
  v_total_out NUMERIC := 0;
  v_net_stock NUMERIC := 0;
BEGIN
  -- Sum all IN movements (positive quantities)
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_in
  FROM stock_logs
  WHERE ingredient_id = p_ingredient_id
    AND type IN ('in')
    AND quantity > 0;

  -- Sum all adjustment IN
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_in
  FROM stock_logs
  WHERE ingredient_id = p_ingredient_id
    AND type = 'adjustment'
    AND quantity > 0;

  v_total_in := v_total_in;

  -- Sum all OUT movements (negative quantities)
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_total_out
  FROM stock_logs
  WHERE ingredient_id = p_ingredient_id
    AND type IN ('out', 'order_deduct');

  -- Sum adjustment OUT
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_total_out
  FROM stock_logs
  WHERE ingredient_id = p_ingredient_id
    AND type = 'adjustment'
    AND quantity < 0;

  v_total_out := v_total_out;

  -- Calculate net stock
  v_net_stock := v_total_in - v_total_out;

  -- Update ingredient current_stock
  UPDATE ingredients
  SET
    current_stock = GREATEST(v_net_stock, 0),
    updated_at = NOW()
  WHERE id = p_ingredient_id;

  RAISE NOTICE 'Stock updated for ingredient %: IN=%, OUT=%, NET=%', p_ingredient_id, v_total_in, v_total_out, v_net_stock;
END;
$$;

-- Function to add stock movement with proper cost calculation
CREATE OR REPLACE FUNCTION public.add_stock_movement(
  p_ingredient_id UUID,
  p_type TEXT,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_stock NUMERIC;
  v_new_stock NUMERIC;
  v_avg_cost NUMERIC;
  v_current_cost NUMERIC;
  v_log_id UUID;
  v_total_cost NUMERIC;
BEGIN
  -- Validate type
  IF p_type NOT IN ('in', 'out', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid type: %. Must be in, out, or adjustment', p_type;
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 AND p_type != 'adjustment' THEN
    RAISE EXCEPTION 'Quantity must be positive for % operations', p_type;
  END IF;

  -- Get current stock and costs
  SELECT
    current_stock,
    COALESCE(avg_cost_per_unit, cost_per_unit, 0),
    cost_per_unit
  INTO v_previous_stock, v_avg_cost, v_current_cost
  FROM ingredients
  WHERE id = p_ingredient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingredient not found: %', p_ingredient_id;
  END IF;

  -- Calculate new stock based on type
  IF p_type = 'in' THEN
    v_new_stock := v_previous_stock + p_quantity;

    -- Update weighted average cost if unit_cost provided
    IF p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
      -- Weighted average: (old_stock * old_cost + new_qty * new_cost) / total_stock
      IF v_previous_stock > 0 THEN
        v_avg_cost := ((v_previous_stock * v_avg_cost) + (p_quantity * p_unit_cost)) / v_new_stock;
      ELSE
        v_avg_cost := p_unit_cost;
      END IF;
      v_current_cost := p_unit_cost;
    END IF;

  ELSIF p_type = 'out' THEN
    v_new_stock := GREATEST(v_previous_stock - p_quantity, 0);
    -- Cost remains the same for OUT operations

  ELSE -- adjustment
    v_new_stock := p_quantity; -- Direct set to quantity
    -- Cost can be updated if provided
    IF p_unit_cost IS NOT NULL THEN
      v_current_cost := p_unit_cost;
      v_avg_cost := p_unit_cost;
    END IF;
  END IF;

  -- Calculate total cost
  v_total_cost := p_quantity * COALESCE(p_unit_cost, v_current_cost, 0);

  -- Update ingredient
  UPDATE ingredients
  SET
    current_stock = v_new_stock,
    avg_cost_per_unit = v_avg_cost,
    cost_per_unit = COALESCE(p_unit_cost, cost_per_unit),
    updated_at = NOW()
  WHERE id = p_ingredient_id;

  -- Create stock log entry
  INSERT INTO stock_logs (
    ingredient_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    unit_cost,
    total_cost,
    notes,
    received_by,
    created_by,
    reference_type
  ) VALUES (
    p_ingredient_id,
    p_type,
    p_quantity,
    v_previous_stock,
    v_new_stock,
    p_unit_cost,
    v_total_cost,
    p_notes,
    p_received_by,
    auth.uid(),
    'manual'
  )
  RETURNING id INTO v_log_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'previous_stock', v_previous_stock,
    'new_stock', v_new_stock,
    'avg_cost', v_avg_cost
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_ingredient_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_stock_movement(UUID, TEXT, NUMERIC, NUMERIC, UUID, UUID, TEXT) TO authenticated;