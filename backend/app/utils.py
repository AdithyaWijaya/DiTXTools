import secrets
import string
from sqlalchemy.orm import Session
from app.models import Token

ALPHABET = string.ascii_uppercase + string.digits

def generate_token(db: Session) -> str:
    while True:
        token = "DX-" + "".join(secrets.choice(ALPHABET) for _ in range(5))

        if not db.query(Token).filter(Token.token == token).first():
            return token