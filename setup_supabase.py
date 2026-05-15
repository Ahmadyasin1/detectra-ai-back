"""
Detectra AI - Supabase Setup & Health Check
============================================
Run ONCE (or any time) to verify Supabase connectivity and print migration SQL.

Usage:
    python setup_supabase.py

Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from detectra-ai-main/.env
"""
from __future__ import annotations
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── Read env from frontend .env ───────────────────────────────────────────────
ENV_FILE = Path(__file__).parent / "detectra-ai-main" / ".env"
env: dict[str, str] = {}
if ENV_FILE.exists():
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()

SUPABASE_URL      = env.get("VITE_SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = env.get("VITE_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in detectra-ai-main/.env")
    sys.exit(1)

print(f"Supabase URL : {SUPABASE_URL}")
print("Anon key     : [set]")
print()


def supabase_get(path: str) -> tuple[int, object]:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    })
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read() or b"{}"
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body.decode("utf-8", errors="replace")}


# ── Check each table ──────────────────────────────────────────────────────────
TABLES = ["video_uploads", "user_profiles", "contact_submissions", "demo_analytics"]
missing = []

for table in TABLES:
    status, data = supabase_get(f"{table}?limit=1")
    if status == 200:
        print(f"  [OK]      {table}")
    elif status == 406:
        # 406 Not Acceptable is still "table exists" — just RLS returned empty
        print(f"  [OK-RLS]  {table}  (exists, RLS active, empty for anon)")
    else:
        print(f"  [MISSING] {table}  (HTTP {status}: {data})")
        missing.append(table)

print()

if not missing:
    print("All tables present. Database is ready.")
    print()
    print("Start the app:")
    print("  start.bat   (or cd detectra-ai && python api_server.py + npm run dev)")
    sys.exit(0)

# ── Print migration SQL ───────────────────────────────────────────────────────
MIGRATION_SQL = (Path(__file__).parent / "supabase" / "migrations" / "001_init.sql").read_text(encoding="utf-8")

print("=" * 65)
print("ACTION REQUIRED - Some tables are missing.")
print("=" * 65)
print()
print("  1. Go to your Supabase project dashboard")
print("     https://supabase.com/dashboard/projects")
print("  2. Click 'SQL Editor' in the left sidebar")
print("  3. Paste the SQL below and click RUN")
print()
print("-" * 65)
print(MIGRATION_SQL.strip())
print("-" * 65)
print()
print("After running the SQL, run this script again to verify:")
print("  python setup_supabase.py")
print()
print("IMPORTANT: Also check in Supabase Dashboard:")
print("  Authentication -> Providers -> Email")
print("  If 'Confirm email' is ON, users must confirm before inserting data.")
print("  For development, disable email confirmation to allow immediate use.")
