# 🚀 Detectra AI — Production Deployment Guide

## Overview
Your Detectra AI project has been transformed into a production-ready, containerized application with:
- **PostgreSQL** database for data persistence
- **Redis** for Celery task queuing and caching
- **FastAPI backend** with AI pipeline processing
- **Celery workers** for background task processing
- **React frontend** served via Nginx
- **Nginx reverse proxy** for production deployment
- **Docker Compose** orchestration with health checks

## Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  FastAPI Backend │    │  Celery Worker  │
│     (Nginx)     │◄──►│   + AI Pipeline  │◄──►│  + AI Pipeline  │
│   Port 3000     │    │    Port 8000     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   PostgreSQL    │    │      Redis      │
                    │   Port 5432     │    │    Port 6379    │
                    └─────────────────┘    └─────────────────┘
```

## Prerequisites
- Docker & Docker Compose installed
- At least 8GB RAM recommended
- At least 20GB free disk space
- Internet connection for model downloads

## Quick Deployment

### 1. Environment Setup
```bash
cd detectra-ai
cp .env.example .env
# Edit .env with your settings:
# - Database passwords
# - Supabase credentials (if using)
# - API ports
# - Security settings
```

### 2. Deploy
```bash
# Development deployment
docker compose up --build -d

# Production deployment (with nginx)
docker compose --profile production up --build -d
```

### 3. Access Your Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Production** (nginx): http://localhost

## Services Overview

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: detectra_db
- **User**: detectra
- **Auto-migrations**: Run on container startup

### Cache & Queue (Redis)
- **Port**: 6379
- **Usage**: Celery broker and result backend

### Backend API (FastAPI)
- **Port**: 8000
- **Features**:
  - Video upload and analysis
  - Real-time WebSocket progress
  - RESTful API endpoints
  - JWT authentication (optional)

### Celery Workers
- **Purpose**: Background video processing
- **Concurrency**: 2 workers
- **Queue**: analysis

### Frontend (React + Nginx)
- **Port**: 3000
- **Build**: Static files served via Nginx

### Production Proxy (Nginx)
- **Port**: 80
- **Routes**:
  - `/api/*` → backend:8000
  - `/ws/*` → backend:8000 (WebSocket)
  - `/*` → frontend:80

## Environment Variables

### Required
```bash
# Database
POSTGRES_USER=detectra
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=detectra_db

# Security
SECRET_KEY=your_32_char_hex_secret_key

# Supabase (for frontend auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optional
```bash
# Ports
API_PORT=8000
FRONTEND_PORT=3000
HTTP_PORT=80

# AI Pipeline
YOLO_CONFIDENCE_THRESHOLD=0.5
WHISPER_MODEL_SIZE=base
```

## File Structure
```
detectra-ai/
├── docker-compose.yml          # Main orchestration
├── .env                        # Environment variables
├── deploy.sh                   # Deployment script
├── backend/                    # FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/               # Database migrations
│   └── app/
├── detectra-ai-main/          # React frontend
├── nginx/
│   └── nginx.conf             # Production proxy config
└── models/                    # YOLO model weights
    ├── yolov8s-seg.pt
    └── yolov8n-pose.pt
```

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery_worker
```

### Health Checks
```bash
# Check all services
docker compose ps

# Manual health check
curl http://localhost:8000/health
```

### Database Management
```bash
# Access database
docker compose exec postgres psql -U detectra -d detectra_db

# Run migrations manually
docker compose exec backend alembic upgrade head
```

### Scaling
```bash
# Scale celery workers
docker compose up -d --scale celery_worker=4

# Update services
docker compose pull && docker compose up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `.env` if 8000/3000/5432 are in use
2. **Memory issues**: Ensure 8GB+ RAM, reduce concurrency if needed
3. **Model download fails**: Check internet connection, models download on first use
4. **Database connection fails**: Wait for postgres health check, check credentials

### Reset Everything
```bash
# Stop and remove everything
docker compose down -v --remove-orphans

# Clean up
docker system prune -a
```

## Security Considerations

### Production Checklist
- [ ] Change all default passwords
- [ ] Generate secure SECRET_KEY
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS certificates
- [ ] Enable Supabase JWT verification
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Regular security updates

### Backup Strategy
```bash
# Backup database
docker compose exec postgres pg_dump -U detectra detectra_db > backup.sql

# Backup volumes
docker run --rm -v detectra_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## Performance Optimization

### For High Traffic
1. Increase Celery workers: `--scale celery_worker=4`
2. Add Redis persistence
3. Use PostgreSQL connection pooling
4. Implement API rate limiting
5. Add load balancer in front of nginx

### Resource Requirements
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB+ for models and data
- **Network**: Stable internet for model downloads

## Next Steps

1. **Test the deployment** with sample videos
2. **Configure monitoring** (Prometheus + Grafana)
3. **Set up CI/CD** pipeline
4. **Add SSL certificates** for HTTPS
5. **Configure backup automation**
6. **Set up log aggregation**

---

## Support

If you encounter issues:
1. Check the logs: `docker compose logs -f`
2. Verify environment variables in `.env`
3. Ensure all required ports are available
4. Check system resources (RAM, disk space)

Your Detectra AI system is now production-ready! 🎉