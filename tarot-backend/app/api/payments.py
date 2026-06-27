"""
Payment related API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
import uuid

from ..database import get_db
from ..services.user_service import UserService
from ..utils.redeem_code import RedeemCodeService
from ..schemas.payment import (
    RedeemCodeValidateRequest,
    RedeemCodeValidateResponse,
    RedeemCodeInfoRequest,
    RedeemCodeInfoResponse,
    RedeemCodeResponse,
    PurchaseRequest,
    PurchaseResponse,
    GooglePlayPurchaseRequest,
    GooglePlayPurchaseResponse,
    GooglePlayConsumeRequest,
    GooglePlayConsumeResponse
)
from ..models import User, RedeemCode, Purchase
from ..config import settings
from ..services.google_play import google_play_service

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.post("/redeem", response_model=RedeemCodeValidateResponse)
async def redeem_code(
    request: RedeemCodeValidateRequest,
    db: Session = Depends(get_db)
):
    """
    Validate and redeem a code for credits.

    This endpoint validates a redeem code and adds credits to the user's balance
    if the code is valid and unused.
    """
    try:
        # Find user by installation_id
        user = db.query(User).filter(
            User.installation_id == request.installation_id
        ).first()

        if not user:
            # Register the user if they don't exist
            user = UserService.register_user(db, request.installation_id)

        # Validate and use the redeem code
        redeem_code, used_successfully = RedeemCodeService.validate_and_use_code(
            db, request.code, user
        )

        if used_successfully:
            # Add credits to user balance
            balance, transaction = UserService.update_user_balance(
                db=db,
                user_id=user.id,
                credit_change=redeem_code.credits,
                transaction_type="earn",
                reference_type="redeem_code",
                reference_id=redeem_code.id,
                description=f"Redeemed code: {redeem_code.code}"
            )

            # Create purchase record for tracking
            purchase = Purchase(
                order_id=f"redeem_{redeem_code.id}_{uuid.uuid4().hex[:8]}",
                platform="redeem_code",
                user_id=user.id,
                product_id=redeem_code.product_id,
                credits=redeem_code.credits,
                status="completed",
                redeem_code=redeem_code.code,
                completed_at=redeem_code.used_at
            )
            db.add(purchase)
            db.commit()

            return RedeemCodeValidateResponse(
                success=True,
                credits=redeem_code.credits,
                balance=balance.credits,
                message=f"Successfully redeemed {redeem_code.credits} credits",
                transaction_id=transaction.id,
                code_info=RedeemCodeResponse.from_orm(redeem_code)
            )

    except ValueError as e:
        return RedeemCodeValidateResponse(
            success=False,
            credits=0,
            balance=0,
            message=str(e),
            transaction_id=None,
            code_info=None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process redeem code"
        )


@router.post("/redeem/info", response_model=RedeemCodeInfoResponse)
async def get_redeem_code_info(
    request: RedeemCodeInfoRequest,
    db: Session = Depends(get_db)
):
    """
    Get information about a redeem code without using it.

    This endpoint allows checking if a code is valid and what credits
    it provides without actually redeeming it.
    """
    try:
        redeem_code = RedeemCodeService.get_code_info(db, request.code)

        if not redeem_code:
            return RedeemCodeInfoResponse(
                valid=False,
                code_info=None,
                message="Invalid redeem code"
            )

        # Check if code is usable
        if redeem_code.status != "active":
            status_messages = {
                "used": "This code has already been used",
                "expired": "This code has expired",
                "disabled": "This code has been disabled"
            }
            message = status_messages.get(redeem_code.status, "This code is not available")

            return RedeemCodeInfoResponse(
                valid=False,
                code_info=RedeemCodeResponse.from_orm(redeem_code),
                message=message
            )

        # Check expiration
        if redeem_code.expires_at and redeem_code.expires_at < db.execute(func.now()).scalar():
            return RedeemCodeInfoResponse(
                valid=False,
                code_info=RedeemCodeResponse.from_orm(redeem_code),
                message="This code has expired"
            )

        return RedeemCodeInfoResponse(
            valid=True,
            code_info=RedeemCodeResponse.from_orm(redeem_code),
            message=f"Valid code for {redeem_code.credits} credits"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get code information"
        )











# Google Play API endpoints
@router.post("/google/verify", response_model=GooglePlayPurchaseResponse)
async def verify_google_play_purchase(
    request: GooglePlayPurchaseRequest,
    db: Session = Depends(get_db)
):
    """
    Verify a Google Play purchase and award credits to user.

    This endpoint verifies a Google Play purchase token and processes
    the order if valid, awarding credits to the user's account.
    """
    try:
        if not google_play_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Play service not available"
            )

        result = await google_play_service.verify_purchase(db, request)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error or "Purchase verification failed"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify Google Play purchase"
        )


@router.post("/google/consume", response_model=GooglePlayConsumeResponse)
async def consume_google_play_purchase(
    request: GooglePlayConsumeRequest,
    db: Session = Depends(get_db)
):
    """
    Mark a Google Play purchase as consumed.

    This endpoint marks a purchase as consumed in Google Play's system
    and updates the local database record.
    """
    try:
        if not google_play_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Play service not available"
            )

        success = await google_play_service.consume_purchase(
            db, request.product_id, request.purchase_token
        )

        if success:
            return GooglePlayConsumeResponse(
                success=True,
                message="Purchase consumed successfully"
            )
        else:
            return GooglePlayConsumeResponse(
                success=False,
                error="Failed to consume purchase"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to consume Google Play purchase"
        )


@router.post("/webhooks/google/play")
async def google_play_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for Google Play Real-time Developer Notifications.

    This endpoint receives notifications from Google Play about
    subscription and purchase events for automated processing.
    """
    try:
        # Basic webhook structure validation
        if "message" not in request:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook format"
            )

        # TODO: Implement webhook signature verification
        # TODO: Parse and process different notification types
        # TODO: Handle subscription events, purchase events, etc.

        # For now, just log the webhook
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Received Google Play webhook: {request}")

        return {"status": "received"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process Google Play webhook"
        )
