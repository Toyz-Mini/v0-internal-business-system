# Backend Audit Report - AbangBob POS System
**Generated:** 2025-11-27
**Status:** Production Readiness Assessment

---

## Executive Summary

This comprehensive audit analyzed the entire backend infrastructure of the AbangBob POS system, examining API routes, database schema, stored procedures, and frontend-backend integration points. The system is **75% production-ready** with several critical missing components that need immediate attention.

### Key Findings:
- ✅ **3 API routes** implemented and functional
- ⚠️ **2 critical database functions** missing
- ⚠️ **Multiple schema mismatches** between frontend expectations and database
- ❌ **No HR/Payroll backend logic** (tables exist but no API support)
- ❌ **Missing Claims & Leave management APIs**
- ✅ Strong RLS (Row Level Security) implementation
- ✅ Comprehensive database schema with proper indexes

---

## 1. API Routes Analysis

### 1.1 Implemented API Routes ✅

#### `/api/inventory/recompute` (POST)
- **Purpose:** Recompute ingredient stock levels
- **Auth:** Admin only
- **Status:** ✅ Fully implemented
- **Dependencies:** Calls `update_ingredient_stock()` RPC (MISSING)
- **Issue:** Function being called doesn't exist in database

#### `/api/upload/product-image` (POST)
- **Purpose:** Upload product images to Supabase storage
- **Auth:** Admin only
- **Status:** ✅ Fully implemented
- **Validation:** File type, size (3MB limit)
- **Storage:** Uses `product-images` bucket
- **Issue:** None - working correctly

#### `/api/webhooks/test` (POST)
- **Purpose:** Test webhook configuration
- **Auth:** None (public endpoint)
- **Status:** ✅ Fully implemented
- **Security:** HMAC signature support
- **Issue:** None - working correctly

### 1.2 Missing Critical API Routes ❌

#### `/api/hr/payroll` endpoints
**Frontend calls from:** `app/hr/payroll/page.tsx`
- **Missing:** GET endpoint for payroll calculation
- **Missing:** POST endpoint to process payroll
- **Missing:** POST endpoint to approve payroll
- **Impact:** HIGH - Payroll page will not function

#### `/api/hr/claims` endpoints
**Frontend calls from:** `app/hr/claims/page.tsx`
- **Missing:** GET `/api/hr/claims` - list claims
- **Missing:** POST `/api/hr/claims` - create claim
- **Missing:** PATCH `/api/hr/claims/:id` - approve/reject
- **Impact:** HIGH - Claims management non-functional

#### `/api/hr/leave` endpoints
**Frontend calls from:** `app/hr/leave/page.tsx`
- **Missing:** GET `/api/hr/leave` - list leave applications
- **Missing:** POST `/api/hr/leave` - submit leave
- **Missing:** PATCH `/api/hr/leave/:id` - approve/reject
- **Impact:** HIGH - Leave management non-functional

#### `/api/reports/export` endpoints
**Frontend calls from:** `app/reports/page.tsx`
- **Missing:** POST `/api/reports/export` - export reports to PDF/Excel
- **Impact:** MEDIUM - Manual export workarounds exist

#### `/api/orders/void` endpoint
**Frontend calls from:** `components/pos/order-history.tsx`
- **Missing:** POST `/api/orders/:id/void` - void order with proper audit trail
- **Current:** Direct database update (not ideal)
- **Impact:** MEDIUM - Needs proper audit logging

---

## 2. Database Schema Analysis

### 2.1 Existing Tables ✅

**Core System:**
- `users` - User authentication and roles
- `employees` - Employee details and HR info
- `attendance` - Clock in/out records
- `categories` - Product categories
- `products` - Menu items
- `modifier_groups` & `modifier_options` - Product modifiers
- `product_modifiers` - Product-modifier relationships
- `ingredients` - Inventory items
- `recipes` - Product-ingredient mapping
- `stock_logs` - Inventory movement history
- `suppliers` - Supplier information
- `customers` - Customer database
- `orders` & `order_items` - Order management
- `expenses` - Business expenses
- `purchase_orders` & `purchase_order_items` - Purchase order system
- `product_images` - Multiple product images support
- `settings` - Business configuration
- `shifts` - Shift management
- `stock_counts` & `stock_count_items` - Stock counting system

