"""
Email verification related SQLAlchemy models.
"""
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class EmailVerification(Base):
    """邮箱验证令牌表模型"""
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    email = Column(
        String(255),
        nullable=False,
        index=True,
        comment="验证的邮箱地址"
    )
    token = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="验证令牌"
    )
    token_type = Column(
        String(20),
        nullable=False,
        comment="令牌类型：verify_email, reset_password"
    )
    expires_at = Column(
        DateTime,
        nullable=False,
        comment="令牌过期时间"
    )
    verified_at = Column(
        DateTime,
        nullable=True,
        comment="验证完成时间"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )

    # 关联关系
    user = relationship("User", back_populates="email_verifications")

    @classmethod
    def create_verification_token(
        cls,
        user_id: int,
        email: str,
        token_type: str = "verify_email",
        expire_hours: int = 24
    ) -> "EmailVerification":
        """
        创建邮箱验证令牌

        Args:
            user_id: 用户ID
            email: 邮箱地址
            token_type: 令牌类型，默认为verify_email
            expire_hours: 过期时间（小时），默认24小时

        Returns:
            EmailVerification实例
        """
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=expire_hours)

        return cls(
            user_id=user_id,
            email=email,
            token=token,
            token_type=token_type,
            expires_at=expires_at
        )

    def is_expired(self) -> bool:
        """检查令牌是否已过期"""
        return datetime.utcnow() > self.expires_at

    def is_verified(self) -> bool:
        """检查是否已验证"""
        return self.verified_at is not None

    def mark_as_verified(self) -> None:
        """标记为已验证"""
        self.verified_at = datetime.utcnow()

    def __repr__(self):
        return f"<EmailVerification(id={self.id}, user_id={self.user_id}, email='{self.email}', type='{self.token_type}')>"