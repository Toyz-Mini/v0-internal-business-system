# Pull Request: CRM Module with Customer Order History & Notes

**Branch:** `feat/crm-module` → `main`

## Summary

Implemented complete CRM (Customer Relationship Management) module with customer management, order history tracking, and notes system. All UI connected to backend APIs with proper validation and error handling in Malay.

## Changes Made

### 1. Customer API Endpoints Created

#### Customer CRUD APIs
- **GET /api/customers** - List all customers with optional search
  - Query param: `?search=term` (searches name and phone)
  - Returns customer list with stats (order_count, total_spent)

- **POST /api/customers** - Create new customer
  - Validates name, phone, email, tags, notes
  - Returns created customer with ID

- **GET /api/customers/[id]** - Get customer details
  - Returns single customer with all info
  - 404 if not found

- **PUT /api/customers/[id]** - Update customer
  - Update name, phone, email, tags, notes
  - Validates email format

- **DELETE /api/customers/[id]** - Delete customer
  - Soft or hard delete (based on implementation)
  - Returns success message

#### Order History APIs
- **GET /api/customers/[id]/orders** - Get customer's order history
  - Returns orders with items and modifiers
  - Includes product details
  - Limited to 50 recent orders
  - Sorted by date (newest first)

#### Notes APIs
- **POST /api/customers/[id]/notes** - Add/update customer notes
  - Accepts notes text
  - Returns updated customer
  - Success message in Malay

- **PUT /api/customers/[id]/notes** - Update customer notes
  - Same as POST (unified endpoint)

### 2. Customer List Page Enhanced (`app/customers/page.tsx`)

#### Sebelum (Direct Supabase):
```typescript
const { data: customers } = await supabase
  .from("customers")
  .select("*")
  .order("total_spent", { ascending: false })
```

#### Selepas (Backend API):
```typescript
const customersResponse = await fetch('/api/customers', {
  cache: 'no-store'
});
const customersData = await customersResponse.json();
const customers = customersData.success ? customersData.data : [];
```

#### Features:
- ✅ Fetch customers via GET /api/customers
- ✅ Display customer stats (total, revenue, avg order value, loyal customers)
- ✅ Search by name or phone
- ✅ Customer tier badges (VIP, Loyal, Regular, New)
- ✅ Quick actions (view history, edit, delete)

### 3. Customer Table Component Updated (`components/customers/customers-table.tsx`)

#### Update Customer
- Uses PUT /api/customers/[id] instead of direct Supabase
- Form validation
- Error messages in Malay
- Toast notifications

#### Delete Customer
- Uses DELETE /api/customers/[id]
- Confirmation dialog in Malay
- Removes from list on success

#### Search Functionality
- Client-side search filtering
- Searches name and phone fields
- Real-time results

### 4. Customer Detail Page Enhanced (`app/customers/[id]/page.tsx`)

#### New Features Added:
1. **Customer Stats Cards**
   - Jumlah Pesanan (Total Orders)
   - Jumlah Belanja (Total Spent)
   - Lawatan Terakhir (Last Visit)
   - Ahli Sejak (Member Since)

2. **Notes System** (NEW!)
   - View customer notes
   - Edit notes inline
   - Save via POST /api/customers/[id]/notes
   - Toast notifications
   - Placeholder when empty
   - Textarea with multiple rows
   - Edit/Save/Cancel buttons

3. **Order History Table**
   - Displays all customer orders
   - Shows order items with quantities
   - Payment method badges
   - Order type badges
   - Formatted dates and currency
   - Item preview (first 2 items + count)

#### Data Flow:
```typescript
// Fetch customer
const customerResponse = await fetch(`/api/customers/${id}`)
const customerData = await customerResponse.json()

// Fetch orders
const ordersResponse = await fetch(`/api/customers/${id}/orders`)
const ordersData = await ordersResponse.json()
```

### 5. Notes System Implementation

#### UI Components:
- Card with FileText icon header
- Edit button to enable editing
- Textarea for input (4 rows)
- Save/Cancel buttons when editing
- Loading state during save
- Toast on success/error

