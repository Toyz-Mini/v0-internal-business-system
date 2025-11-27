-- Migration: Add missing settings columns for business settings UI
-- Date: 2025-01-28
-- Description: Adds columns required by business-settings.tsx, attendance-settings.tsx

-- Add missing settings columns for business settings UI
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS enable_takeaway BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_gomamam BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_walkin BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS annual_leave_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS medical_leave_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS enable_unpaid_leave BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_paid_leave BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_replacement_leave BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ot_start_hour INTEGER DEFAULT 18,
ADD COLUMN IF NOT EXISTS payroll_day INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS enable_epf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_socso BOOLEAN DEFAULT true;

-- Update existing row with defaults if exists
UPDATE public.settings SET
  enable_takeaway = COALESCE(enable_takeaway, true),
  enable_gomamam = COALESCE(enable_gomamam, false),
  enable_walkin = COALESCE(enable_walkin, true),
  annual_leave_days = COALESCE(annual_leave_days, 14),
  medical_leave_days = COALESCE(medical_leave_days, 14),
  enable_unpaid_leave = COALESCE(enable_unpaid_leave, true),
  enable_paid_leave = COALESCE(enable_paid_leave, true),
  enable_replacement_leave = COALESCE(enable_replacement_leave, false),
  ot_start_hour = COALESCE(ot_start_hour, 18),
  payroll_day = COALESCE(payroll_day, 25),
  enable_epf = COALESCE(enable_epf, true),
  enable_socso = COALESCE(enable_socso, true)
WHERE id IS NOT NULL;
