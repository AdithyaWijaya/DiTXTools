import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.database import Base

class Token(Base):
    __tablename__= "Token"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(8), unique=True, index=True)
    created_at = Column(DateTime(timezone=True),nullable=False,server_default=func.now())
    used_at = Column(DateTime(timezone=True),nullable=True)
    used_app_id = Column(Text,nullable=True)
    used_by_ip = Column(Text,nullable=True)

class DownloadSession(Base):
    __tablename__ = "download_sessions"

    id = Column(Integer, primary_key=True, index=True)
    download_id = Column(String(64), unique=True, index=True, nullable=False)
    file_path = Column(String(512), nullable=False)
    filename = Column(String(256), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    @staticmethod
    def generate_download_id() -> str:
        return secrets.token_urlsafe(32)

class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True)

    discord_id = Column(
        String,
        index=True,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

class BotRole(Base):
    __tablename__ = "bot_roles"

    id = Column(Integer, primary_key=True)
    role_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False, default="")
    limit = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
