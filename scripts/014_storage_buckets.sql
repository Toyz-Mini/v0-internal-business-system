/*
  # Storage Buckets Configuration

  1. Buckets
    - `employee-documents` - Employee documents (IC, passport, photos)
    - `expense-receipts` - Expense receipt images
    - `claim-attachments` - Claim supporting documents

  2. Security
    - RLS policies for authenticated access
    - Admin and employee-specific permissions
*/

-- =====================================================
-- 1. EMPLOYEE DOCUMENTS BUCKET
-- =====================================================

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false, -- Private bucket
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete employee documents" ON storage.objects;

-- Storage policies
CREATE POLICY "Authenticated users can view employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated users can upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('admin', 'staff')
  ))
);

CREATE POLICY "Authenticated users can update employee documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);

CREATE POLICY "Authenticated users can delete employee documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);

-- =====================================================
-- 2. EXPENSE RECEIPTS BUCKET
-- =====================================================

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false, -- Private bucket
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete expense receipts" ON storage.objects;

-- Storage policies (admin only)
CREATE POLICY "Authenticated users can view expense receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('admin', 'cashier')
  ))
);

CREATE POLICY "Admins can upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);

CREATE POLICY "Admins can update expense receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);

CREATE POLICY "Admins can delete expense receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);

-- =====================================================
-- 3. CLAIM ATTACHMENTS BUCKET
-- =====================================================

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-attachments',
  'claim-attachments',
  false, -- Private bucket
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update claim attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete claim attachments" ON storage.objects;

-- Storage policies
CREATE POLICY "Authenticated users can view claim attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'claim-attachments');

CREATE POLICY "Authenticated users can upload claim attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'claim-attachments');

CREATE POLICY "Admins can update claim attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'claim-attachments'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);

CREATE POLICY "Admins can delete claim attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-attachments'
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  ))
);
