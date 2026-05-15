from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.exceptions import CredentialsException
from app.core.security import decode_token
from app.db.models.user import User
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise CredentialsException()

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise CredentialsException()

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise CredentialsException("User not found or inactive")

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    # is_active already checked in get_current_user; this alias exists for clarity
    return current_user
