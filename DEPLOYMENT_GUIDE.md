# 🚀 DEPLOYMENT GUIDE - F&B POS SYSTEM

**Version:** 1.0.0
**Date:** 2025-11-27
**Status:** Production Ready

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before deploying, ensure you have:

- [x] Supabase project created
- [x] Database schema deployed
- [x] Environment variables ready
- [ ] Vercel account with access
- [ ] Domain name (optional)
- [ ] Test data prepared

---

## 🗄️ DATABASE SETUP (SUPABASE)

Your Supabase database is already configured at:
```
URL: https://0ec90b57d6e95fcbda19832f.supabase.co
```

### Database Migration Status:

The following migrations exist in `/scripts/` directory:

1. ✅ `000_complete_setup.sql` - Initial setup
2. ✅ `001_create_users_employees.sql` - User & employee tables
3. ✅ `002_create_products_inventory.sql` - Product management
4. ✅ `003_create_orders_customers.sql` - Orders & customers
5. ✅ `004_purchase_orders.sql` - Purchase order system
6. ✅ `006_product_images_table.sql` - Image support
7. ✅ `007_settings_table.sql` - System settings
8. ✅ `008_performance_indexes.sql` - Performance optimization
9. ✅ `009_audit_logs.sql` - Audit trail
10. ✅ `010_stock_counts_shifts.sql` - Stock counting
11. ✅ `013_hr_tables.sql` - HR management
12. ✅ `014_storage_buckets.sql` - File storage
13. ✅ `015_add_employee_fields.sql` - Employee enhancements

### Verify Database Schema:

```bash
# Check if tables exist in Supabase dashboard:
- users
- employees
- products
- categories
- orders
- customers
- ingredients
- attendance
- expenses
- suppliers
- purchase_orders
- stock_counts
```

---

## 🔐 ENVIRONMENT VARIABLES

Your environment variables are configured in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

**IMPORTANT:** These need to be set in Vercel:

1. Go to Vercel Project Settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://0ec90b57d6e95fcbda19832f.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]
```

---

## 📦 DEPLOYMENT OPTIONS

### Option 1: Deploy to Vercel (Recommended)

#### Method A: GitHub Integration (Easiest)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Production ready"
   git branch -M main
   git remote add origin https://github.com/yourusername/pos-system.git
   git push -u origin main
   ```

2. **Deploy via Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables
   - Click "Deploy"

#### Method B: Vercel CLI (Faster)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Follow prompts:**
   - Link to existing project or create new
   - Configure environment variables when prompted
   - Deploy!

---

## 🔧 VERCEL CONFIGURATION

Your `vercel.json` is already configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@next_public_supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@next_public_supabase_anon_key"
  }
}
```

**Region:** Singapore (sin1) - Change if needed

---

## ✅ POST-DEPLOYMENT VERIFICATION

After deployment, verify the following:

### 1. Build Success
- [ ] Deployment completed without errors
- [ ] All routes accessible
- [ ] No 404 errors

### 2. Database Connection
- [ ] Can connect to Supabase
- [ ] Can query tables
- [ ] RLS policies working

### 3. Core Features
- [ ] Login page loads
- [ ] Dashboard displays
- [ ] POS system accessible
- [ ] Can view products
- [ ] Can view orders

### 4. API Endpoints (Test via browser console or Postman)
```javascript
// Test dashboard stats
fetch('https://your-domain.vercel.app/api/dashboard/stats')

// Test products
fetch('https://your-domain.vercel.app/api/products')

// Test categories
fetch('https://your-domain.vercel.app/api/categories')
```

---

## 👥 INITIAL USER SETUP

### Create First Admin User:

1. **Via Supabase Dashboard:**
   - Go to Authentication → Users
   - Click "Add User"
   - Email: admin@yourbusiness.com
   - Password: [secure-password]
   - Save user

2. **Set Admin Role:**
   ```sql
   -- Run in Supabase SQL Editor
   UPDATE users
   SET role = 'admin'
   WHERE email = 'admin@yourbusiness.com';
   ```

3. **Login:**
   - Go to your deployment URL
   - Navigate to /auth/login
   - Login with admin credentials

---

## 📊 INITIAL DATA SETUP

### 1. Categories (Required First)
Navigate to `/admin/categories` and create:
- Food
- Beverages
- Desserts
- etc.

### 2. Products
Navigate to `/admin/products` and add your menu items

### 3. Ingredients
Navigate to `/admin/ingredients` and add inventory items

### 4. Suppliers
Navigate to `/suppliers` and add your suppliers

### 5. Employees
Navigate to `/employees` and add your team

---

## 🔍 TROUBLESHOOTING

### Build Fails
**Problem:** Deployment fails during build

**Solution:**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run lint

# Verify all dependencies installed
npm install
```

