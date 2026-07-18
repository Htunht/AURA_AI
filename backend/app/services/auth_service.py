from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import verify_password
from app.models.user import User
from app.models.user_role import UserRole


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
) -> User | None:
    statement = (
        select(User)
        .where(User.email == email.lower().strip())
        .options(
            selectinload(User.user_roles)
            .selectinload(UserRole.role)
        )
    )

    user = db.scalar(statement)

    if user is None or not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user