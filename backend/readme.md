# DiTXTools Backend — Dokumentasi API

Backend ditulis dengan **FastAPI**. Semua endpoint di bawah ini bisa di-explore
interaktif di Swagger UI: `http://localhost:8000/docs`.

Base URL local: `http://localhost:8000`

---

## Daftar Isi

1. [Root](#root)
2. [API Manifest (`/api`)](#api-manifest-api)
3. [Admin (`/admin`)](#admin-admin)
4. [Bot (`/bot`)](#bot-bot)
5. [Autentikasi](#autentikasi)
6. [Rate Limit](#rate-limit)

---

## Root

### `GET /`

Mengembalikan halaman HTML API reference (`templates/api.html`).

| | |
|---|---|
| Autentikasi | Tidak |
| Respons | `text/html` |

---

### `GET /admin`

Mengembalikan halaman web admin (`templates/admin.html`).

| | |
|---|---|
| Autentikasi | Tidak |
| Respons | `text/html` |

---

### `GET /favicon.ico`

Mengembalikan favicon (`static/favicon.ico`).

| | |
|---|---|
| Autentikasi | Tidak |
| Respons | `image/x-icon` |

---

### `GET /health`

Proxy health check ke upstream `https://hubcapmanifest.com/api/v1/health`.

| | |
|---|---|
| Autentikasi | Tidak |
| Respons | JSON dari upstream |

**Error:**
- `502` — gagal terhubung ke upstream.

---

### `GET /static/*`

Static files yang dimount dari direktori `backend/static`.

---

## API Manifest (`/api`)

Prefix: `/api`

---

### `POST /api/token/validate`

Cek validitas token **tanpa menandainya sebagai terpakai**. Valid = token
ditemukan, belum digunakan, dan belum kedaluwarsa (1 jam).

| | |
|---|---|
| Autentikasi | Tidak |
| Rate limit | 10/menit per IP |

**Request body (JSON):**

```json
{ "token": "DX-8F3K2Q" }
```

**Respons `200`:**

```json
{ "valid": true, "message": "Token is valid." }
```

**Error:**
- `400` — token tidak valid / sudah dipakai / kedaluwarsa.
- `429` — rate limit.

---

### `POST /api/manifest`

Download manifest game sebagai file ZIP.

| | |
|---|---|
| Autentikasi | Tergantung provider (lihat tabel di bawah) |
| Rate limit | 15/menit per IP |

**Request body (JSON):**

```json
{
  "app_id": 730,
  "source": "hubcap",
  "token": "DX-8F3K2Q",
  "api_key": null
}
```

| Field | Tipe | Keterangan |
|-------|------|------------|
| `app_id` | `int` | Steam App ID. Wajib. |
| `source` | `string` | Provider. Opsional, default `hubcap`. Opsi: `hubcap`, `manifesthub1`, `sushi`, `ryuu`, `yaszz`. |
| `token` | `string` | Wajib jika `source=hubcap`. |
| `api_key` | `string` | Wajib jika `source=manifesthub1`. |

**Providers:**

| Source | Auth yang dibutuhkan | Endpoint upstream |
|--------|----------------------|-------------------|
| `hubcap` | Token (`DX-XXXXX`) | `hubcapmanifest.com/api/v1/manifest/{app_id}` |
| `manifesthub1` | API key | Finder API + bundle download |
| `sushi` | Tidak ada | GitHub raw zip |
| `ryuu` | Tidak ada | Direct HTTP |
| `yaszz` | Tidak ada | GitHub archive download |

**Flow untuk `hubcap`:**
1. Token divalidasi (`validate_token`).
2. Token diklaim secara **atomic** (`claim_token`) — token yang sama tidak
   bisa dipakai dua request bersamaan.
3. Jika download gagal (404 / upstream error), klaim **dilepas kembali**
   (`release_token`) sehingga token bisa dipakai lagi.

**Respons `200`:**
- `application/zip` dengan header `Content-Disposition: attachment; filename="{app_id}.zip"`.

**Error:**
- `400` — provider tidak valid, token/api_key tidak diberikan, atau token sudah dipakai.
- `404` — manifest tidak tersedia.
- `4xx/5xx` (upstream) — gagal mengambil manifest.
- `429` — rate limit.

---

### `GET /api/status/{app_id}`

Cek status ketersediaan manifest sebuah game.

| | |
|---|---|
| Autentikasi | Tidak |
| Rate limit | Tidak |

**Path parameter:**

| Parameter | Tipe | Keterangan |
|-----------|------|------------|
| `app_id` | `int` | Steam App ID. Wajib. |

**Respons `200`:** JSON dari upstream (status ketersediaan per provider).

**Error:**
- `404` — game tidak ditemukan.
- `4xx/5xx` (upstream) — gagal mengambil status.

---

### `GET /api/search`

Cari game berdasarkan nama.

| | |
|---|---|
| Autentikasi | Tidak |
| Rate limit | Tidak |

**Query parameters:**

| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `q` | `string` | — | Kata kunci pencarian. Wajib, min 3 karakter. |
| `limit` | `int` | `20` | Jumlah hasil maksimal. Range `1–100`. |
| `appid` | `bool` | `false` | Jika `true`, kembalikan App ID Steam juga. |

**Respons `200`:** JSON hasil pencarian dari upstream.

**Error:**
- `422` — `q` kurang dari 3 karakter / `limit` di luar range.
- `4xx/5xx` (upstream) — pencarian gagal.

---

### `GET /api/steam/{app_id}`

Detail game langsung dari Steam Store (normalized).

| | |
|---|---|
| Autentikasi | Tidak |
| Rate limit | Tidak |

**Path parameter:**

| Parameter | Tipe | Keterangan |
|-----------|------|------------|
| `app_id` | `string` | Steam App ID. Wajib. |

**Respons `200`:**

```json
{
  "name": "Counter-Strike 2",
  "headerImage": "https://cdn.cloudflare.steamstatic.com/.../header.jpg",
  "releaseDate": "21 Aug, 2012",
  "genres": ["Action", "Free to Play"],
  "description": "For over two decades, Counter-Strike...",
  "developers": ["Valve"],
  "publishers": ["Valve"]
}
```

**Error:**
- `404` — game tidak ditemukan di Steam.
- `502` — gagal terhubung ke Steam.
- `4xx` (upstream) — error dari Steam API.

---

## Admin (`/admin`)

Prefix: `/admin`

Hampir semua endpoint admin dilindungi oleh header **`x-api-key`**
(dibandingkan dengan constant-time compare via `secrets.compare_digest`).

---

### `POST /admin/login`

Login ke web admin. Berhasil → mengembalikan `ADMIN_API_KEY` yang dipakai
sebagai session token ("Bearer" manual lewat header `x-api-key`).

| | |
|---|---|
| Autentikasi | Username/password (body) |
| Rate limit | 5/menit per IP |

**Request body (JSON):**

```json
{ "username": "admin", "password": "secret" }
```

**Respons `200`:**

```json
{ "api_key": "<ADMIN_API_KEY>", "username": "admin" }
```

**Error:**
- `401` — username/password salah.
- `429` — rate limit.

---

### `POST /admin/token`

Membuat token baru dengan format `DX-XXXXX` (huruf kapital alfanumerik).

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Respons `200`:**

```json
{
  "token": "DX-8F3K2Q",
  "created_at": "2026-08-10T10:00:00Z",
  "used_at": null,
  "used_app_id": null,
  "used_by_ip": null
}
```

---

### `DELETE /admin/token/{token_value}`

Hapus satu token berdasarkan kode token.

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Path parameter:**

| Parameter | Tipe | Keterangan |
|-----------|------|------------|
| `token_value` | `string` | Kode token (`DX-XXXXX`). Wajib. |

**Respons `200`:**
```json
{ "message": "Token deleted successfully." }
```

**Error:**
- `404` — token tidak ditemukan.

---

### `DELETE /admin/tokens/clear`

Hapus token massal: semua token yang **sudah terpakai** (`used_at` terisi) dan
token yang **belum dipakai tapi berumur lebih dari 1 jam** (kedaluwarsa).

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Respons `200`:**

```json
{ "deleted": 42 }
```

---

### `GET /admin/tokens`

Daftar semua token dengan filter, pencarian, dan paginasi.

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Query parameters:**

| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `status` | `string` | `null` | Filter: `active`, `used`, `expired`. |
| `search` | `string` | `null` | Cari by kode token / `app_id` / IP. |
| `skip` | `int` | `0` | Offset paginasi. `>= 0`. |
| `limit` | `int` | `50` | Jumlah per halaman. Range `1–200`. |

**Status token:**
- `active` — belum dipakai & belum kedaluwarsa.
- `used` — sudah dipakai.
- `expired` — belum dipakai tapi lewat 1 jam.

**Respons `200`:**

```json
{
  "total": 3,
  "items": [
    {
      "token": "DX-8F3K2Q",
      "created_at": "2026-08-10T10:00:00Z",
      "used_at": null,
      "used_app_id": null,
      "used_by_ip": null,
      "status": "active"
    }
  ]
}
```

---

### `GET /admin/settings/hubcap-api-key`

Lihat status konfigurasi API key Hubcap. Nilai asli **tidak pernah dikirim**,
hanya bentuk termask (masked).

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Respons `200`:**

```json
{
  "configured": true,
  "masked_value": "abcd****wxyz",
  "updated_at": "2026-08-10T10:00:00Z"
}
```

---

### `PUT /admin/settings/hubcap-api-key`

Perbarui API key Hubcap (disimpan di tabel settings, bukan env).

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Request body (JSON):**

```json
{ "api_key": "hubcap-api-key-baru" }
```

**Respons `200`:** sama seperti `GET` (dengan nilai masked).

**Error:**
- `400` — `api_key` kosong.
- `401` — API key header salah.

---

### `GET /admin/userstats`

Proxy user stats dari upstream Hubcap
(`https://hubcapmanifest.com/api/v1/user/stats`) menggunakan API key Hubcap
yang tersimpan di settings.

| | |
|---|---|
| Autentikasi | Header `x-api-key` |
| Rate limit | Tidak |

**Respons `200`:** JSON statistik user dari Hubcap.

**Error:**
- `502` — API key Hubcap invalid/kedaluwarsa, atau gagal terhubung ke upstream.
- `4xx/5xx` (upstream) — error dari Hubcap.

---

## Bot (`/bot`)

Prefix: `/bot`

---

### `POST /bot/token`

Membuat token untuk user Discord (dipanggil oleh slash command `/token` dari
bot). Log penggunaan dicatat di tabel `TokenUsage`, dan kuota harian dicek
berdasarkan role Discord.

| | |
|---|---|
| Autentikasi | Header `x-api-key` (**BOT_API_KEY**) |
| Rate limit | Tidak |

**Request body (JSON):**

```json
{ "discord_id": "123456789012345678" }
```

**Alur:**
1. Ambil role user dari Discord (`get_roles`).
2. Tentukan limit harian dari `ROLE_LIMIT` (config):
   - Role admin → **unlimited**.
   - Role OG → **1 token/hari**.
   - Role lain → ditolak (`403`).
3. Jika bukan unlimited, hitung pemakaian hari ini dari `TokenUsage`. Jika
   sudah mencapai limit → `429`.

**Respons `200`:**

```json
{
  "token": "DX-8F3K2Q",
  "created_at": "2026-08-10T10:00:00Z",
  "used_at": null,
  "used_app_id": null,
  "used_by_ip": null
}
```

**Error:**
- `401` — `x-api-key` bot salah.
- `403` — role tidak diizinkan.
- `429` — kuota harian habis.

---

## Autentikasi

| Mekanisme | Header | Endpoint |
|-----------|--------|----------|
| Admin API key | `x-api-key: <ADMIN_API_KEY>` | `/admin/*` |
| Bot API key | `x-api-key: <BOT_API_KEY>` | `/bot/*` |
| Token hubcap | Body JSON `token` | `/api/token/validate`, `/api/manifest` |
| API key manifesthub1 | Body JSON `api_key` | `/api/manifest` |

Semua pembandingan kredensial (kecuali bot key) memakai
`secrets.compare_digest` (constant-time) dan **fail closed** jika env var
belum diset.

---

## Rate Limit

Rate limiting berbasis **in-memory, per-IP** (slowapi):

| Endpoint | Limit |
|----------|-------|
| `POST /api/token/validate` | 10/menit |
| `POST /api/manifest` | 15/menit |
| `POST /admin/login` | 5/menit |

Saat limit terlampaui, server mengembalikan `429` dengan format:

```json
{ "detail": "Too many requests, please try again later. (10 per 1 minute)" }
```