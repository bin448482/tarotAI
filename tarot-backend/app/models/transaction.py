"""
Transaction related SQLAlchemy models.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship

from ..database import Base


class CreditTransaction(Base):
    """积分交易记录表模型"""
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    type = Column(
        String(20),
        nullable=False,
        index=True,
        comment="交易类型: earn, consume, refund, admin_adjust"
    )
    credits = Column(
        Integer,
        nullable=False,
        comment="积分变化量（正数表示增加，负数表示扣减）"
    )
    balance_after = Column(
        Integer,
        nullable=False,
        comment="交易后余额"
    )
    reference_type = Column(
        String(50),
        nullable=True,
        comment="关联类型: purchase, reading, refund, admin"
    )
    reference_id = Column(
        Integer,
        nullable=True,
        comment="关联记录ID"
    )
    description = Column(
        Text,
        nullable=True,
        comment="交易描述"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="创建时间"
    )

    # 关联关系
    user = relationship("User", back_populates="transactions")

    def __repr__(self):
        return (
            f"<CreditTransaction(id={self.id}, user_id={self.user_id}, "
            f"type='{self.type}', credits={self.credits})>"
        )