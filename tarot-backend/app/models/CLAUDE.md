# 数据库模型设计 (app/models/CLAUDE.md)

## 📊 数据库架构概述

### 数据库文件管理
- **后台数据库**: `./backend_tarot.db` (独立数据库文件)
- **源数据库**: `../tarot-ai-generator/data/tarot_config.db`
- **迁移策略**: 从源数据库复制核心表（card, dimension, card_interpretation）

### 表结构分类
1. **核心塔罗表** (已存在) - card, dimension, card_interpretation等
2. **支付系统表** (新增) - users, purchases, redeem_codes等
3. **历史记录表** (已存在) - user_history

## 🗄️ 核心表结构设计

### 现有表 (来自 tarot-ai-generator)

#### 1. card - 卡牌基础信息
```sql
CREATE TABLE card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    suit VARCHAR(50),
    number INTEGER,
    arcana_type VARCHAR(20),  -- major, minor
    description TEXT,
    keywords VARCHAR(500)
);
```

#### 2. dimension - 解读维度定义
```sql
CREATE TABLE dimension (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    description TEXT,
    aspect VARCHAR(100),
    aspect_type INTEGER,
    spread_type VARCHAR(50)  -- three-card, celtic-cross
);
```

#### 3. card_interpretation - 牌意主表
```sql
CREATE TABLE card_interpretation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    orientation VARCHAR(20),  -- upright, reversed
    basic_meaning TEXT,
    detailed_meaning TEXT,
    keywords VARCHAR(500),
    FOREIGN KEY (card_id) REFERENCES card (id)
);
```

#### 4. spread - 牌阵定义
```sql
CREATE TABLE spread (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),  -- three-card, celtic-cross
    position_count INTEGER,
    description TEXT,
    positions JSON  -- 牌位描述
);
```

### 新增支付系统表

#### 5. users - 用户管理 (支持匿名和邮箱登录)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    installation_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NULL,  -- 邮箱地址（可选）
    password_hash VARCHAR(255) NULL,  -- 密码哈希（可选）
    email_verified BOOLEAN DEFAULT FALSE,  -- 邮箱验证状态
    email_verified_at TIMESTAMP NULL,  -- 邮箱验证时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_credits_purchased INTEGER DEFAULT 0,
    total_credits_consumed INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX idx_users_installation_id ON users (installation_id);
CREATE INDEX idx_users_email ON users (email);
```

#### 6. user_balance - 用户积分余额 (乐观锁)
```sql
CREATE TABLE user_balance (
    user_id INTEGER PRIMARY KEY,
    credits INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,  -- 乐观锁版本号
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 乐观锁更新示例
-- UPDATE user_balance SET credits = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
-- WHERE user_id = ? AND version = ?
```

#### 7. redeem_codes - 兑换码管理
```sql
CREATE TABLE redeem_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(32) UNIQUE NOT NULL,
    product_id INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- active, used, expired, disabled
    used_by INTEGER NULL,
    used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    batch_id VARCHAR(50) NULL,  -- 批次ID
    FOREIGN KEY (used_by) REFERENCES users (id)
);

-- 索引
CREATE INDEX idx_redeem_codes_code ON redeem_codes (code);
CREATE INDEX idx_redeem_codes_status ON redeem_codes (status);
CREATE INDEX idx_redeem_codes_batch_id ON redeem_codes (batch_id);
```

#### 8. purchases - 订单记录
```sql
CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    platform VARCHAR(50) NOT NULL,  -- redeem_code, google_play, app_store
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    amount_cents INTEGER,
    currency VARCHAR(3),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed, refunded
    purchase_token TEXT NULL,  -- Google Play/App Store购买凭证
    redeem_code VARCHAR(32) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 索引
