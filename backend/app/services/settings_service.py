from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import HUBCAP_APIKEY, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN
from app.models import AppSetting

HUBCAP_API_KEY_SETTING = "hubcap_api_key"
DISCORD_GUILD_ID_SETTING = "discord_guild_id"
DISCORD_BOT_TOKEN_SETTING = "discord_bot_token"
DISCORD_ALLOWED_CHANNELS_SETTING = "discord_allowed_channels"

def get_setting(db: Session, key: str) -> AppSetting | None:
    return db.query(AppSetting).filter(AppSetting.key == key).first()


def set_setting(db: Session, key: str, value: str) -> AppSetting:
    setting = get_setting(db, key)

    if setting is None:
        setting = AppSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(setting)
    return setting

def get_hubcap_api_key(db: Session) -> str | None:
    setting = get_setting(db, HUBCAP_API_KEY_SETTING)
    if setting and setting.value:
        return setting.value

    return HUBCAP_APIKEY

def get_discord_config(db: Session) -> dict:
    guild_setting = get_setting(db, DISCORD_GUILD_ID_SETTING)
    token_setting = get_setting(db, DISCORD_BOT_TOKEN_SETTING)

    return {
        "guild_id": guild_setting.value if guild_setting and guild_setting.value else DISCORD_GUILD_ID,
        "bot_token": token_setting.value if token_setting and token_setting.value else DISCORD_BOT_TOKEN,
    }

def get_discord_allowed_channels(db: Session) -> list[str]:
    setting = get_setting(db, DISCORD_ALLOWED_CHANNELS_SETTING)
    if not setting or not setting.value:
        return []

    return [
        part.strip()
        for part in setting.value.replace("\n", ",").split(",")
        if part.strip()
    ]
