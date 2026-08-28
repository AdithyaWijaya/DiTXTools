from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Token

def validate_token(
    db: Session,
    token: str,
) -> Token:

    token_db = (
        db.query(Token)
        .filter(Token.token == token)
        .first()
    )

    if token_db is None:
        raise HTTPException(
            404,
            "Token not found."
        )

    if token_db.used_at is not None:
        raise HTTPException(
            400,
            "Token has been used."
        )

    expired_time = token_db.created_at + timedelta(hours=1)

    if datetime.now(timezone.utc) > expired_time:
        raise HTTPException(
            400,
            "Token has expired."
        )

    return token_db

def claim_token(
    db: Session,
    token: Token,
    app_id: int,
    ip: str,
) -> bool:

    now = datetime.now(timezone.utc)

    claimed_rows = (
        db.query(Token)
        .filter(
            Token.id == token.id,
            Token.used_at.is_(None),
        )
        .update(
            {
                "used_at": now,
                "used_app_id": str(app_id),
                "used_by_ip": ip,
            },
            synchronize_session=False,
        )
    )

    db.commit()

    return claimed_rows == 1


def release_token(
    db: Session,
    token: Token,
) -> None:

    db.query(Token).filter(Token.id == token.id).update(
        {
            "used_at": None,
            "used_app_id": None,
            "used_by_ip": None,
        },
        synchronize_session=False,
    )

    db.commit()