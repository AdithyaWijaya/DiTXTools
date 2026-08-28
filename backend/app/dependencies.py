import os
from fastapi import Header, HTTPException
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.config import ADMIN_API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, BOT_API_KEY, ROLE_LIMIT, DOWNLOAD_EXPIRE_SECONDS
from app.database import SessionLocal
from app.models import BotRole, DownloadSession

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_admin_key(x_api_key: str = Header(...)):
    if ADMIN_API_KEY is None or not secrets.compare_digest(x_api_key, ADMIN_API_KEY):
        raise HTTPException(
            status_code=401,
            detail="Invalid API Key"
        )

def verify_admin_credentials(username: str, password: str) -> bool:
    if ADMIN_USERNAME is None or ADMIN_PASSWORD is None or ADMIN_API_KEY is None:
        return False

    username_ok = secrets.compare_digest(username, ADMIN_USERNAME)
    password_ok = secrets.compare_digest(password, ADMIN_PASSWORD)

    return username_ok and password_ok

def verify_bot_key(x_api_key: str = Header(...)):
    if x_api_key != BOT_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid Bot API Key"
        )
    
def get_daily_limit(db: Session, role_ids: list[str]):
    roles = db.query(BotRole).filter(BotRole.role_id.in_(role_ids)).all()

    if roles:
        limit = 0

        for role in roles:
            if role.limit is None:
                return None

            limit = max(limit, role.limit)

        return limit

    return _env_daily_limit(role_ids)

def _env_daily_limit(role_ids: list[str]):
    limit = 0

    for role in role_ids:

        if role not in ROLE_LIMIT:
            continue

        value = ROLE_LIMIT[role]

        if value is None:
            return None

        limit = max(limit, value)

    return limit

def cleanup_expired_sessions(db: Session) -> None:
    try:
        expired_sessions = (
            db.query(DownloadSession)
            .filter(DownloadSession.expires_at < datetime.now(timezone.utc))
            .all()
        )
        for session in expired_sessions:
            try:
                if os.path.exists(session.file_path):
                    os.remove(session.file_path)
            except OSError:
                pass
            db.delete(session)
        db.commit()
    except Exception:
        db.rollback()

def create_download_session(db: Session, file_path: str, filename: str) -> DownloadSession:
    cleanup_expired_sessions(db)
    download_id = DownloadSession.generate_download_id()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=DOWNLOAD_EXPIRE_SECONDS)
    session = DownloadSession(
        download_id=download_id,
        file_path=file_path,
        filename=filename,
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

