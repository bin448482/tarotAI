# 工具函数 (app/utils/CLAUDE.md)

## 🔧 工具函数架构

### 工具模块组织
```
app/utils/
├── __init__.py          # 工具模块初始化
├── logger.py            # 日志管理工具 (✅ 已实现)
├── auth.py              # 认证工具
├── redeem_code.py       # 兑换码生成工具
├── security.py          # 安全相关工具
├── helpers.py           # 辅助函数
├── validators.py        # 数据验证工具
└── dimension_definitions.py  # 维度定义工具
```

## 📝 日志管理系统 (logger.py) - ✅ 已实现

### 设计理念
统一管理应用日志输出，将详细调试信息记录到文件，关键信息和错误输出到控制台，避免控制台输出过多无关信息。

### 日志架构
```python
class AdminLogger:
    """管理员操作日志记录器"""

    def __init__(self, name: str = "admin"):
        self.logger = logging.getLogger(name)
        self._setup_logger()

    def _setup_logger(self):
        """设置日志记录器"""
        # 文件处理器 - 记录详细信息到 logs/admin_YYYYMMDD.log
        file_handler = logging.FileHandler(
            LOG_DIR / f"admin_{datetime.now().strftime('%Y%m%d')}.log",
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)

        # 控制台处理器 - 只记录重要信息 (INFO+)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)

class APILogger:
    """API请求日志记录器"""

    def _setup_logger(self):
        """设置API日志记录器"""
        # API日志文件 - logs/api_YYYYMMDD.log
        file_handler.setLevel(logging.DEBUG)

        # 控制台只显示错误 (ERROR+)
        console_handler.setLevel(logging.ERROR)
```

### 日志级别策略
- **DEBUG**: 详细调试信息，仅记录到文件
- **INFO**: 重要操作流程，记录到文件和控制台
- **WARNING**: 警告信息，记录到文件和控制台
- **ERROR**: 错误信息，记录到文件和控制台

### 核心功能

#### 管理员操作日志
```python
from app.utils.logger import admin_logger, log_admin_action, log_user_credit_change

# 基础日志记录
admin_logger.info("管理员登录成功", {"username": "admin"})
admin_logger.debug("请求参数验证", {"param_count": 3})
admin_logger.warning("用户不存在", {"installation_id": "xxx"})
admin_logger.error("数据库连接失败", exception, {"context": "user_query"})

# 专用操作日志
log_admin_action(
    action="积分调整",
    admin="admin",
    target="user_123",
    result="success",
    data={"old_balance": 100, "new_balance": 150}
)

log_user_credit_change(
    user_id="user_123",
    change=50,
    reason="管理员手动调整",
    admin="admin",
    new_balance=150
)
```

#### API请求日志
```python
from app.utils.logger import api_logger

# API请求记录
api_logger.log_request(
    method="POST",
    path="/api/v1/admin/users/adjust-credits",
    user="admin_browser"
)

# API响应记录
api_logger.log_response(
    path="/api/v1/admin/users",
    status=200,
    message="用户列表查询成功"
)

# API错误记录
api_logger.log_error(
    path="/api/v1/payments/redeem",
    error=exception,
    context={"code": "INVALID123", "user_id": 456}
)
```

### 日志文件组织
```
logs/
├── admin_20250929.log    # 管理员操作日志
├── admin_20250928.log    # 历史管理员日志
├── api_20250929.log      # API请求日志
└── api_20250928.log      # 历史API日志
```

### 集成实例

#### 主应用中间件 (app/main.py)
```python
# 替换原有的debug中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    from app.utils.logger import api_logger

    # 记录重要的API请求
    if request.method == "POST" and ("/admin/" in str(request.url) or "/api/" in str(request.url)):
        api_logger.log_request(
            method=request.method,
            path=str(request.url.path),
            user=request.headers.get("user-agent", "unknown")[:50]
        )

    response = await call_next(request)

    # 记录错误响应
    if response.status_code >= 400:
        api_logger.log_response(
            path=str(request.url.path),
            status=response.status_code
        )

    return response
```

