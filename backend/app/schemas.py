from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

class TokenResponse(BaseModel):
    token: str
    created_at: datetime
    used_at: datetime | None = None
    used_app_id: str | None = None
    used_by_ip: str | None = None

    class Config:
        from_attributes = True

class ManifestDownloadRequest(BaseModel):
    app_id: int
    source: Literal["hubcap", "manifesthub1", "sushi", "ryuu", "yaszz"] = "hubcap"
    token: str | None = None
    api_key: str | None = None

class TokenValidateRequest(BaseModel):
    token: str = Field(..., min_length=1)


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AdminLoginResponse(BaseModel):
    api_key: str
    username: str


class TokenListItem(TokenResponse):
    # status dihitung di server: active (belum dipakai & belum expired),
    # used (sudah dipakai), expired (belum dipakai tapi lewat 1 jam)
    status: Literal["active", "used", "expired"]


class TokenListResponse(BaseModel):
    total: int
    items: list[TokenListItem]


class HubcapApiKeyResponse(BaseModel):
    configured: bool
    masked_value: str | None = None
    updated_at: datetime | None = None


class HubcapApiKeyUpdateRequest(BaseModel):
    api_key: str = Field(..., min_length=1)


class TokenRequest(BaseModel):
    discord_id: str
    roles: list[str]

class DiscordRequest(BaseModel):
    discord_id: str