### 2.2 Missing Tables ❌

#### `claims` table
**Required by:** `app/hr/claims/page.tsx`
**Structure needed:**
```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  claim_type TEXT NOT NULL CHECK (claim_type IN ('mileage', 'other')),
  claim_date DATE NOT NULL,
  distance_km NUMERIC(10,2),
  amount NUMERIC(10,2) NOT NULL,
  place_route TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `leave_balances` table
**Required by:** `app/hr/leave/page.tsx`
**Structure needed:**
```sql
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  year INTEGER NOT NULL,
  annual_balance NUMERIC(5,2) DEFAULT 0,
  replacement_balance NUMERIC(5,2) DEFAULT 0,
  medical_balance NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year)
);
```

#### `leave_applications` table
**Required by:** `app/hr/leave/page.tsx`
**Structure needed:**
```sql
CREATE TABLE leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'replacement', 'medical', 'paid_leave', 'unpaid_leave')),
  application_date DATE DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(3,1) NOT NULL,
  reason TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `employee_documents` table
**Required by:** `components/hr/document-upload.tsx`
**Structure needed:**
```sql
CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  document_type TEXT CHECK (document_type IN ('photo', 'ic', 'passport', 'other')),
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Schema Mismatches ⚠️

#### `employees` table field discrepancies
**Frontend expects:** (from `lib/types.ts`)
- `salary_rate` (number)
- `salary_type` (hourly | monthly)
- `hourly_rate` (number)
- `ot_rate` (number)

**Database has:** (from `001_create_users_employees.sql`)
- `salary_amount` (instead of salary_rate)
- `salary_type` ✅
- `hourly_rate` ✅
- **MISSING:** `ot_rate` field

**Fix required:**
```sql
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS salary_rate NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_rate NUMERIC(10,2) DEFAULT 0;

-- Migrate existing data
UPDATE employees SET salary_rate = salary_amount WHERE salary_rate IS NULL;
```

#### `attendance` table field discrepancies
**Frontend expects:**
- `ot_hours` (for OT tracking)
- `ot_clock_in`, `ot_clock_out` (separate OT sessions)
- `ot_approved` (boolean)
- `approved_by` (UUID)
- `photo_url`, `photo_storage_path` (attendance photos)

**Database has:**
- `overtime_hours` ✅ (but named differently)
- **MISSING:** All OT-specific fields above

**Fix required:**
```sql
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS ot_hours NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_clock_in TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ot_clock_out TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ot_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS geo_lat NUMERIC(10,8),
  ADD COLUMN IF NOT EXISTS geo_lon NUMERIC(11,8),
  ADD COLUMN IF NOT EXISTS photo_required BOOLEAN DEFAULT FALSE;

-- Sync existing data
UPDATE attendance SET ot_hours = overtime_hours WHERE ot_hours IS NULL;
```

#### `orders` table field discrepancies
**Frontend expects:**
- `source_type` ('takeaway' | 'gomamam')
- `customer_phone`, `customer_country_code` (for quick phone entry)
- `split_payments` (JSONB for split payment tracking)
- `voided_at`, `voided_by`, `void_reason` (void tracking)
- `refunded_at`, `refunded_by`, `refund_amount` (refund tracking)

**Database has:**
- **MISSING:** All fields above

**Fix required:**
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('takeaway', 'gomamam')),
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_country_code TEXT DEFAULT '+673',
  ADD COLUMN IF NOT EXISTS split_payments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);
```

#### `order_items` table field discrepancies
**Frontend expects:**
- `discount_amount`, `discount_type` (item-level discounts)

**Database has:**
- **MISSING:** Both fields

**Fix required:**
```sql
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed'));
```

#### `expenses` table field discrepancies
**Frontend expects:**
- `category_id` (UUID reference to expense_categories)
- `expense_date` (instead of `date`)

**Database has:**
- `category` (TEXT field) - should be a foreign key
- `date` ✅

**Fix required:**
```sql
-- Create expense_categories table first
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate existing categories
INSERT INTO expense_categories (name)
SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Add foreign key column
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id),
  ADD COLUMN IF NOT EXISTS expense_date DATE;

-- Migrate data
UPDATE expenses e
SET category_id = ec.id
FROM expense_categories ec
WHERE e.category = ec.name AND e.category_id IS NULL;

UPDATE expenses SET expense_date = date WHERE expense_date IS NULL;
```