#### 管理员API (app/api/admin.py)
```python
# 替换所有 print() 调用
@user_router.post("/users/adjust-credits")
async def adjust_user_credits(...):
    admin_logger.debug("管理员积分调整请求", {"admin": current_admin})

    try:
        # 业务逻辑...
        log_user_credit_change(
            user_id=user.installation_id,
            change=request.credits,
            reason=request.reason,
            admin=current_admin,
            new_balance=balance.credits
        )
    except Exception as e:
        admin_logger.error("积分调整失败", e, {
            "installation_id": request.installation_id,
            "credits": request.credits,
            "admin": current_admin
        })
```

#### 业务服务 (app/services/)
```python
# reading_service.py
from ..utils.logger import api_logger

try:
    # LLM调用...
except Exception as e:
    api_logger.log_error("analyze_question", e, {"question": question[:100]})

# llm_service.py
try:
    # API调用...
except Exception as e:
    api_logger.log_error("zhipu_api_call", e, {"prompt_length": len(prompt)})
```

### 性能优化
- **按需创建**: 日志实例按需创建，避免重复初始化
- **异步安全**: 支持FastAPI异步环境
- **内存友好**: 日志文件按日期分割，避免单文件过大
- **编码处理**: UTF-8编码，支持中文日志内容

### 监控建议
- **日志轮转**: 定期清理超过30天的日志文件
- **错误告警**: 监控ERROR级别日志，及时发现问题
- **性能指标**: 通过API日志分析响应时间和成功率
- **用户行为**: 通过管理员日志分析操作模式

---

## 🔐 认证工具 (auth.py)

### JWT工具函数
```python
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
import os

class JWTUtil:
    """JWT工具类"""

    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 24小时

    def create_access_token(
        self,
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """创建访问令牌"""
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[Dict]:
        """验证令牌"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.JWTError:
            return None

    def create_anonymous_token(self, user_id: int, installation_id: str) -> str:
        """创建匿名用户令牌"""
        payload = {
            "user_id": user_id,
            "installation_id": installation_id,
            "user_type": "anonymous",
            "iat": datetime.utcnow()
        }
        return self.create_access_token(payload)

    def create_admin_token(self, username: str) -> str:
        """创建管理员令牌"""
        payload = {
            "username": username,
            "user_type": "admin",
            "role": "admin",
            "iat": datetime.utcnow()
        }
        return self.create_access_token(payload, timedelta(hours=24))

# 全局实例
jwt_util = JWTUtil()
```

### 密码安全工具
```python
import bcrypt
from typing import str

class PasswordUtil:
    """密码安全工具"""

    @staticmethod
    def hash_password(password: str) -> str:
        """哈希密码"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed.encode('utf-8')
        )

    @staticmethod
    def generate_secure_password(length: int = 12) -> str:
        """生成安全密码"""
        import secrets
        import string

        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password

# 全局实例
password_util = PasswordUtil()
```

## 🎫 兑换码工具 (redeem_code.py)

