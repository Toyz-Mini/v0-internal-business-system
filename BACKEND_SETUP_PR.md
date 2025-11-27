# Backend Setup - Pull Request

## Overview

This PR introduces a comprehensive backend scaffold with a robust service layer, API endpoints, and database seeding capabilities using Supabase as the data persistence layer.

## Changes Summary

### 1. API Health & Status Endpoints

#### `/api/health` - Health Check Endpoint
Returns application health status with database connectivity check.

**Response:**
```json
{
  "ok": true,
  "version": "1.0.0-dev",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

**Test with curl:**
```bash
curl http://localhost:3000/api/health
```

#### `/api/db-status` - Database Status Endpoint
Returns detailed database status including table counts.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "database": {
    "connected": true,
    "tables": {
      "categories": 3,
      "products": 5,
      "ingredients": 5,
      "modifier_groups": 2,
      "modifier_options": 5,
      "orders": 0,
      "customers": 0
    }
  },
  "summary": {
    "totalTables": 14,
    "successfulQueries": 14,
    "failedQueries": 0
  }
}
```

**Test with curl:**
```bash
curl http://localhost:3000/api/db-status
```

### 2. Service Layer

Created comprehensive service modules with full CRUD operations:

- **CategoryService** (`services/category.service.ts`)
  - `getAll()`, `getById()`, `getActive()`
  - `create()`, `update()`, `delete()`

- **ProductService** (`services/product.service.ts`)
  - `getAll()`, `getById()`, `getByCategory()`, `getAvailable()`
  - `create()`, `update()`, `delete()`, `search()`

- **ModifierService** (`services/modifier.service.ts`)
  - `getAllGroups()`, `getGroupById()`, `getGroupWithOptions()`
  - `getOptionsByGroup()`, `createGroup()`, `createOption()`
  - `updateGroup()`, `updateOption()`, `deleteGroup()`, `deleteOption()`

- **InventoryService** (`services/inventory.service.ts`)
  - `getAllIngredients()`, `getIngredientById()`, `getLowStock()`
  - `createIngredient()`, `updateIngredient()`, `updateStock()`
  - `getStockLogs()`, `deductStockForOrder()`

- **OrderService** (`services/order.service.ts`)
  - `getAll()`, `getById()`, `getWithItems()`, `getOrderItems()`
  - `create()` - **Transactional with inventory deduction**
  - `updateStatus()`, `updatePaymentStatus()`, `cancelOrder()`
  - `getByDateRange()`, `getRevenueStats()`

- **CustomerService** (`services/customer.service.ts`)
  - `getAll()`, `getById()`, `getActive()`
  - `create()`, `update()`, `delete()`, `search()`
  - `getTopCustomers()`, `getCustomerOrders()`, `updateCustomerStats()`

### 3. Transactional Order Creation

The `OrderService.create()` method implements a complete transaction that:
1. Creates the order record
2. Creates all order items
3. Fetches product recipes
4. Automatically deducts ingredient stock
5. Creates stock movement logs

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "order_type": "dine-in",
    "table_number": "5",
    "items": [
      {
        "product_id": "product-uuid-here",
        "product_name": "Ayam Gunting Original",
        "quantity": 2,
        "unit_price": 18.90,
        "notes": "Extra spicy"
      }
    ],
    "payment_method": "cash"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order-uuid",
      "order_number": "ORD-1234567890-ABC123",
      "status": "pending",
      "total_amount": 40.07,
      "subtotal": 37.80,
      "tax_amount": 2.27
    },
    "items": [...]
  }
}
```

### 4. Zod Validation

All API inputs are validated using Zod schemas (`lib/validations/api.validation.ts`):

- `createCategorySchema`, `updateCategorySchema`
- `createProductSchema`, `updateProductSchema`
- `createModifierGroupSchema`, `createModifierOptionSchema`
- `createIngredientSchema`, `updateIngredientSchema`
- `updateStockSchema`
- `createCustomerSchema`, `updateCustomerSchema`
- `createOrderSchema`, `updateOrderStatusSchema`, `updatePaymentStatusSchema`

**Validation Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Price must be positive"
}
```

### 5. Database Seeding

Created comprehensive seed script (`scripts/seed.ts`) that inserts:
- 3 menu categories (Main Dishes, Beverages, Sides)
- 5 menu items (Ayam Gunting varieties, drinks)
- 2 modifier groups (Spice Level, Add-ons)
- 5 modifier options
- 5 inventory items (ingredients)

**Run seed:**
```bash
npm install
npm run seed
```

