-- Complete Database Setup Script
-- This combines all essential migrations for initial setup

-- Part 1: Create all base tables first
-- From 002_create_products_inventory.sql
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) DEFAULT 0,
  image_url TEXT,
  sku TEXT UNIQUE,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  max_selection INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  modifier_group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, modifier_group_id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  current_stock DECIMAL(10,3) DEFAULT 0,
  min_stock DECIMAL(10,3) DEFAULT 0,
  cost_per_unit DECIMAL(10,4) DEFAULT 0,
  avg_cost_per_unit DECIMAL(10,4) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  qty_per_unit DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'order_deduct')),
  quantity DECIMAL(10,3) NOT NULL,
  previous_stock DECIMAL(10,3),
  new_stock DECIMAL(10,3),
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  received_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- From 003_create_orders_customers.sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  order_count INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES users(id),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'free_item')),
  discount_reason TEXT,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'qrpay', 'bank_transfer', 'split')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'voided')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  source_type TEXT CHECK (source_type IN ('takeaway', 'gomamam')),
  customer_phone TEXT,
  customer_country_code TEXT DEFAULT '+673',
  split_payments JSONB DEFAULT '[]'::jsonb,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES users(id),
  void_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refunded_by UUID REFERENCES users(id),
  refund_amount DECIMAL(12,2),
  shift_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  modifiers JSONB DEFAULT '[]',
  modifier_price DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  expense_date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default expense categories
INSERT INTO expense_categories (name, description) VALUES
  ('Utilities', 'Electricity, water, internet'),
  ('Rent', 'Shop rental'),
  ('Supplies', 'Ingredients and supplies'),
  ('Salaries', 'Staff salaries and wages'),
  ('Marketing', 'Advertising and promotions'),
  ('Maintenance', 'Equipment and facility maintenance'),
  ('Transportation', 'Delivery and transport costs'),
  ('Other', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

-- From 004_purchase_orders.sql
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'received', 'cancelled')),
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  expected_date DATE,
  received_date TIMESTAMP WITH TIME ZONE,
  received_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity NUMERIC(10,3) NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  received_quantity NUMERIC(10,3) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- From 006_product_images_table.sql
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- From 007_settings_table.sql
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
  opening_variance_threshold NUMERIC(5,2) DEFAULT 2.00,
  closing_variance_threshold NUMERIC(5,2) DEFAULT 2.00,
  require_photos_for_variance_above NUMERIC(5,2) DEFAULT 5.00,
  enable_offline_counts BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (business_name)
VALUES ('AbangBob Ayam Gunting')
ON CONFLICT DO NOTHING;

-- From 010_stock_counts_shifts.sql
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID,
  opened_by UUID REFERENCES users(id),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_stock_count_id UUID,
  closing_stock_count_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID,
  type TEXT NOT NULL CHECK (type IN ('opening', 'closing')),
  shift_id UUID REFERENCES shifts(id),
  counted_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  total_expected_value NUMERIC(12,2) DEFAULT 0,
  total_counted_value NUMERIC(12,2) DEFAULT 0,
  total_variance_value NUMERIC(12,2) DEFAULT 0,
  variance_percentage NUMERIC(5,2) DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  unit TEXT NOT NULL,
  quantity_counted NUMERIC(10,3),
  expected_quantity NUMERIC(10,3) DEFAULT 0,
  variance_qty NUMERIC(10,3) DEFAULT 0,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  variance_value NUMERIC(12,2) DEFAULT 0,
  not_counted BOOLEAN DEFAULT false,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys for shifts
ALTER TABLE shifts
  ADD CONSTRAINT fk_shifts_opening_count
  FOREIGN KEY (opening_stock_count_id) REFERENCES stock_counts(id);

ALTER TABLE shifts
  ADD CONSTRAINT fk_shifts_closing_count
  FOREIGN KEY (closing_stock_count_id) REFERENCES stock_counts(id);

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_shift
  FOREIGN KEY (shift_id) REFERENCES shifts(id);

-- Part 2: Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;

-- Part 3: Create RLS Policies (permissive for internal system)
CREATE POLICY "categories_all" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "products_all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "modifier_groups_all" ON modifier_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "modifier_options_all" ON modifier_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "product_modifiers_all" ON product_modifiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ingredients_all" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "recipes_all" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stock_logs_all" ON stock_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_all" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "customers_all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "orders_all" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "order_items_all" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "expenses_all" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "expense_categories_all" ON expense_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "purchase_orders_all" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "purchase_order_items_all" ON purchase_order_items FOR ALL USING (true);
CREATE POLICY "product_images_all" ON product_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "shifts_all" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stock_counts_all" ON stock_counts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stock_count_items_all" ON stock_count_items FOR ALL USING (true) WITH CHECK (true);
