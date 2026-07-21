from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.services.discord_service import get_roles
from app.dependencies import get_db, verify_bot_key, get_daily_limit
from app.models import TokenUsage, Token
from app.utils import generate_token
from app.schemas import TokenResponse, DiscordRequest

router = APIRouter(prefix="/bot")

@router.post("/token", response_model=TokenResponse)
async def create_discord_token(
    request: DiscordRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_bot_key),
):

    # Ambil role user langsung dari Discord
    roles = await get_roles(request.discord_id)

    # Tentukan limit berdasarkan role
    limit = get_daily_limit(roles)

    if limit == 0:
        raise HTTPException(
            status_code=403,
            detail="Role tidak diizinkan."
        )

    # Jika bukan unlimited, cek kuota harian
    if limit is not None:

        today = datetime.now(timezone.utc).date()

        used = (
            db.query(TokenUsage)
            .filter(
                TokenUsage.discord_id == request.discord_id,
                func.date(TokenUsage.created_at) == today,
            )
            .count()
        )

        if used >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Kuota harian ({limit}) sudah habis."
            )

    # Generate token
    token = Token(
        token=generate_token(db)
    )

    db.add(token)

    # Simpan log penggunaan
    db.add(
        TokenUsage(
            discord_id=request.discord_id
        )
    )

    db.commit()
    db.refresh(token)

    return token