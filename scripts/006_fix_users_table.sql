-- Fix users table to add full_name column
-- This script aligns the schema with seed data that uses full_name

-- Add full_name column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Copy data from name to full_name if name exists and full_name is empty
UPDATE users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Now insert seed data with full_name
INSERT INTO users (email, full_name, role) VALUES
('admin@abangbob.com', 'Admin AbangBob', 'admin'),
('cashier@abangbob.com', 'Cashier 1', 'cashier'),
('staff@abangbob.com', 'Staff 1', 'staff')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Verify the data
SELECT id, email, full_name, role, created_at FROM users;
