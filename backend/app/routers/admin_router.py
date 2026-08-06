from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db, verify_admin_credentials
from app.limiter import limiter
from app.models import Token
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    HubcapApiKeyResponse,
    HubcapApiKeyUpdateRequest,
    TokenResponse,
    TokenListResponse,
    TokenListItem,
)
from app.services.settings_service import (
    HUBCAP_API_KEY_SETTING,
    get_hubcap_api_key,
    get_setting,
    set_setting,
)
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

        # Forward status code dan response dari server tujuan
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.json() if e.response.content else e.response.text,
        )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to upstream API: {str(e)}",
        )
