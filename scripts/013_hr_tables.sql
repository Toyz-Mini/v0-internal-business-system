/*
  # HR Management Tables

  1. New Tables
    - `claims` - Employee expense claims
    - `leave_balances` - Annual leave balance tracking
    - `leave_applications` - Leave application requests
    - `employee_documents` - Document storage metadata

  2. Security
    - Enable RLS on all tables
    - Create appropriate policies for authenticated users

  3. Indexes
    - Add performance indexes for common queries
*/

-- =====================================================
-- 1. CLAIMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('mileage', 'other')),
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km NUMERIC(10,2),
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  place_route TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_claims_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS claims_updated ON public.claims;
CREATE TRIGGER claims_updated
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_claims_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_claims_employee_id ON public.claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_claim_date ON public.claims(claim_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_employee_status ON public.claims(employee_id, status);

-- Enable RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "claims_select_all" ON public.claims
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "claims_insert_all" ON public.claims
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "claims_update_all" ON public.claims
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "claims_delete_admin" ON public.claims
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 2. LEAVE BALANCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  annual_balance NUMERIC(5,2) NOT NULL DEFAULT 14,
  replacement_balance NUMERIC(5,2) NOT NULL DEFAULT 0,
  medical_balance NUMERIC(5,2) NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year)
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_leave_balances_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_balances_updated ON public.leave_balances;
CREATE TRIGGER leave_balances_updated
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balances_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON public.leave_balances(year DESC);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON public.leave_balances(employee_id, year);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "leave_balances_select_all" ON public.leave_balances
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "leave_balances_insert_all" ON public.leave_balances
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "leave_balances_update_all" ON public.leave_balances
  FOR UPDATE TO authenticated USING (true);

-- Function to initialize leave balance for new employees
CREATE OR REPLACE FUNCTION public.initialize_leave_balance(p_employee_id UUID, p_year INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO leave_balances (employee_id, year, annual_balance, medical_balance)
  VALUES (p_employee_id, p_year, 14, 14)
  ON CONFLICT (employee_id, year) DO NOTHING;
END;
$$;

-- =====================================================
-- 3. LEAVE APPLICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'replacement', 'medical', 'paid_leave', 'unpaid_leave')),
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(3,1) NOT NULL CHECK (total_days > 0),
  reason TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_leave_applications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_applications_updated ON public.leave_applications;
CREATE TRIGGER leave_applications_updated
  BEFORE UPDATE ON public.leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_applications_timestamp();

-- Trigger to deduct leave balance when approved
CREATE OR REPLACE FUNCTION public.deduct_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_balance_column TEXT;
BEGIN
  -- Only process if status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    v_year := EXTRACT(YEAR FROM NEW.start_date);

    -- Determine which balance to deduct
    IF NEW.leave_type = 'annual' THEN
      v_balance_column := 'annual_balance';
    ELSIF NEW.leave_type = 'replacement' THEN
      v_balance_column := 'replacement_balance';
    ELSIF NEW.leave_type = 'medical' THEN
      v_balance_column := 'medical_balance';
    ELSE
      -- Paid and unpaid leave don't affect balance
      RETURN NEW;
    END IF;

    -- Ensure leave balance exists
    PERFORM initialize_leave_balance(NEW.employee_id, v_year);

    -- Deduct from appropriate balance
    IF v_balance_column = 'annual_balance' THEN
      UPDATE leave_balances
      SET annual_balance = annual_balance - NEW.total_days
      WHERE employee_id = NEW.employee_id AND year = v_year;
    ELSIF v_balance_column = 'replacement_balance' THEN
      UPDATE leave_balances
      SET replacement_balance = replacement_balance - NEW.total_days
      WHERE employee_id = NEW.employee_id AND year = v_year;
    ELSIF v_balance_column = 'medical_balance' THEN
      UPDATE leave_balances
      SET medical_balance = medical_balance - NEW.total_days
      WHERE employee_id = NEW.employee_id AND year = v_year;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deduct_leave_on_approval ON public.leave_applications;
CREATE TRIGGER deduct_leave_on_approval
  AFTER INSERT OR UPDATE ON public.leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_leave_balance();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_applications_employee_id ON public.leave_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON public.leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_start_date ON public.leave_applications(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_leave_applications_employee_status ON public.leave_applications(employee_id, status);

-- Enable RLS
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "leave_applications_select_all" ON public.leave_applications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "leave_applications_insert_all" ON public.leave_applications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "leave_applications_update_all" ON public.leave_applications
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "leave_applications_delete_admin" ON public.leave_applications
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 4. EMPLOYEE DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  uploaded_by UUID REFERENCES public.users(id),
  document_type TEXT CHECK (document_type IN ('photo', 'ic', 'passport', 'other')),
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_employee_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_documents_updated ON public.employee_documents;
CREATE TRIGGER employee_documents_updated
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_employee_documents_timestamp();

-- Trigger to ensure only one primary document per type per employee
CREATE OR REPLACE FUNCTION public.ensure_single_primary_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    -- Unset other primary documents of same type for this employee
    UPDATE employee_documents
    SET is_primary = FALSE
    WHERE employee_id = NEW.employee_id
      AND document_type = NEW.document_type
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_primary_document ON public.employee_documents;
CREATE TRIGGER ensure_primary_document
  BEFORE INSERT OR UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_document();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_document_type ON public.employee_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_employee_documents_is_primary ON public.employee_documents(employee_id, is_primary);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "employee_documents_select_all" ON public.employee_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "employee_documents_insert_all" ON public.employee_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "employee_documents_update_all" ON public.employee_documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "employee_documents_delete_all" ON public.employee_documents
  FOR DELETE TO authenticated USING (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.initialize_leave_balance(UUID, INTEGER) TO authenticated;
