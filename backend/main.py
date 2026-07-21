import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from slowapi.errors import RateLimitExceeded

from app.config import BASE_DIR, ALLOWED_ORIGINS
from app.database import engine
from app.limiter import limiter
from app import models
from app.routers.admin_router import router as admin_router
from app.routers.api_router import router as api_router
from app.routers.bot_router import router as bot_router

models.Base.metadata.create_all(bind=engine)

app= FastAPI (docs_url=None, redoc_url=None, openapi_url=None)

# Rate limiting
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    # Format response disamakan dengan HTTPException biasa (pakai key
    # "detail") supaya frontend tidak perlu menangani bentuk error terpisah.
    return JSONResponse(
        status_code=429,
        content={"detail": f"Terlalu banyak permintaan, coba lagi sebentar. ({exc.detail})"},
    )

# Middleware
# Kalau ALLOWED_ORIGINS diisi di .env, pakai origin spesifik + credentials.
# Kalau tidak, fallback ke wildcard TANPA credentials (kombinasi wildcard +
# credentials=True tidak disarankan dan akan ditolak sebagian browser).
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=bool(ALLOWED_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static
app.mount("/static", StaticFiles(directory=f"{BASE_DIR}/static"), name="static")


@app.get("/")
def root():
    return FileResponse(f"{BASE_DIR}/templates/api.html")

@app.get("/favicon.ico")
def favicon():
    return FileResponse(f"{BASE_DIR}/static/favicon.ico")

@app.get("/admin")
def admin_panel():
    return FileResponse(f"{BASE_DIR}/templates/admin.html")

# API Status
@app.get("/health")
async def health_proxy():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://hubcapmanifest.com/api/v1/health")

        return JSONResponse(
            content=response.json(),
            status_code=response.status_code,
        )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to upstream API: {str(e)}"
        )
    
# Web admin
app.include_router(admin_router)

# Manifest API
app.include_router(api_router)

# keperluan bot discord
app.include_router(bot_router)