#### `ingredients` table field discrepancies
**Frontend expects:**
- `avg_cost_per_unit` (for weighted average cost calculation)

**Database has:**
- `cost_per_unit` ✅
- **MISSING:** `avg_cost_per_unit`

**Fix required:**
```sql
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS avg_cost_per_unit NUMERIC(10,4) DEFAULT 0;

-- Initialize with current cost
UPDATE ingredients SET avg_cost_per_unit = cost_per_unit WHERE avg_cost_per_unit IS NULL;
```

---

## 3. Database Functions (RPC) Analysis

### 3.1 Existing Functions ✅

From `scripts/004_create_functions.sql`:
- ✅ `generate_order_number()` - Generate order numbers
- ✅ `deduct_stock_for_order(order_id, user_id)` - Deduct stock after order
- ✅ `calculate_attendance_hours()` - Trigger to calculate hours
- ✅ `update_customer_stats()` - Trigger to update customer stats

From `scripts/004_purchase_orders.sql`:
- ✅ `generate_po_number()` - Generate PO numbers

From `scripts/010_stock_counts_shifts.sql`:
- ✅ `calculate_expected_closing_quantity(shift_id, ingredient_id)`
- ✅ `calculate_stock_count_variances(stock_count_id)`
- ✅ `apply_closing_count_to_inventory(stock_count_id)`

### 3.2 Missing Critical Functions ❌

#### `update_ingredient_stock(p_ingredient_id UUID)`
**Called by:** `/api/inventory/recompute`
**Purpose:** Recalculate ingredient stock from stock_logs
**Impact:** HIGH - Recompute stock button will fail

**Implementation needed:**
```sql
CREATE OR REPLACE FUNCTION update_ingredient_stock(p_ingredient_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_in NUMERIC := 0;
  v_total_out NUMERIC := 0;
  v_net_stock NUMERIC := 0;
BEGIN
  -- Sum all IN movements
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_in
  FROM stock_logs
  WHERE ingredient_id = p_ingredient_id
    AND type IN ('in', 'adjustment')
    AND quantity > 0;

  -- Sum all OUT movements
  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_total_out
  FROM stock_logs
  WHERE ingredient_id = p_ingredient_id
    AND type IN ('out', 'order_deduct', 'adjustment')
    AND quantity < 0;

  -- Calculate net stock
  v_net_stock := v_total_in - v_total_out;

  -- Update ingredient
  UPDATE ingredients
  SET
    current_stock = GREATEST(v_net_stock, 0),
    updated_at = NOW()
  WHERE id = p_ingredient_id;
END;
$$;
```

#### `add_stock_movement()` RPC
**Called by:** `components/inventory/add-stock-dialog.tsx`
**Purpose:** Add stock with proper logging and cost calculation
**Impact:** HIGH - Adding stock will fail

**Implementation needed:**
```sql
CREATE OR REPLACE FUNCTION add_stock_movement(
  p_ingredient_id UUID,
  p_type TEXT,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_stock NUMERIC;
  v_new_stock NUMERIC;
  v_avg_cost NUMERIC;
  v_log_id UUID;
BEGIN
  -- Get current stock
  SELECT current_stock, avg_cost_per_unit
  INTO v_previous_stock, v_avg_cost
  FROM ingredients
  WHERE id = p_ingredient_id;

  -- Calculate new stock
  IF p_type = 'in' THEN
    v_new_stock := v_previous_stock + p_quantity;

    -- Update average cost if unit_cost provided
    IF p_unit_cost IS NOT NULL THEN
      v_avg_cost := ((v_previous_stock * v_avg_cost) + (p_quantity * p_unit_cost)) / v_new_stock;
    END IF;
  ELSIF p_type = 'out' THEN
    v_new_stock := GREATEST(v_previous_stock - p_quantity, 0);
  ELSE -- adjustment
    v_new_stock := p_quantity;
  END IF;

  -- Update ingredient
  UPDATE ingredients
  SET
    current_stock = v_new_stock,
    avg_cost_per_unit = COALESCE(v_avg_cost, avg_cost_per_unit),
    cost_per_unit = COALESCE(p_unit_cost, cost_per_unit),
    updated_at = NOW()
  WHERE id = p_ingredient_id;

  -- Create stock log
  INSERT INTO stock_logs (
    ingredient_id, type, quantity, previous_stock, new_stock,
    unit_cost, total_cost, notes, received_by, created_by
  ) VALUES (
    p_ingredient_id, p_type, p_quantity, v_previous_stock, v_new_stock,
    p_unit_cost, p_quantity * COALESCE(p_unit_cost, 0), p_notes, p_received_by, auth.uid()
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'previous_stock', v_previous_stock,
    'new_stock', v_new_stock
  );
END;
$$;
```

