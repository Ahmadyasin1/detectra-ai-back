import os
import shutil
from pathlib import Path

SRC = Path(r"f:/working/New FYP Ahmad Using Antigravity and Claude/detectra-ai/backend")
DST = Path(r"f:/working/New FYP Ahmad Using Antigravity and Claude/backend_clean")

EXCLUDE_DIRS = {"venv", ".pytest_cache", "__pycache__", "temp", "uploads", "tests", "models"}
EXCLUDE_FILES = {"detectra.db", "detectra_dev.db"}

if DST.exists():
    print(f"Removing existing destination {DST}")
    shutil.rmtree(DST)

DST.mkdir(parents=True)
print(f"Created destination {DST}")

# Copy top-level files
for item in SRC.iterdir():
    name = item.name
    if item.is_dir():
        if name in EXCLUDE_DIRS:
            print(f"Skipping dir {name}")
            continue
        # copy tree
        dest = DST / name
        print(f"Copying dir {item} -> {dest}")
        shutil.copytree(item, dest, ignore=shutil.ignore_patterns("*.pyc", "*.pyo", "*.log", "*.db", "*.sqlite3", "venv", "__pycache__", ".ruff_cache"), dirs_exist_ok=True)
    else:
        if name in EXCLUDE_FILES:
            print(f"Skipping file {name}")
            continue
        if name.endswith(('.pt', '.zip')):
            print(f"Skipping large file {name}")
            continue
        # Only copy relevant files
        if name in {"Dockerfile", "requirements.txt", "pyproject.toml", "alembic.ini", ".env.example", ".dockerignore", "README.md", "Dockerfile"} or name.endswith(('.yml', '.yaml')):
            print(f"Copying file {item}")
            shutil.copy2(item, DST / name)

# Ensure app package exists
if not (DST / "app").exists():
    raise SystemExit("app package not found in source; aborting")

print("Prune model weights if any accidentally copied")
models_dir = DST / 'models'
if models_dir.exists():
    for f in models_dir.iterdir():
        if f.suffix in {'.pt', '.pth', '.zip'}:
            print(f"Removing model file {f.name}")
            f.unlink()

# Create a minimal .gitignore
gitignore = DST / '.gitignore'
with gitignore.open('w', encoding='utf-8') as g:
    g.write("venv/\n__pycache__/\n*.db\n*.sqlite3\nmodels/*\nuploads/*\n")

print("Copy complete. Summary:")
for root, dirs, files in os.walk(DST):
    rel = Path(root).relative_to(DST)
    print(f"{rel}/: dirs={len(dirs)} files={len(files)}")

print(f"Backend package ready at: {DST}")
