-- Audit Logs Table for Security & Compliance
-- Tracks all sensitive operations in the system

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (p_user_id, p_user_email, p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_metadata)
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for automatic audit logging on orders (void/refund)
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log void/refund operations
    IF OLD.payment_status != NEW.payment_status AND NEW.payment_status IN ('voided', 'refunded') THEN
      PERFORM log_audit_event(
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        NEW.payment_status,
        'orders',
        NEW.id,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb,
        jsonb_build_object('reason', 'Order status changed')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order changes
DROP TRIGGER IF EXISTS audit_order_changes_trigger ON orders;
CREATE TRIGGER audit_order_changes_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_order_changes();

-- Trigger function for stock changes audit
CREATE OR REPLACE FUNCTION audit_stock_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log all stock changes
    IF NEW.type IN ('adjustment', 'out') AND ABS(NEW.quantity) > 10 THEN
      PERFORM log_audit_event(
        NEW.created_by,
        (SELECT email FROM auth.users WHERE id = NEW.created_by),
        'stock_' || NEW.type,
        'stock_logs',
        NEW.id,
        NULL,
        row_to_json(NEW)::jsonb,
        jsonb_build_object(
          'ingredient_id', NEW.ingredient_id,
          'previous_stock', NEW.previous_stock,
          'new_stock', NEW.new_stock
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for stock changes
DROP TRIGGER IF EXISTS audit_stock_changes_trigger ON stock_logs;
CREATE TRIGGER audit_stock_changes_trigger
  AFTER INSERT ON stock_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_stock_changes();

-- Trigger function for employee/payroll changes
CREATE OR REPLACE FUNCTION audit_employee_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log salary changes
    IF OLD.salary_rate != NEW.salary_rate THEN
      PERFORM log_audit_event(
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'salary_change',
        'employees',
        NEW.id,
        jsonb_build_object('salary_rate', OLD.salary_rate),
        jsonb_build_object('salary_rate', NEW.salary_rate),
        jsonb_build_object('employee_name', NEW.name)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for employee changes
DROP TRIGGER IF EXISTS audit_employee_changes_trigger ON employees;
CREATE TRIGGER audit_employee_changes_trigger
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_changes();
