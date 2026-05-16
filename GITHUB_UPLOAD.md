# GitHub upload guide (detectra-ai-back)

## Heroku “No requirements.txt” / Python buildpack error

Your log shows **`Heroku-24` + `heroku/python`**. That ignores `heroku.yml` and `Dockerfile.heroku`.

**Recommended (ML API):** Heroku Dashboard → app **Settings** → **Stack** → **container** → remove all buildpacks → redeploy. Build log should mention **Docker**, not buildpacks.

**Fallback:** Root `requirements.txt` + `Procfile` + `Aptfile` were added for Python buildpack (may hit slug size limits; use **Standard-2x** dyno).

---

You uploaded files with **“Add files via upload”**. That works, but the repo must match what Docker/Heroku expect.

Your UI (`detectra-ai-main`) talks to **`api_server.py`**, not the optional `backend/` Postgres API.

---

## What you already have on GitHub (approx.)

| On GitHub root | Purpose |
|----------------|---------|
| `backend/`, `app/`, `alembic/` | Optional enterprise API (needs Postgres — **not** used by default UI) |
| `docker/`, `nginx/`, `scripts/` | Docker deploy helpers |
| `supabase/migrations/` | Database SQL |
| `uploads/`, `static/` | Data / assets |
| `DEPLOYMENT.md` | Docs |

---

## Required files still missing on GitHub

Upload these from your PC folder  
`F:\working\New FYP Ahmad Using Antigravity and Claude\detectra-ai\`  
to the **root** of https://github.com/Ahmadyasin1/detectra-ai-back (same level as `DEPLOYMENT.md`):

### ML API (required for Heroku + Analyzer)

| Upload this file | From local path |
|------------------|-----------------|
| `api_server.py` | repo root (or `detectra-ai/`) |
| `analyze_videos.py` | repo root |
| `detectra_accuracy.py` | repo root |
| `detectra_cv2.py` | repo root — **required** for Heroku OpenCV |
| `requirements.txt` | repo root — points to `requirements.heroku.txt` |
| `requirements.heroku.txt` | repo root |
| `requirements.api.txt` | repo root (local full install) |
| `Procfile` | `web: bash bin/start` |
| `bin/post_compile` | removes GUI OpenCV after pip install |
| `bin/start` | startup check + uvicorn |
| `Aptfile` | ffmpeg + libGL libs |
| `app.json` | Apt + Python buildpack order |
| `dashboard.html` | repo root |
| `Dockerfile.heroku` | repo root |
| `heroku.yml` | repo root (Container stack) |
| `HEROKU.md` | `detectra-ai/HEROKU.md` |

### Frontend (required for the website)

Upload the **entire folder**:

| Upload | From local path |
|--------|-----------------|
| `detectra-ai-main/` (all files) | `detectra-ai/detectra-ai-main/` |

### Recommended extras

| File / folder | From |
|---------------|------|
| `docker-compose.yml` | `detectra-ai/docker-compose.yml` |
| `Dockerfile.api` | `detectra-ai/Dockerfile.api` |
| `deploy.ps1`, `deploy.sh` | `detectra-ai/` |
| `.env.example` | `detectra-ai/.env.example` |
| `.gitignore` | `detectra-ai/.gitignore` |

**Do not upload** `.env` (secrets), `analysis_output/`, `*.mp4`, `jobs_db.sqlite3`.

---

## Correct GitHub root layout (target)

```
detectra-ai-back/
├── heroku.yml              ← Heroku Container config
├── Dockerfile.heroku       ← API Docker image
├── Procfile                ← web: bash bin/start
├── bin/post_compile        ← fix OpenCV on build
├── bin/start               ← runtime entry
├── detectra_cv2.py         ← headless OpenCV
├── api_server.py           ← ML API (UI uses this)
├── analyze_videos.py
├── detectra_accuracy.py
├── requirements.api.txt
├── detectra-ai-main/       ← React UI (full folder)
├── docker-compose.yml
├── docker/
├── nginx/
├── scripts/
├── supabase/
├── DEPLOYMENT.md
├── HEROKU.md
├── backend/                ← optional (not for default Heroku app)
└── ...
```

---

## Heroku after upload

1. **Settings → Stack → Container**
2. Upload/push `heroku.yml` + `Dockerfile.heroku` + API files above
3. **Deploy** branch `main`
4. Config vars: `ALLOWED_ORIGINS`, `SUPABASE_JWT_SECRET`, etc. (see `HEROKU.md`)
5. Dyno: **Standard-2x** or larger
6. Test: `https://detectra-ai.herokuapp.com/health`

Frontend: deploy `detectra-ai-main` to **Vercel** with  
`VITE_API_URL=https://detectra-ai.herokuapp.com`

---

## Easier than web upload: Git push

```powershell
cd "f:\working\New FYP Ahmad Using Antigravity and Claude"
git remote set-url origin https://github.com/Ahmadyasin1/detectra-ai-back.git
git add heroku.yml Dockerfile.heroku app.json GITHUB_UPLOAD.md detectra-ai/
git commit -m "Add Heroku config and full detectra-ai project"
git push origin master:main
```

(Use `main` if GitHub default branch is `main`.)

---

## Important

| Mistake | Result |
|---------|--------|
| Only `backend/` on GitHub | Heroku build fails or UI cannot analyze video |
| No `heroku.yml` | “No default language detected” |
| Buildpack stack (not Container) | Same error |
| Free dyno for ML | Crashes (out of memory) |

Your local Docker setup uses **`detectra-ai/detectra-ai-main` + `api_server.py`** — GitHub must include the same files.
