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

Required backend env vars: `DATABASE_URL`, `HUBCAP_APIKEY`, `ADMIN_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`, `BOT_API_KEY`.

Optional backend env vars (only used as fallback until overridden in web admin → **Bot** menu): `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`, `ROLE_ADMIN`, `ROLE_OG`.

Required bot env vars: `API_URL`, `BOT_API_KEY`. The Discord login token is NOT read from env anymore — the bot fetches it from the backend once at startup via `GET /bot/config` (sourced from web admin → Bot → `app_settings`). Changing the token in admin requires a bot restart (no polling, to save usage).

## Architecture

- **Frontend**: SPA with state-based page switching (no router). Entry: `frontend/src/main.tsx`. Pages: Home, Manifest (search + download), Fixes.
- **Backend**: FastAPI, auto-creates DB tables on startup (`models.Base.metadata.create_all`). DB: PostgreSQL + SQLAlchemy. Rate limiting via slowapi (in-memory, per-IP).
- **Bot**: Single slash command `/token` that calls `POST /bot/token` on the backend.

### API route layout

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/api` | Token (hubcap) or API key (manifesthub1) | Manifest download, search, status, steam details |
| `/admin` | `x-api-key` header (constant-time compare via `secrets.compare_digest`) | Token CRUD, settings, bot config + roles, user stats |
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
- **Daily limits**: Per Discord role via `bot_roles` table, managed in web admin → **Bot** menu (`limit: null` = unlimited). Env `ROLE_LIMIT` only used as fallback until roles are configured in the DB. Discord guild ID + bot token also configurable in web admin (`app_settings`), with env fallback.
- **Channel restriction**: `/token` rejected in DMs (`guild_id` empty) and in non-configured guilds. `discord_allowed_channels` setting (comma/newline separated channel IDs, web admin → **Bot**) restricts allowed channels; empty = all guild channels allowed. Bot sends `guild_id` + `channel_id` in `POST /bot/token`.

## Deployment

- Frontend: Vercel
- Backend: Railway
- Bot: wispbyte
- DB: Supabase (PostgreSQL)
