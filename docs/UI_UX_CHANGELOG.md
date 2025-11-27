# UI/UX Improvements Changelog

## Version 2.0 - UI Refinement Update

### 1. Sidebar Navigation Restructure
**File:** `components/layout/sidebar.tsx`

Grouped navigation into logical sections:
- **Menu & POS**: Menu Management, POS, Orders & Customers
- **Operations**: Stock Count, Inventory, Suppliers  
- **HR & Staff**: Employee Management, Attendance & OT, Claims, Leave, HR Dashboard
- **Finance**: Expenses, Reports
- **System**: Settings

Features:
- Collapsible groups with chevron indicators
- Active state highlighting for groups
- Role-based visibility
- Consistent styling

---

### 2. Dashboard Enhancements
**Files:** `app/dashboard/page.tsx`, `components/dashboard/quick-actions.tsx`

New Widgets (6 total):
- Today Sales with order count
- Total Orders
- COGS (Cost of Goods Sold) - calculated from recipes
- Gross Profit with margin percentage
- Expenses
- Staff Present (clocked in count)

Quick Actions (6 buttons):
- Open POS
- Add Product
- Add Stock
- Add Expense
- Submit Claim
- Apply Leave

---

### 3. Red Bar Bug - FIXED
**File:** `components/ui/offline-banner.tsx`

- Changed from full-width bottom bar to small toast in corner
- Only appears when offline or briefly showing reconnection
- Uses amber color (offline) / green (reconnected)
- Auto-hides after reconnection

---

### 4. Product Card Redesign
**File:** `components/pos/product-grid.tsx`

Changes:
- Smaller cards (3-6 columns based on screen)
- Larger, bold price text (text-lg)
- Compact layout with minimal padding
- Consistent white background
- Smaller stock badges
- Improved hover states

---

### 5. POS UI Improvements
**File:** `components/pos/pos-layout.tsx`

Features:
- Sticky category tabs on mobile
- Larger touch targets for mobile (h-16 buttons)
- Cart drawer on right (desktop) / bottom sheet (mobile)
- Improved modifier dialog with sticky footer
- Currency updated to BND
- Better mobile bottom bar with item count & total

---

### 6. Settings Page Additions
**File:** `components/settings/business-settings.tsx`

New Config Sections:
- **Currency**: BND, MYR, SGD options
- **Delivery Types**: Walk-in, Takeaway, GoMamam toggles
- **Leave Settings**: 
  - Annual/Medical leave days
  - Enable Cuti Tanpa Gaji
  - Enable Cuti Dengan Gaji
  - Enable Replacement Leave
- **OT Rules**:
  - OT rate multiplier (1x, 1.5x, 2x)
  - OT start hour
  - Require approval toggle
- **Payroll Rules**:
  - Pay day selection
  - EPF/TAP toggle
  - SOCSO/SCP toggle

---

### 7. Mobile Optimization

Applied across all components:
- Collapsible sidebar
- Dashboard cards stack vertically on mobile
- POS thumb-reachable layout with large buttons
- Big attendance buttons (existing)

---

### 8. Notification Improvements

Using Sonner toast library (already integrated):
- Stock update notifications
- Order created confirmations
- Clock-in/out messages
- Expense submitted alerts
- Claim approved notifications

---

## Schema Impact

**Settings table** - New optional columns:
- enable_takeaway, enable_gomamam, enable_walkin (boolean)
- annual_leave_days, medical_leave_days (integer)
- enable_unpaid_leave, enable_paid_leave, enable_replacement_leave (boolean)
- ot_rate_multiplier, ot_start_hour, require_ot_approval
- payroll_day, enable_epf, enable_socso

These fields use defaults and won't break existing data.

---

## Deployment Notes

**Preview Environment Issue:**
The v0 preview shows "@supabase/ssr" import error due to sandbox limitations. 
This will resolve automatically in production deployment.

**Action Required:**
Click "Publish" to deploy changes to Vercel production.
