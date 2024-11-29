import os

JWT_PUBLIC_KEY_URL: str = os.getenv("JWT_PUBLIC_KEY_URL", "http://testserver/jwks")
