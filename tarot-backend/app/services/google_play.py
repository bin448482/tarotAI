"""
Google Play Developer API Integration Service
"""
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from google.auth.credentials import Credentials
from google.auth import default
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.payment import Purchase
from app.models.user import User
from app.models.transaction import CreditTransaction
from app.services.user_service import UserService
from app.schemas.payment import GooglePlayPurchaseRequest, GooglePlayPurchaseResponse

logger = logging.getLogger(__name__)


class GooglePlayService:
    """Google Play Developer API service for purchase verification"""

    def __init__(self):
        self.package_name = settings.GOOGLE_PACKAGE_NAME
        self.service = None
        self._initialize_service()

    def _initialize_service(self):
        """Initialize Google Play Developer API service"""
        try:
            if not settings.GOOGLE_PLAY_ENABLED:
                logger.info("Google Play API is disabled")
                return

            if not settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:
                logger.error("Google Play service account JSON path not configured")
                return

            # Load service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
                scopes=['https://www.googleapis.com/auth/androidpublisher']
            )

            # Build the service
            self.service = build('androidpublisher', 'v3', credentials=credentials)
            logger.info("Google Play Developer API service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Google Play service: {e}")
            self.service = None

    async def verify_purchase(
        self,
        db: Session,
        purchase_request: GooglePlayPurchaseRequest
    ) -> GooglePlayPurchaseResponse:
        """
        Verify a Google Play purchase and process the order

        Args:
            db: Database session
            purchase_request: Purchase verification request data

        Returns:
            GooglePlayPurchaseResponse with verification result
        """
        if not self.service:
            return GooglePlayPurchaseResponse(
                success=False,
                error="Google Play API not available",
                order_id=None
            )

        try:
            # Verify the purchase token with Google Play
            purchase_info = await self._verify_purchase_token(
                purchase_request.product_id,
                purchase_request.purchase_token
            )

            if not purchase_info:
                return GooglePlayPurchaseResponse(
                    success=False,
                    error="Invalid purchase token",
                    order_id=None
                )

            # Check if purchase is already processed
            existing_purchase = db.query(Purchase).filter(
                Purchase.purchase_token == purchase_request.purchase_token
            ).first()

            if existing_purchase:
                return GooglePlayPurchaseResponse(
                    success=True,
                    message="Purchase already processed",
                    order_id=existing_purchase.order_id,
                    credits_awarded=existing_purchase.credits
                )

            # Get or create user (and bind email if provided)
            user = UserService.get_or_create_user(
                db, purchase_request.installation_id, getattr(purchase_request, "email", None)
            )

            # Create purchase record
            # Derive order_id with fallback for auditability
            order_id = purchase_info.get('orderId')
            if not order_id:
                order_id = f"gp_{(hash(purchase_request.purchase_token) & 0xffffffff):08x}"
                logger.warning(f"Google Play purchase without orderId, using fallback: {order_id}")

            # Map product to credits; store product_id as credits for v1 per policy
            credits = self._get_credits_for_product(purchase_request.product_id)
            purchase = Purchase(
                order_id=order_id,
                platform='google_play',
                user_id=user.id,
                product_id=credits,  # v1: store credits value as product_id to align with redeem codes
                credits=credits,
                amount_cents=purchase_info.get('priceAmountMicros', 0) // 10000,  # Convert to cents
                currency=purchase_info.get('priceCurrencyCode', 'USD'),
                status='completed',
                purchase_token=purchase_request.purchase_token,
                completed_at=datetime.utcnow()
            )

            db.add(purchase)
            db.flush()

            # Award credits to user
            balance, _ = UserService.update_user_balance(
                db=db,
                user_id=user.id,
                credit_change=credits,
                transaction_type='earn',
                reference_type='purchase',
                reference_id=purchase.id,
                description=f"Google Play purchase: {purchase_request.product_id}"
            )
            new_balance = balance.credits

            db.commit()

            # Log important fields and truncated token for traceability
            token_trunc = purchase_request.purchase_token[:8] + '...' if purchase_request.purchase_token else 'none'
            logger.info(
                "Processed GP purchase | orderId=%s productId=%s credits=%s installation_id=%s token=%s",
                order_id,
                purchase_request.product_id,
                credits,
                purchase_request.installation_id,
                token_trunc,
            )

            return GooglePlayPurchaseResponse(
                success=True,
                message="Purchase verified and credits awarded",
                order_id=order_id,
                credits_awarded=credits,
                new_balance=new_balance
            )

        except Exception as e:
            db.rollback()
            logger.error(f"Error verifying Google Play purchase: {e}")
            return GooglePlayPurchaseResponse(
                success=False,
                error=f"Purchase verification failed: {str(e)}",
                order_id=None
            )

    async def _verify_purchase_token(
        self,
        product_id: str,
        purchase_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Verify purchase token with Google Play API

        Args:
            product_id: Google Play product ID
            purchase_token: Purchase token to verify

        Returns:
            Purchase information if valid, None if invalid
        """
        try:
            # Call Google Play API to verify the purchase
            result = self.service.purchases().products().get(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            # Check purchase state (0 = purchased, 1 = canceled)
            if result.get('purchaseState') != 0:
                logger.warning(f"Purchase not in valid state: {result.get('purchaseState')}")
                return None

            # Check consumption state (0 = yet to be consumed, 1 = consumed)
            if result.get('consumptionState') == 1:
                logger.warning(f"Purchase already consumed: {purchase_token}")
                return None

            return result

        except HttpError as e:
            logger.error(f"Google Play API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error verifying purchase: {e}")
            return None

    async def acknowledge_purchase(
        self,
        product_id: str,
        purchase_token: str
    ) -> bool:
        """
        Acknowledge a purchase to Google Play

        Args:
            product_id: Google Play product ID
            purchase_token: Purchase token to acknowledge

        Returns:
            True if acknowledgment successful, False otherwise
        """
        if not self.service:
            return False

        try:
            self.service.purchases().products().acknowledge(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            logger.info(f"Successfully acknowledged purchase: {purchase_token}")
            return True

        except Exception as e:
            logger.error(f"Error acknowledging purchase: {e}")
            return False

    async def consume_purchase(
        self,
        db: Session,
        product_id: str,
        purchase_token: str
    ) -> bool:
        """
        Mark a purchase as consumed in Google Play

        Args:
            db: Database session
            product_id: Google Play product ID
            purchase_token: Purchase token to consume

        Returns:
            True if consumption successful, False otherwise
        """
        if not self.service:
            return False

        try:
            # Mark as consumed in Google Play
            self.service.purchases().products().consume(
                packageName=self.package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            # Update purchase record in database
            purchase = db.query(Purchase).filter(
                Purchase.purchase_token == purchase_token
            ).first()

            if purchase:
                purchase.status = 'consumed'
                db.commit()

            logger.info(f"Successfully consumed purchase: {purchase_token}")
            return True

        except Exception as e:
            logger.error(f"Error consuming purchase: {e}")
            db.rollback()
            return False

    def _get_credits_for_product(self, product_id: str) -> int:
        """
        Get credits amount for a Google Play product ID

        Args:
            product_id: Google Play product ID

        Returns:
            Number of credits for the product
        """
        # Product mapping (customize based on your product catalog)
        product_credits = {
            'com.mysixth.tarot.credits_5': 5,
            'com.mysixth.tarot.credits_10': 10,
            'com.mysixth.tarot.credits_20': 20,
            'com.mysixth.tarot.credits_50': 50,
            'com.mysixth.tarot.credits_100': 100,
        }

        return product_credits.get(product_id, 1)

    async def get_subscription_info(
        self,
        subscription_id: str,
        purchase_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get subscription information (for future subscription support)

        Args:
            subscription_id: Google Play subscription ID
            purchase_token: Purchase token

        Returns:
            Subscription information if valid, None if invalid
        """
        if not self.service:
            return None

        try:
            result = self.service.purchases().subscriptions().get(
                packageName=self.package_name,
                subscriptionId=subscription_id,
                token=purchase_token
            ).execute()

            return result

        except Exception as e:
            logger.error(f"Error getting subscription info: {e}")
            return None

    def is_available(self) -> bool:
        """Check if Google Play service is available"""
        return self.service is not None and settings.GOOGLE_PLAY_ENABLED


# Global instance
google_play_service = GooglePlayService()