### 兑换码生成器
```python
import secrets
import string
from typing import List, Set
from datetime import datetime, timedelta

class RedeemCodeGenerator:
    """兑换码生成器"""

    # 避免易混淆字符
    SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    def __init__(self):
        self.prefix = os.getenv("REDEEM_CODE_PREFIX", "TAROT")
        self.length = int(os.getenv("REDEEM_CODE_LENGTH", "16"))

    def generate_single_code(self) -> str:
        """生成单个兑换码"""
        # 计算去除前缀后的长度
        code_length = self.length - len(self.prefix)
        if code_length <= 0:
            code_length = 8

        # 生成随机码
        random_part = ''.join(
            secrets.choice(self.SAFE_CHARS)
            for _ in range(code_length)
        )

        return f"{self.prefix}{random_part}"

    def generate_batch_codes(self, count: int) -> List[str]:
        """批量生成兑换码（确保唯一性）"""
        if count > 10000:
            raise ValueError("单次生成数量不能超过10000")

        generated_codes: Set[str] = set()
        max_attempts = count * 10  # 防止无限循环
        attempts = 0

        while len(generated_codes) < count and attempts < max_attempts:
            code = self.generate_single_code()
            generated_codes.add(code)
            attempts += 1

        if len(generated_codes) < count:
            raise RuntimeError(f"生成唯一兑换码失败，只生成了{len(generated_codes)}个")

        return list(generated_codes)

    def validate_code_format(self, code: str) -> bool:
        """验证兑换码格式"""
        if len(code) != self.length:
            return False

        if not code.startswith(self.prefix):
            return False

        # 检查字符是否在安全字符集中
        code_part = code[len(self.prefix):]
        return all(char in self.SAFE_CHARS for char in code_part)

    def generate_with_checksum(self, base_code: str) -> str:
        """生成带校验位的兑换码"""
        # 简单校验算法
        checksum = sum(ord(char) for char in base_code) % len(self.SAFE_CHARS)
        checksum_char = self.SAFE_CHARS[checksum]
        return f"{base_code}{checksum_char}"

    def verify_checksum(self, code: str) -> bool:
        """验证兑换码校验位"""
        if len(code) < 2:
            return False

        base_code = code[:-1]
        checksum_char = code[-1]

        expected_checksum = sum(ord(char) for char in base_code) % len(self.SAFE_CHARS)
        expected_char = self.SAFE_CHARS[expected_checksum]

        return checksum_char == expected_char

# 全局生成器实例
redeem_code_generator = RedeemCodeGenerator()

# 便捷函数
def generate_redeem_code() -> str:
    """生成单个兑换码"""
    return redeem_code_generator.generate_single_code()

def generate_redeem_codes(count: int) -> List[str]:
    """批量生成兑换码"""
    return redeem_code_generator.generate_batch_codes(count)

def validate_redeem_code(code: str) -> bool:
    """验证兑换码格式"""
    return redeem_code_generator.validate_code_format(code)
```

## 🛡️ 安全工具 (security.py)

### 限流工具
```python
import time
from typing import Dict, Optional
from collections import defaultdict, deque
import asyncio

class RateLimiter:
    """基于内存的简单限流器"""

    def __init__(self):
        self._requests: Dict[str, deque] = defaultdict(deque)
        self._locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> bool:
        """检查是否允许请求"""
        async with self._locks[key]:
            now = time.time()
            requests = self._requests[key]

            # 清理过期请求
            while requests and requests[0] < now - window_seconds:
                requests.popleft()

            # 检查是否超出限制
            if len(requests) >= max_requests:
                return False

            # 记录当前请求
            requests.append(now)
            return True

    async def get_remaining(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> int:
        """获取剩余请求数"""
        async with self._locks[key]:
            now = time.time()
            requests = self._requests[key]

            # 清理过期请求
            while requests and requests[0] < now - window_seconds:
                requests.popleft()

            return max(0, max_requests - len(requests))

    def clear_key(self, key: str):
        """清除特定键的限制"""
        if key in self._requests:
            del self._requests[key]
        if key in self._locks:
            del self._locks[key]

# 全局限流器实例
rate_limiter = RateLimiter()
```

