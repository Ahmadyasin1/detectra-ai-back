# 🔧 OAuth Configuration Fix Guide

Based on the errors you're seeing, here's exactly how to fix Google and GitHub OAuth:

## ❌ Current Errors

1. **Google**: `"Unsupported provider: missing OAuth secret"` - Client Secret is missing
2. **GitHub**: 404 error - OAuth app not configured correctly

---

## ✅ Step 1: Fix Google OAuth

### Part A: Create Google OAuth Credentials

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**:
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it: `Detectra AI` (or any name)
   - Click "Create"
   - Wait for it to be created, then select it

3. **Enable Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click on it and click **Enable**

4. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **External** (unless you have a Google Workspace)
   - Click **Create**
   - Fill in:
     - **App name**: `Detectra AI`
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **Save and Continue**
   - On **Scopes** page, click **Save and Continue**
   - On **Test users** page, click **Save and Continue**
   - On **Summary** page, click **Back to Dashboard**

5. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ Create Credentials** → **OAuth 2.0 Client ID**
   - If prompted, configure consent screen (do the steps above)
   - **Application type**: Select **Web application**
   - **Name**: `Detectra AI Web Client`
   - **Authorized JavaScript origins**: Click **+ Add URI** and add:
     ```
     https://txkwnceefmaotmqluajc.supabase.co
     ```
   - **Authorized redirect URIs**: Click **+ Add URI** and add:
     ```
     https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback
     ```
   - Click **Create**
   - **IMPORTANT**: Copy the **Client ID** and **Client Secret** (you'll need these!)

### Part B: Add Credentials to Supabase

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/txkwnceefmaotmqluajc/auth/providers
   - Or: Dashboard → Authentication → Providers → Google

2. **Fill in Google Settings**:
   - **Enable Sign in with Google**: ✅ Already enabled (keep it on)
   - **Client IDs**: Paste your **Client ID** from Google Cloud Console
   - **Client Secret (for OAuth)**: Paste your **Client Secret** from Google Cloud Console
   - **Skip nonce checks**: Leave OFF (default)
   - **Allow users without an email**: Leave OFF (default)

3. **Click "Save"**

4. **Verify**:
   - The error message should disappear
   - You should see a green checkmark or success message

---

## ✅ Step 2: Fix GitHub OAuth

### Part A: Create GitHub OAuth App

1. **Go to GitHub Developer Settings**:
   - Visit: https://github.com/settings/developers
   - Sign in to GitHub

2. **Create New OAuth App**:
   - Click **OAuth Apps** in the left sidebar
   - Click **New OAuth App** button

3. **Fill in OAuth App Details**:
   - **Application name**: `Detectra AI` (or any name)
   - **Homepage URL**: 
     ```
     https://txkwnceefmaotmqluajc.supabase.co
     ```
   - **Authorization callback URL**: ⚠️ **CRITICAL - Must be EXACTLY this**:
     ```
     https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback
     ```
   - **Important**: The callback URL must match EXACTLY (no trailing slash, no extra paths)

4. **Click "Register application"**

5. **Copy Credentials**:
   - You'll see a page with your app details
   - **Client ID**: Copy this (it's visible)
   - **Client Secret**: Click **Generate a new client secret**
   - Copy the **Client Secret** immediately (you can only see it once!)

### Part B: Add Credentials to Supabase

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/txkwnceefmaotmqluajc/auth/providers
   - Or: Dashboard → Authentication → Providers → GitHub

2. **Enable and Configure GitHub**:
   - **Enable Sign in with GitHub**: Turn it ON ✅
   - **Client ID (for OAuth)**: Paste your **Client ID** from GitHub
   - **Client Secret (for OAuth)**: Paste your **Client Secret** from GitHub

3. **Click "Save"**

---

## ✅ Step 3: Configure Redirect URLs in Supabase

1. **Go to URL Configuration**:
   - In Supabase Dashboard: **Authentication** → **URL Configuration**

2. **Set Site URL**:
   - For development: `http://localhost:5173`
   - For production: Your production domain (if you have one)

3. **Add Redirect URLs** (one per line):
   ```
   http://localhost:5173/demo
   http://localhost:5173/*
   https://yourdomain.com/demo
   https://yourdomain.com/*
   ```
   - Replace `yourdomain.com` with your actual domain if you have one
   - For now, just add: `http://localhost:5173/demo` and `http://localhost:5173/*`

4. **Click "Save"**

---

## 🧪 Step 4: Test OAuth

### Test Google OAuth:

1. **Clear browser cache** (optional but recommended):
   - Press `Ctrl + Shift + Delete`
   - Clear cookies and cache

2. **Go to your app**:
   - Visit: `http://localhost:5173/signin` or `http://localhost:5173/signup`

3. **Click "Sign in with Google"**:
   - You should be redirected to Google's consent screen
   - Select your Google account
   - Click "Allow" or "Continue"
   - You should be redirected back to `/demo`
   - Your profile should be created automatically

### Test GitHub OAuth:

1. **Go to your app**:
   - Visit: `http://localhost:5173/signin` or `http://localhost:5173/signup`

2. **Click "Sign in with GitHub"**:
   - You should be redirected to GitHub's authorization screen
   - Click "Authorize Detectra AI" (or your app name)
   - You should be redirected back to `/demo`
   - Your profile should be created automatically with your GitHub username

---

## 🔍 Troubleshooting

### Google OAuth Still Not Working:

1. **Check Client ID and Secret**:
   - Make sure you copied them correctly (no extra spaces)
   - Client ID should look like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - Client Secret should look like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

2. **Check Redirect URI in Google Cloud Console**:
   - Must be exactly: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
   - No trailing slash, no extra paths

3. **Check OAuth Consent Screen**:
   - Make sure it's published or you're added as a test user
   - Go to OAuth consent screen → Add your email as a test user

### GitHub OAuth Still Not Working:

1. **Check Callback URL in GitHub**:
   - Must be EXACTLY: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
   - No trailing slash, no typos
   - Go to GitHub → Settings → Developer settings → OAuth Apps → Your app → Edit
   - Verify the callback URL matches exactly

2. **Check Client ID and Secret in Supabase**:
   - Make sure they're pasted correctly
   - Client ID should be a string of characters
   - Client Secret should start with something like `ghp_` or similar

3. **Check if GitHub App is Active**:
   - In GitHub, make sure your OAuth app is not deleted or disabled

### Both Not Working:

1. **Check Supabase Project Status**:
   - Make sure your Supabase project is active
   - Check if there are any service issues

2. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any error messages
   - Share the errors if you see any

3. **Check Network Tab**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try OAuth again
   - Look for failed requests (red)
   - Check the response for error messages

---

## 📋 Quick Checklist

### Google OAuth:
- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Authorized redirect URI added: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
- [ ] Client ID added to Supabase
- [ ] Client Secret added to Supabase
- [ ] Google provider enabled in Supabase

### GitHub OAuth:
- [ ] GitHub OAuth app created
- [ ] Callback URL set to: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
- [ ] Client ID copied from GitHub
- [ ] Client Secret generated and copied from GitHub
- [ ] Client ID added to Supabase
- [ ] Client Secret added to Supabase
- [ ] GitHub provider enabled in Supabase

### Supabase Configuration:
- [ ] Site URL configured
- [ ] Redirect URLs added
- [ ] Both providers saved successfully

---

## 🎯 Summary

**The code is working correctly!** The errors are due to missing configuration in:
1. **Google Cloud Console** - Need to create OAuth credentials
2. **GitHub** - Need to create OAuth app
3. **Supabase Dashboard** - Need to add the credentials

Once you complete the steps above, OAuth will work immediately. The code automatically handles:
- Redirecting to providers
- Processing OAuth callbacks
- Creating user profiles
- Redirecting back to your app

If you still have issues after following these steps, let me know and I'll help debug!