CREATE INDEX idx_purchases_order_id ON purchases (order_id);
CREATE INDEX idx_purchases_user_id ON purchases (user_id);
CREATE INDEX idx_purchases_status ON purchases (status);
```

#### 9. credit_transactions - 积分交易记录 (审计追踪)
```sql
CREATE TABLE credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,  -- earn, consume, refund, admin_adjust
    credits INTEGER NOT NULL,  -- 正数表示增加，负数表示扣减
    balance_after INTEGER NOT NULL,
    reference_type VARCHAR(50) NULL,  -- purchase, reading, refund
    reference_id INTEGER NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 索引
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions (user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions (type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions (created_at);
```

#### 10. email_verifications - 邮箱验证令牌管理
```sql
CREATE TABLE email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(20) NOT NULL,  -- verify_email, reset_password
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 索引
CREATE INDEX idx_email_verifications_token ON email_verifications (token);
CREATE INDEX idx_email_verifications_user_id ON email_verifications (user_id);
CREATE INDEX idx_email_verifications_email ON email_verifications (email);
```

## 🔧 SQLAlchemy模型实现

### 模型文件组织
```
app/models/
├── __init__.py          # 导出所有模型
├── base.py              # Base模型类
├── card.py              # 卡牌相关模型
├── dimension.py         # 维度模型
├── interpretation.py    # 解读模型
├── spread.py            # 牌阵模型
├── user.py              # 用户相关模型
├── payment.py           # 支付相关模型
├── transaction.py       # 交易记录模型
└── email_verification.py # 邮箱验证模型
```

### 关键模型实现要点

#### user.py - 用户相关模型
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    installation_id = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    total_credits_purchased = Column(Integer, default=0)
    total_credits_consumed = Column(Integer, default=0)

    # 关系
    balance = relationship("UserBalance", back_populates="user", uselist=False)
    purchases = relationship("Purchase", back_populates="user")
    transactions = relationship("CreditTransaction", back_populates="user")

class UserBalance(Base):
    __tablename__ = "user_balance"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    credits = Column(Integer, default=0)
    version = Column(Integer, default=1)  # 乐观锁
    updated_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    user = relationship("User", back_populates="balance")
```

#### payment.py - 支付相关模型
```python
class RedeemCode(Base):
    __tablename__ = "redeem_codes"

    id = Column(Integer, primary_key=True)
    code = Column(String(32), unique=True, nullable=False)
    product_id = Column(Integer, nullable=False)
    credits = Column(Integer, nullable=False)
    status = Column(String(20), default="active")
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    batch_id = Column(String(50), nullable=True)

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True)
    order_id = Column(String(100), unique=True, nullable=False)
    platform = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, nullable=False)
    credits = Column(Integer, nullable=False)
    amount_cents = Column(Integer, nullable=True)
    currency = Column(String(3), nullable=True)
    status = Column(String(20), default="pending")
    purchase_token = Column(Text, nullable=True)
    redeem_code = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # 关系
    user = relationship("User", back_populates="purchases")
```

## 🔄 数据库迁移策略

### Alembic迁移文件组织
```
migrations/versions/
├── 001_create_payment_tables.py       # 创建支付系统表
├── 002_add_indexes.py                 # 添加索引优化
├── 003_seed_default_data.py           # 初始数据填充
└── 004_add_admin_user.py              # 创建默认管理员
```

### 初始数据迁移
```python
# 从源数据库复制核心表数据
def copy_core_tables():
    """从 tarot-ai-generator 数据库复制核心表"""
    source_db = "../tarot-ai-generator/data/tarot_config.db"
    target_db = "./backend_tarot.db"

    tables_to_copy = [
        "card", "dimension", "card_interpretation",
        "card_interpretation_dimension", "spread"
    ]

    for table in tables_to_copy:
        # 执行数据复制逻辑
        pass
```

## 📊 数据库性能优化

### 索引策略
1. **用户查询优化**: installation_id 唯一索引
2. **兑换码优化**: code 唯一索引 + status 复合索引
3. **订单查询优化**: order_id 唯一索引 + user_id + status 复合索引
4. **交易记录优化**: user_id + created_at 复合索引

### 查询优化要点
- 使用 SQLAlchemy 的 `select()` 进行显式查询
- 合理使用 `joinedload()` 避免 N+1 查询问题
- 对频繁查询的字段建立适当索引
- 使用乐观锁处理并发余额更新

## 🔒 数据安全和完整性

### 乐观锁实现
```python
# 余额更新示例
def update_user_balance(user_id: int, credits_change: int, current_version: int):
    """使用乐观锁更新用户余额"""
    result = db.execute(
        update(UserBalance)
        .where(UserBalance.user_id == user_id)
        .where(UserBalance.version == current_version)
        .values(
            credits=UserBalance.credits + credits_change,
            version=UserBalance.version + 1,
            updated_at=datetime.utcnow()
        )
    )
    if result.rowcount == 0:
        raise ConcurrentUpdateError("余额更新失败，请重试")
```

### 数据验证
- Pydantic 模型验证输入数据
- 数据库层面的约束和外键
- 业务逻辑层面的状态验证
- 定期数据一致性检查

## 🧪 测试数据管理

### 测试夹具 (fixtures/)
```
tests/fixtures/
├── cards.json          # 测试卡牌数据
├── dimensions.json     # 测试维度数据
├── users.json          # 测试用户数据
└── redeem_codes.json   # 测试兑换码数据
```

### 数据库重置脚本
```python
def reset_test_database():
    """重置测试数据库到初始状态"""
    # 清空所有表
    # 重新插入基础测试数据
    pass
```

---

*此文档定义了塔罗牌应用后端的完整数据库架构，为开发团队提供数据层设计和实现指南。*