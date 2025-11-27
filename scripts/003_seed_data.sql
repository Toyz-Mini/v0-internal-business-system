-- Seed data for AbangBob Ayam Gunting

-- Insert expense categories
INSERT INTO expense_categories (name, description) VALUES
('Sewa', 'Rental premises'),
('Utiliti', 'Electric, water, internet'),
('Gaji', 'Staff salary'),
('Bahan Mentah', 'Raw materials and ingredients'),
('Peralatan', 'Equipment and tools'),
('Marketing', 'Advertising and promotions'),
('Lain-lain', 'Miscellaneous expenses');

-- Insert product categories
INSERT INTO categories (name, description, sort_order) VALUES
('Ayam Goreng', 'Fried chicken menu', 1),
('Set Meal', 'Combo meals', 2),
('Minuman', 'Beverages', 3),
('Tambahan', 'Add-ons and sides', 4);

-- Insert modifier groups
INSERT INTO modifier_groups (name, is_required, max_selections) VALUES
('Pedas Level', false, 1),
('Add Cheese', false, 1),
('Nasi', false, 1);

-- Insert modifiers
INSERT INTO modifiers (group_id, name, price_adjustment)
SELECT id, 'Tak Pedas', 0 FROM modifier_groups WHERE name = 'Pedas Level'
UNION ALL
SELECT id, 'Pedas Sikit', 0 FROM modifier_groups WHERE name = 'Pedas Level'
UNION ALL
SELECT id, 'Pedas', 0 FROM modifier_groups WHERE name = 'Pedas Level'
UNION ALL
SELECT id, 'Extra Pedas', 0 FROM modifier_groups WHERE name = 'Pedas Level';

INSERT INTO modifiers (group_id, name, price_adjustment)
SELECT id, 'Add Cheese', 2.00 FROM modifier_groups WHERE name = 'Add Cheese';

INSERT INTO modifiers (group_id, name, price_adjustment)
SELECT id, 'Nasi Putih', 2.00 FROM modifier_groups WHERE name = 'Nasi'
UNION ALL
SELECT id, 'Nasi Lemak', 3.00 FROM modifier_groups WHERE name = 'Nasi';

-- Insert sample products
INSERT INTO products (category_id, name, description, price, cost)
SELECT c.id, '2 Pcs Ayam', '2 pieces fried chicken', 8.90, 4.00
FROM categories c WHERE c.name = 'Ayam Goreng'
UNION ALL
SELECT c.id, '3 Pcs Ayam', '3 pieces fried chicken', 12.90, 6.00
FROM categories c WHERE c.name = 'Ayam Goreng'
UNION ALL
SELECT c.id, '5 Pcs Ayam', '5 pieces fried chicken (family)', 19.90, 9.50
FROM categories c WHERE c.name = 'Ayam Goreng';

INSERT INTO products (category_id, name, description, price, cost)
SELECT c.id, 'Set A - 2 Pcs + Nasi + Air', 'Complete meal set', 13.90, 6.50
FROM categories c WHERE c.name = 'Set Meal'
UNION ALL
SELECT c.id, 'Set B - 3 Pcs + Nasi + Air', 'Large meal set', 17.90, 8.50
FROM categories c WHERE c.name = 'Set Meal';

INSERT INTO products (category_id, name, description, price, cost)
SELECT c.id, 'Air Sirap', 'Rose syrup drink', 2.50, 0.50
FROM categories c WHERE c.name = 'Minuman'
UNION ALL
SELECT c.id, 'Teh O Ais', 'Iced tea', 2.00, 0.40
FROM categories c WHERE c.name = 'Minuman'
UNION ALL
SELECT c.id, 'Air Mineral', 'Mineral water', 1.50, 0.50
FROM categories c WHERE c.name = 'Minuman';

INSERT INTO products (category_id, name, description, price, cost)
SELECT c.id, 'Coleslaw', 'Fresh coleslaw', 3.00, 1.00
FROM categories c WHERE c.name = 'Tambahan'
UNION ALL
SELECT c.id, 'Fries', 'French fries', 4.00, 1.50
FROM categories c WHERE c.name = 'Tambahan';

-- Insert ingredients
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit) VALUES
('Ayam', 'kg', 50.000, 10.000, 12.00),
('Tepung Ayam', 'kg', 20.000, 5.000, 8.00),
('Minyak Masak', 'liter', 30.000, 10.000, 6.00),
('Serbuk Perasa', 'kg', 5.000, 1.000, 25.00),
('Kotak Packaging', 'pcs', 500.000, 100.000, 0.50),
('Sos Cili', 'liter', 10.000, 3.000, 5.00),
('Beras', 'kg', 25.000, 5.000, 3.50),
('Santan', 'liter', 5.000, 2.000, 8.00),
('Gula', 'kg', 10.000, 2.000, 3.00),
('Teh', 'kg', 2.000, 0.500, 15.00),
('Sirap', 'liter', 5.000, 1.000, 6.00),
('Kentang', 'kg', 15.000, 5.000, 5.00),
('Kobis', 'kg', 5.000, 2.000, 4.00),
('Mayonis', 'kg', 3.000, 1.000, 12.00);

