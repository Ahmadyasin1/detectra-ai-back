# Detectra AI — convenience targets
.PHONY: help up prod down logs health build gpu test-docker

help:
	@echo "Targets: up, prod, down, logs, health, build, gpu"

up:
	docker compose up -d --build

prod:
	docker compose --profile production up -d --build

down:
	docker compose --profile production --profile fullstack down

logs:
	docker compose logs -f api frontend

health:
	curl -fsS http://localhost:8000/health && echo

build:
	docker compose build api frontend

gpu:
	docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build

test-docker:
	powershell -ExecutionPolicy Bypass -File scripts/docker-smoke-test.ps1
