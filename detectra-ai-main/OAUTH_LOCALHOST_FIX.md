# 🔧 Fix: OAuth Redirecting to localhost After Deployment

## 🐛 Problem

After deployment, clicking GitHub/Google OAuth button redirects to `localhost:3000` instead of your production URL, causing `ERR_CONNECTION_REFUSED`.

## ✅ Solution

This is a **Supabase configuration issue**. You need to update the redirect URLs in Supabase Dashboard.

---

## 🚀 Quick Fix Steps

### Step 1: Get Your Production URL

First, find your Vercel deployment URL:
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Find your project
- Copy the production URL (e.g., `https://your-project.vercel.app`)

### Step 2: Update Supabase Redirect URLs

1. **Go to Supabase Dashboard**:
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to Authentication Settings**:
   - Click **Authentication** in the left sidebar
   - Click **URL Configuration** (or go to Settings → Auth → URL Configuration)

3. **Update Site URL**:
   - Set **Site URL** to your production URL:
     ```
     https://your-project.vercel.app
     ```

4. **Add Redirect URLs**:
   - In the **Redirect URLs** section, add these URLs (one per line):
     ```
     https://your-project.vercel.app
     https://your-project.vercel.app/demo
     https://your-project.vercel.app/signin
     https://your-project.vercel.app/signup
     https://your-project.vercel.app/profile
     https://your-project.vercel.app/*
     ```

5. **Remove localhost URLs** (if you want):
   - You can keep localhost URLs for development, or remove them
   - If keeping, make sure production URLs are listed first

6. **Click Save**

### Step 3: Verify GitHub OAuth Configuration

1. **Go to GitHub Developer Settings**:
   - Visit [https://github.com/settings/developers](https://github.com/settings/developers)
   - Click **OAuth Apps**
   - Click on your Detectra AI app

2. **Update Authorization callback URL**:
   - Make sure it's set to:
     ```
     https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback
     ```
   - **Important**: This should point to Supabase, NOT your Vercel URL

3. **Update Homepage URL** (optional):
   - Set to your production URL:
     ```
     https://your-project.vercel.app
     ```

4. **Click Update application**

### Step 4: Verify Google OAuth Configuration

1. **Go to Google Cloud Console**:
   - Visit [https://console.cloud.google.com](https://console.cloud.google.com)
   - Select your project
   - Go to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID

2. **Update Authorized redirect URIs**:
   - Make sure it includes:
     ```
     https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback
     ```
   - **Important**: This should point to Supabase, NOT your Vercel URL

3. **Save changes**

### Step 5: Test OAuth

1. **Clear browser cache and cookies** for your site
2. **Visit your production site**
3. **Click "Sign in with GitHub"**
4. **Authorize on GitHub**
5. **You should be redirected back to your production site** (not localhost)

---

## 🔍 How OAuth Flow Works

```
1. User clicks "Sign in with GitHub"
   ↓
2. App redirects to Supabase OAuth endpoint
   ↓
3. Supabase redirects to GitHub
   ↓
4. User authorizes on GitHub
   ↓
5. GitHub redirects back to Supabase callback URL
   ↓
6. Supabase processes OAuth and redirects to YOUR app
   ↓
7. Supabase uses the "Redirect URLs" from Step 2 to determine where to send user
   ↓
8. If localhost is in the list, Supabase might use it (causing the error)
```

**The fix**: By updating Supabase redirect URLs to only include production URLs, Supabase will redirect to your production site instead of localhost.

---

## 🐛 Troubleshooting

### Still redirecting to localhost?

1. **Check Supabase Redirect URLs**:
   - Make sure production URLs are listed
   - Make sure they're saved correctly
   - Try removing localhost URLs temporarily

2. **Check Browser Cache**:
   - Clear browser cache and cookies
   - Try incognito/private mode
   - Try a different browser

3. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs → Auth Logs
   - Look for OAuth redirect errors
   - Check what URL Supabase is trying to redirect to

4. **Verify Environment Variables**:
   - In Vercel, check that `VITE_SUPABASE_URL` is set correctly
   - Make sure it's not pointing to a different Supabase project

5. **Check OAuth Provider Settings**:
   - GitHub: Verify callback URL is `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
   - Google: Verify redirect URI is `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`

### OAuth not working at all?

1. **Check if provider is enabled**:
   - Supabase Dashboard → Authentication → Providers
   - Make sure GitHub/Google is enabled
   - Verify Client ID and Secret are set

2. **Check for errors in browser console**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for OAuth errors

3. **Check network requests**:
   - Open DevTools → Network tab
   - Try OAuth again
   - Look for failed requests

---

## 📝 Code Changes Made

The code has been updated to:
- ✅ Store the current origin before OAuth redirect
- ✅ Use saved origin after OAuth callback
- ✅ Prevent localhost redirects in production
- ✅ Better error handling for OAuth failures

---

## ✅ Verification Checklist

After making changes:

- [ ] Supabase Site URL is set to production URL
- [ ] Supabase Redirect URLs include production URLs
- [ ] GitHub OAuth callback URL points to Supabase
- [ ] Google OAuth redirect URI points to Supabase
- [ ] Cleared browser cache
- [ ] Tested OAuth on production site
- [ ] OAuth redirects to production URL (not localhost)
- [ ] User is signed in after OAuth
- [ ] User is redirected to intended page (e.g., /demo)

---

## 🎯 Summary

**The root cause**: Supabase redirect URLs were configured with localhost, so after OAuth, Supabase redirected to localhost instead of production.

**The fix**: Update Supabase redirect URLs to include your production domain, and ensure OAuth providers point to Supabase callback URL.

**Status**: After following these steps, OAuth should work correctly in production! ✅