**Expected Output:**
```
Starting database seed...
Step 1: Seeding categories...
Created 3 categories
Step 2: Seeding modifier groups...
Created 2 modifier groups
Step 3: Seeding modifier options...
Created 5 modifier options
Step 4: Seeding products...
Created 5 products
Step 5: Seeding ingredients...
Created 5 ingredients
Database seed completed successfully!
```

### 6. Order API Endpoints

#### `POST /api/orders` - Create Order
Creates a new order with automatic inventory deduction.

#### `GET /api/orders` - List Orders
Retrieves all orders with optional limit parameter.

**Query Parameters:**
- `limit` (optional): Number of orders to return (default: 100)

**Test:**
```bash
curl http://localhost:3000/api/orders?limit=10
```

#### `GET /api/orders/[id]` - Get Order Details
Retrieves a specific order with all items.

**Test:**
```bash
curl http://localhost:3000/api/orders/order-uuid-here
```

#### `PATCH /api/orders/[id]` - Update Order
Updates order status or payment status.

**Update Status:**
```bash
curl -X PATCH http://localhost:3000/api/orders/order-uuid-here \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

**Update Payment:**
```bash
curl -X PATCH http://localhost:3000/api/orders/order-uuid-here \
  -H "Content-Type: application/json" \
  -d '{"payment_status": "paid", "payment_method": "credit_card"}'
```

### 7. Environment Configuration

Created `.env.example` documenting all required environment variables:
- Supabase configuration
- Application environment
- Git information
- Optional webhook, printer, storage settings
- Feature flags

## New Dependencies

- `tsx` (v4.7.0) - TypeScript execution for seed script

## Files Added

### API Routes
- `app/api/health/route.ts`
- `app/api/db-status/route.ts`
- `app/api/orders/route.ts`
- `app/api/orders/[id]/route.ts`

### Services
- `services/category.service.ts`
- `services/product.service.ts`
- `services/modifier.service.ts`
- `services/inventory.service.ts`
- `services/order.service.ts`
- `services/customer.service.ts`

### Validation
- `lib/validations/api.validation.ts`

### Scripts
- `scripts/seed.ts`

### Configuration
- `.env.example`

## Testing Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure Supabase credentials:
```bash
cp .env.example .env
```

### 3. Run Database Seed
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Database Status:**
```bash
curl http://localhost:3000/api/db-status
```

**List Orders:**
```bash
curl http://localhost:3000/api/orders
```

**Create Order (replace UUIDs with real ones from seed):**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "order_type": "takeaway",
    "items": [
      {
        "product_id": "get-from-db-status",
        "product_name": "Ayam Gunting Original",
        "quantity": 1,
        "unit_price": 18.90
      }
    ],
    "payment_method": "cash"
  }'
```

### 6. Verify Build
```bash
npm run build
```

Expected: Successful build with no TypeScript errors.

## Postman Collection

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Restaurant POS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/health"
      }
    },
    {
      "name": "Database Status",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/db-status"
      }
    },
    {
      "name": "Create Order",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/orders",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"order_type\": \"dine-in\",\n  \"items\": [\n    {\n      \"product_id\": \"{{productId}}\",\n      \"product_name\": \"Test Product\",\n      \"quantity\": 1,\n      \"unit_price\": 10.00\n    }\n  ],\n  \"payment_method\": \"cash\"\n}"
        }
      }
    },
    {
      "name": "List Orders",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/orders"
      }
    },
    {
      "name": "Get Order Details",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/orders/{{orderId}}"
      }
    },
    {
      "name": "Update Order Status",
      "request": {
        "method": "PATCH",
        "url": "{{baseUrl}}/api/orders/{{orderId}}",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"status\": \"completed\"\n}"
        }
      }
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:3000"}
  ]
}
```

## Architecture Highlights

1. **Service Layer Pattern**: Business logic is separated into dedicated service classes
2. **Type Safety**: Full TypeScript support with Zod validation
3. **Transaction Safety**: Order creation includes automatic inventory deduction
4. **Error Handling**: Comprehensive error responses with proper HTTP status codes
5. **Supabase Integration**: Leverages existing Supabase setup
6. **Scalability**: Service layer can be easily extended for new features

## Next Steps

Future enhancements could include:
- Additional API endpoints (categories, products, customers)
- Pagination for list endpoints
- Advanced filtering and sorting
- Rate limiting and authentication middleware
- API documentation with Swagger/OpenAPI
- Webhook integration for order events
- Real-time order updates using Supabase subscriptions

## Build Status

Build completed successfully with no errors or warnings.
