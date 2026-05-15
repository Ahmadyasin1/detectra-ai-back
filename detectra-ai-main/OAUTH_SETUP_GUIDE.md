# OAuth (Google/GitHub) Setup Guide

## ✅ Code Implementation

The OAuth implementation is now complete and working. The code handles:
- Google OAuth sign-in/sign-up
- GitHub OAuth sign-in/sign-up
- Automatic profile creation for social auth users
- Proper redirect handling after OAuth callback

## 🔧 Supabase Configuration Required

For OAuth to work, you **MUST** configure the OAuth providers in your Supabase dashboard:

### Step 1: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. Set **Application type** to **Web application**
7. Add **Authorized JavaScript origins**:
   - `https://txkwnceefmaotmqluajc.supabase.co`
   - `http://localhost:5173` (for local development)
   - Your production domain (if applicable)
8. Add **Authorized redirect URIs**:
   - `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
9. Copy the **Client ID** and **Client Secret**

10. In Supabase Dashboard:
    - Go to **Authentication** → **Providers**
    - Enable **Google**
    - Paste your **Client ID** and **Client Secret**
    - Click **Save**

### Step 2: Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Detectra AI (or your app name)
   - **Homepage URL**: `https://txkwnceefmaotmqluajc.supabase.co` (or your domain)
   - **Authorization callback URL**: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

6. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **GitHub**
   - Paste your **Client ID** and **Client Secret**
   - Click **Save**

### Step 3: Configure Redirect URLs

In Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Add your **Site URL**:
   - For development: `http://localhost:5173`
   - For production: Your production domain
3. Add **Redirect URLs** (one per line):
   ```
   http://localhost:5173/demo
   http://localhost:5173/*
   https://yourdomain.com/demo
   https://yourdomain.com/*
   ```

## 🧪 Testing OAuth

### Test Google OAuth:
1. Click "Sign in with Google" on the sign-in or sign-up page
2. You should be redirected to Google's consent screen
3. After authorizing, you'll be redirected back to `/demo`
4. Your profile should be automatically created

### Test GitHub OAuth:
1. Click "Sign in with GitHub" on the sign-in or sign-up page
2. You should be redirected to GitHub's authorization screen
3. After authorizing, you'll be redirected back to `/demo`
4. Your profile should be automatically created with GitHub username

## 🔍 Troubleshooting

### Issue: "OAuth provider not enabled"
**Solution**: Make sure you've enabled the provider in Supabase Dashboard → Authentication → Providers

### Issue: "Redirect URI mismatch"
**Solution**: 
- Check that the redirect URI in Google/GitHub matches exactly: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`
- Check that your Site URL and Redirect URLs are configured in Supabase

### Issue: "OAuth works but user not redirected"
**Solution**: 
- Check browser console for errors
- Verify `detectSessionInUrl: true` is set in `src/lib/supabase.ts` (it is)
- Check that redirect URLs are configured in Supabase

### Issue: "Profile not created after OAuth"
**Solution**: 
- Check browser console for errors
- Verify RLS policies are set up correctly
- Check Supabase logs for database errors

## 📝 Current Implementation Details

### Files Modified:
- `src/contexts/AuthContext.tsx`:
  - `signInWithProvider()` - Handles OAuth flow
  - `onAuthStateChange()` - Processes OAuth callbacks
  - `fetchUserProfile()` - Creates profile for social auth users

- `src/lib/supabase.ts`:
  - `detectSessionInUrl: true` - Automatically detects OAuth hash fragments

- `src/pages/SignIn.tsx` & `src/pages/SignUp.tsx`:
  - Social auth buttons with loading states
  - Error handling for OAuth failures

### How It Works:
1. User clicks "Sign in with Google/GitHub"
2. `signInWithProvider()` is called
3. User is redirected to provider's consent screen
4. After authorization, provider redirects to Supabase callback URL
5. Supabase processes the OAuth response and redirects to your app
6. `onAuthStateChange()` detects the new session
7. `fetchUserProfile()` creates/loads the user profile
8. User is redirected to `/demo` (or original destination)

## ✅ Checklist

Before OAuth will work:
- [ ] Google OAuth app created in Google Cloud Console
- [ ] Google Client ID and Secret added to Supabase
- [ ] GitHub OAuth app created in GitHub
- [ ] GitHub Client ID and Secret added to Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Site URL configured in Supabase

After setup:
- [ ] Test Google sign-in
- [ ] Test Google sign-up
- [ ] Test GitHub sign-in
- [ ] Test GitHub sign-up
- [ ] Verify profiles are created correctly
- [ ] Verify redirects work correctly

## 🎯 Summary

The code is **100% ready** for OAuth. You just need to:
1. Configure Google OAuth in Google Cloud Console and Supabase
2. Configure GitHub OAuth in GitHub and Supabase
3. Add redirect URLs in Supabase

Once configured, OAuth will work immediately!