### 输入验证和清理
```python
import re
from typing import str, Optional
import html

class InputSanitizer:
    """输入清理和验证工具"""

    # 危险字符模式
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # XSS脚本
        r'javascript:',                # JavaScript协议
        r'on\w+\s*=',                 # 事件处理器
        r'<iframe[^>]*>.*?</iframe>',  # iframe标签
    ]

    @staticmethod
    def sanitize_html(text: str) -> str:
        """清理HTML内容"""
        if not text:
            return ""

        # HTML实体编码
        sanitized = html.escape(text)

        # 移除危险模式
        for pattern in InputSanitizer.DANGEROUS_PATTERNS:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)

        return sanitized.strip()

    @staticmethod
    def validate_email(email: str) -> bool:
        """验证邮箱格式"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def validate_phone(phone: str) -> bool:
        """验证手机号格式"""
        # 中国手机号格式
        pattern = r'^1[3-9]\d{9}$'
        return re.match(pattern, phone) is not None

    @staticmethod
    def clean_filename(filename: str) -> str:
        """清理文件名"""
        if not filename:
            return "unnamed"

        # 移除危险字符
        cleaned = re.sub(r'[<>:"/\\|?*]', '_', filename)
        cleaned = cleaned.strip('. ')

        # 限制长度
        if len(cleaned) > 255:
            cleaned = cleaned[:255]

        return cleaned or "unnamed"

    @staticmethod
    def validate_installation_id(installation_id: str) -> bool:
        """验证安装ID格式"""
        # UUID格式验证
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return re.match(pattern, installation_id.lower()) is not None

# 全局实例
input_sanitizer = InputSanitizer()
```

## 🔍 数据验证工具 (validators.py)

### 业务数据验证器
```python
from typing import List, Optional, Dict, Any
from datetime import datetime
import re

class BusinessValidator:
    """业务数据验证器"""

    @staticmethod
    def validate_tarot_question(question: str) -> Dict[str, Any]:
        """验证塔罗问题"""
        result = {"valid": True, "errors": []}

        if not question or not question.strip():
            result["valid"] = False
            result["errors"].append("问题不能为空")
            return result

        question = question.strip()

        if len(question) < 5:
            result["valid"] = False
            result["errors"].append("问题至少需要5个字符")

        if len(question) > 200:
            result["valid"] = False
            result["errors"].append("问题不能超过200个字符")

        # 检查是否包含敏感内容（简化版）
        sensitive_keywords = ["暴力", "色情", "政治", "赌博"]
        for keyword in sensitive_keywords:
            if keyword in question:
                result["valid"] = False
                result["errors"].append(f"问题包含敏感内容：{keyword}")

        return result

    @staticmethod
    def validate_spread_type(spread_type: str) -> bool:
        """验证牌阵类型"""
        valid_types = ["three-card", "celtic-cross"]
        return spread_type in valid_types

    @staticmethod
    def validate_card_selection(cards: List[Dict]) -> Dict[str, Any]:
        """验证卡牌选择"""
        result = {"valid": True, "errors": []}

        if not cards:
            result["valid"] = False
            result["errors"].append("必须选择至少一张卡牌")
            return result

        if len(cards) > 10:
            result["valid"] = False
            result["errors"].append("最多只能选择10张卡牌")

        # 检查每张卡牌的数据
        positions = set()
        for i, card in enumerate(cards):
            # 检查必需字段
            required_fields = ["card_id", "orientation", "position"]
            for field in required_fields:
                if field not in card:
                    result["valid"] = False
                    result["errors"].append(f"卡牌{i+1}缺少字段：{field}")

            # 检查方向
            if card.get("orientation") not in ["upright", "reversed"]:
                result["valid"] = False
                result["errors"].append(f"卡牌{i+1}方向无效")

            # 检查位置唯一性
            position = card.get("position")
            if position in positions:
                result["valid"] = False
                result["errors"].append(f"位置{position}重复")
            positions.add(position)

        return result

    @staticmethod
    def validate_dimension_selection(
        dimensions: List[int],
        spread_type: str
    ) -> Dict[str, Any]:
        """验证维度选择"""
        result = {"valid": True, "errors": []}

        if not dimensions:
            result["valid"] = False
            result["errors"].append("必须选择至少一个维度")
            return result

        # 根据牌阵类型检查维度数量
        if spread_type == "three-card" and len(dimensions) != 3:
            result["valid"] = False
            result["errors"].append("三牌阵必须选择3个维度")

        if spread_type == "celtic-cross" and len(dimensions) != 10:
            result["valid"] = False
            result["errors"].append("凯尔特十字必须选择10个维度")

        # 检查维度唯一性
        if len(dimensions) != len(set(dimensions)):
            result["valid"] = False
            result["errors"].append("不能选择重复的维度")

        return result

# 全局验证器实例
business_validator = BusinessValidator()
```

