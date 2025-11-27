# QA Test Matrix

## Smoke Test Checklist

### 1. Authentication Module

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Admin Login | Enter admin@abangbob.com / Admin123! | Redirect to /dashboard | |
| Cashier Login | Enter cashier@abangbob.com / Cashier123! | Redirect to /dashboard | |
| Invalid Login | Enter wrong password | Show error message | |
| Session Persist | Refresh page after login | Stay logged in | |
| Logout | Click logout button | Redirect to /auth/login | |

### 2. POS Module

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| View Products | Navigate to /pos | Products grid displayed | |
| Add to Cart | Click product | Item added to cart | |
| Update Quantity | Click +/- buttons | Quantity updates | |
| Add Modifier | Select product modifier | Modifier applied, price adjusted | |
| Apply Discount | Add percentage/fixed discount | Total recalculated | |
| Cash Payment | Complete order with cash | Order created, receipt shown | |
| Split Payment | Pay with multiple methods | All payments recorded | |
| Stock Deduction | Complete order | Ingredient stock reduced | |
| View History | Click "Sejarah" button | Order history displayed | |
| Void Order (Admin) | Void completed order | Order status = voided, stock restored | |
| Void Order (Cashier) | Void order > 10 min | Show "not allowed" error | |

### 3. Inventory Module

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| View Inventory | Navigate to /inventory | Ingredients list displayed | |
| Add Stock | Use "Add Stock" dialog | Stock increased, log created | |
| Stock Out | Deduct stock manually | Stock decreased, log created | |
| Low Stock Alert | Set stock below min | Alert shown on dashboard | |
| View Stock Logs | Click ingredient → logs | History displayed | |
| Create PO | Create purchase order | PO saved as draft | |
| Receive Stock | Mark PO as received | Stock updated from PO | |

### 4. HR/Attendance Module

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Clock In | Select employee, click Clock In | Attendance recorded with GPS | |
| Clock Out | Click Clock Out | Total hours calculated | |
| View History | Check attendance history | Records displayed | |
| Late Detection | Clock in after 9 AM | Marked as late | |
| Overtime Calc | Work > 8 hours | Overtime hours shown | |
| Payroll Report | Generate payroll | Summary with deductions | |
| Export CSV | Export attendance | CSV file downloaded | |

### 5. Analytics Module

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Dashboard Load | Navigate to /dashboard | Stats displayed < 2s | |
| Sales Overview | View reports page | Charts rendered | |
| Date Filter | Change date range | Data filtered correctly | |
| Cashier Filter | Select specific cashier | Sales filtered | |
| Export Report | Click export button | CSV downloaded | |
| Product Performance | View product stats | Top sellers shown | |

### 6. Accounting Module

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Add Expense | Create new expense | Expense saved | |
| View P&L | Check profit/loss card | Revenue - Expenses shown | |
| Category Filter | Filter by category | Expenses filtered | |
| Date Filter | Filter by date range | Expenses filtered | |

### 7. Security Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| RLS - Cashier Write | Cashier try update user | Error: permission denied | |
| RLS - Staff Write | Staff try create product | Error: permission denied | |
| XSS Prevention | Enter `<script>` in input | HTML escaped | |
| Session Timeout | Wait 1 hour inactive | Redirect to login | |
| Audit Log | Void order as admin | Entry in audit_logs | |

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Login time | < 1s | |
| POS page load | < 500ms | |
| Order creation | < 200ms | |
| Dashboard load | < 2s | |
| Report generation | < 3s | |
| Stock deduction | < 100ms | |

## Known Issues & Fixes

| Issue | Status | Fix ETA |
|-------|--------|---------|
| - | - | - |

## QA Toggles

### Reset Test Data

\`\`\`sql
-- Clear orders (development only!)
TRUNCATE orders CASCADE;
TRUNCATE stock_logs;

-- Reset stock to defaults
UPDATE ingredients SET current_stock = 100;
\`\`\`

### Create Test User

\`\`\`sql
-- Create via Supabase Auth first, then:
INSERT INTO public.users (id, email, name, role)
VALUES ('AUTH_USER_ID', 'test@test.com', 'Test User', 'cashier');
