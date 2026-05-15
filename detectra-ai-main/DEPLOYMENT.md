# 🚀 Production Deployment Guide

This guide will help you deploy Detectra AI to production.

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] OAuth providers configured (Google/GitHub)
- [ ] Build tested locally (`npm run build`)
- [ ] Production build verified (`npm run preview:prod`)

## 🔧 Environment Setup

### 1. Create Production Environment File

Create a `.env.production` file (or set environment variables in your hosting platform):

```bash
VITE_SUPABASE_URL=https://txkwnceefmaotmqluajc.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

**Important**: Never commit `.env.production` to version control!

### 2. Update Supabase Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

1. **Site URL**: Set to your production domain (e.g., `https://detectra.ai`)
2. **Redirect URLs**: Add your production URLs:
   ```
   https://detectra.ai/demo
   https://detectra.ai/*
   https://www.detectra.ai/demo
   https://www.detectra.ai/*
   ```

### 3. Update OAuth Provider Redirect URLs

#### Google OAuth:
- In Google Cloud Console, add your production domain to:
  - **Authorized JavaScript origins**: `https://detectra.ai`
  - **Authorized redirect URIs**: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`

#### GitHub OAuth:
- In GitHub OAuth App settings, update:
  - **Homepage URL**: `https://detectra.ai`
  - **Authorization callback URL**: `https://txkwnceefmaotmqluajc.supabase.co/auth/v1/callback`

## 🌐 Deployment Platforms

### Vercel (Recommended)

Vercel is the easiest and fastest way to deploy React applications.

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

#### Step 2: Deploy
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Step 3: Configure Environment Variables
1. Go to your project on Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy

#### Step 4: Configure Custom Domain (Optional)
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

**Vercel Configuration** (`vercel.json` is already configured):
- Automatic HTTPS
- SPA routing support
- Optimized caching headers

### Netlify

#### Step 1: Install Netlify CLI
```bash
npm i -g netlify-cli
```

#### Step 2: Deploy
```bash
# Build the project
npm run build

# Deploy to production
netlify deploy --prod --dir=dist
```

#### Step 3: Configure Environment Variables
1. Go to Netlify Dashboard → **Site settings** → **Environment variables**
2. Add your environment variables
3. Redeploy

#### Step 4: Create `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

#### Step 1: Install gh-pages
```bash
npm install --save-dev gh-pages
```

#### Step 2: Update `package.json`
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  },
  "homepage": "https://yourusername.github.io/detectra-ai"
}
```

#### Step 3: Deploy
```bash
npm run deploy
```

**Note**: Update `vite.config.ts` base to `'/detectra-ai/'` if using GitHub Pages.

### Docker

#### Step 1: Create `Dockerfile`
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Step 2: Create `nginx.conf`
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Step 3: Build and Run
```bash
docker build -t detectra-ai .
docker run -p 3000:80 detectra-ai
```

### AWS S3 + CloudFront

#### Step 1: Build
```bash
npm run build
```

#### Step 2: Upload to S3
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

#### Step 3: Configure CloudFront
1. Create CloudFront distribution
2. Set origin to your S3 bucket
3. Configure error pages:
   - 403 → `/index.html` (200)
   - 404 → `/index.html` (200)

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly
- ✅ Use secrets management in your hosting platform

### 2. Supabase Security
- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Review and test RLS policies
- ✅ Use service role key only on backend (never in frontend)
- ✅ Enable rate limiting in Supabase

### 3. HTTPS
- ✅ Always use HTTPS in production
- ✅ Enable HSTS headers
- ✅ Use secure cookies

### 4. Content Security Policy
Add CSP headers in your hosting platform:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://txkwnceefmaotmqluajc.supabase.co;
```

## 📊 Performance Optimization

### 1. Enable Compression
Most hosting platforms enable gzip/brotli automatically. Verify in:
- Vercel: Automatic
- Netlify: Automatic
- Nginx: Add compression module

### 2. CDN Configuration
- ✅ Enable CDN caching for static assets
- ✅ Set appropriate cache headers
- ✅ Use CDN for video assets (Supabase Storage)

### 3. Monitoring
Consider adding:
- **Sentry** for error tracking
- **Google Analytics** for user analytics
- **Lighthouse CI** for performance monitoring

## 🧪 Post-Deployment Testing

### 1. Test Authentication
- [ ] Email/password sign-up works
- [ ] Email/password sign-in works
- [ ] Google OAuth works
- [ ] GitHub OAuth works
- [ ] Sign-out works
- [ ] Protected routes redirect correctly

### 2. Test Core Features
- [ ] Demo page loads correctly
- [ ] Video plays correctly
- [ ] Navigation works
- [ ] Forms submit correctly
- [ ] Profile page works

### 3. Test Performance
- [ ] Page load time < 3s
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] Mobile responsive

### 4. Test Security
- [ ] HTTPS enabled
- [ ] No sensitive data in console
- [ ] RLS policies working
- [ ] OAuth redirects work

## 🔄 Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 📝 Rollback Procedure

If something goes wrong:

1. **Vercel**: Go to Deployments → Select previous deployment → Promote to Production
2. **Netlify**: Go to Deploys → Select previous deploy → Publish deploy
3. **Docker**: Tag and keep previous image versions
4. **S3**: Keep previous versions in S3 versioning

## 🆘 Troubleshooting

### Build Fails
- Check Node.js version (18+)
- Clear `node_modules` and reinstall
- Check for TypeScript errors: `npm run typecheck`
- Check for linting errors: `npm run lint`

### Environment Variables Not Working
- Verify variable names start with `VITE_`
- Restart development server after adding variables
- Check hosting platform's environment variable settings

### OAuth Not Working in Production
- Verify redirect URLs match exactly
- Check Supabase URL configuration
- Verify OAuth app settings in Google/GitHub

### Video Not Loading
- Check Supabase Storage bucket permissions
- Verify video URL is accessible
- Check CORS settings in Supabase

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs
3. Review deployment logs
4. Contact support: contact@nexariza.com

---

**Ready to deploy?** Follow the steps above for your chosen platform!

