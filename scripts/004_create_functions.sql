-- AbangBob Ayam Gunting - Database Functions

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_count INT;
  order_num TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count 
  FROM orders 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  order_num := 'AB' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(today_count::TEXT, 4, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct stock after order
CREATE OR REPLACE FUNCTION deduct_stock_for_order(p_order_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  recipe RECORD;
  prev_stock DECIMAL;
  new_stock_val DECIMAL;
BEGIN
  -- Loop through order items
  FOR item IN 
    SELECT oi.product_id, oi.quantity 
    FROM order_items oi 
    WHERE oi.order_id = p_order_id
  LOOP
    -- Loop through recipe ingredients
    FOR recipe IN
      SELECT r.ingredient_id, r.qty_per_unit, i.current_stock
      FROM recipes r
      JOIN ingredients i ON i.id = r.ingredient_id
      WHERE r.product_id = item.product_id
    LOOP
      prev_stock := recipe.current_stock;
      new_stock_val := prev_stock - (recipe.qty_per_unit * item.quantity);
      
      -- Update ingredient stock
      UPDATE ingredients 
      SET current_stock = new_stock_val, updated_at = NOW()
      WHERE id = recipe.ingredient_id;
      
      -- Log stock movement
      INSERT INTO stock_logs (ingredient_id, type, quantity, previous_stock, new_stock, reference_id, reference_type, created_by)
      VALUES (recipe.ingredient_id, 'order_deduct', recipe.qty_per_unit * item.quantity, prev_stock, new_stock_val, p_order_id, 'order', p_user_id);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate attendance hours
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
DECLARE
  hours_worked DECIMAL;
  overtime DECIMAL;
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    hours_worked := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    hours_worked := ROUND(hours_worked::NUMERIC, 2);
    
    -- Calculate overtime (>8 hours)
    IF hours_worked > 8 THEN
      overtime := hours_worked - 8;
    ELSE
      overtime := 0;
    END IF;
    
    NEW.total_hours := hours_worked;
    NEW.overtime_hours := overtime;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for attendance calculation
DROP TRIGGER IF EXISTS calc_attendance_hours ON attendance;
CREATE TRIGGER calc_attendance_hours
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_attendance_hours();

-- Function to update customer stats after order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET 
      order_count = order_count + 1,
      total_spent = total_spent + NEW.total,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer stats
DROP TRIGGER IF EXISTS update_customer_on_order ON orders;
CREATE TRIGGER update_customer_on_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();
