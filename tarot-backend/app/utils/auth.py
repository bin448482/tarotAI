"""
Authentication utilities for JWT token management.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt
from fastapi import HTTPException, status

from ..config import settings


def generate_anonymous_user_id() -> str:
    """
    生成匿名用户ID。

    Returns:
        str: UUID格式的用户ID
    """
    return str(uuid.uuid4())


def create_jwt_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌。

    Args:
        user_id: 用户ID
        expires_delta: 过期时间增量，如果为None则使用默认值

    Returns:
        str: JWT令牌字符串
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)

    payload = {
        "sub": user_id,  # subject (用户ID)
        "exp": expire,   # expiration time
        "iat": datetime.now(timezone.utc),  # issued at
        "type": "access"  # token type
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌 (通用版本)。

    Args:
        data: 要编码到令牌中的数据
        expires_delta: 过期时间增量，如果为None则使用默认值

    Returns:
        str: JWT令牌字符串
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)

    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    验证JWT令牌并返回payload。

    Args:
        token: JWT令牌字符串

    Returns:
        Dict[str, Any]: 令牌payload

    Raises:
        HTTPException: 令牌无效时抛出401错误
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

        # 检查令牌类型
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        # 检查用户ID
        user_id = payload.get("sub")
        if user_id is None and payload.get("user_id") is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user ID"
            )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def verify_token(token: str) -> Dict[str, Any]:
    """
    验证JWT令牌的别名函数。

    Args:
        token: JWT令牌字符串

    Returns:
        Dict[str, Any]: 令牌payload
    """
    return verify_jwt_token(token)


def extract_user_id_from_token(token: str) -> str:
    """
    从JWT令牌中提取用户installation_id。
    兼容两套认证系统的JWT token格式。

    Args:
        token: JWT令牌字符串

    Returns:
        str: 用户installation_id

    Raises:
        HTTPException: 令牌无效时抛出401错误
    """
    payload = verify_jwt_token(token)

    # 兼容两套系统的token格式
    # 1. 优先使用 installation_id 字段（users.py系统）
    # 2. 降级使用 sub 字段（auth.py系统）
    installation_id = payload.get("installation_id") or payload.get("sub")

    if not installation_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing installation_id"
        )

    return str(installation_id)