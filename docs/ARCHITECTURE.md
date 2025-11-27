# Code Architecture

## Project Structure

\`\`\`
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   └── login/         # Login page
│   ├── dashboard/         # Main dashboard
│   ├── pos/               # Point of Sale
│   ├── inventory/         # Inventory management
│   ├── attendance/        # HR attendance
│   ├── employees/         # Employee management
│   ├── expenses/          # Expense tracking
│   ├── reports/           # Analytics & reports
│   ├── customers/         # Customer CRM
│   ├── suppliers/         # Supplier management
│   └── settings/          # System settings
│
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # App shell, sidebar, header
│   ├── pos/              # POS-specific components
│   ├── inventory/        # Inventory components
│   ├── attendance/       # Attendance components
│   ├── employees/        # Employee components
│   ├── expenses/         # Expense components
│   ├── reports/          # Report components
│   ├── customers/        # Customer components
│   ├── suppliers/        # Supplier components
│   ├── dashboard/        # Dashboard widgets
│   └── settings/         # Settings components
│
├── lib/                   # Utilities & configurations
│   ├── supabase/         # Supabase client configs
│   │   ├── client.ts     # Browser client
│   │   ├── server.ts     # Server client
│   │   └── middleware.ts # Auth middleware
│   ├── types.ts          # TypeScript type definitions
│   ├── utils.ts          # General utilities
│   ├── ux-utils.ts       # UX utilities (loading, errors)
│   ├── cache.ts          # Data caching utilities
│   ├── audit.ts          # Audit logging
│   ├── validation.ts     # Input validation
│   └── webhook.ts        # Webhook utilities
│
├── scripts/               # SQL migration scripts
│   ├── 001_*.sql         # Initial schema
│   ├── 002_*.sql         # RLS policies
│   ├── 003_*.sql         # Seed data
│   ├── ...
│   └── 009_audit_logs.sql
│
└── docs/                  # Documentation
\`\`\`

## Key Patterns

### 1. Server vs Client Components

- **Server Components** (default): Pages that fetch data
- **Client Components** (`"use client"`): Interactive UI with state

\`\`\`tsx
// Server component - app/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('orders').select()
  return <DashboardView orders={data} />
}

// Client component - components/dashboard/stats-card.tsx
"use client"
export function StatsCard({ value, label }) {
  const [isHovered, setIsHovered] = useState(false)
  // ...
}
\`\`\`

### 2. Supabase Client Usage

\`\`\`tsx
// Client-side (browser)
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()

// Server-side (RSC, Route Handlers)
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()
\`\`\`

### 3. Data Fetching Pattern

\`\`\`tsx
// In Server Components - direct fetch
const { data, error } = await supabase.from('table').select()

// In Client Components - use SWR or useState/useEffect
const { data, error, isLoading } = useSWR('key', fetcher)
\`\`\`

### 4. Error Handling

\`\`\`tsx
import { useAsyncAction, getErrorMessage } from "@/lib/ux-utils"

const { isLoading, error, execute } = useAsyncAction()

const handleSubmit = async () => {
  await execute(async () => {
    const { error } = await supabase.from('table').insert(data)
    if (error) throw error
  })
}
\`\`\`

### 5. Caching Strategy

\`\`\`tsx
import { getProducts, invalidateProductsCache } from "@/lib/cache"

// Get with cache (5 min TTL)
const products = await getProducts()

// Force refresh
const products = await getProducts(true)

// Invalidate after mutation
invalidateProductsCache()
\`\`\`

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with policies:

| Role | Permissions |
|------|-------------|
| `admin` | Full CRUD on all tables |
| `cashier` | Read all, write orders/customers |
| `staff` | Read all, write attendance only |

### Authentication Flow

1. User submits login → Supabase Auth
2. Session cookie set → Middleware checks
3. `updateSession()` refreshes token
4. Protected routes redirect if no session

### Audit Trail

Sensitive operations are logged:
- Order void/refund
- Stock adjustments > 10 units
- Salary changes
- Login/logout events
