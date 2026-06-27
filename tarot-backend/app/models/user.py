"""
User related SQLAlchemy models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship

from ..database import Base


class User(Base):
    """匿名用户管理表模型"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    installation_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="设备唯一标识符"
    )
    email = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
        comment="用户邮箱地址（可选）"
    )
    password_hash = Column(
        String(255),
        nullable=True,
        comment="密码哈希值（可选）"
    )
    email_verified = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="邮箱验证状态"
    )
    email_verified_at = Column(
        DateTime,
        nullable=True,
        comment="邮箱验证时间"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    last_active_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        comment="最后活跃时间"
    )
    total_credits_purchased = Column(
        Integer,
        default=0,
        nullable=False,
        comment="累计购买积分数"
    )
    total_credits_consumed = Column(
        Integer,
        default=0,
        nullable=False,
        comment="累计消费积分数"
    )

    # 关联关系
    balance = relationship("UserBalance", back_populates="user", uselist=False)
    purchases = relationship("Purchase", back_populates="user")
    transactions = relationship("CreditTransaction", back_populates="user")
    used_redeem_codes = relationship(
        "RedeemCode",
        back_populates="used_by_user",
        foreign_keys="RedeemCode.used_by"
    )
    email_verifications = relationship("EmailVerification", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, installation_id='{self.installation_id}')>"


class UserBalance(Base):
    """用户积分余额表模型"""
    __tablename__ = "user_balance"

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        primary_key=True,
        index=True,
        comment="用户ID"
    )
    credits = Column(
        Integer,
        default=0,
        nullable=False,
        comment="当前积分余额"
    )
    version = Column(
        Integer,
        default=1,
        nullable=False,
        comment="乐观锁版本号"
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
        nullable=False,
        comment="更新时间"
    )

    # 关联关系
    user = relationship("User", back_populates="balance")

    def __repr__(self):
        return f"<UserBalance(user_id={self.user_id}, credits={self.credits}, version={self.version})>"