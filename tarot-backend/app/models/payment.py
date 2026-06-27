"""
Payment related SQLAlchemy models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship

from ..database import Base


class RedeemCode(Base):
    """兑换码管理表模型"""
    __tablename__ = "redeem_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
        comment="兑换码"
    )
    product_id = Column(
        Integer,
        nullable=False,
        comment="商品ID（暂时使用整型，未来可扩展）"
    )
    credits = Column(
        Integer,
        nullable=False,
        comment="兑换积分数量"
    )
    status = Column(
        String(20),
        default="active",
        nullable=False,
        index=True,
        comment="状态: active, used, expired, disabled"
    )
    used_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="使用用户ID"
    )
    used_at = Column(
        DateTime,
        nullable=True,
        comment="使用时间"
    )
    expires_at = Column(
        DateTime,
        nullable=True,
        comment="过期时间"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    batch_id = Column(
        String(50),
        nullable=True,
        index=True,
        comment="批次ID"
    )

    # 关联关系
    used_by_user = relationship(
        "User",
        back_populates="used_redeem_codes",
        foreign_keys=[used_by]
    )

    def __repr__(self):
        return f"<RedeemCode(id={self.id}, code='{self.code}', status='{self.status}')>"


class Purchase(Base):
    """订单记录表模型"""
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="订单ID"
    )
    platform = Column(
        String(50),
        nullable=False,
        index=True,
        comment="平台: redeem_code, google_play, app_store"
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    product_id = Column(
        Integer,
        nullable=False,
        comment="商品ID"
    )
    credits = Column(
        Integer,
        nullable=False,
        comment="购买积分数量"
    )
    amount_cents = Column(
        Integer,
        nullable=True,
        comment="支付金额（分）"
    )
    currency = Column(
        String(3),
        nullable=True,
        comment="货币代码"
    )
    status = Column(
        String(20),
        default="pending",
        nullable=False,
        index=True,
        comment="状态: pending, completed, failed, refunded"
    )
    purchase_token = Column(
        Text,
        nullable=True,
        comment="Google Play/App Store购买凭证"
    )
    redeem_code = Column(
        String(32),
        nullable=True,
        comment="使用的兑换码"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    completed_at = Column(
        DateTime,
        nullable=True,
        comment="完成时间"
    )

    # 关联关系
    user = relationship("User", back_populates="purchases")

    def __repr__(self):
        return f"<Purchase(id={self.id}, order_id='{self.order_id}', status='{self.status}')>"