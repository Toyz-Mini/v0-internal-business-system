# Database Schema Documentation

## Entity Relationship Diagram

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │     │  employees  │     │  attendance │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ user_id(FK) │     │ id (PK)     │
│ email       │     │ id (PK)     │◄────│ employee_id │
│ name        │     │ name        │     │ clock_in    │
│ role        │     │ position    │     │ clock_out   │
│ is_active   │     │ salary_rate │     │ location    │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ categories  │     │  products   │     │   recipes   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ category_id │     │ id (PK)     │
│ name        │     │ id (PK)     │◄────│ product_id  │
│ sort_order  │     │ name        │     │ ingredient_ │
└─────────────┘     │ price       │     │ qty_per_unit│
                    │ cost        │     └─────────────┘
                    └─────────────┘            │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  suppliers  │     │ ingredients │     │ stock_logs  │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ supplier_id │◄────│ingredient_id│
│ name        │     │ id (PK)     │     │ id (PK)     │
│ contact     │     │ name        │     │ type        │
└─────────────┘     │ current_stk │     │ quantity    │
                    │ min_stock   │     │ prev/new_stk│
                    └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  customers  │     │   orders    │     │ order_items │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ customer_id │     │ id (PK)     │
│ name        │     │ id (PK)     │◄────│ order_id    │
│ phone       │     │ order_number│     │ product_id  │
│ total_spent │     │ total       │     │ quantity    │
└─────────────┘     │ payment_mthd│     │ modifiers   │
                    │ cashier_id  │     └─────────────┘
                    └─────────────┘

┌─────────────┐     ┌─────────────┐
│ expense_cat │     │  expenses   │
├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ category_id │
│ name        │     │ id (PK)     │
└─────────────┘     │ amount      │
                    │ description │
                    │ expense_date│
                    └─────────────┘
\`\`\`

## Tables Description

### Core Tables

| Table | Description | RLS Policies |
|-------|-------------|--------------|
| `users` | System users (linked to auth.users) | Admin-only write, all read |
| `employees` | Employee details, salary info | Admin-only write, all read |
| `products` | Menu items with price/cost | Admin-only write, all read |
| `categories` | Product categories | Admin-only write, all read |
| `ingredients` | Raw materials/inventory | Admin-only write, all read |
| `recipes` | Product-ingredient mappings | Admin-only write, all read |

### Transactional Tables

| Table | Description | RLS Policies |
|-------|-------------|--------------|
| `orders` | Sales transactions | Cashier/admin insert, all read |
| `order_items` | Order line items | Cashier/admin insert, all read |
| `stock_logs` | Inventory movement history | Admin write, all read |
| `attendance` | Clock in/out records | All insert, all read |
| `expenses` | Business expenses | Admin write, all read |

### Reference Tables

| Table | Description |
|-------|-------------|
| `suppliers` | Vendor/supplier info |
| `customers` | Customer CRM data |
| `modifier_groups` | Modifier categories (e.g., "Pedas Level") |
| `modifiers` | Individual modifiers (e.g., "Pedas", "Tak Pedas") |
| `expense_categories` | Expense categories |
| `audit_logs` | Security audit trail |

## Key Relationships

1. **Product → Recipe → Ingredient**: Products have recipes that define which ingredients are consumed
2. **Order → Order Items → Product**: Orders contain line items referencing products
3. **Employee → Attendance**: Employees clock in/out daily
4. **Stock Logs**: All inventory changes are logged with reference to source (order, manual, purchase)

## Database Functions

| Function | Purpose |
|----------|---------|
| `generate_order_number()` | Creates unique order numbers (ORD-YYYYMMDD-XXXX) |
| `deduct_stock_for_order()` | Reduces ingredient stock based on recipes |
| `restore_stock_for_void()` | Restores stock when order is voided |
| `log_audit_event()` | Records audit trail entries |

## Indexes

See `scripts/008_performance_indexes.sql` for all performance indexes.
