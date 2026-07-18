from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole

ROLES = [
    ("RECRUITER", "Recruiter"),
    ("INTERVIEWER", "Interviewer"),
    ("HIRING_MANAGER", "Hiring Manager"),
    ("ADMIN", "Administrator"),
]

USERS = [
    (
        "recruiter@aura.local",
        "AURA Recruiter",
        "RECRUITER",
    ),
    (
        "interviewer@aura.local",
        "AURA Interviewer",
        "INTERVIEWER",
    ),
    (
        "manager@aura.local",
        "AURA Hiring Manager",
        "HIRING_MANAGER",
    ),
    (
        "admin@aura.local",
        "AURA Administrator",
        "ADMIN",
    ),
]

DEVELOPMENT_PASSWORD = "AuraDemo123!"


def seed_auth() -> None:
    with SessionLocal() as db:
        roles_by_code: dict[str, Role] = {}

        for code, name in ROLES:
            role = db.scalar(
                select(Role).where(Role.code == code)
            )

            if role is None:
                role = Role(
                    code=code,
                    name=name,
                )
                db.add(role)
                db.flush()

            roles_by_code[code] = role

        for email, full_name, role_code in USERS:
            user = db.scalar(
                select(User).where(User.email == email)
            )

            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    password_hash=hash_password(
                        DEVELOPMENT_PASSWORD
                    ),
                )
                db.add(user)
                db.flush()

            existing_assignment = db.scalar(
                select(UserRole).where(
                    UserRole.user_id == user.id,
                    UserRole.role_id
                    == roles_by_code[role_code].id,
                )
            )

            if existing_assignment is None:
                db.add(
                    UserRole(
                        user_id=user.id,
                        role_id=roles_by_code[role_code].id,
                    )
                )

        db.commit()


if __name__ == "__main__":
    seed_auth()
    print("Development auth data seeded")