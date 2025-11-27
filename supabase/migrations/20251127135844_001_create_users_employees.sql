-- AbangBob Ayam Gunting - Users & Employees Tables
-- Users table (for authentication & roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table (detailed staff info)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  ic_number TEXT,
  address TEXT,
  salary_type TEXT NOT NULL CHECK (salary_type IN ('hourly', 'monthly')),
  salary_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  bank_name TEXT,
  bank_account TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ,
  clock_in_lat DECIMAL(10,8),
  clock_in_lng DECIMAL(11,8),
  clock_out TIMESTAMPTZ,
  clock_out_lat DECIMAL(10,8),
  clock_out_lng DECIMAL(11,8),
  total_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  is_late BOOLEAN DEFAULT false,
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_admin" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_admin" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete_admin" ON users FOR DELETE USING (true);

-- Employees policies  
CREATE POLICY "employees_select_all" ON employees FOR SELECT USING (true);
CREATE POLICY "employees_insert_admin" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update_admin" ON employees FOR UPDATE USING (true);
CREATE POLICY "employees_delete_admin" ON employees FOR DELETE USING (true);

-- Attendance policies
CREATE POLICY "attendance_select_all" ON attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert_all" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "attendance_update_all" ON attendance FOR UPDATE USING (true);
