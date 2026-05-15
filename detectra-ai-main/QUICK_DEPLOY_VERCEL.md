# ⚡ Quick Deploy to Vercel

## 🚀 3-Step Deployment

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
vercel --prod
```

That's it! 🎉

---

## ⚙️ After Deployment: Set Environment Variables

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

```
VITE_SUPABASE_URL = https://txkwnceefmaotmqluajc.supabase.co
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key_here
```

5. **Redeploy** (click Redeploy in Deployments tab)

---

## ✅ Verify It Works

Visit your deployment URL and test:
- [ ] Homepage loads
- [ ] Sign-up works
- [ ] Sign-in works
- [ ] Demo page loads

---

## 📖 Need More Details?

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete guide.

