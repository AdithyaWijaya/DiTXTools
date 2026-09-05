from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.services.discord_service import get_roles
from app.services.settings_service import get_discord_config, get_discord_allowed_channels
from app.dependencies import get_db, verify_bot_key, get_daily_limit
from app.models import TokenUsage, Token
from app.utils import generate_token
from app.schemas import TokenResponse, DiscordRequest
from app.limiter import limiter

router = APIRouter(prefix="/bot", tags=["Bot"])

@router.get("/config")
@limiter.limit("30/minute")
def get_bot_config(
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(verify_bot_key),
):
    config = get_discord_config(db)

    if not config["bot_token"]:
        raise HTTPException(
            status_code=404,
            detail="Discord bot token is not configured. Set it in the admin Bot page.",
        )

    return {"discord_token": config["bot_token"]}

@router.post("/token", response_model=TokenResponse)
@limiter.limit("10/minute")
async def create_discord_token(
    request: Request,
    data: DiscordRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_bot_key),
):
    if not data.guild_id:
        raise HTTPException(
            status_code=403,
            detail="This command can only be used inside the server, not in DMs."
        )

    config = get_discord_config(db)
    if config["guild_id"] and data.guild_id != config["guild_id"]:
        raise HTTPException(
            status_code=403,
            detail="This command is not available in this server."
        )
    allowed_channels = get_discord_allowed_channels(db)
    if allowed_channels and (not data.channel_id or data.channel_id not in allowed_channels):
        raise HTTPException(
            status_code=403,
            detail="This command can only be used in allowed channels."
        )
    roles = await get_roles(db, request.discord_id)
    limit = get_daily_limit(db, roles)

    if limit == 0:
        raise HTTPException(
            status_code=403,
            detail="Role is not allowed."
        )
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
                detail=f"Daily quota ({limit}) has been exhausted."
            )
    token = Token(
        token=generate_token(db)
    )

    db.add(token)
    db.add(
        TokenUsage(
            discord_id=request.discord_id
        )
    )

    db.commit()
    db.refresh(token)

    return token
