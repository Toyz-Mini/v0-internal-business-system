/*
  # Add Employee Fields for Payroll

  1. Changes
    - Add `hourly_rate` column to employees table if missing
    - Add `status` column to employees table if missing
    - Migrate data from existing fields
    - Update indexes for new fields

  2. Purpose
    - Support V0 payroll dashboard requirements
    - Enable proper hourly rate tracking for payroll calculations
    - Add employee status tracking (active, inactive, terminated)
*/

-- Add hourly_rate column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN hourly_rate NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added hourly_rate column to employees table';
  ELSE
    RAISE NOTICE 'hourly_rate column already exists in employees table';
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN status VARCHAR(32) DEFAULT 'active';
    RAISE NOTICE 'Added status column to employees table';
  ELSE
    RAISE NOTICE 'status column already exists in employees table';
  END IF;
END $$;

-- Add check constraint for status if column was just added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_status_check'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_status_check
      CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave'));
    RAISE NOTICE 'Added status check constraint to employees table';
  ELSE
    RAISE NOTICE 'status check constraint already exists';
  END IF;
END $$;

-- Migrate data: Set status based on is_active field
UPDATE public.employees
SET status = CASE
  WHEN is_active = true THEN 'active'
  WHEN is_active = false THEN 'inactive'
  ELSE 'active'
END
WHERE status IS NULL OR status = 'active';

-- Add comment to columns for documentation
COMMENT ON COLUMN public.employees.hourly_rate IS 'Hourly rate for hourly employees, used in payroll calculations';
COMMENT ON COLUMN public.employees.status IS 'Employee status: active, inactive, terminated, on_leave';

-- Create index for status lookups (for filtering active employees)
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Verify the migration
DO $$
DECLARE
  hourly_rate_exists BOOLEAN;
  status_exists BOOLEAN;
  employee_count INTEGER;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name = 'hourly_rate'
  ) INTO hourly_rate_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name = 'status'
  ) INTO status_exists;

  SELECT COUNT(*) INTO employee_count FROM public.employees;

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  - hourly_rate column exists: %', hourly_rate_exists;
  RAISE NOTICE '  - status column exists: %', status_exists;
  RAISE NOTICE '  - Total employees: %', employee_count;
END $$;
