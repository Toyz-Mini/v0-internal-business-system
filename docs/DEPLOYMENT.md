# Deployment Guide - AbangBob Ayam Gunting System

This guide provides comprehensive instructions for deploying the AbangBob Ayam Gunting internal management system to production on Vercel.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Vercel Deployment](#vercel-deployment)
- [Post-Deployment](#post-deployment)
- [Custom Domain](#custom-domain)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Project**
   - Create a free project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key

2. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Install Vercel CLI (optional): `npm install -g vercel`

3. **Git Repository**
   - Push your code to GitHub, GitLab, or Bitbucket

---

## Environment Variables

### Required Variables

You **must** configure these environment variables in Vercel:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Database Setup

### Step 1: Run Migrations

Execute the SQL migration files in order in your Supabase SQL Editor.

### Step 2: Configure Storage

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket named `product-images`
3. Set bucket to **Public** access

### Step 3: Create First Admin User

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add user** → **Create new user**
3. After creation, go to **Table Editor** → **users** table
4. Set user `role` to `admin`

---

## Vercel Deployment

### Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Add environment variables
4. Click **Deploy**

---

## Security Checklist

- [ ] All environment variables are set
- [ ] RLS policies are enabled on all tables
- [ ] Admin passwords are strong
- [ ] SSL certificate is active

---

**Last Updated:** 2025-11-27
