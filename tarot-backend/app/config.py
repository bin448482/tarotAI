"""
Configuration management for the Tarot Backend API.
"""
import os
from typing import Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # 兼容旧版本的 pydantic
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application settings
    APP_NAME: str = "Tarot Backend API"
    APP_VERSION: str = "1.0.0"
    APP_BASE_URL: str = "http://localhost:8000"  # 生产环境需要修改
    DEBUG: bool = False
    DEFAULT_LOCALE: str = "zh-CN"
    SUPPORTED_LOCALES: list[str] = ["zh-CN", "en"]

    # Database configuration
    DATABASE_URL: str = "sqlite:///./backend_tarot.db"

    # LLM configuration (参考 ../tarot-ai-generator/.env)
    API_PROVIDER: str = "zhipu"  # zhipu 或 openai
    ZHIPUAI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    MODEL_NAME: str = "glm-4-flash"
    ZHIPU_MODEL_NAME: str = "glm-4-flash"
    OPENAI_MODEL_NAME: str = "gpt-4o-mini"
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 1000

    # API 调用限制
    RATE_LIMIT_PER_MINUTE: int = 60
    BATCH_SIZE: int = 10

    # JWT configuration
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24 * 7  # 7天

    # 管理员认证
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "your-secure-admin-password"
    ADMIN_SESSION_EXPIRE_HOURS: int = 24
    ADMIN_TOKEN_EXPIRE_HOURS: int = 24

    # Google Play API配置
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: Optional[str] = None
    GOOGLE_PACKAGE_NAME: str = "com.mysixth.tarot"
    GOOGLE_PLAY_ENABLED: bool = False

    # 兑换码配置
    REDEEM_CODE_LENGTH: int = 16
    REDEEM_CODE_PREFIX: Optional[str] = "TAROT"
    REDEEM_CODE_EXPIRES_DAYS: int = 365
    REDEEM_CODE_DAILY_LIMIT_PER_DEVICE: int = 5

    # 积分系统配置
    DEFAULT_INITIAL_CREDITS: int = 10
    DEFAULT_CREDITS_PER_AI_READING: int = 1
    CREDITS_EXPIRE_DAYS: int = 0  # 0表示永不过期

    # 支付安全配置
    PAYMENT_RATE_LIMIT_PER_HOUR: int = 10
    WEBHOOK_SECRET_KEY: str = "your-webhook-secret"

    # 邮箱SMTP配置 (QQ邮箱)
    EMAIL_SMTP_HOST: str = "smtp.qq.com"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_FROM_ADDRESS: str = ""
    EMAIL_FROM_NAME: str = "塔罗牌应用"
    EMAIL_PASSWORD: str = ""  # QQ邮箱授权码
    EMAIL_USE_TLS: bool = True
    EMAIL_TIMEOUT: int = 60  # 连接超时时间（秒）

    # CORS settings
    CORS_ORIGINS: list[str] = ["*"]  # 开发环境允许所有来源
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: list[str] = ["*"]
    CORS_HEADERS: list[str] = ["*"]

    # Static files
    STATIC_DIR: str = "static"
    CARDS_IMAGE_PATH: str = "static/images"
    APP_RELEASE_STORAGE_DIR: str = "static/app-releases"
    APP_RELEASE_BASE_URL: str = "/static/app-releases"
    APP_RELEASE_MAX_SIZE_MB: int = 300
    APP_RELEASE_ALLOWED_EXTENSIONS: list[str] = [".apk"]
    APP_RELEASE_ALLOWED_MIME_TYPES: list[str] = [
        "application/vnd.android.package-archive",
        "application/octet-stream",
        "binary/octet-stream",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings
