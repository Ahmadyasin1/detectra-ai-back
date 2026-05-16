# Deploy Detectra AI on Heroku

Heroku failed with **"No default language could be detected"** because:

1. No `heroku.yml` + **Container** stack, and  
2. GitHub upload was missing `api_server.py`, `requirements.api.txt`, and `Dockerfile.heroku` at the **repo root**.

See **[GITHUB_UPLOAD.md](../GITHUB_UPLOAD.md)** if you used “Add files via upload” on GitHub.

Use **Heroku Container** (`heroku.yml` at repo root → `Dockerfile.heroku`), not the default buildpack.

### If you use the Python buildpack instead (logs show `heroku/python`)

1. **Slug limit (~900 MB)** — Root `requirements.txt` installs `requirements.heroku.txt` (no `openai-whisper` / Triton). Full ASR fallback is `pip install -r requirements.api.txt` locally.
2. **ffmpeg** — Root `Aptfile` is only applied if the **Apt** buildpack runs **before** Python. From the repo root, `app.json` lists the correct order; for an existing app run:
   ```bash
   heroku buildpacks:clear -a YOUR_APP
   heroku buildpacks:add https://github.com/heroku/heroku-buildpack-apt -a YOUR_APP
   heroku buildpacks:add heroku/python -a YOUR_APP
   ```
3. Prefer **Container** stack for reproducible ML images: `heroku stack:set container -a YOUR_APP` and deploy with `heroku.yml` (no Python slug).

---

## Architecture on Heroku

| Heroku app | What runs | Dockerfile |
|------------|-----------|------------|
| **detectra-ai** (API) | `api_server.py` | `detectra-ai/Dockerfile.heroku` |
| **detectra-ai-web** (optional) | `detectra-ai-main` UI | `detectra-ai-main/Dockerfile.heroku` |

**Recommended:** API on Heroku + UI on **Vercel** (free, easier).  
**Minimum dyno for API:** `standard-2x` or `performance-m` (ML needs RAM; 512MB will OOM).

**Web dynos:** Use exactly **one** web dyno or uploads/WebSockets hit different servers and you see `Job 'xxxxxxxx' not found`:

```bash
heroku ps:scale web=1 -a YOUR_APP
```

---

## One-time setup (API app)

### 1. Set stack to Container

**Dashboard:** App → **Settings** → **Stack** → **Container**

**CLI:**
```bash
heroku stack:set container -a detectra-ai
```

### 2. Connect GitHub

Deploy branch **`main`**. At **repo root** you must have:

- `heroku.yml` → `Dockerfile.heroku`
- `api_server.py`, `analyze_videos.py`, `requirements.api.txt`

### 3. Config vars (Settings → Config Vars)

| Variable | Example |
|----------|---------|
| `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,https://detectra-ai-web.herokuapp.com` |
| `VITE_SUPABASE_URL` | (if needed server-side) |
| `SUPABASE_JWT_SECRET` | from Supabase |
| `HF_TOKEN` | optional |
| `WARMUP_MODELS` | `0` (set `1` to pre-download YOLO on boot; slower deploy) |

Do **not** set `PORT` — Heroku sets it automatically.

### 4. Deploy

Push to GitHub (connected branch) or:

```bash
git push heroku main
```

Health check: `https://detectra-ai.herokuapp.com/health`

---

## Frontend options

### A) Vercel (easiest)

- Root directory: `detectra-ai/detectra-ai-main`
- `VITE_API_URL=https://detectra-ai.herokuapp.com`

### B) Second Heroku app

1. Create app `detectra-ai-web`
2. `heroku stack:set container`
3. Use `detectra-ai/detectra-ai-main/heroku.yml` — set **Root Directory** in Heroku to `detectra-ai/detectra-ai-main` if the platform supports it, or copy `heroku.yml` into that folder at repo root for a subtree deploy.

Config:

```
VITE_API_URL=https://detectra-ai.herokuapp.com
```

(Build args must be set at Docker build — use Heroku `ARG` via `heroku.yml` env or rebuild with Config Vars mapped in CI.)

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| No default language detected | Enable **container** stack; add root `heroku.yml` |
| Repository not found (Git) | Fix `git remote` URL |
| App crashed (H14/H10) | Increase dyno size; check `heroku logs --tail` |
| R14 Memory quota | Upgrade to **standard-2x** or higher |
| Request timeout | Video jobs are long; Heroku has 30s HTTP timeout on router — use async jobs + polling (already in API) |

---

## Why not buildpack-only?

- ML stack (~5GB image): **Docker required**
- Frontend is in **`detectra-ai/detectra-ai-main`**, not repo root
- Default UI uses **`api_server.py`**, not `backend/` Postgres stack

For full production (nginx + api + ui), use **Docker Compose on Azure/VM** — see `DEPLOYMENT.md`.
