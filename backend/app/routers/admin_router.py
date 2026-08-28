from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db, verify_admin_credentials
from app.limiter import limiter
from app.models import Token, BotRole
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    BotConnectionTestRequest,
    BotConnectionTestResponse,
    BotRoleCreate,
    BotRoleResponse,
    BotRoleUpdate,
    BotSettingsResponse,
    BotSettingsUpdate,
    HubcapApiKeyResponse,
    HubcapApiKeyUpdateRequest,
    TokenResponse,
    TokenListResponse,
    TokenListItem,
)
from app.services.settings_service import (
    DISCORD_ALLOWED_CHANNELS_SETTING,
    DISCORD_BOT_TOKEN_SETTING,
    DISCORD_GUILD_ID_SETTING,
    HUBCAP_API_KEY_SETTING,
    get_discord_allowed_channels,
    get_discord_config,
    get_hubcap_api_key,
    get_setting,
    set_setting,
)
from app.services.discord_service import verify_discord_connection
from app.utils import generate_token
from app.dependencies import verify_admin_key
from app.config import ADMIN_API_KEY

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def _mask_secret(value: str | None) -> str | None:
    if not value:
        return None

    if len(value) <= 8:
        return "*" * len(value)

    return f"{value[:4]}****{value[-4:]}"


@router.post("/login", response_model=AdminLoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: AdminLoginRequest):
    if not verify_admin_credentials(data.username, data.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password."
        )

    return AdminLoginResponse(api_key=ADMIN_API_KEY, username=data.username)


@router.post("/token", response_model=TokenResponse)
def create_token(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key)
):
    token = Token(
        token=generate_token(db)
    )

    db.add(token)
    db.commit()
    db.refresh(token)

    return token


