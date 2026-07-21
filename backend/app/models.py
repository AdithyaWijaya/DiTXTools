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