## 📊 维度定义工具 (dimension_definitions.py)

### 维度定义管理
```python
from typing import Dict, List, Optional

class DimensionDefinitions:
    """维度定义管理器"""

    # 凯尔特十字固定维度定义
    CELTIC_CROSS_DIMENSIONS = [
        {
            "name": "凯尔特十字-现状",
            "category": "凯尔特十字",
            "description": "展示你当前所处的核心局面与主题焦点。",
            "aspect": "现状",
            "aspect_type": 1
        },
        {
            "name": "凯尔特十字-挑战",
            "category": "凯尔特十字",
            "description": "揭示阻碍或需要正视的主要挑战与阻力。",
            "aspect": "挑战",
            "aspect_type": 2
        },
        {
            "name": "凯尔特十字-潜意识",
            "category": "凯尔特十字",
            "description": "映照深层潜意识的态度与隐藏动机。",
            "aspect": "潜意识",
            "aspect_type": 3
        },
        {
            "name": "凯尔特十字-显意识",
            "category": "凯尔特十字",
            "description": "呈现你在表层意识中的想法与期待。",
            "aspect": "显意识",
            "aspect_type": 4
        },
        {
            "name": "凯尔特十字-过去",
            "category": "凯尔特十字",
            "description": "回顾近期过去对当前局势的影响与铺垫。",
            "aspect": "过去影响",
            "aspect_type": 5
        },
        {
            "name": "凯尔特十字-未来",
            "category": "凯尔特十字",
            "description": "预示短期内即将浮现的趋势或事件。",
            "aspect": "未来趋势",
            "aspect_type": 6
        },
        {
            "name": "凯尔特十字-自我态度",
            "category": "凯尔特十字",
            "description": "分析你对该议题的自我认知与内在姿态。",
            "aspect": "自我态度",
            "aspect_type": 7
        },
        {
            "name": "凯尔特十字-外部影响",
            "category": "凯尔特十字",
            "description": "评估环境、他人或社会因素对局势的影响。",
            "aspect": "外部影响",
            "aspect_type": 8
        },
        {
            "name": "凯尔特十字-希望恐惧",
            "category": "凯尔特十字",
            "description": "剖析你内心的期望与顾虑之间的拉扯。",
            "aspect": "希望恐惧",
            "aspect_type": 9
        },
        {
            "name": "凯尔特十字-结果",
            "category": "凯尔特十字",
            "description": "综合推演事件的最终走向或长期结果。",
            "aspect": "最终结果",
            "aspect_type": 10
        }
    ]

    @classmethod
    def get_celtic_cross_dimensions(cls) -> List[Dict]:
        """获取凯尔特十字维度定义"""
        return cls.CELTIC_CROSS_DIMENSIONS.copy()

    @classmethod
    def validate_dimension_consistency(
        cls,
        dimension_data: Dict,
        spread_type: str
    ) -> bool:
        """验证维度定义一致性"""
        if spread_type == "celtic-cross":
            # 验证凯尔特十字维度
            expected = cls.CELTIC_CROSS_DIMENSIONS
            for i, expected_dim in enumerate(expected):
                if (dimension_data.get("aspect_type") == i + 1 and
                    dimension_data.get("name") != expected_dim["name"]):
                    return False
            return True

        return True  # 三牌阵允许动态维度

    @classmethod
    def get_dimension_template(cls, aspect_type: int, spread_type: str) -> Optional[Dict]:
        """获取维度模板"""
        if spread_type == "celtic-cross":
            for dim in cls.CELTIC_CROSS_DIMENSIONS:
                if dim["aspect_type"] == aspect_type:
                    return dim.copy()
        return None

# 全局定义管理器
dimension_definitions = DimensionDefinitions()
```