-- Insert recipes (ingredient usage per product)
-- 2 Pcs Ayam
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.300 FROM products p, ingredients i WHERE p.name = '2 Pcs Ayam' AND i.name = 'Ayam'
UNION ALL
SELECT p.id, i.id, 0.050 FROM products p, ingredients i WHERE p.name = '2 Pcs Ayam' AND i.name = 'Tepung Ayam'
UNION ALL
SELECT p.id, i.id, 0.100 FROM products p, ingredients i WHERE p.name = '2 Pcs Ayam' AND i.name = 'Minyak Masak'
UNION ALL
SELECT p.id, i.id, 0.010 FROM products p, ingredients i WHERE p.name = '2 Pcs Ayam' AND i.name = 'Serbuk Perasa'
UNION ALL
SELECT p.id, i.id, 1.000 FROM products p, ingredients i WHERE p.name = '2 Pcs Ayam' AND i.name = 'Kotak Packaging';

-- 3 Pcs Ayam
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.450 FROM products p, ingredients i WHERE p.name = '3 Pcs Ayam' AND i.name = 'Ayam'
UNION ALL
SELECT p.id, i.id, 0.075 FROM products p, ingredients i WHERE p.name = '3 Pcs Ayam' AND i.name = 'Tepung Ayam'
UNION ALL
SELECT p.id, i.id, 0.150 FROM products p, ingredients i WHERE p.name = '3 Pcs Ayam' AND i.name = 'Minyak Masak'
UNION ALL
SELECT p.id, i.id, 0.015 FROM products p, ingredients i WHERE p.name = '3 Pcs Ayam' AND i.name = 'Serbuk Perasa'
UNION ALL
SELECT p.id, i.id, 1.000 FROM products p, ingredients i WHERE p.name = '3 Pcs Ayam' AND i.name = 'Kotak Packaging';

-- 5 Pcs Ayam
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.750 FROM products p, ingredients i WHERE p.name = '5 Pcs Ayam' AND i.name = 'Ayam'
UNION ALL
SELECT p.id, i.id, 0.125 FROM products p, ingredients i WHERE p.name = '5 Pcs Ayam' AND i.name = 'Tepung Ayam'
UNION ALL
SELECT p.id, i.id, 0.250 FROM products p, ingredients i WHERE p.name = '5 Pcs Ayam' AND i.name = 'Minyak Masak'
UNION ALL
SELECT p.id, i.id, 0.025 FROM products p, ingredients i WHERE p.name = '5 Pcs Ayam' AND i.name = 'Serbuk Perasa'
UNION ALL
SELECT p.id, i.id, 1.000 FROM products p, ingredients i WHERE p.name = '5 Pcs Ayam' AND i.name = 'Kotak Packaging';

-- Air Sirap
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.030 FROM products p, ingredients i WHERE p.name = 'Air Sirap' AND i.name = 'Sirap'
UNION ALL
SELECT p.id, i.id, 0.020 FROM products p, ingredients i WHERE p.name = 'Air Sirap' AND i.name = 'Gula';

-- Teh O Ais
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.005 FROM products p, ingredients i WHERE p.name = 'Teh O Ais' AND i.name = 'Teh'
UNION ALL
SELECT p.id, i.id, 0.020 FROM products p, ingredients i WHERE p.name = 'Teh O Ais' AND i.name = 'Gula';

-- Coleslaw
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.100 FROM products p, ingredients i WHERE p.name = 'Coleslaw' AND i.name = 'Kobis'
UNION ALL
SELECT p.id, i.id, 0.030 FROM products p, ingredients i WHERE p.name = 'Coleslaw' AND i.name = 'Mayonis';

-- Fries
INSERT INTO recipes (product_id, ingredient_id, qty_per_unit)
SELECT p.id, i.id, 0.150 FROM products p, ingredients i WHERE p.name = 'Fries' AND i.name = 'Kentang'
UNION ALL
SELECT p.id, i.id, 0.050 FROM products p, ingredients i WHERE p.name = 'Fries' AND i.name = 'Minyak Masak';

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('Pembekal Ayam Segar Sdn Bhd', 'En. Ahmad', '012-3456789', 'ahmad@ayamsegar.com', 'No 123, Jalan Industri, Shah Alam'),
('Borong Tepung & Minyak', 'Puan Siti', '013-9876543', 'siti@borongtepung.com', 'Lot 45, Kawasan Perindustrian, Klang'),
('Packaging Express', 'Mr. Lee', '016-5551234', 'lee@packagingexpress.com', 'Unit 8, Jalan Warehouse, PJ');
