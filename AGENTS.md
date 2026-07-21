# DiTXTools

Steam manifest downloader with multi-provider support.

## Structure

```
backend/     Python FastAPI (uvicorn)
bot/         Discord bot (discord.py)
frontend/    Vite + React 19 + TypeScript 6.0
```

## Commands

| Directory | Command | Description |
|-----------|---------|-------------|
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | `tsc -b && vite build` |
| `frontend/` | `npm run lint` | `eslint .` |
| `backend/` | `uvicorn main:app --reload` | Dev server |
| `bot/` | `python main.py` | Run bot |

No tests exist anywhere in the repo.

## Config

- **Backend** loads `.env` from `backend/.env` then root `.env` (two `load_dotenv()` calls).
- **Frontend** env: `VITE_API_URL` (set in `.env.development` / `.env.production`).
- **Bot** loads `.env` from `bot/.env` then root `.env`.

Required backend env vars: `DATABASE_URL`, `HUBCAP_APIKEY`, `ADMIN_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`, `BOT_API_KEY`, `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`, `ROLE_ADMIN`, `ROLE_OG`.

Required bot env vars: `TOKEN` (Discord), `API_URL`, `BOT_API_KEY`.

## Architecture

- **Frontend**: SPA with state-based page switching (no router). Entry: `frontend/src/main.tsx`. Pages: Home, Manifest (search + download), Fixes.
- **Backend**: FastAPI, auto-creates DB tables on startup (`models.Base.metadata.create_all`). DB: PostgreSQL + SQLAlchemy. Rate limiting via slowapi (in-memory, per-IP).
- **Bot**: Single slash command `/token` that calls `POST /bot/token` on the backend.

### API route layout

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/api` | Token (hubcap) or API key (manifesthub1) | Manifest download, search, status, steam details |
| `/admin` | `x-api-key` header (constant-time compare via `secrets.compare_digest`) | Token CRUD, settings, user stats |
| `/bot` | `x-api-key` header | Discord token generation |

### Manifest providers

| Source | Requires | Type |
|--------|----------|------|
| hubcap | Token (single-use, 1h expiry) | Proxy to hubcapmanifest.com |
| manifesthub1 | API key | Finder API + bundle download |
| sushi | None | GitHub raw zip |
| ryuu | None | Direct HTTP |
| yaszz | None | GitHub archive download |

### Token system

- Format: `DX-XXXXX` (uppercase alphanumeric, `secrets` module).
- **Atomic claiming**: SQL `UPDATE ... WHERE used_at IS NULL` prevents TOCTOU races (see `token_service.py:claim_token`).
- **Released** on failed download (404 or upstream error).
- **Daily limits**: Per Discord role via `ROLE_LIMIT` in config (admin: unlimited, OG: 1/day).

## Deployment

- Frontend: Vercel
- Backend: Railway
- Bot: wispbyte
- DB: Supabase (PostgreSQL)
