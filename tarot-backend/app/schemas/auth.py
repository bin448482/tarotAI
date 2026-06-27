"""
Authentication-related Pydantic schemas.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class AnonymousUserResponse(BaseModel):
    """匿名用户创建响应"""
    user_id: str
    token: str
    expires_in: int = 7 * 24 * 3600  # 7天，以秒为单位


class TokenValidationRequest(BaseModel):
    """令牌验证请求"""
    token: str


class TokenValidationResponse(BaseModel):
    """令牌验证响应"""
    valid: bool
    user_id: str | None = None
    expires_at: str | None = None


# Email verification schemas
class SendVerificationEmailRequest(BaseModel):
    """发送验证邮件请求"""
    email: EmailStr = Field(..., description="用户邮箱地址")
    user_id: Optional[str] = Field(None, description="用户ID（可选，用于关联现有匿名用户）")


class SendVerificationEmailResponse(BaseModel):
    """发送验证邮件响应"""
    success: bool
    message: str
    email: str
    user_id: str


class VerifyEmailRequest(BaseModel):
    """邮箱验证请求"""
    token: str = Field(..., description="验证令牌")


class VerifyEmailResponse(BaseModel):
    """邮箱验证响应"""
    success: bool
    message: str
    user_id: str
    email: str


class SetPasswordRequest(BaseModel):
    """设置密码请求"""
    token: str = Field(..., description="验证令牌")
    password: str = Field(..., min_length=8, max_length=128, description="用户密码")


class SetPasswordResponse(BaseModel):
    """设置密码响应"""
    success: bool
    message: str
    user_id: str


class EmailLoginRequest(BaseModel):
    """邮箱登录请求"""
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., description="用户密码")


class EmailLoginResponse(BaseModel):
    """邮箱登录响应"""
    success: bool
    message: str
    user_id: str
    token: str
    expires_in: int = 7 * 24 * 3600


class SendPasswordResetRequest(BaseModel):
    """发送密码重置邮件请求"""
    email: EmailStr = Field(..., description="用户邮箱地址")


class SendPasswordResetResponse(BaseModel):
    """发送密码重置邮件响应"""
    success: bool
    message: str
    email: str


class ResetPasswordRequest(BaseModel):
    """重置密码请求"""
    token: str = Field(..., description="重置令牌")
    password: str = Field(..., min_length=8, max_length=128, description="新密码")


class ResetPasswordResponse(BaseModel):
    """重置密码响应"""
    success: bool
    message: str
    user_id: str


class EmailStatusResponse(BaseModel):
    """获取邮箱状态响应"""
    success: bool
    user_id: str = Field(..., description="匿名用户 installation_id")
    email: Optional[EmailStr] = Field(None, description="用户绑定的邮箱")
    email_verified: bool = Field(..., description="邮箱是否已验证")
    email_verified_at: Optional[str] = Field(None, description="邮箱验证时间，ISO 格式")
    message: Optional[str] = Field(None, description="附加提示信息")
