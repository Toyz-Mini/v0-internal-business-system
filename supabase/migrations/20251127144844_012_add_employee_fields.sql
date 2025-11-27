/*
  # Add Employee Fields for Payroll - URGENT FIX

  1. Changes
    - Add `hourly_rate` column (NUMERIC(10,2) DEFAULT 0) if missing
    - Add `status` column (VARCHAR(32) DEFAULT 'active') if missing
    - Add `ot_hours` column to attendance table if missing

  2. Purpose
    - Fix missing columns error in V0 payroll dashboard
    - Enable payroll calculations for hourly employees
    - Ensure API compatibility
*/

-- Add hourly_rate column to employees table if it doesn't exist
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

-- Add status column to employees table if it doesn't exist
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

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_status_check'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_status_check
      CHECK (status IN ('active', 'inactive', 'terminated', 'on_leave'));
    RAISE NOTICE 'Added status check constraint';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Status check constraint already exists';
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);

-- Add column comments
COMMENT ON COLUMN public.employees.hourly_rate IS 'Hourly rate for hourly employees';
COMMENT ON COLUMN public.employees.status IS 'Employee status: active, inactive, terminated, on_leave';

-- Add ot_hours column to attendance table for API compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'attendance'
    AND column_name = 'ot_hours'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN ot_hours NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added ot_hours column to attendance table';
  ELSE
    RAISE NOTICE 'ot_hours column already exists in attendance table';
  END IF;
END $$;

-- Sync overtime_hours to ot_hours for existing records
UPDATE public.attendance
SET ot_hours = COALESCE(overtime_hours, 0)
WHERE (ot_hours IS NULL OR ot_hours = 0) AND overtime_hours IS NOT NULL;

-- Create trigger to keep overtime_hours and ot_hours in sync
CREATE OR REPLACE FUNCTION sync_ot_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.overtime_hours IS NOT NULL THEN
    NEW.ot_hours := NEW.overtime_hours;
  END IF;
  IF NEW.ot_hours IS NOT NULL AND NEW.overtime_hours IS NULL THEN
    NEW.overtime_hours := NEW.ot_hours;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_ot_hours_trigger ON public.attendance;
CREATE TRIGGER sync_ot_hours_trigger
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION sync_ot_hours();

COMMENT ON COLUMN public.attendance.ot_hours IS 'Overtime hours (synced with overtime_hours for API compatibility)';

-- Verification
DO $$
DECLARE
  hourly_rate_exists BOOLEAN;
  status_exists BOOLEAN;
  ot_hours_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'hourly_rate'
  ) INTO hourly_rate_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'status'
  ) INTO status_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'ot_hours'
  ) INTO ot_hours_exists;

  RAISE NOTICE '=== MIGRATION VERIFICATION ===';
  RAISE NOTICE 'hourly_rate column exists: %', hourly_rate_exists;
  RAISE NOTICE 'status column exists: %', status_exists;
  RAISE NOTICE 'ot_hours column exists: %', ot_hours_exists;
END $$;