### Database Connection Error
**Problem:** Cannot connect to Supabase

**Solutions:**
1. Verify environment variables are set correctly in Vercel
2. Check Supabase project is not paused
3. Verify database URL is correct
4. Check RLS policies are configured

### Authentication Not Working
**Problem:** Cannot login

**Solutions:**
1. Check Supabase Auth is enabled
2. Verify user exists in `auth.users` table
3. Check user has role in `users` table
4. Verify JWT token is valid

### API Returns 401 Unauthorized
**Problem:** API endpoints return unauthorized

**Solutions:**
1. Verify user is logged in
2. Check session is valid
3. Verify RLS policies allow access
4. Check middleware configuration

### Pages Not Loading
**Problem:** Pages show 404 or don't render

**Solutions:**
1. Check Next.js routing configuration
2. Verify all pages exist in `/app` directory
3. Check for middleware blocking
4. Review server logs in Vercel

---

## 📈 MONITORING & MAINTENANCE

### Vercel Dashboard
Monitor your deployment:
- **Deployments:** Track all deployments
- **Analytics:** View traffic and performance
- **Logs:** Check runtime logs
- **Metrics:** Monitor build times

### Supabase Dashboard
Monitor your database:
- **Table Editor:** View and edit data
- **SQL Editor:** Run queries
- **API Logs:** Monitor API calls
- **Auth:** Manage users

---

## 🔒 SECURITY BEST PRACTICES

### After Deployment:

1. **Change Default Credentials:**
   - Update admin password
   - Rotate API keys if needed

2. **Configure CORS:**
   - Add your domain to Supabase allowed origins
   - Update CORS headers if needed

3. **Enable RLS:**
   - Verify all tables have RLS enabled
   - Test policies with different user roles

4. **Backup Strategy:**
   - Enable Supabase automatic backups
   - Set up regular database exports

5. **Monitor Logs:**
   - Check Vercel function logs
   - Review Supabase API logs
   - Set up error alerts

---

## 📱 MOBILE ACCESS

Your deployment is fully responsive and accessible on:
- Desktop browsers
- Tablets
- Mobile phones

**Recommended for POS:**
- iPad or Android tablet
- Modern browser (Chrome, Safari, Edge)
- Stable internet connection

---

## 🆘 SUPPORT & RESOURCES

### Documentation
- This deployment guide
- `PHASE_1_AND_2_COMPLETE.md` - Full feature documentation
- `BACKEND_AUDIT_COMPREHENSIVE.md` - System architecture

### Quick Links
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- GitHub Repo: [your-repo-url]

### Common Commands
```bash
# Redeploy
vercel --prod

# Check deployment logs
vercel logs

# Check build output
vercel logs [deployment-url]

# Run locally
npm run dev

# Build locally
npm run build
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [x] Code complete and tested
- [x] Build passes locally
- [x] Environment variables documented
- [x] Database schema ready
- [x] Vercel.json configured

### During Deployment:
- [ ] Push to GitHub (if using GitHub integration)
- [ ] Deploy to Vercel
- [ ] Set environment variables
- [ ] Verify build succeeds
- [ ] Check deployment URL

### Post-Deployment:
- [ ] Test login
- [ ] Test POS system
- [ ] Test dashboard
- [ ] Test all main features
- [ ] Create admin user
- [ ] Add initial data
- [ ] Configure business settings
- [ ] Train staff
- [ ] Go live!

---

## 🎉 CONGRATULATIONS!

Your F&B POS system is now deployed and ready for production use!

**System Capabilities:**
- ✅ Complete POS system
- ✅ Inventory management
- ✅ Customer tracking
- ✅ Employee attendance
- ✅ Sales reporting
- ✅ Purchase orders
- ✅ Stock counts
- ✅ Expense tracking
- ✅ HR management

**Next Steps:**
1. Complete initial data setup
2. Train your staff
3. Run parallel operations (optional)
4. Go fully live!

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Production URL:** _________________
**Notes:** _________________

