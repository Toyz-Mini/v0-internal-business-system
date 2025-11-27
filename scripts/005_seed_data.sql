-- AbangBob Ayam Gunting - Sample Seed Data

-- Insert default admin user
INSERT INTO users (email, full_name, role) VALUES
('admin@abangbob.com', 'Admin AbangBob', 'admin'),
('cashier@abangbob.com', 'Cashier 1', 'cashier'),
('staff@abangbob.com', 'Staff 1', 'staff')
ON CONFLICT (email) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (name, description, sort_order) VALUES
('Ayam Goreng', 'Menu ayam goreng', 1),
('Set Meal', 'Pakej set lengkap', 2),
('Sides', 'Lauk tambahan', 3),
('Drinks', 'Minuman', 4)
ON CONFLICT DO NOTHING;

-- Insert sample modifier groups
INSERT INTO modifier_groups (name, is_required, max_selection) VALUES
('Spice Level', false, 1),
('Add-ons', false, 3);

-- Insert modifier options
INSERT INTO modifier_options (group_id, name, price_adjustment, is_default)
SELECT mg.id, opt.name, opt.price, opt.is_default
FROM modifier_groups mg
CROSS JOIN (VALUES 
  ('Spice Level', 'Mild', 0, true),
  ('Spice Level', 'Medium', 0, false),
  ('Spice Level', 'Spicy', 0, false),
  ('Spice Level', 'Extra Spicy', 0, false),
  ('Add-ons', 'Extra Cheese', 2.00, false),
  ('Add-ons', 'Extra Sauce', 1.00, false),
  ('Add-ons', 'Coleslaw', 2.50, false)
) AS opt(group_name, name, price, is_default)
WHERE mg.name = opt.group_name
ON CONFLICT DO NOTHING;

-- Insert sample ingredients
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit) VALUES
('Ayam (kg)', 'kg', 50, 10, 12.00),
('Tepung Goreng (kg)', 'kg', 20, 5, 8.00),
('Minyak Masak (L)', 'L', 30, 10, 6.50),
('Serbuk Rempah (kg)', 'kg', 5, 2, 25.00),
('Sos Cili (btl)', 'btl', 20, 5, 8.00),
('Sos Tomato (btl)', 'btl', 15, 5, 7.00),
('Nasi (kg)', 'kg', 25, 10, 4.50),
('Kotak Packaging (pc)', 'pc', 500, 100, 0.50),
('Plastik Beg (pc)', 'pc', 300, 100, 0.10),
('Air Mineral (btl)', 'btl', 48, 12, 1.00),
('Sirap (btl)', 'btl', 10, 3, 8.00)
ON CONFLICT DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, address) VALUES
('Pembekal Ayam Segar', 'En. Ahmad', '012-3456789', 'Pasar Borong, Selangor'),
('Kedai Runcit ABC', 'Pn. Lim', '013-9876543', 'Taman Industri, KL'),
('Packaging Direct', 'Mr. Kumar', '011-1234567', 'Klang, Selangor')
ON CONFLICT DO NOTHING;

-- Insert expense categories reference
-- Common expense categories: Rent, Utilities, Supplies, Marketing, Wages, Others
