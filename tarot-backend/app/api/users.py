"""
User related API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from ..database import get_db
from ..services.user_service import UserService
from ..schemas.user import (
    UserRegisterRequest,
    UserAuthRequest,
    UserResponse,
    UserAuthResponse,
    BalanceResponse,
    TransactionResponse,
    TransactionHistoryResponse,
    UserStatsResponse,
    AdminBalanceAdjustRequest,
    CreditConsumeRequest,
    CreditConsumeResponse
)
from ..models import User, UserBalance, CreditTransaction
from ..utils.auth import verify_jwt_token
from ..config import settings

router = APIRouter(prefix="/api/v1", tags=["users"])

# Security scheme for JWT token
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from JWT token.
    This is a placeholder - will be implemented with proper FastAPI security.
    """
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.post("/users/register", response_model=UserAuthResponse)
async def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register or login anonymous user with installation_id.

    If user already exists, updates last_active_at and returns existing user.
    If new user, creates user and initial balance record.
    """
    try:
        user = UserService.register_user(db, request.installation_id)
        _, token = UserService.authenticate_user(db, request.installation_id)

        return UserAuthResponse(
            user=UserResponse.from_orm(user),
            access_token=token,
            token_type="bearer"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/users/auth", response_model=UserAuthResponse)
async def authenticate_user(
    request: UserAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.
    """
    try:
        user, token = UserService.authenticate_user(db, request.installation_id)

        return UserAuthResponse(
            user=UserResponse.from_orm(user),
            access_token=token,
            token_type="bearer"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile information.
    """
    return UserResponse.from_orm(current_user)


@router.get("/me/balance", response_model=BalanceResponse)
async def get_user_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's balance.
    """
    balance = UserService.get_user_balance(db, current_user.id)

    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Balance record not found"
        )

    return BalanceResponse.from_orm(balance)


@router.get("/me/transactions", response_model=TransactionHistoryResponse)
async def get_user_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's transaction history.
    """
    transactions = UserService.get_user_transactions(
        db, current_user.id, limit, offset
    )

    # Get total count for pagination
    total_count = db.query(func.count(CreditTransaction.id)).filter(
        CreditTransaction.user_id == current_user.id
    ).scalar()

    has_more = offset + len(transactions) < total_count

    return TransactionHistoryResponse(
        transactions=[TransactionResponse.from_orm(t) for t in transactions],
        total_count=total_count,
        has_more=has_more
    )


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's statistics summary.
    """
    try:
        stats = UserService.get_user_stats(db, current_user.id)
        return UserStatsResponse(**stats)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/consume", response_model=CreditConsumeResponse)
async def consume_credits(
    request: CreditConsumeRequest,
    db: Session = Depends(get_db)
):
    """
    Consume credits for LLM calls or other services.

    This endpoint is called before making an LLM request to ensure
    the user has sufficient credits.
    """
    try:
        # Find user by installation_id
        user = db.query(User).filter(
            User.installation_id == request.installation_id
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Consume credits
        balance, transaction = UserService.update_user_balance(
            db=db,
            user_id=user.id,
            credit_change=-request.credits,
            transaction_type="consume",
            reference_type=request.type,
            reference_id=request.reference_id,
            description=request.description or f"{request.type} consumption"
        )

        return CreditConsumeResponse(
            success=True,
            remaining_credits=balance.credits,
            transaction_id=transaction.id,
            message=f"Successfully consumed {request.credits} credits"
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to consume credits"
        )


# Admin endpoints (will need proper admin authentication)
@router.post("/admin/users/{user_id}/balance/adjust")
async def admin_adjust_balance(
    user_id: int,
    request: AdminBalanceAdjustRequest,
    db: Session = Depends(get_db)
    # TODO: Add admin authentication dependency
):
    """
    Admin endpoint to adjust user balance.

    This endpoint allows administrators to manually adjust user credits
    for refunds, promotions, or corrections.
    """
    try:
        balance, transaction = UserService.admin_adjust_balance(
            db=db,
            user_id=user_id,
            credit_change=request.credit_change,
            description=request.description,
            admin_id=None  # TODO: Get from admin authentication
        )

        return {
            "success": True,
            "user_id": user_id,
            "credit_change": request.credit_change,
            "new_balance": balance.credits,
            "transaction_id": transaction.id,
            "description": request.description
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust balance"
        )