@router.delete("/token/{token_value}")
def delete_token(
    token_value: str,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    token = db.query(Token).filter(Token.token == token_value).first()

    if token is None:
        raise HTTPException(status_code=404, detail="Token not found.")

    db.delete(token)
    db.commit()

    return {"message": "Token deleted successfully."}


@router.delete("/tokens/clear")
def clear_tokens(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

    deleted = (
        db.query(Token)
        .filter(
            or_(
                Token.used_at.isnot(None),
                Token.created_at < cutoff,
            )
        )
        .delete(synchronize_session=False)
    )
    db.commit()

    return {"deleted": deleted}


def _token_status(token: Token) -> str:
    if token.used_at is not None:
        return "used"

    expired_time = token.created_at + timedelta(hours=1)
    if datetime.now(timezone.utc) > expired_time:
        return "expired"

    return "active"


@router.get("/tokens", response_model=TokenListResponse)
def list_tokens(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
    status: str | None = Query(None, description="Filter: active, used, expired"),
    search: str | None = Query(None, description="Search by token code / app_id / IP"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query = db.query(Token)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Token.token.ilike(like),
                Token.used_app_id.ilike(like),
                Token.used_by_ip.ilike(like),
            )
        )

    all_tokens = query.order_by(Token.created_at.desc()).all()

    items = [
        TokenListItem(
            token=t.token,
            created_at=t.created_at,
            used_at=t.used_at,
            used_app_id=t.used_app_id,
            used_by_ip=t.used_by_ip,
            status=_token_status(t),
        )
        for t in all_tokens
    ]

    if status:
        items = [i for i in items if i.status == status]

    total = len(items)
    page = items[skip: skip + limit]

    return TokenListResponse(total=total, items=page)


@router.get("/settings/hubcap-api-key", response_model=HubcapApiKeyResponse)
def get_hubcap_api_key_setting(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    setting = get_setting(db, HUBCAP_API_KEY_SETTING)
    value = get_hubcap_api_key(db)

    return HubcapApiKeyResponse(
        configured=bool(value),
        masked_value=_mask_secret(value),
        updated_at=setting.updated_at if setting else None,
    )


@router.put("/settings/hubcap-api-key", response_model=HubcapApiKeyResponse)
def update_hubcap_api_key_setting(
    data: HubcapApiKeyUpdateRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    api_key = data.api_key.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="Hubcap API key is required.")

    setting = set_setting(db, HUBCAP_API_KEY_SETTING, api_key)

    return HubcapApiKeyResponse(
        configured=True,
        masked_value=_mask_secret(setting.value),
        updated_at=setting.updated_at,
    )


@router.get("/userstats")
async def proxy_user_stats(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    hubcap_api_key = get_hubcap_api_key(db)
    headers = {
        "Authorization": f"Bearer {hubcap_api_key}"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get("https://hubcapmanifest.com/api/v1/user/stats",
                headers=headers
            )

        response.raise_for_status()
        return response.json()

    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403):
            raise HTTPException(
                status_code=502,
                detail="The Hubcap API key is invalid or has expired. Update the API key in the Settings page.",
            )

        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.json() if e.response.content else e.response.text,
        )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to upstream API: {str(e)}",
        )


def _build_bot_settings(db: Session) -> BotSettingsResponse:
    config = get_discord_config(db)
    guild_setting = get_setting(db, DISCORD_GUILD_ID_SETTING)
    token_setting = get_setting(db, DISCORD_BOT_TOKEN_SETTING)
    roles = db.query(BotRole).order_by(BotRole.created_at.asc()).all()

    updated_ats = [
        s.updated_at
        for s in (guild_setting, token_setting, get_setting(db, DISCORD_ALLOWED_CHANNELS_SETTING))
        if s and s.updated_at
    ]

    return BotSettingsResponse(
        guild_id=config["guild_id"],
        guild_configured=bool(config["guild_id"]),
        bot_token_configured=bool(config["bot_token"]),
        bot_token_masked=_mask_secret(config["bot_token"]),
        allowed_channels=get_discord_allowed_channels(db),
        updated_at=max(updated_ats) if updated_ats else None,
        roles=roles,
    )


@router.get("/bot/settings", response_model=BotSettingsResponse)
def get_bot_settings(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    return _build_bot_settings(db)


@router.put("/bot/settings", response_model=BotSettingsResponse)
def update_bot_settings(
    data: BotSettingsUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    fields = data.model_fields_set

    if "guild_id" in fields and data.guild_id and data.guild_id.strip():
        set_setting(db, DISCORD_GUILD_ID_SETTING, data.guild_id.strip())

    if "bot_token" in fields and data.bot_token and data.bot_token.strip():
        set_setting(db, DISCORD_BOT_TOKEN_SETTING, data.bot_token.strip())

    if "allowed_channels" in fields and data.allowed_channels is not None:
        set_setting(db, DISCORD_ALLOWED_CHANNELS_SETTING, data.allowed_channels.strip())

    return _build_bot_settings(db)


@router.post("/bot/test", response_model=BotConnectionTestResponse)
async def test_bot_connection(
    data: BotConnectionTestRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    config = get_discord_config(db)

    guild_id = (data.guild_id or "").strip() or config["guild_id"]
    bot_token = (data.bot_token or "").strip() or config["bot_token"]

    if not guild_id or not bot_token:
        raise HTTPException(
            status_code=400,
            detail="Guild ID and bot token are required.",
        )

    ok, detail = await verify_discord_connection(guild_id, bot_token)
    return BotConnectionTestResponse(ok=ok, detail=detail)


@router.get("/bot/roles", response_model=list[BotRoleResponse])
def list_bot_roles(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    return db.query(BotRole).order_by(BotRole.created_at.asc()).all()


@router.post("/bot/roles", response_model=BotRoleResponse, status_code=201)
def create_bot_role(
    data: BotRoleCreate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    role_id = data.role_id.strip()
    if not role_id:
        raise HTTPException(status_code=400, detail="Role ID is required.")

    existing = db.query(BotRole).filter(BotRole.role_id == role_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role with this ID already exists.")

    role = BotRole(
        role_id=role_id,
        name=data.name.strip() or role_id,
        limit=data.limit,
    )

    db.add(role)
    db.commit()
    db.refresh(role)

    return role


@router.put("/bot/roles/{role_id}", response_model=BotRoleResponse)
def update_bot_role(
    role_id: int,
    data: BotRoleUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    role = db.query(BotRole).filter(BotRole.id == role_id).first()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found.")

    fields = data.model_fields_set

    if "name" in fields and data.name is not None:
        role.name = data.name.strip() or role.name

    if "limit" in fields:
        role.limit = data.limit

    db.commit()
    db.refresh(role)

    return role


@router.delete("/bot/roles/{role_id}")
def delete_bot_role(
    role_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin_key),
):
    role = db.query(BotRole).filter(BotRole.id == role_id).first()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found.")

    db.delete(role)
    db.commit()

    return {"message": "Role deleted successfully."}
