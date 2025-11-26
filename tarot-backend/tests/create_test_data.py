#!/usr/bin/env python3
"""
创建测试兑换码数据的脚本
"""
import sys
import os
from datetime import datetime, timedelta

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db, engine
from app.models.payment import RedeemCode
from sqlalchemy.orm import sessionmaker
import uuid
import secrets
import string

def generate_redeem_code() -> str:
    """生成16位兑换码"""
    # 使用大写字母和数字，排除容易混淆的字符
    chars = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '').replace('1', '')
    return ''.join(secrets.choice(chars) for _ in range(16))

def create_test_redeem_codes():
    """创建测试兑换码数据"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 检查是否已有兑换码数据
        existing_count = db.query(RedeemCode).count()
        print(f"现有兑换码数量: {existing_count}")

        if existing_count > 0:
            print("数据库中已有兑换码数据，跳过创建")
            return

        print("创建测试兑换码数据...")

        # 创建不同状态的测试兑换码
        test_codes = []
        batch_id = f"test_batch_{uuid.uuid4().hex[:8]}"

        # 创建10个活跃的兑换码
        for i in range(10):
            code = RedeemCode(
                code=generate_redeem_code(),
                product_id=1,
                credits=5,
                status="active",
                expires_at=datetime.utcnow() + timedelta(days=365),
                batch_id=batch_id,
                created_at=datetime.utcnow()
            )
            test_codes.append(code)

        # 创建5个不同积分值的兑换码
        for credits in [1, 10, 20, 50, 100]:
            code = RedeemCode(
                code=generate_redeem_code(),
                product_id=1,
                credits=credits,
                status="active",
                expires_at=datetime.utcnow() + timedelta(days=30),
                batch_id=f"credits_{credits}_batch",
                created_at=datetime.utcnow()
            )
            test_codes.append(code)

        # 创建一些已禁用的兑换码
        for i in range(3):
            code = RedeemCode(
                code=generate_redeem_code(),
                product_id=1,
                credits=10,
                status="disabled",
                expires_at=datetime.utcnow() + timedelta(days=365),
                batch_id="disabled_batch",
                created_at=datetime.utcnow()
            )
            test_codes.append(code)

        # 创建一些已过期的兑换码
        for i in range(2):
            code = RedeemCode(
                code=generate_redeem_code(),
                product_id=1,
                credits=5,
                status="expired",
                expires_at=datetime.utcnow() - timedelta(days=30),
                batch_id="expired_batch",
                created_at=datetime.utcnow() - timedelta(days=60)
            )
            test_codes.append(code)

        # 批量插入
        db.add_all(test_codes)
        db.commit()

        print(f"成功创建 {len(test_codes)} 个测试兑换码")

        # 显示统计信息
        stats = {
            "total": db.query(RedeemCode).count(),
            "active": db.query(RedeemCode).filter(RedeemCode.status == "active").count(),
            "disabled": db.query(RedeemCode).filter(RedeemCode.status == "disabled").count(),
            "expired": db.query(RedeemCode).filter(RedeemCode.status == "expired").count(),
        }

        print("兑换码统计:")
        for status, count in stats.items():
            print(f"  {status}: {count}")

    except Exception as e:
        print(f"创建测试数据时出错: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_redeem_codes()