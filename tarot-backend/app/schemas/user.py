"""
User related Pydantic schemas.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    """Request schema for user registration."""
    installation_id: str = Field(
        ...,
        description="Unique device identifier",
        min_length=1,
        max_length=255
    )


class UserAuthRequest(BaseModel):
    """Request schema for user authentication."""
    installation_id: str = Field(
        ...,
        description="Unique device identifier",
        min_length=1,
        max_length=255
    )


class UserResponse(BaseModel):
    """Response schema for user information."""
    id: int
    installation_id: str
    email: Optional[str] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    created_at: datetime
    last_active_at: datetime
    total_credits_purchased: int
    total_credits_consumed: int

    class Config:
        from_attributes = True


class UserAuthResponse(BaseModel):
    """Response schema for user authentication."""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class BalanceResponse(BaseModel):
    """Response schema for user balance."""
    user_id: int
    credits: int
    version: int
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    """Response schema for credit transactions."""
    id: int
    user_id: int
    type: str
    credits: int
    balance_after: int
    reference_type: Optional[str]
    reference_id: Optional[int]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionHistoryResponse(BaseModel):
    """Response schema for transaction history list."""
    transactions: List[TransactionResponse]
    total_count: int
    has_more: bool


class UserStatsResponse(BaseModel):
    """Response schema for user statistics."""
    user_id: int
    installation_id: str
    created_at: datetime
    last_active_at: datetime
    current_balance: int
    total_purchased: int
    total_consumed: int
    transaction_count: int


class AdminBalanceAdjustRequest(BaseModel):
    """Request schema for admin balance adjustment."""
    user_id: int = Field(..., description="User ID to adjust")
    credit_change: int = Field(..., description="Credit amount to add/subtract")
    description: str = Field(
        ...,
        description="Reason for adjustment",
        min_length=1,
        max_length=500
    )


class CreditConsumeRequest(BaseModel):
    """Request schema for consuming credits."""
    installation_id: str = Field(..., description="Device identifier")
    credits: int = Field(..., gt=0, description="Credits to consume")
    type: str = Field(..., description="Consumption type (e.g., ai_reading)")
    reference_id: Optional[int] = Field(None, description="Related record ID")
    description: Optional[str] = Field(None, max_length=200, description="Consumption description")


class CreditConsumeResponse(BaseModel):
    """Response schema for credit consumption."""
    success: bool
    remaining_credits: int
    transaction_id: int
    message: str