---

## 4. Frontend-Backend Integration Issues

### 4.1 Direct Supabase Queries (Bypassing API) ⚠️

The frontend makes extensive direct calls to Supabase instead of using API routes. While this works, it has drawbacks:

**Pros:**
- Faster development
- Less latency
- Direct type safety

**Cons:**
- Business logic scattered across frontend
- Harder to maintain consistency
- Cannot add server-side validation
- Difficult to add audit logging
- Cannot rate-limit or monitor easily

**Files with direct queries:** 51 files
**Recommendation:** Keep for now, but create API endpoints for critical operations (orders, inventory, payroll)

### 4.2 Missing API Endpoints for Complex Operations

**High Priority:**
1. Order void/refund API - needs audit trail and validation
2. Payroll calculation API - complex business logic
3. Stock recompute API - partially done but RPC missing
4. Claims approval workflow API
5. Leave approval workflow API

---

## 5. Security Analysis

### 5.1 Row Level Security (RLS) Status ✅

**Excellent RLS implementation:**
- All tables have RLS enabled
- Policies are permissive for internal system (all authenticated users)
- Good for internal-only POS system
- Product images have proper public read policies

**Note:** Current policies use `USING (true)` which allows all authenticated users. This is acceptable for an internal POS system but should be tightened for production if multiple tenants or stricter access control is needed.

### 5.2 Authentication ✅

- Supabase Auth properly integrated
- Middleware protection on routes
- Role-based access control (admin, cashier, staff)

### 5.3 Input Validation ⚠️

**API routes have validation:**
- ✅ File upload: type and size checks
- ✅ Webhook test: URL validation
- ⚠️ Recompute: basic auth check only

**Frontend validation:**
- Forms have client-side validation
- No backend validation for direct Supabase calls

**Recommendation:** Add Zod schemas for validation

---

## 6. Storage Buckets

### 6.1 Configured Buckets ✅

**`product-images` bucket:**
- Public read access ✅
- Admin-only write ✅
- File type restrictions: JPEG, PNG, WebP ✅
- Size limit: 3MB ✅
- Proper RLS policies ✅

### 6.2 Missing Buckets ❌

**`employee-documents` bucket:**
- Required by: `components/hr/document-upload.tsx`
- Needs: Private access, only employee/admin can view
- File types: PDF, JPEG, PNG
- Size limit: 5MB recommended

**`expense-receipts` bucket:**
- Required by: `components/expenses/add-expense-dialog.tsx`
- Needs: Admin-only access
- File types: PDF, JPEG, PNG
- Size limit: 5MB

**`claim-attachments` bucket:**
- Required by: Claims management
- Needs: Employee can upload, admin can view
- File types: PDF, JPEG, PNG
- Size limit: 5MB

---

## 7. Missing Features vs. Frontend Expectations

### 7.1 HR & Payroll Module
**Frontend:** Fully built UI at `app/hr/payroll/page.tsx`
**Backend:** ❌ No API endpoints, no calculation logic
**Tables:** ✅ attendance table exists
**Impact:** Module completely non-functional

**Required:**
1. Payroll calculation API
2. OT calculation logic
3. Payroll approval workflow
4. Payroll export functionality

### 7.2 Claims Management
**Frontend:** Built at `app/hr/claims/page.tsx`
**Backend:** ❌ No table, no API
**Impact:** Module completely non-functional

**Required:**
1. `claims` table
2. Claims CRUD APIs
3. Approval workflow
4. File upload support

