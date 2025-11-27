# Production Deployment Checklist

Use this checklist before deploying to production to ensure everything is ready.

## Pre-Deployment

### Environment Setup
- [ ] `.env.example` file is complete and up to date
- [ ] All required environment variables documented
- [ ] Supabase project created and configured
- [ ] Storage bucket `product-images` created and set to public

### Database
- [ ] All migration files run in correct order
- [ ] RLS policies enabled on all tables
- [ ] Performance indexes created
- [ ] First admin user created
- [ ] Test data seeded (optional)

### Code Quality
- [ ] Production build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console.log statements (except console.error)
- [ ] All unused imports removed
- [ ] All dead code removed

### Security
- [ ] RLS policies tested and verified
- [ ] Admin-only routes protected
- [ ] API routes have proper authentication
- [ ] File upload validation in place
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] No secrets exposed in frontend code

## Deployment

### Vercel Setup
- [ ] Project imported to Vercel
- [ ] All environment variables added
- [ ] Build command: `npm run build`
- [ ] Framework preset: Next.js
- [ ] Region: Singapore (sin1)

### DNS & Domain
- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated
- [ ] SSL certificate active
- [ ] Domain verification complete

## Post-Deployment Testing

### Critical Flows
- [ ] **Authentication**
  - [ ] Login works
  - [ ] Logout works
  - [ ] Session persists on refresh
  - [ ] Unauthorized access blocked

- [ ] **Order Creation (POS)**
  - [ ] Create order from POS
  - [ ] Inventory auto-deducts
  - [ ] Receipt generates correctly
  - [ ] Order appears in history
  - [ ] Payment methods work

- [ ] **Inventory Management**
  - [ ] View inventory list
  - [ ] Add stock (Stock In)
  - [ ] Stock logs recorded
  - [ ] Low stock alerts show
  - [ ] Recompute stock works

- [ ] **Menu Management**
  - [ ] Add/edit products
  - [ ] Upload product images
  - [ ] Create/edit categories
  - [ ] Manage modifier groups
  - [ ] Changes reflect on POS

- [ ] **CRM & Customers**
  - [ ] View customer list
  - [ ] Add new customer
  - [ ] View customer detail page
  - [ ] View order history
  - [ ] Add/edit notes

- [ ] **Reporting Dashboard**
  - [ ] Sales stats load correctly
  - [ ] Charts render properly
  - [ ] Top items table shows data
  - [ ] Top categories display
  - [ ] Date filtering works

- [ ] **Role-Based Access Control**
  - [ ] Admin has full access
  - [ ] Manager has correct permissions
  - [ ] Cashier access restricted
  - [ ] Kitchen access restricted
  - [ ] Staff access restricted
  - [ ] Unauthorized users redirected

### API Health Checks
- [ ] `/api/health` returns 200
- [ ] `/api/db-status` returns database status
- [ ] All API routes respond correctly
- [ ] Error handling works properly

### Performance
- [ ] Page load times < 3 seconds
- [ ] Images load quickly
- [ ] No layout shifts
- [ ] Smooth navigation
- [ ] Mobile responsive

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Safari (desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (latest)

## Monitoring Setup

- [ ] Vercel Analytics enabled
- [ ] Vercel Logs accessible
- [ ] Supabase Database monitoring active
- [ ] Error tracking configured
- [ ] Database backups enabled
- [ ] Uptime monitoring (optional)

## Documentation

- [ ] README.md updated
- [ ] DEPLOYMENT.md reviewed
- [ ] User guide available (if needed)
- [ ] Admin credentials documented securely
- [ ] Support contacts listed

## Rollback Plan

- [ ] Previous working deployment identified
- [ ] Rollback procedure documented
- [ ] Database backup available
- [ ] Team notified of deployment

## Communication

- [ ] Team notified of deployment time
- [ ] Users informed of maintenance window (if applicable)
- [ ] Support team briefed
- [ ] Stakeholders updated

---

## Critical Issues Found?

If you discover critical issues during testing:

1. **Stop deployment immediately**
2. Document the issue
3. Fix in development
4. Re-run this checklist
5. Deploy again

---

## Production URLs

Record your production URLs for reference:

- **Production URL**: `https://_____.vercel.app`
- **Custom Domain**: `https://_____`
- **Supabase URL**: `https://_____.supabase.co`
- **Database URL**: (stored securely)

---

## Deployment Sign-Off

Before marking deployment as complete:

- [ ] All critical flows tested
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Team notified
- [ ] Documentation updated

**Deployed by:** _______________
**Date:** _______________
**Version:** _______________
**Sign-off:** _______________

---

## Post-Deployment (24-48 hours)

Monitor the following after deployment:

- [ ] Check error logs daily
- [ ] Monitor database performance
- [ ] Review user feedback
- [ ] Check for any unusual behavior
- [ ] Verify backup jobs running
- [ ] Test critical flows again

---

**Keep this checklist for every deployment to maintain quality and consistency.**
