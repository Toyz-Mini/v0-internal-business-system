-- Performance Indexes for AbangBob Business System
-- Run this script to create indexes for high-frequency queries

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_cashier_id ON orders(cashier_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Stock logs table indexes
CREATE INDEX IF NOT EXISTS idx_stock_logs_ingredient_id ON stock_logs(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_logs_reference ON stock_logs(reference_type, reference_id);

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, clock_in);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Ingredients table indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier_id ON ingredients(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_is_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock ON ingredients(current_stock, min_stock);

-- Recipes table indexes (for stock deduction)
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON recipes(ingredient_id);

-- Expenses table indexes
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Comment: Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(created_at DESC, payment_status);
CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance(clock_in, clock_out);

-- Analyze tables after creating indexes
ANALYZE orders;
ANALYZE order_items;
ANALYZE stock_logs;
ANALYZE attendance;
ANALYZE products;
ANALYZE ingredients;
ANALYZE recipes;
ANALYZE expenses;
ANALYZE customers;
ANALYZE employees;