## 🔧 辅助函数 (helpers.py)

### 通用辅助工具
```python
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json

class HelperUtils:
    """通用辅助工具"""

    @staticmethod
    def generate_uuid() -> str:
        """生成UUID字符串"""
        return str(uuid.uuid4())

    @staticmethod
    def get_utc_now() -> datetime:
        """获取UTC当前时间"""
        return datetime.now(timezone.utc)

    @staticmethod
    def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """格式化日期时间"""
        return dt.strftime(format_str)

    @staticmethod
    def safe_json_loads(json_str: str, default: Any = None) -> Any:
        """安全的JSON解析"""
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            return default

    @staticmethod
    def safe_json_dumps(obj: Any, default: Any = None) -> str:
        """安全的JSON序列化"""
        try:
            return json.dumps(obj, ensure_ascii=False, default=str)
        except (TypeError, ValueError):
            return json.dumps(default) if default is not None else "{}"

    @staticmethod
    def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
        """截断文本"""
        if not text or len(text) <= max_length:
            return text
        return text[:max_length - len(suffix)] + suffix

    @staticmethod
    def clean_dict(data: Dict, remove_none: bool = True, remove_empty: bool = False) -> Dict:
        """清理字典数据"""
        result = {}
        for key, value in data.items():
            if remove_none and value is None:
                continue
            if remove_empty and value == "":
                continue
            result[key] = value
        return result

    @staticmethod
    def get_client_ip(request) -> str:
        """获取客户端IP地址"""
        # 检查代理头
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"

    @staticmethod
    def mask_sensitive_data(data: str, mask_char: str = "*", keep_start: int = 3, keep_end: int = 3) -> str:
        """遮蔽敏感数据"""
        if not data or len(data) <= keep_start + keep_end:
            return mask_char * len(data) if data else ""

        start_part = data[:keep_start]
        end_part = data[-keep_end:] if keep_end > 0 else ""
        middle_part = mask_char * (len(data) - keep_start - keep_end)

        return start_part + middle_part + end_part

# 全局辅助工具实例
helper_utils = HelperUtils()

# 便捷函数
def generate_uuid() -> str:
    return helper_utils.generate_uuid()

def get_utc_now() -> datetime:
    return helper_utils.get_utc_now()

def safe_json_loads(json_str: str, default: Any = None) -> Any:
    return helper_utils.safe_json_loads(json_str, default)

def truncate_text(text: str, max_length: int) -> str:
    return helper_utils.truncate_text(text, max_length)
```

## 🧪 工具测试

### 测试结构
```
tests/utils/
├── test_auth.py              # 认证工具测试
├── test_redeem_code.py       # 兑换码工具测试
├── test_security.py          # 安全工具测试
├── test_validators.py        # 验证器测试
└── test_helpers.py           # 辅助函数测试
```

### 关键测试用例
```python
# tests/utils/test_redeem_code.py
def test_generate_redeem_code():
    """测试兑换码生成"""
    code = generate_redeem_code()

    assert len(code) == 16
    assert code.startswith("TAROT")
    assert validate_redeem_code(code)

def test_generate_batch_codes():
    """测试批量生成兑换码"""
    codes = generate_redeem_codes(100)

    assert len(codes) == 100
    assert len(set(codes)) == 100  # 确保唯一性

    for code in codes:
        assert validate_redeem_code(code)
```

---

*此文档定义了塔罗牌应用后端的工具函数库，提供认证、安全、验证等核心工具的设计和实现指南。*