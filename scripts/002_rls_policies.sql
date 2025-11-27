-- Row Level Security Policies for AbangBob System
-- All authenticated users can read most data, but write permissions vary by role

-- Users table policies
CREATE POLICY "Users can view all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert users" ON users FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can update users" ON users FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can delete users" ON users FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Employees policies
CREATE POLICY "All can view employees" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage employees" ON employees FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Attendance policies
CREATE POLICY "All can view attendance" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "All can insert attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update attendance" ON attendance FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Categories policies
CREATE POLICY "All can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Products policies
CREATE POLICY "All can view products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON products FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Modifier groups policies
CREATE POLICY "All can view modifier_groups" ON modifier_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage modifier_groups" ON modifier_groups FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Modifiers policies
CREATE POLICY "All can view modifiers" ON modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage modifiers" ON modifiers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Product modifiers policies
CREATE POLICY "All can view product_modifiers" ON product_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage product_modifiers" ON product_modifiers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Ingredients policies
CREATE POLICY "All can view ingredients" ON ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ingredients" ON ingredients FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Recipes policies
CREATE POLICY "All can view recipes" ON recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage recipes" ON recipes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Suppliers policies
CREATE POLICY "All can view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage suppliers" ON suppliers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Stock logs policies
CREATE POLICY "All can view stock_logs" ON stock_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stock_logs" ON stock_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'cashier'))
);

-- Customers policies
CREATE POLICY "All can view customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cashiers and admins can manage customers" ON customers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'cashier'))
);

-- Orders policies
CREATE POLICY "All can view orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cashiers and admins can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'cashier'))
);
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Order items policies
CREATE POLICY "All can view order_items" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cashiers and admins can create order_items" ON order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'cashier'))
);

-- Expense categories policies
CREATE POLICY "All can view expense_categories" ON expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expense_categories" ON expense_categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Expenses policies
CREATE POLICY "All can view expenses" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage expenses" ON expenses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