#### Backend Integration:
```typescript
const handleSaveNotes = async () => {
  const response = await fetch(`/api/customers/${customer.id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  })

  if (response.ok) {
    toast.success("Notes berjaya dikemaskini")
  } else {
    toast.error("Gagal simpan notes")
  }
}
```

#### Use Cases:
- VIP customer preferences
- Allergy information
- Special requests
- Contact preferences
- Behavioral notes

## Features Implemented

### ✅ Customer List
- Display all customers with search
- Total orders and total spent per customer
- Last visit date
- Customer tier system (VIP/Loyal/Regular/New)
- Edit and delete actions
- Link to order history

### ✅ Customer Detail Page
- Comprehensive customer profile
- Order history with items
- Stats dashboard
- Notes management system
- Back navigation

### ✅ Order History
- List of all customer orders
- Order details (items, quantities, prices)
- Payment methods
- Order types
- Formatted dates
- Item preview

### ✅ Notes System
- Add notes to customers
- Edit existing notes
- Save via API
- Toast notifications
- Multi-line text support
- Placeholder for empty state

### ✅ Search Functionality
- Search by name
- Search by phone
- Real-time filtering
- Clear search results

## Validation & UX

### Validation Rules:
- Name required (min 1 character)
- Email format validation
- Phone optional but validated if provided
- Tags array validation
- Notes text validation

### Error Messages (Malay):
| Scenario | Message |
|----------|---------|
| Delete confirmation | Adakah anda pasti mahu padam pelanggan ini? |
| Delete failed | Gagal padam pelanggan |
| Update failed | Gagal kemaskini pelanggan |
| Notes saved | Notes berjaya dikemaskini |
| Notes save failed | Gagal simpan notes |
| Customer not found | Pelanggan tidak dijumpai |

### Loading States:
- Spinner while fetching customer data
- "Menyimpan..." text during save
- Disabled buttons during operations
- Skeleton loaders where appropriate

### Toast Notifications:
- Success: Green toast with checkmark
- Error: Red toast with X icon
- Auto-dismiss after 3 seconds
- Clear, concise messages in Malay

## Files Changed

### New Files
- `app/api/customers/route.ts`
- `app/api/customers/[id]/route.ts`
- `app/api/customers/[id]/orders/route.ts`
- `app/api/customers/[id]/notes/route.ts`

### Modified Files
- `app/customers/page.tsx` - Uses backend API
- `app/customers/[id]/page.tsx` - Enhanced with notes system
- `components/customers/customers-table.tsx` - Backend integration

## Testing Checklist

- [x] Customer list loads via API
- [x] Search functionality works
- [x] Customer detail page displays correctly
- [x] Order history shows items and modifiers
- [x] Notes can be added
- [x] Notes can be edited
- [x] Notes save successfully
- [x] Toast notifications appear
- [x] Delete customer works
- [x] Update customer works
- [x] Error messages in Malay
- [x] Build successful without errors

## Screenshots

### 1. Customer List Page
![Customer List](screenshots/customer-list.png)
- All customers displayed
- Search bar for name/phone
- Customer tier badges
- Total orders and spent columns
- Quick actions menu

### 2. Customer Search
![Search](screenshots/customer-search.png)
- Real-time search results
- Filters by name or phone
- Results update instantly

### 3. Customer Detail Page - Stats
![Customer Stats](screenshots/customer-stats.png)
- Four stat cards:
  - Jumlah Pesanan with ShoppingBag icon
  - Jumlah Belanja with DollarSign icon
  - Lawatan Terakhir with Calendar icon
  - Ahli Sejak with User icon

### 4. Notes Section - Empty State
![Notes Empty](screenshots/notes-empty.png)
- FileText icon header
- "Tiada notes" message
- "Klik Edit untuk menambah notes" prompt
- Edit button

### 5. Notes Section - Editing
![Notes Editing](screenshots/notes-editing.png)
- Textarea with 4 rows
- Placeholder text with examples
- Save and Batal buttons
- Character input visible

### 6. Notes Section - Saved
![Notes Saved](screenshots/notes-saved.png)
- Notes displayed as text
- Edit button to modify
- Success toast notification
- Multiline text preserved

### 7. Order History Table
![Order History](screenshots/order-history.png)
- Order number column
- Date and time
- Order type badges (takeaway/delivery/dine-in)
- Items preview (2 items + count)
- Payment method badges
- Total amount

### 8. Order History - Empty
![No Orders](screenshots/no-orders.png)
- ShoppingBag icon
- "Tiada sejarah pesanan" message
- Clean empty state

## User Flows

### View Customer Order History
1. User navigates to Customers page
2. Searches for customer by name/phone
3. Clicks on customer row or "Lihat Sejarah" from menu
4. Customer detail page loads
5. Order history displayed in table
6. Can see all items in each order

### Add Notes to Customer
1. User opens customer detail page
2. Scrolls to "Notes Pelanggan" section
3. Sees "Tiada notes" message
4. Clicks "Edit" button
5. Textarea appears with placeholder
6. Types notes: "VIP customer, suka extra pedas, alergi seafood"
7. Clicks "Simpan"
8. Notes saved via API
9. Toast: "Notes berjaya dikemaskini"
10. Notes displayed as text

### Edit Existing Notes
1. User opens customer with existing notes
2. Sees notes displayed
3. Clicks "Edit"
4. Textarea appears with current notes
5. Modifies text
6. Clicks "Simpan"
7. API updates notes
8. Success toast appears
9. Updated notes displayed

### Search Customers
1. User types in search box
2. Results filter in real-time
3. Searches both name and phone fields
4. No results shows "No customers found"

## API Request/Response Examples

### GET /api/customers
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ahmad bin Ali",
      "phone": "+6738123456",
      "email": "ahmad@example.com",
      "order_count": 12,
      "total_spent": 450.50,
      "last_visit": "2025-11-20T10:30:00Z",
      "tags": ["VIP", "frequent"],
      "notes": "Suka extra pedas",
      "created_at": "2025-01-15T00:00:00Z"
    }
  ],
  "count": 1
}
```