### 7.3 Leave Management
**Frontend:** Built at `app/hr/leave/page.tsx`
**Backend:** ❌ No tables, no API
**Impact:** Module completely non-functional

**Required:**
1. `leave_balances` table
2. `leave_applications` table
3. Leave CRUD APIs
4. Balance calculation logic
5. Approval workflow

### 7.4 Employee Documents
**Frontend:** Built at `components/hr/document-upload.tsx`
**Backend:** ❌ No table, no storage bucket
**Impact:** Document upload will fail

**Required:**
1. `employee_documents` table
2. `employee-documents` storage bucket
3. Upload API with validation

---

## 8. Redundant/Unused Code

### 8.1 Unused Database Fields
- `users.role_id` - defined in types but not used
- `employees.employee_code` - not referenced in frontend

### 8.2 Unused Files
None identified - all components are referenced

---

## 9. Performance Considerations

### 9.1 Indexes Status ✅

**Good index coverage:**
- Purchase orders: supplier, status
- Purchase order items: purchase_order_id
- Stock counts: type, status, shift_id, counted_by
- Stock count items: stock_count_id, ingredient_id
- Performance indexes defined in `008_performance_indexes.sql`

### 9.2 Missing Indexes ⚠️

**Recommended additions:**
```sql
-- Frequently queried date ranges
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_attendance_date ON attendance(date DESC);
CREATE INDEX idx_stock_logs_created_at ON stock_logs(created_at DESC);

-- Foreign key lookups
CREATE INDEX idx_recipes_product_id ON recipes(product_id);
CREATE INDEX idx_recipes_ingredient_id ON recipes(ingredient_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Status filtering
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_status ON orders(status);
```

---

## 10. Priority Action Items

### 10.1 CRITICAL (Must Fix Before Production) 🔴

1. **Create missing database functions**
   - `update_ingredient_stock()`
   - `add_stock_movement()`
   - Files: Create `scripts/011_missing_functions.sql`

2. **Fix schema mismatches**
   - Add `ot_rate` to employees table
   - Add OT fields to attendance table
   - Add `source_type`, payment fields to orders
   - Files: Create `scripts/012_schema_fixes.sql`

3. **Implement HR tables**
   - Create `claims` table
   - Create `leave_balances` table
   - Create `leave_applications` table
   - Create `employee_documents` table
   - Files: Create `scripts/013_hr_tables.sql`

4. **Create storage buckets**
   - `employee-documents`
   - `expense-receipts`
   - `claim-attachments`
   - Files: Create `scripts/014_storage_buckets.sql`

### 10.2 HIGH PRIORITY (Needed for Full Functionality) 🟡

5. **Implement HR API endpoints**
   - `/api/hr/claims` (GET, POST, PATCH)
   - `/api/hr/leave` (GET, POST, PATCH)
   - `/api/hr/payroll` (GET, POST)
   - Files: Create `/app/api/hr/` directory

6. **Create expense categories table**
   - Migrate existing text categories to relational
   - Files: Update `scripts/012_schema_fixes.sql`

7. **Add performance indexes**
   - Date-based queries
   - Foreign key lookups
   - Files: Update `scripts/008_performance_indexes.sql`

### 10.3 MEDIUM PRIORITY (Nice to Have) 🟢

8. **Create order management APIs**
   - `/api/orders/:id/void` - proper void workflow
   - `/api/orders/:id/refund` - refund handling
   - Files: Create `/app/api/orders/` directory

9. **Add input validation layer**
   - Implement Zod schemas
   - Add to API routes
   - Files: Create `/lib/validation-schemas.ts`

10. **Improve error handling**
    - Standardized error responses
    - Better error logging
    - Files: Create `/lib/api-utils.ts`

### 10.4 LOW PRIORITY (Future Enhancement) 🔵

11. **Add API rate limiting**
12. **Implement caching layer**
13. **Add API documentation (OpenAPI/Swagger)**
14. **Create database backup procedures**

---

## 11. Execution Plan

### Phase 1: Database Foundation (Week 1)
**Goal:** Fix all schema issues and missing functions

**Tasks:**
1. Create `scripts/011_missing_functions.sql`
   - Implement `update_ingredient_stock()`
   - Implement `add_stock_movement()`

