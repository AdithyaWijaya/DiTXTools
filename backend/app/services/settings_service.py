from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import HUBCAP_APIKEY
from app.models import AppSetting


HUBCAP_API_KEY_SETTING = "hubcap_api_key"


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
