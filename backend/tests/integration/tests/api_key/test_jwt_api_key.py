from datetime import datetime
from datetime import timedelta
from datetime import timezone
from unittest.mock import MagicMock
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from danswer.auth.schemas import UserRole
from danswer.db.models import User
from danswer.main import app
from danswer.utils import get_test_db_session

# Generate RSA keys for testing

RSA_PRIVATE_KEY = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
RSA_PUBLIC_KEY = RSA_PRIVATE_KEY.public_key()

PRIVATE_KEY_PEM = RSA_PRIVATE_KEY.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption(),
)

PUBLIC_KEY_PEM = RSA_PUBLIC_KEY.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    session = get_test_db_session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_user(db_session: Session):
    # Create a test user in the database using the same method as other tests
    user = User(
        email="testuser@example.com",
        hashed_password="testpassword",
        is_active=True,
        is_verified=True,
        role=UserRole.BASIC,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def mock_get_jwk_client():
    class MockJWKClient:
        def get_signing_key_from_jwt(self, token):
            return MagicMock(key=PUBLIC_KEY_PEM)

    return MockJWKClient()


def test_jwt_authentication(client, test_user, monkeypatch):
    # Mock the function that fetches the JWK client
    with patch(
        "danswer.backend.danswer.auth.users.get_jwk_client",
        return_value=mock_get_jwk_client(),
    ):
        # Generate JWT token with test user's email
        now = datetime.now(tz=timezone.utc)
        payload = {
            "email": test_user.email,
            "iat": now,
            "exp": now + timedelta(minutes=5),
        }
        token = jwt.encode(payload, PRIVATE_KEY_PEM, algorithm="RS256")

        headers = {"Authorization": f"Bearer {token}"}

        # Send request to an existing protected endpoint
        response = client.get("/api/v1/datasets", headers=headers)
        assert response.status_code == 200
        # Additional assertions can be added based on the endpoint's response
