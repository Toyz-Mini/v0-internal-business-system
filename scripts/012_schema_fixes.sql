/*
  # Schema Fixes and Enhancements

  1. Employees Table
    - Add `salary_rate` column (align with frontend)
    - Add `ot_rate` column for overtime rate
    - Migrate existing `salary_amount` to `salary_rate`

  2. Attendance Table
    - Add OT tracking fields (ot_clock_in, ot_clock_out, ot_approved)
    - Add photo fields for attendance verification
    - Add geo location fields
    - Sync `ot_hours` with existing `overtime_hours`

  3. Orders Table
    - Add `source_type` for order source tracking
    - Add customer phone fields for quick entry
    - Add void/refund tracking fields
    - Add split payment support

  4. Order Items Table
    - Add item-level discount fields

  5. Expenses Table
    - Create expense_categories table
    - Add category_id foreign key
    - Migrate existing text categories
    - Add expense_date column

  6. Ingredients Table
    - Add avg_cost_per_unit for weighted average cost
*/

-- =====================================================
-- 1. EMPLOYEES TABLE FIXES
-- =====================================================

-- Add missing columns to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS salary_rate NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_rate NUMERIC(10,2) DEFAULT 0;

-- Migrate existing salary_amount to salary_rate
UPDATE public.employees
SET salary_rate = COALESCE(salary_amount, 0)
WHERE salary_rate = 0;

-- Set default OT rate (1.5x hourly rate for hourly employees)
UPDATE public.employees
SET ot_rate = ROUND(hourly_rate * 1.5, 2)
WHERE salary_type = 'hourly' AND ot_rate = 0 AND hourly_rate > 0;

-- =====================================================
-- 2. ATTENDANCE TABLE FIXES
-- =====================================================

-- Add OT and photo tracking columns
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS ot_hours NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_clock_in TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ot_clock_out TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ot_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10,8),
  ADD COLUMN IF NOT EXISTS geo_lon NUMERIC(11,8),
  ADD COLUMN IF NOT EXISTS photo_required BOOLEAN DEFAULT FALSE;

-- Sync ot_hours with existing overtime_hours
UPDATE public.attendance
SET ot_hours = COALESCE(overtime_hours, 0)
WHERE ot_hours = 0 AND overtime_hours > 0;

-- =====================================================
-- 3. EXPENSE CATEGORIES TABLE
-- =====================================================

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "expense_categories_all" ON public.expense_categories
  FOR ALL USING (true) WITH CHECK (true);

-- Migrate existing expense categories from text to relational
INSERT INTO public.expense_categories (name)
SELECT DISTINCT category
FROM public.expenses
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Add some default categories if none exist
INSERT INTO public.expense_categories (name, description) VALUES
  ('Utilities', 'Electricity, water, internet'),
  ('Rent', 'Shop rental'),
  ('Supplies', 'Ingredients and supplies'),
  ('Salaries', 'Staff salaries and wages'),
  ('Marketing', 'Advertising and promotions'),
  ('Maintenance', 'Equipment and facility maintenance'),
  ('Transportation', 'Delivery and transport costs'),
  ('Other', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. EXPENSES TABLE FIXES
-- =====================================================

-- Add new columns to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.expense_categories(id),
  ADD COLUMN IF NOT EXISTS expense_date DATE;

-- Migrate category text to category_id
UPDATE public.expenses e
SET category_id = ec.id
FROM public.expense_categories ec
WHERE e.category = ec.name AND e.category_id IS NULL;

-- Migrate date to expense_date
UPDATE public.expenses
SET expense_date = date
WHERE expense_date IS NULL AND date IS NOT NULL;

-- Set default expense_date if still null
UPDATE public.expenses
SET expense_date = CURRENT_DATE
WHERE expense_date IS NULL;

-- =====================================================
-- 5. ORDERS TABLE FIXES
-- =====================================================

-- Add order tracking and payment fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('takeaway', 'gomamam')),
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_country_code TEXT DEFAULT '+673',
  ADD COLUMN IF NOT EXISTS split_payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);

-- Set default source_type for existing orders
UPDATE public.orders
SET source_type = 'takeaway'
WHERE source_type IS NULL;

-- =====================================================
-- 6. ORDER ITEMS TABLE FIXES
-- =====================================================

-- Add item-level discount fields
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed'));

-- =====================================================
-- 7. INGREDIENTS TABLE FIXES
-- =====================================================

-- Add weighted average cost column
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS avg_cost_per_unit NUMERIC(10,4) DEFAULT 0;

-- Initialize avg_cost_per_unit with current cost_per_unit
UPDATE public.ingredients
SET avg_cost_per_unit = cost_per_unit
WHERE avg_cost_per_unit = 0 OR avg_cost_per_unit IS NULL;

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Date-based query indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON public.stock_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);

-- Foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON public.recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON public.recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);

-- Status filtering indexes
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_source_type ON public.orders(source_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON public.orders(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, date DESC);
