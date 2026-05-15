# 🚀 Vercel Deployment Guide

Complete guide to deploy Detectra AI on Vercel.

## ✅ Pre-Deployment Checklist

- [ ] Code committed to Git repository
- [ ] Environment variables documented
- [ ] Build tested locally (`npm run build`)
- [ ] Supabase database migrations run
- [ ] OAuth providers configured

## 📦 Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

Or use npx (no installation needed):
```bash
npx vercel
```

## 🔐 Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate with Vercel.

## 🚀 Step 3: Deploy to Vercel

### Option A: Deploy via CLI (Recommended)

1. **Navigate to your project directory**:
   ```bash
   cd detectra-ai-main
   ```

2. **Deploy to production**:
   ```bash
   vercel --prod
   ```

   Or for a preview deployment first:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No** (for first deployment)
   - Project name: `detectra-ai` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings? **No**

### Option B: Deploy via GitHub Integration

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Import project in Vercel Dashboard**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **Add New Project**
   - Import your GitHub repository
   - Configure project settings (see below)
   - Click **Deploy**

## ⚙️ Step 4: Configure Environment Variables

### Via Vercel Dashboard:

1. Go to your project on [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Settings** → **Environment Variables**
3. Add the following variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://txkwnceefmaotmqluajc.supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |

4. Click **Save**

### Via CLI:

```bash
vercel env add VITE_SUPABASE_URL production
# Paste: https://txkwnceefmaotmqluajc.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste your Supabase anon key
```

## 🔄 Step 5: Redeploy After Adding Environment Variables

After adding environment variables, you need to redeploy:

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel Dashboard:
- Go to **Deployments** tab
- Click the **⋯** menu on the latest deployment
- Click **Redeploy**

## 🌐 Step 6: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `detectra.ai`)
4. Follow DNS configuration instructions
5. Vercel will automatically provision SSL certificate

## 🔧 Step 7: Update Supabase Redirect URLs

After deployment, update Supabase to allow your Vercel domain:

1. **Go to Supabase Dashboard**:
   - [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Authentication** → **URL Configuration**

2. **Update Site URL**:
   - Set to: `https://your-project.vercel.app` (or your custom domain)

3. **Add Redirect URLs**:
   ```
   https://your-project.vercel.app/demo
   https://your-project.vercel.app/*
   https://your-custom-domain.com/demo
   https://your-custom-domain.com/*
   ```

4. **Update OAuth Providers**:
   - **Google OAuth**: Update redirect URI in Google Cloud Console
   - **GitHub OAuth**: Update callback URL in GitHub OAuth App settings

## 📊 Step 8: Verify Deployment

### Check Deployment Status:

1. Go to **Deployments** tab in Vercel Dashboard
2. Wait for build to complete (usually 1-2 minutes)
3. Click on the deployment to see build logs
4. Click **Visit** to open your live site

### Test Your Application:

- [ ] Homepage loads correctly
- [ ] Sign-up works
- [ ] Sign-in works
- [ ] Google OAuth works
- [ ] GitHub OAuth works
- [ ] Demo page loads and video plays
- [ ] Protected routes work
- [ ] Profile page accessible

## 🔍 Troubleshooting

### Build Fails

**Error**: Build command failed
- **Solution**: Check build logs in Vercel Dashboard
- Verify Node.js version (should be 18+)
- Check for TypeScript errors: `npm run typecheck`
- Check for linting errors: `npm run lint`

**Error**: Module not found
- **Solution**: Ensure `package.json` has all dependencies
- Run `npm install` locally to verify dependencies

### Environment Variables Not Working

**Error**: Supabase connection fails
- **Solution**: 
  - Verify environment variables are set in Vercel
  - Check variable names start with `VITE_`
  - Redeploy after adding variables
  - Check browser console for errors

### OAuth Not Working

**Error**: OAuth redirect fails
- **Solution**:
  - Update Supabase redirect URLs with your Vercel domain
  - Update OAuth provider settings (Google/GitHub)
  - Clear browser cache and cookies
  - Check Supabase logs for errors

### Routing Issues

**Error**: 404 on page refresh
- **Solution**: `vercel.json` is already configured with rewrites
- If issues persist, verify `vercel.json` is in root directory

### Video Not Loading

**Error**: Video fails to load
- **Solution**:
  - Check Supabase Storage bucket permissions
  - Verify video URL is accessible
  - Check CORS settings in Supabase
  - Check browser console for CORS errors

## 📈 Performance Optimization

Vercel automatically optimizes your deployment:

- ✅ **Automatic HTTPS** - SSL certificates provisioned automatically
- ✅ **Global CDN** - Content delivered from edge locations
- ✅ **Automatic Compression** - Gzip/Brotli compression enabled
- ✅ **Image Optimization** - Automatic image optimization (if using Vercel Image)
- ✅ **Caching** - Static assets cached with optimal headers

### Monitor Performance:

1. Go to **Analytics** tab in Vercel Dashboard
2. View:
   - Page views
   - Performance metrics
   - Core Web Vitals
   - Real User Monitoring (RUM)

## 🔄 Continuous Deployment

### Automatic Deployments:

Vercel automatically deploys when you push to your connected Git branch:

1. **Push to `main` branch** → Deploys to production
2. **Push to other branches** → Creates preview deployment
3. **Pull requests** → Creates preview deployment with PR link

### Manual Deployment:

```bash
vercel --prod
```

## 🔐 Security Best Practices

Vercel provides:

- ✅ **Automatic HTTPS** - All deployments use HTTPS
- ✅ **DDoS Protection** - Built-in protection
- ✅ **Security Headers** - Configured in `vercel.json`
- ✅ **Environment Variables** - Encrypted at rest

## 📝 Vercel Configuration

Your `vercel.json` is already configured with:

- ✅ SPA routing (all routes → index.html)
- ✅ Cache headers for static assets
- ✅ Security headers
- ✅ Build command and output directory

## 🎯 Quick Reference

### Deploy Commands:

```bash
# First deployment
vercel

# Production deployment
vercel --prod

# Preview deployment
vercel

# View deployments
vercel ls

# View logs
vercel logs
```

### Environment Variables:

```bash
# Add environment variable
vercel env add VITE_SUPABASE_URL production

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VITE_SUPABASE_URL production
```

## ✅ Post-Deployment Checklist

- [ ] Application loads correctly
- [ ] Environment variables working
- [ ] Authentication works (email/password)
- [ ] OAuth works (Google/GitHub)
- [ ] Demo page loads
- [ ] Video plays correctly
- [ ] Protected routes work
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Analytics enabled (optional)

## 🆘 Support

If you encounter issues:

1. **Check Vercel Dashboard** → **Deployments** → Build logs
2. **Check Browser Console** for client-side errors
3. **Check Supabase Logs** for backend errors
4. **Review Documentation**:
   - [Vercel Docs](https://vercel.com/docs)
   - [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

## 🎉 Success!

Your Detectra AI application is now live on Vercel! 🚀

**Next Steps**:
- Share your deployment URL
- Monitor performance in Vercel Analytics
- Set up custom domain (optional)
- Configure monitoring and alerts

---

**Need help?** Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for general deployment information.

