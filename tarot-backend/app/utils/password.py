"""
Password hashing and verification utilities.
"""
import bcrypt
import secrets
import string
from typing import Tuple


def hash_password(password: str) -> str:
    """
    使用bcrypt对密码进行哈希处理。

    Args:
        password: 明文密码

    Returns:
        str: 哈希后的密码
    """
    # 将密码转换为字节
    password_bytes = password.encode('utf-8')

    # 生成盐值并哈希密码
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    # 返回字符串格式的哈希值
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """
    验证密码是否匹配哈希值。

    Args:
        password: 明文密码
        hashed_password: 存储的哈希密码

    Returns:
        bool: 密码是否匹配
    """
    try:
        # 将密码和哈希值转换为字节
        password_bytes = password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')

        # 验证密码
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # 如果验证过程中出现任何错误，返回False
        return False


def generate_secure_password(length: int = 12) -> str:
    """
    生成安全的随机密码。

    Args:
        length: 密码长度，默认12位

    Returns:
        str: 生成的随机密码
    """
    if length < 8:
        raise ValueError("密码长度至少为8位")

    # 定义字符集
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special_chars = "!@#$%^&*"

    # 确保密码包含各种字符类型
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special_chars)
    ]

    # 填充剩余长度
    all_chars = lowercase + uppercase + digits + special_chars
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))

    # 打乱顺序
    secrets.SystemRandom().shuffle(password)

    return ''.join(password)


def validate_password_strength(password: str) -> Tuple[bool, list[str]]:
    """
    验证密码强度。

    Args:
        password: 待验证的密码

    Returns:
        Tuple[bool, list[str]]: (是否符合要求, 错误信息列表)
    """
    errors = []

    # 长度检查
    if len(password) < 8:
        errors.append("密码长度至少为8位")

    if len(password) > 128:
        errors.append("密码长度不能超过128位")

    # 字符类型检查
    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)

    if not has_lower:
        errors.append("密码必须包含小写字母")

    if not has_upper:
        errors.append("密码必须包含大写字母")

    if not has_digit:
        errors.append("密码必须包含数字")

    if not has_special:
        errors.append("密码必须包含特殊字符")

    # 常见弱密码检查
    weak_passwords = [
        "password", "123456", "qwerty", "abc123", "admin123",
        "password123", "123456789", "12345678"
    ]

    if password.lower() in weak_passwords:
        errors.append("密码太简单，请使用更复杂的密码")

    return len(errors) == 0, errors


def is_password_compromised(password: str) -> bool:
    """
    检查密码是否在常见泄露密码列表中。

    注意：这里提供基础实现，生产环境可考虑集成HaveIBeenPwned API

    Args:
        password: 待检查的密码

    Returns:
        bool: 密码是否已被泄露
    """
    # 常见泄露密码列表（简化版）
    common_passwords = {
        "123456", "password", "123456789", "12345678", "12345",
        "1234567", "1234567890", "qwerty", "abc123", "million2",
        "000000", "1234", "iloveyou", "aaron431", "password123",
        "123123", "admin", "welcome", "monkey", "login"
    }

    return password.lower() in common_passwords