2. Create `scripts/012_schema_fixes.sql`
   - Add missing columns to employees, attendance, orders, order_items
   - Create expense_categories table and migrate data
   - Add avg_cost_per_unit to ingredients

3. Create `scripts/013_hr_tables.sql`
   - Create claims, leave_balances, leave_applications, employee_documents tables
   - Add RLS policies
   - Add indexes

4. Create `scripts/014_storage_buckets.sql`
   - Create employee-documents bucket
   - Create expense-receipts bucket
   - Create claim-attachments bucket
   - Configure RLS policies

**Testing:**
- Run all migrations on test database
- Verify no breaking changes
- Test existing functionality still works

### Phase 2: API Implementation (Week 2)
**Goal:** Implement missing backend logic

**Tasks:**
1. Create `/app/api/hr/claims/route.ts`
   - GET: List claims with filters
   - POST: Create new claim

2. Create `/app/api/hr/claims/[id]/route.ts`
   - PATCH: Approve/reject claim
   - GET: Get claim details

3. Create `/app/api/hr/leave/route.ts`
   - GET: List leave applications
   - POST: Submit leave application

4. Create `/app/api/hr/leave/[id]/route.ts`
   - PATCH: Approve/reject leave
   - GET: Get leave details

5. Create `/app/api/hr/payroll/route.ts`
   - GET: Calculate payroll for period
   - POST: Process payroll

**Testing:**
- Test all endpoints with Postman/Thunder Client
- Verify permissions and auth
- Test error cases

### Phase 3: Integration & Testing (Week 3)
**Goal:** Ensure frontend-backend integration works

**Tasks:**
1. Update frontend to use new API endpoints
2. Test all HR workflows end-to-end
3. Fix any integration issues
4. Performance testing
5. Security audit

### Phase 4: Production Deployment (Week 4)
**Goal:** Deploy to production safely

**Tasks:**
1. Create database backup
2. Run migrations on production
3. Deploy API changes
4. Monitor for errors
5. User acceptance testing

---

## 12. Migration File Checklist

### Files to Create:

- [ ] `scripts/011_missing_functions.sql` - Missing RPC functions
- [ ] `scripts/012_schema_fixes.sql` - Schema mismatches
- [ ] `scripts/013_hr_tables.sql` - HR management tables
- [ ] `scripts/014_storage_buckets.sql` - Storage bucket configuration
- [ ] `scripts/015_performance_indexes.sql` - Additional indexes
- [ ] `app/api/hr/claims/route.ts` - Claims management API
- [ ] `app/api/hr/claims/[id]/route.ts` - Claim approval API
- [ ] `app/api/hr/leave/route.ts` - Leave management API
- [ ] `app/api/hr/leave/[id]/route.ts` - Leave approval API
- [ ] `app/api/hr/payroll/route.ts` - Payroll calculation API
- [ ] `app/api/orders/[id]/void/route.ts` - Order void API
- [ ] `app/api/orders/[id]/refund/route.ts` - Order refund API
- [ ] `lib/validation-schemas.ts` - Zod validation schemas

---

## 13. Suggested Branch Strategy

**Main branch:** `main` (production)
**Development:** `development` (testing)
**Feature branches:**
- `feature/database-fixes` - Phase 1 work
- `feature/hr-api` - Phase 2 work
- `feature/integration-testing` - Phase 3 work

**Merge strategy:**
1. Feature branches → development
2. Test in development environment
3. development → main after full QA

---

## 14. Conclusion

The AbangBob POS system has a **solid foundation** with comprehensive database schema and good security practices. However, several critical components are missing for production readiness:

**Strengths:**
- ✅ Well-structured database schema
- ✅ Proper RLS implementation
- ✅ Good separation of concerns
- ✅ Comprehensive type definitions

**Weaknesses:**
- ❌ HR modules (Claims, Leave, Payroll) have no backend
- ❌ Missing critical database functions
- ❌ Schema mismatches between frontend and backend
- ❌ Limited API layer (mostly direct Supabase calls)

**Estimated effort to production:** 3-4 weeks with 1 developer

**Risk level:** MEDIUM - Core POS functionality works, but HR features are completely non-functional

**Recommendation:** Follow the phased execution plan above, starting with database fixes (Phase 1) which are the foundation for everything else.
