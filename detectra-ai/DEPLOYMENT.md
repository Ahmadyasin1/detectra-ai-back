# Detectra AI — Production Deployment (Docker)

Docker is the recommended way to run Detectra in production: one command brings up the **ML API**, **React UI**, and optional **Nginx gateway**.

## Architecture

```
                    ┌─────────────────────────────────────┐
  Browser :80       │  nginx (profile: production)        │
  ─────────────────►│  /api, /ws, /health  →  api:8000   │
                    │  /*                    →  frontend  │
                    └─────────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │  api (api_server.py + analyze_videos)   │
                    │  frontend (Vite build + Nginx static)   │
                    └─────────────────────────────────────────┘
                                         │
                              Supabase (auth + storage)
```

The React app talks to **`api_server.py`** (`POST /api/analyze`, WebSockets, reports).  
The separate `backend/` FastAPI app (Postgres + Celery) is **optional** (`--profile fullstack`) and not required for the default UI.

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Docker | 24+ |
| Docker Compose | v2 |
| RAM | 8 GB+ (16 GB recommended for ML) |
| Disk | 10 GB+ free (models cache) |

**GPU (optional):** [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

---

## 2. Quick start (local / VM)

```bash
cd detectra-ai
cp .env.example .env
# Edit .env: Supabase URL + anon key, ALLOWED_ORIGINS, HF_TOKEN (optional)

# Default stack = ML API + React UI from detectra-ai/detectra-ai-main
docker compose up -d --build api frontend

# Production gateway on port 80
./deploy.sh production
# or Windows:
.\deploy.ps1

# Dev mode: UI :3000, API :8000 (no gateway)
./deploy.sh dev
.\deploy.ps1 -Dev
```

**Frontend path:** `detectra-ai/detectra-ai-main` (Vite + React). Do **not** use `backend/` or `--profile fullstack` for the default video analyzer UI.

### Docker Desktop (what you should see)

| Docker Desktop group | Container | Role |
|----------------------|-----------|------|
| **detectra** | `detectra_api` | ML API (`api_server.py`) |
| **detectra** | `detectra_frontend` | UI from `detectra-ai-main` |
| **detectra** (optional) | `detectra_gateway` | Production nginx on :80 |

If you see a separate container named **`detectra-ai`** (not in the `detectra` group), it is a **legacy manual build**. Remove it:

```powershell
.\scripts\docker-cleanup.ps1
```

| URL | Service |
|-----|---------|
| http://localhost | Full app (production profile) |
| http://localhost:3000 | Frontend only (dev) |
| http://localhost:8000/health | API health |

```bash
docker compose logs -f api frontend
docker compose down
```

---

## 3. Environment variables

Copy `.env.example` → `.env`.

### Required for production quality

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (frontend build) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (frontend build) |
| `SUPABASE_JWT_SECRET` | Verify user JWTs on API |
| `ALLOWED_ORIGINS` | CORS, e.g. `https://yourdomain.com` |

### Recommended

| Variable | Purpose |
|----------|---------|
| `HF_TOKEN` | HuggingFace model downloads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side storage from API |
| `WARMUP_MODELS=1` | Pre-download YOLO weights on container start |

### Docker / split deploy

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Leave **empty** when using Docker nginx (same-origin `/api`) |
| `VITE_API_URL` | Set to `https://api.yourdomain.com` for Vercel + remote API |

---

## 4. Compose profiles

| Profile | Services | Use case |
|---------|----------|----------|
| *(default)* | `api`, `frontend` | Development, simple VM |
| `production` | + `nginx` on `:80` | Single-host production |
| `fullstack` | + `postgres`, `redis`, `backend`, `celery` | Enterprise DB API (separate from default UI) |

```bash
# Production gateway
docker compose --profile production up -d --build

# Optional Postgres backend
docker compose --profile fullstack up -d --build
```

---

## 5. GPU deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
# Windows:
.\deploy.ps1 -Gpu
```

Deploy on **DigitalOcean GPU Droplets**, **Azure NC-series**, or any host with NVIDIA drivers + container toolkit.

---

## 6. Heroku (Container)

Heroku **cannot** auto-detect Node/Python when the app lives in `detectra-ai/`. Use the **container** stack and root `heroku.yml`. See **[HEROKU.md](./HEROKU.md)**.

```bash
heroku stack:set container -a detectra-ai
```

Minimum dyno: **standard-2x** or higher (ML RAM). Frontend: Vercel or a second Heroku app.

---

## 7. Cloud deployment

### Single VM (recommended for FYP / demo)

1. Ubuntu 22.04+ VM (4 vCPU, 16 GB RAM; GPU optional).
2. Install Docker + Compose.
3. Clone repo, configure `.env`, run `./deploy.sh production`.
4. Point DNS A record → VM IP.
5. Add TLS with [Caddy](https://caddyserver.com/) or Certbot in front of port 80.

### Split deploy (scale UI separately)

| Component | Host | Notes |
|-----------|------|-------|
| Frontend | **Vercel** | Root: `detectra-ai-main`, set `VITE_API_URL=https://api.yourdomain.com` |
| API | **Docker VM / Fly / Render** | Run `api` service only from this compose file |

```bash
# API-only on a server
docker compose up -d --build api
```

Set `ALLOWED_ORIGINS` to your Vercel URL.

---

## 8. Supabase setup

1. Run SQL in `supabase/migrations/`.
2. Create storage bucket `videos` (see `002_storage_videos_bucket.sql`).
3. Auth → URL configuration:
   - `http://localhost/**`
   - `https://your-production-domain/**`

---

## 9. Post-deploy checklist

- [ ] `curl http://localhost:8000/health` → `200`
- [ ] App loads; Analyzer shows **API ONLINE**
- [ ] Upload a short MP4; progress WebSocket updates
- [ ] HTML report + labeled video download work
- [ ] `ALLOWED_ORIGINS` matches your public URL (not `*` in production)
- [ ] `.env` is not committed to git

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| `exec /entrypoint.sh: no such file or directory` | Rebuild API image (`docker compose build api`). Entrypoint is generated inside the image with Unix line endings. |
| Port 8000 / 3000 already in use | Stop local `api_server.py` / `npm run dev`, or set `API_PORT=8002` and `FRONTEND_PORT=3001` in `.env` |
| API container restarts | `docker compose logs api` — often OOM; increase RAM or use GPU |
| CORS errors | Set `ALLOWED_ORIGINS` to exact frontend URL |
| Frontend can’t reach API | With gateway: use `VITE_API_URL=` empty; check `docker compose ps` |
| Slow first analysis | Set `WARMUP_MODELS=1` or run one test job to cache weights |
| Build fails on weights | Weights auto-download via Ultralytics; no `.pt` files in repo needed |
| Huge API image / slow build | CPU PyTorch is installed from the CPU wheel index (~5 GB image). Use `docker-compose.gpu.yml` on NVIDIA hosts. |

### Local smoke test (Windows)

```powershell
cd detectra-ai
.\deploy.ps1 -Dev          # auto-picks 8002/3001 if dev servers are running
.\scripts\docker-smoke-test.ps1
```

---

## 11. Student Pack hosts

- **DigitalOcean:** GPU Droplet + this compose file.
- **Azure:** NC-series VM + NVIDIA toolkit + `docker-compose.gpu.yml`.
- **Vercel:** Frontend only; API on VM with `VITE_API_URL` pointing to your server.
