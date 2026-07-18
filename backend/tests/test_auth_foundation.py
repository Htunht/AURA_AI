import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.session import SessionLocal
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.services.seed_auth import ROLES, USERS, seed_auth


@pytest.fixture(scope="module")
def client() -> TestClient:
    seed_auth()
    return TestClient(app)


def test_settings_parse_access_token_expire_minutes_as_integer() -> None:
    settings = get_settings()

    assert settings.access_token_expire_minutes == 30
    assert isinstance(settings.access_token_expire_minutes, int)


def test_password_hash_and_verify() -> None:
    hashed = hash_password("valid-password")

    assert hashed != "valid-password"
    assert verify_password("valid-password", hashed)


def test_invalid_password_verification() -> None:
    hashed = hash_password("valid-password")

    assert not verify_password("wrong-password", hashed)


def test_access_token_encode_decode() -> None:
    token = create_access_token(
        subject="user-id",
        additional_claims={"roles": ["ADMIN"]},
    )

    payload = decode_access_token(token)

    assert payload["sub"] == "user-id"
    assert payload["type"] == "access"
    assert payload["roles"] == ["ADMIN"]


def test_wrong_token_type_rejected() -> None:
    settings = get_settings()
    token = jwt.encode(
        {"sub": "user-id", "type": "refresh"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token)


def test_seed_auth_is_idempotent() -> None:
    seed_auth()
    seed_auth()

    expected_role_codes = {code for code, _name in ROLES}
    expected_emails = {email for email, _name, _role in USERS}

    with SessionLocal() as db:
        role_count = db.scalar(
            select(func.count()).select_from(Role).where(Role.code.in_(expected_role_codes))
        )
        user_count = db.scalar(
            select(func.count()).select_from(User).where(User.email.in_(expected_emails))
        )
        assignment_count = db.scalar(
            select(func.count())
            .select_from(UserRole)
            .join(User)
            .where(User.email.in_(expected_emails))
        )

    assert role_count == len(expected_role_codes)
    assert user_count == len(expected_emails)
    assert assignment_count == len(expected_emails)


def test_login_success(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@aura.local",
            "password": "AuraDemo123!",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"


def test_login_invalid_password(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@aura.local",
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


def test_auth_me_success(client: TestClient) -> None:
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@aura.local",
            "password": "AuraDemo123!",
        },
    )
    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "admin@aura.local"
    assert body["full_name"] == "AURA Administrator"
    assert body["is_active"] is True
    assert "ADMIN" in body["roles"]


def test_auth_me_missing_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired authentication token"}


def test_auth_me_malformed_token(client: TestClient) -> None:
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired authentication token"}
