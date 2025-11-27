# AbangBob Internal Business System - Changelog v1.0

## Release Date: 26 November 2025

---

## Production URLs
- **Production**: https://v0-internal-business-system.vercel.app
- **Login Page**: https://v0-internal-business-system.vercel.app/auth/login

---

## QA Account Credentials

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@abangbob.com | Admin123! | Admin | Full access semua modules |
| cashier@abangbob.com | Cashier123! | Cashier | POS, attendance only |
| staff@abangbob.com | Staff123! | Staff | Limited access |

---

## Database Summary

### Tables (22 total)
| Table | Rows | RLS |
|-------|------|-----|
| users | 3 | Enabled |
| categories | 4 | Enabled |
| products | 10 | Enabled |
| ingredients | 14 | Enabled |
| recipes | 23 | Enabled |
| modifier_groups | 3 | Enabled |
| modifiers | 7 | Enabled |
| suppliers | 3 | Enabled |
| expense_categories | 7 | Enabled |
| settings | 1 | Disabled (public read) |
| orders | 0 | Enabled |
| order_items | 0 | Enabled |
| attendance | 0 | Enabled |
| expenses | 0 | Enabled |
| customers | 0 | Enabled |
| employees | 0 | Enabled |
| stock_logs | 0 | Enabled |
| audit_logs | 0 | Enabled |
| purchase_orders | 0 | Enabled |
| purchase_order_items | 0 | Enabled |
| modifier_options | 0 | Enabled |
| product_modifiers | 0 | Enabled |

---

## Modules Delivered

### A. POS System
- [x] Product grid dengan categories
- [x] Search bar untuk cari produk
- [x] Cart dengan quantity update
- [x] Item-level discount dan notes
- [x] Order-level discount
- [x] Modifiers support
- [x] Payment flows: Cash, QR Pay, Bank Transfer
- [x] Split payment support
- [x] Change calculator
- [x] Stock deduction via recipes (automatic)
- [x] Order history dengan filter
- [x] Void/Refund dengan window check (10 min untuk cashier)
- [x] Receipt printing (thermal format)
- [x] Double-tap prevention
- [x] Network status indicator
- [x] Mobile-responsive UI

### B. Inventory Management
- [x] Ingredients list dengan stock levels
- [x] Low stock alerts
- [x] Manual stock adjustment
- [x] Stock logs dengan reference tracking
- [x] Recipe management (product-ingredient mapping)
- [x] Purchase Orders (create, receive, cancel)
- [x] Supplier management

### C. HR Module
- [x] Clock in/out dengan GPS location
- [x] Attendance history
- [x] Payroll calculation (overtime, late penalty)
- [x] Malaysian statutory deductions (EPF, SOCSO, EIS)
- [x] Attendance approval (manager)
- [x] CSV export untuk payroll

### D. Analytics Dashboard
- [x] Date range filter
- [x] Cashier filter
- [x] Total sales, COGS, Gross Profit, Net Profit
- [x] Top products visualization
- [x] Payment methods breakdown
- [x] Daily breakdown table
- [x] CSV export

### E. Accounting
- [x] Expense tracking
- [x] Expense categories
- [x] P&L view
- [x] Date filtering

### F. Integrations
- [x] Webhook system (order events, inventory alerts)
- [x] Business settings (receipt template)
- [x] WhatsApp export untuk customers

### G. Settings
- [x] Business info configuration
- [x] Receipt template customization
- [x] Webhook URL configuration

---

## Security Fixes Applied (26 Nov 2025)

1. **Function search_path** - Fixed all functions to use `SET search_path = public`:
   - `audit_employee_changes()`
   - `audit_order_changes()`
   - `audit_stock_changes()`
   - `generate_order_number()`
   - `generate_po_number()`

2. **Missing Indexes Added**:
   - `idx_modifier_options_group_id`
   - `idx_modifiers_group_id`
   - `idx_product_modifiers_modifier_group_id`
   - `idx_purchase_order_items_ingredient_id`
   - `idx_purchase_order_items_po_id`
   - `idx_audit_logs_table_name`
   - `idx_audit_logs_created_at`

3. **Auth Fix** - Fixed `auth.identities` and `auth.users` NULL column issue yang menyebabkan "Database error querying schema"

---

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| 001_create_tables.sql | Core tables | Applied |
| 002_rls_policies.sql | RLS policies | Applied |
| 003_seed_data.sql | Initial data | Applied |
| 004_purchase_orders.sql | PO tables | Applied |
| 005_modifier_options.sql | Modifier tables | Applied |
| 006_employees_table.sql | Employees table | Applied |
| 007_settings_table.sql | Settings table | Applied |
| 008_performance_indexes.sql | Performance indexes | Applied |
| 009_audit_logs.sql | Audit logging | Applied |

---

## Environment Variables Configured

All required environment variables are set:
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `POSTGRES_URL` / `POSTGRES_PRISMA_URL`

---

## Sane Defaults Implemented

| Feature | Default Value | Notes |
|---------|---------------|-------|
| Void Window | 10 minutes | Cashier boleh void dalam 10 min, Admin unlimited |
| Overtime Threshold | 8 hours | Lebih dari 8 jam dikira OT |
| OT Rate Multiplier | 1.5x | Standard Malaysian rate |
| EPF Rate | 11% | Employee contribution |
| SOCSO Rate | 0.5% | Employee contribution |
| EIS Rate | 0.2% | Employee contribution |
| Late Penalty | RM 10/day | Configurable |
| Receipt Width | 80mm | Thermal printer standard |
| Submit Guard Delay | 2 seconds | Prevent double-tap |
| Network Timeout | 30 seconds | Order creation timeout |

---

## Known Limitations

1. **Offline Mode** - System requires internet connection. Offline banner will show when disconnected.
2. **Receipt Printing** - Uses browser print dialog. Hardware receipt printer integration requires additional setup.
3. **WhatsApp** - Export only, not direct send (requires WhatsApp Business API for direct messaging).
4. **Backups** - Supabase provides daily backups. Manual backup export available via dashboard.

---

## Post-Go-Live Checklist

- [ ] Verify login dengan semua 3 accounts
- [ ] Create test order di POS
- [ ] Verify stock deduction dalam Inventory
- [ ] Test void order (within 10 min)
- [ ] Test clock in/out
- [ ] Check reports match orders
- [ ] Setup custom domain (if applicable)
- [ ] Enable 2FA untuk admin accounts (Supabase dashboard)

---

## Support

For issues or questions:
- Vercel Support: vercel.com/help
- Supabase Dashboard: supabase.com/dashboard

---

**Deployed by**: v0 Team
**Version**: 1.0.0
**Date**: 26 November 2025
