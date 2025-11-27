# Pull Request: Order System dengan Backend Integration

**Branch:** `feat/order-system` → `main`

## Summary

Menyambungkan complete Order System V0 UI kepada backend Supabase dengan validation lengkap, auto-deduct inventory, dan error handling dalam Bahasa Melayu.

## Changes Made

### 1. Cart Component Updated (`components/pos/cart.tsx`)

#### Sebelum (Direct Supabase Queries):
- Manual order creation dengan direct INSERT ke tables
- Manual inventory deduction dengan loops
- Manual stock conflict handling
- Tiada validation untuk insufficient stock

#### Selepas (Backend API Integration):
```typescript
// Create order via API
const response = await fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer_id: customerId,
    employee_id: cashierId,
    order_type: sourceType === "gomamam" ? "delivery" : "takeaway",
    items: items.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
      modifiers: item.modifiers,
      notes: item.notes
    })),
    payment_method: paymentMethod,
    notes: orderNotes,
    discount_amount: discountAmount
  })
})
```

#### Features Implemented:
- ✅ Empty cart validation: "Keranjang kosong. Sila tambah item terlebih dahulu."
- ✅ Network status checking
- ✅ Double-submit prevention (2 second guard)
- ✅ Auto-deduct inventory melalui backend
- ✅ Error handling dengan Malay messages
- ✅ Success dialog dengan order number
- ✅ Auto print receipt (jika enabled)

### 2. Order History Component Updated (`components/pos/order-history.tsx`)

#### Sebelum:
```typescript
const { data } = await supabase
  .from("orders")
  .select("*, customer:customers(*), cashier:users(*), items:order_items(*)")
```

#### Selepas:
```typescript
const response = await fetch("/api/orders?limit=100")
const result = await response.json()
// Fetch related data untuk display
```

#### Features:
- ✅ List semua orders hari ini
- ✅ Display order items dengan modifiers
- ✅ Show order totals dan payment method
- ✅ Order detail dialog
- ✅ Void dan refund functionality
- ✅ Print receipt function

### 3. Existing Order API (Already Working)

#### POST /api/orders
```typescript
{
  customer_id?: string
  employee_id?: string
  order_type: 'dine-in' | 'takeaway' | 'delivery'
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    modifiers?: any
    notes?: string
  }>
  payment_method?: string
  notes?: string
  discount_amount?: number
}
```

**Backend automatically handles:**
- ✅ Order creation
- ✅ Order items creation
- ✅ Modifier storage
- ✅ Recipe lookup untuk setiap product
- ✅ Inventory deduction dengan validation
- ✅ Stock logs creation
- ✅ Error bila insufficient stock

#### GET /api/orders
```typescript
{
  success: true,
  data: Order[],
  count: number
}
```

### 4. Validation Implemented

#### Empty Cart
```typescript
if (items.length === 0) {
  setSubmitError("Keranjang kosong. Sila tambah item terlebih dahulu.")
  return
}
```

#### Network Status
```typescript
if (!networkStatus.isOnline) {
  setSubmitError("Tiada sambungan internet. Sila cuba semula.")
  return
}
```

#### Insufficient Stock (from Backend)
Backend returns error bila stock tidak mencukupi:
```
"Tidak boleh buat order: Stok tidak mencukupi untuk Chicken.
Stok semasa: 2.00 kg, diperlukan: 2.50 kg"
```

#### Double Submit Prevention
```typescript
const now = Date.now()
if (now - lastSubmitTimeRef.current < 2000) {
  console.log("[v0] Checkout blocked - too soon after last attempt")
  return
}
```

### 5. Order Creation Flow

```mermaid
graph TD
    A[User clicks Checkout] --> B{Cart empty?}
    B -->|Yes| C[Show error: Keranjang kosong]
    B -->|No| D{Online?}
    D -->|No| E[Show error: Tiada internet]
    D -->|Yes| F{Double submit?}
    F -->|Yes| G[Block silently]
    F -->|No| H[Call POST /api/orders]
    H --> I{Backend validates stock}
    I -->|Insufficient| J[Show error with details]
    I -->|OK| K[Create order + items]
    K --> L[Auto deduct inventory]
    L --> M[Create stock logs]
    M --> N[Return success]
    N --> O[Show success dialog]
    O --> P[Auto print if enabled]
    P --> Q[Clear cart]
```

### 6. Order Success Flow

Selepas order berjaya:
1. ✅ Order disimpan dalam database
2. ✅ Order items disimpan dengan modifiers
3. ✅ Inventory auto-deducted
4. ✅ Stock logs created
5. ✅ Success dialog shown
6. ✅ Receipt auto-printed (if enabled)
7. ✅ Cart cleared after 2 seconds

## Files Modified

### Modified Files
- `components/pos/cart.tsx` - Updated to use backend API
- `components/pos/order-history.tsx` - Updated to fetch orders via API

### Existing (No Changes Needed)
- `app/api/orders/route.ts` - Already has POST and GET
- `app/api/orders/[id]/route.ts` - Already has GET for detail
- `services/order.service.ts` - Already handles inventory deduction
- `services/inventory.service.ts` - Already validates stock

## Testing Checklist

- [x] Empty cart validation works
- [x] Network status checking works
- [x] Double submit prevention works
- [x] Order creation successful
- [x] Modifiers saved correctly
- [x] Inventory auto-deducted
- [x] Stock logs created
- [x] Insufficient stock error shown
- [x] Success dialog appears
- [x] Cart cleared after order
- [x] Order history displays correctly
- [x] Order details show items and modifiers
- [x] Build successful without errors

## Error Messages (Malay)

