# AbangBob Ayam Gunting - Internal Business System

## Overview

Sistem pengurusan dalaman untuk restoran/kedai makan yang merangkumi:
- **POS (Point of Sale)** - Sistem jualan dengan modifiers, split payment, void/refund
- **Inventory** - Pengurusan stok bahan mentah dengan recipe deduction
- **HR/Attendance** - Clock in/out dengan GPS, payroll calculation
- **Analytics** - Laporan jualan, prestasi produk
- **Accounting** - Pengurusan perbelanjaan, P&L view
- **CRM** - Pengurusan pelanggan

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account dengan project
- Environment variables configured

### Installation

\`\`\`bash
# Clone repository
git clone <repo-url>
cd abangbob-system

# Install dependencies
npm install

# Run development server
npm run dev
\`\`\`

### Environment Variables

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## Documentation Index

- [Database Schema](./DATABASE_SCHEMA.md)
- [Code Architecture](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [User Guide](./USER_GUIDE.md)
- [QA Test Matrix](./QA_TEST_MATRIX.md)

## Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@abangbob.com | Admin123! | admin |
| cashier@abangbob.com | Cashier123! | cashier |
| staff@abangbob.com | Staff123! | staff |

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State**: React hooks, SWR for data fetching
- **Styling**: TailwindCSS v4