### POST /api/customers/[id]/notes
**Request:**
```json
{
  "notes": "VIP customer, suka extra pedas, alergi seafood"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ahmad bin Ali",
    "notes": "VIP customer, suka extra pedas, alergi seafood",
    ...
  },
  "message": "Notes berjaya dikemaskini"
}
```

### GET /api/customers/[id]/orders
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "order_number": "ORD-ABC123",
      "order_type": "takeaway",
      "total": 25.50,
      "payment_method": "cash",
      "status": "completed",
      "created_at": "2025-11-27T12:00:00Z",
      "order_items": [
        {
          "id": "item-uuid",
          "quantity": 2,
          "unit_price": 10.00,
          "product": {
            "id": "product-uuid",
            "name": "Ayam Gunting",
            "image_url": null
          },
          "modifiers": []
        }
      ]
    }
  ],
  "count": 1
}
```

## Database Schema (No Changes)

Uses existing `customers` table:
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  order_count INTEGER DEFAULT 0,
  total_spent DECIMAL DEFAULT 0,
  last_visit TIMESTAMP,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Breaking Changes
None - This enhances existing CRM functionality without breaking changes.

## Dependencies
No new dependencies added.

## Performance Considerations
- Customer list fetched via API (server-side)
- Order history limited to 50 orders per customer
- Client-side search for instant filtering
- Toast notifications don't block UI
- Optimistic UI updates where applicable

## Security
- All API endpoints validate input with Zod
- Customer data protected by authentication
- Notes stored securely in database
- No sensitive data exposed in URLs

## Accessibility
- Proper semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Clear focus states
- Screen reader friendly

## Future Enhancements
- [ ] Customer tags management UI
- [ ] Export customer list to CSV
- [ ] Customer segments/groups
- [ ] Email marketing integration
- [ ] Customer lifetime value calculations
- [ ] Purchase frequency analysis
- [ ] Customer retention metrics

## Checklist
- [x] Code builds successfully
- [x] All API endpoints working
- [x] UI connected to backend
- [x] Search functionality works
- [x] Notes system functional
- [x] Order history displays correctly
- [x] Error messages in Malay
- [x] Toast notifications working
- [x] No breaking changes
- [x] Documentation updated

## Review Notes
- V0 UI design preserved with enhancements
- Backend API pattern consistent with previous modules
- Error handling comprehensive
- User feedback clear in Malay
- Notes system intuitive and simple
- Order history informative

---

**Ready for merge to main** ✅
