"""
Payment related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class RedeemCodeCreateRequest(BaseModel):
    """Request schema for creating redeem codes."""
    product_id: int = Field(..., description="Product ID")
    credits: int = Field(..., gt=0, description="Credits per code")
    count: int = Field(..., gt=0, le=1000, description="Number of codes to create")
    expires_days: Optional[int] = Field(None, gt=0, description="Days until expiration")
    prefix: Optional[str] = Field(None, max_length=8, description="Code prefix")
    code_length: int = Field(16, ge=8, le=32, description="Length of each code")


class RedeemCodeResponse(BaseModel):
    """Response schema for redeem code information."""
    id: int
    code: str
    product_id: int
    credits: int
    status: str
    used_by: Optional[int]
    used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
    batch_id: Optional[str]

    class Config:
        from_attributes = True


class RedeemCodeBatchResponse(BaseModel):
    """Response schema for batch code creation."""
    batch_id: str
    codes_created: int
    total_credits: int
    expires_at: Optional[datetime]
    codes: List[RedeemCodeResponse]


class RedeemCodeValidateRequest(BaseModel):
    """Request schema for redeem code validation."""
    code: str = Field(..., min_length=6, max_length=32, description="Redeem code")
    installation_id: str = Field(..., description="User's installation ID")


class RedeemCodeValidateResponse(BaseModel):
    """Response schema for redeem code validation."""
    success: bool
    credits: int
    balance: int
    message: str
    transaction_id: Optional[int] = None
    code_info: Optional[RedeemCodeResponse] = None


class RedeemCodeInfoRequest(BaseModel):
    """Request schema for redeem code information."""
    code: str = Field(..., min_length=6, max_length=32, description="Redeem code")


class RedeemCodeInfoResponse(BaseModel):
    """Response schema for redeem code information."""
    valid: bool
    code_info: Optional[RedeemCodeResponse] = None
    message: str


class RedeemCodeBatchStatsResponse(BaseModel):
    """Response schema for batch statistics."""
    batch_id: str
    total_codes: int
    active_codes: int
    used_codes: int
    expired_codes: int
    disabled_codes: int
    usage_rate: float


class RedeemCodeListRequest(BaseModel):
    """Request schema for listing redeem codes."""
    batch_id: Optional[str] = Field(None, description="Filter by batch ID")
    status: Optional[str] = Field(None, description="Filter by status")
    limit: int = Field(50, ge=1, le=500, description="Number of codes to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class RedeemCodeListResponse(BaseModel):
    """Response schema for redeem code list."""
    codes: List[RedeemCodeResponse]
    total_count: int
    has_more: bool


class RedeemCodeDisableRequest(BaseModel):
    """Request schema for disabling redeem codes."""
    code_ids: List[int] = Field(..., description="List of code IDs to disable")
    reason: Optional[str] = Field(None, max_length=200, description="Reason for disabling")


class RedeemCodeDisableResponse(BaseModel):
    """Response schema for code disabling."""
    success: bool
    disabled_count: int
    message: str


class PurchaseRequest(BaseModel):
    """Request schema for creating a purchase record."""
    platform: str = Field(..., description="Purchase platform")
    user_id: int = Field(..., description="User ID")
    product_id: int = Field(..., description="Product ID")
    credits: int = Field(..., gt=0, description="Credits purchased")
    amount_cents: Optional[int] = Field(None, description="Amount paid in cents")
    currency: Optional[str] = Field(None, max_length=3, description="Currency code")
    purchase_token: Optional[str] = Field(None, description="Platform purchase token")
    redeem_code: Optional[str] = Field(None, description="Used redeem code")


class PurchaseResponse(BaseModel):
    """Response schema for purchase information."""
    id: int
    order_id: str
    platform: str
    user_id: int
    product_id: int
    credits: int
    amount_cents: Optional[int]
    currency: Optional[str]
    status: str
    purchase_token: Optional[str]
    redeem_code: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class GooglePlayPurchaseRequest(BaseModel):
    """Request schema for Google Play purchase verification."""
    installation_id: str = Field(..., description="User's installation ID")
    product_id: str = Field(..., description="Google Play product ID")
    purchase_token: str = Field(..., description="Google Play purchase token")
    order_id: Optional[str] = Field(None, description="Google Play order ID")
    email: Optional[str] = Field(None, description="Optional user email to bind on success")


class GooglePlayPurchaseResponse(BaseModel):
    """Response schema for Google Play purchase verification."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    order_id: Optional[str] = None
    credits_awarded: Optional[int] = None
    new_balance: Optional[int] = None


class GooglePlayConsumeRequest(BaseModel):
    """Request schema for Google Play purchase consumption."""
    product_id: str = Field(..., description="Google Play product ID")
    purchase_token: str = Field(..., description="Google Play purchase token")


class GooglePlayConsumeResponse(BaseModel):
    """Response schema for Google Play purchase consumption."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
