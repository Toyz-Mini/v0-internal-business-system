-- Settings table for business configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT DEFAULT 'My Restaurant',
  address TEXT,
  phone TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  service_charge_rate DECIMAL(5,2) DEFAULT 0,
  enable_loyalty BOOLEAN DEFAULT FALSE,
  loyalty_points_per_rm INTEGER DEFAULT 1,
  currency TEXT DEFAULT 'MYR',
  receipt_header TEXT,
  receipt_footer TEXT,
  receipt_width TEXT DEFAULT '80mm',
  print_logo BOOLEAN DEFAULT TRUE,
  print_customer_copy BOOLEAN DEFAULT TRUE,
  auto_print BOOLEAN DEFAULT FALSE,
  webhooks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one settings row
INSERT INTO settings (business_name) 
VALUES ('My Restaurant')
ON CONFLICT DO NOTHING;

-- Update trigger
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated ON settings;
CREATE TRIGGER settings_updated
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_timestamp();
