# Deployment Guide

## Prerequisites

- Vercel account
- Supabase project
- Environment variables ready

## Deployment Steps

### 1. Database Setup

Run SQL scripts in order:

\`\`\`bash
# In Supabase SQL Editor, run:
scripts/001_create_tables.sql
scripts/002_rls_policies.sql
scripts/003_seed_data.sql
scripts/004_create_functions.sql
scripts/008_performance_indexes.sql
scripts/009_audit_logs.sql
\`\`\`

### 2. Environment Variables

Set in Vercel dashboard:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
\`\`\`

### 3. Deploy to Vercel

Option A: Via v0 UI
- Click "Publish" button

Option B: Via CLI
\`\`\`bash
vercel deploy --prod
\`\`\`

### 4. Post-Deployment Checks

1. Test login with admin credentials
2. Verify POS can create orders
3. Check stock deduction works
4. Test attendance clock in/out

## Rollback Plan

### Code Rollback

\`\`\`bash
# Via Vercel dashboard
# Go to Deployments → Select previous → Promote to Production

# Or via CLI
vercel rollback
\`\`\`

### Database Rollback

For each migration, create a down migration:

\`\`\`sql
-- Example: rollback audit_logs
DROP TRIGGER IF EXISTS audit_order_changes_trigger ON orders;
DROP TRIGGER IF EXISTS audit_stock_changes_trigger ON stock_logs;
DROP FUNCTION IF EXISTS audit_order_changes();
DROP FUNCTION IF EXISTS log_audit_event();
DROP TABLE IF EXISTS audit_logs;
\`\`\`

## Safe Migration Strategy

### Up Migration

1. Create new migration file: `scripts/0XX_feature_name.sql`
2. Test in staging/development
3. Run in production during low-traffic
4. Verify application still works

### Down Migration

1. Create rollback file: `scripts/0XX_feature_name_down.sql`
2. Keep ready for emergency rollback
3. Test rollback procedure in staging

## Staging Environment

### Setup Staging

1. Create separate Supabase project for staging
2. Deploy to Vercel preview branch
3. Use staging env vars

\`\`\`env
# .env.staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-xxx.supabase.co
\`\`\`

### Testing in Staging

1. Run all smoke tests
2. Test with dummy data
3. Verify integrations work
4. Load test if needed

## Monitoring

### Vercel Analytics

- Enable Web Vitals monitoring
- Set up alerts for error spikes

### Supabase Dashboard

- Monitor database performance
- Check auth logs for issues
- Review API request counts

## Adding New Staff

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → Enter email/password
3. In SQL Editor, run:

\`\`\`sql
INSERT INTO public.users (id, email, name, role, is_active)
VALUES (
  'USER_ID_FROM_AUTH',
  'new@email.com',
  'Staff Name',
  'cashier', -- or 'admin', 'staff'
  true
);

INSERT INTO public.employees (user_id, name, email, position, salary_rate, salary_type)
VALUES (
  'USER_ID_FROM_AUTH',
  'Staff Name',
  'new@email.com',
  'Cashier',
  50.00,
  'hourly'
);