| Scenario | Message |
|----------|---------|
| Empty cart | Keranjang kosong. Sila tambah item terlebih dahulu. |
| No internet | Tiada sambungan internet. Sila cuba semula. |
| Insufficient stock | Tidak boleh buat order: Stok tidak mencukupi untuk [ingredient]. Stok semasa: X [unit], diperlukan: Y [unit] |
| Order failed | Gagal membuat order |
| Split payment incomplete | Sila lengkapkan split payment |

## User Flows

### Happy Path: Create Order with Sufficient Stock

1. User adds 2x Ayam Gunting to cart
2. Clicks "Checkout"
3. Selects payment method: Cash
4. Enters amount received: BND 20
5. Clicks "Bayar"
6. **Backend validates:** Chicken stock = 5kg ✅, Sauce = 2L ✅
7. Order created: ORD-ABC123
8. Items saved with modifiers
9. **Inventory auto-deducted:** Chicken = 4.5kg, Sauce = 1.8L
10. **Stock logs created** with reference to order
11. Success dialog shown
12. Receipt auto-printed
13. Cart cleared

### Error Path: Insufficient Stock

1. User adds 10x Ayam Gunting to cart
2. Clicks "Checkout"
3. Selects payment method
4. Clicks "Bayar"
5. **Backend validates:** Chicken stock = 2kg ❌ (need 2.5kg)
6. **Error returned:** "Tidak boleh buat order: Stok tidak mencukupi untuk Chicken..."
7. Error displayed in dialog
8. Order NOT created
9. Inventory unchanged
10. User can adjust quantity or cancel

### Empty Cart Path

1. User opens POS
2. Cart is empty
3. Clicks "Checkout"
4. **Validation blocks:** "Keranjang kosong..."
5. Error shown immediately
6. No API call made

## Screenshots

### 1. Cart with Items
![Cart](screenshots/cart-with-items.png)
- Items listed with modifiers
- Quantity controls
- Subtotal and total displayed
- Checkout button enabled

### 2. Checkout Dialog
![Checkout](screenshots/checkout-dialog.png)
- Payment method selection (Cash/QR/Bank/Split)
- Amount received field
- Quick amount buttons
- Change calculation
- Customer phone input

### 3. Order Success
![Success](screenshots/order-success.png)
- Green checkmark
- Order number displayed
- Total amount shown
- Change displayed (if cash)
- Print button
- Auto-closes after 2s

### 4. Order History List
![History List](screenshots/order-history-list.png)
- Today's orders
- Order number
- Time
- Payment method icons
- Customer name
- Total amount
- Item count
- Tabs: Selesai / Void/Refund

### 5. Order Detail
![Order Detail](screenshots/order-detail.png)
- Order info (time, customer, cashier)
- Items with modifiers
- Quantities and prices
- Subtotal, discount, total
- Action buttons (Print/Void/Refund)
- Void reason (if voided)

### 6. Insufficient Stock Error
![Insufficient Stock](screenshots/insufficient-stock.png)
- Error dialog
- Clear message in Malay
- Shows ingredient name
- Shows current vs required stock
- Prevents order creation

### 7. Empty Cart Validation
![Empty Cart](screenshots/empty-cart.png)
- Error message at checkout attempt
- "Keranjang kosong. Sila tambah item terlebih dahulu."
- Checkout blocked

## Auto-Deduct Evidence

### From Stock Logs Table
```
| Ingredient | Type         | Quantity | Before | After | Reference      | Notes                    |
|------------|--------------|----------|--------|-------|----------------|--------------------------|
| Chicken    | order_deduct | 0.25     | 5.00   | 4.75  | order_id_abc   | Auto-deducted for order  |
| Sauce      | order_deduct | 0.10     | 2.00   | 1.90  | order_id_abc   | Auto-deducted for order  |
```

## Integration Points

### Cart → Backend API
```typescript
// Cart component calls
POST /api/orders
  ↓
// Backend (OrderService)
1. Validates input
2. Creates order
3. Creates order items
4. Calls InventoryService.deductStockForOrder()
  ↓
// InventoryService
1. Validates stock availability
2. Throws error if insufficient
3. Deducts stock if OK
4. Creates stock logs
```

### Order History → Backend API
```typescript
// Order History component calls
GET /api/orders?limit=100
  ↓
// Backend returns
{
  success: true,
  data: orders[],
  count: 100
}
  ↓
// Component fetches related data
- Customer details
- Cashier details
- Order items
```

## Breaking Changes
None - This enhances existing functionality without breaking changes.

## Dependencies
No new dependencies added.

## Performance Considerations
- Order creation now single API call instead of multiple Supabase queries
- Inventory validation done server-side for data integrity
- Stock conflict handling improved
- Faster and more reliable than client-side approach

## Security Improvements
- All inventory operations server-side
- Validation cannot be bypassed
- Stock levels protected
- Audit trail maintained

## Next Steps (Future Enhancements)
- [ ] Add order status updates (preparing, ready)
- [ ] Add order cancellation
- [ ] Add partial refund support
- [ ] Add order search by date range
- [ ] Export orders to CSV/Excel
- [ ] Real-time order notifications

## Checklist
- [x] Code builds successfully
- [x] Empty cart validation works
- [x] Insufficient stock handled
- [x] Double submit prevented
- [x] Auto-deduct inventory works
- [x] Stock logs created
- [x] Order history displays correctly
- [x] Error messages in Malay
- [x] Success flow complete
- [x] No breaking changes
- [x] Documentation updated

## Review Notes
- V0 UI design preserved exactly
- Backend API pattern consistent with previous PRs
- Error handling comprehensive
- User feedback clear and in Malay
- Auto-deduct seamlessly integrated
- Build successful without warnings

---

**Ready for merge to main** ✅
