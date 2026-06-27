"""
Admin authentication service and dependencies.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.utils.auth import create_access_token, verify_jwt_token


class AdminAuthService:
    """Admin authentication service."""

    def __init__(self):
        self.admin_username = settings.ADMIN_USERNAME
        self.admin_password = settings.ADMIN_PASSWORD
        self.expire_hours = settings.ADMIN_TOKEN_EXPIRE_HOURS or 24

    def verify_credentials(self, username: str, password: str) -> bool:
        """Verify admin credentials."""
        return (username == self.admin_username and
                password == self.admin_password)

    def create_admin_token(self, username: str) -> str:
        """Create admin JWT token."""
        payload = {
            "sub": username,
            "username": username,
            "user_type": "admin",
            "role": "admin"
        }
        expires_delta = timedelta(hours=self.expire_hours)
        return create_access_token(payload, expires_delta)

    def verify_admin_token(self, token: str) -> Optional[str]:
        """Verify admin token and return username."""
        try:
            payload = verify_jwt_token(token)

            # Check if it's an admin token
            if payload.get("user_type") != "admin":
                return None

            return payload.get("sub") or payload.get("username")
        except HTTPException:
            return None


# Global admin auth service instance
admin_auth_service = AdminAuthService()

# Bearer token security scheme
bearer_scheme = HTTPBearer()


def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    """
    Dependency to get current admin from Bearer token.

    Args:
        credentials: HTTP Authorization credentials from Bearer token

    Returns:
        str: Admin username

    Raises:
        HTTPException: If token is invalid or user is not admin
    """
    username = admin_auth_service.verify_admin_token(credentials.credentials)

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return username


def require_admin(current_admin: str = Depends(get_current_admin)) -> str:
    """
    Dependency that requires admin authentication.

    Args:
        current_admin: Current admin username from get_current_admin

    Returns:
        str: Admin username
    """
    return current_admin