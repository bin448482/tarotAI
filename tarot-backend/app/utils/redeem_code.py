"""
Redeem code generation and validation utilities.
"""
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import RedeemCode, User
from ..config import settings


class RedeemCodeGenerator:
    """Utility class for generating and managing redeem codes."""

    # Characters to use for redeem codes (avoiding confusing characters)
    CHARSET = string.ascii_uppercase + string.digits
    EXCLUDED_CHARS = {'0', 'O', '1', 'I', 'L'}

    @classmethod
    def get_valid_chars(cls) -> str:
        """Get valid characters for code generation."""
        return ''.join([c for c in cls.CHARSET if c not in cls.EXCLUDED_CHARS])

    @classmethod
    def generate_code(cls, length: int = 16, prefix: Optional[str] = None) -> str:
        """
        Generate a secure redeem code.

        Args:
            length: Total length of the code
            prefix: Optional prefix for the code

        Returns:
            str: Generated redeem code
        """
        valid_chars = cls.get_valid_chars()

        if prefix:
            remaining_length = length - len(prefix)
            if remaining_length < 4:
                raise ValueError("Code length too short for prefix")

            random_part = ''.join(secrets.choice(valid_chars) for _ in range(remaining_length))
            return f"{prefix}{random_part}"
        else:
            return ''.join(secrets.choice(valid_chars) for _ in range(length))

    @classmethod
    def generate_batch(
        cls,
        count: int,
        length: int = 16,
        prefix: Optional[str] = None
    ) -> List[str]:
        """
        Generate a batch of unique redeem codes.

        Args:
            count: Number of codes to generate
            length: Length of each code
            prefix: Optional prefix for codes

        Returns:
            List[str]: List of unique redeem codes
        """
        codes = set()
        max_attempts = count * 10  # Prevent infinite loops
        attempts = 0

        while len(codes) < count and attempts < max_attempts:
            code = cls.generate_code(length, prefix)
            codes.add(code)
            attempts += 1

        if len(codes) < count:
            raise ValueError(f"Could not generate {count} unique codes")

        return list(codes)

    @classmethod
    def create_batch_id(cls) -> str:
        """
        Create a batch ID for tracking code batches.

        Returns:
            str: Batch ID in format BATCH_YYYYMMDD_HHMMSS_RANDOM
        """
        valid_chars = cls.get_valid_chars()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        random_suffix = ''.join(secrets.choice(valid_chars) for _ in range(4))
        return f"BATCH_{timestamp}_{random_suffix}"


class RedeemCodeService:
    """Service for managing redeem codes."""

    @staticmethod
    def create_redeem_codes(
        db: Session,
        product_id: int,
        credits: int,
        count: int,
        expires_days: Optional[int] = None,
        batch_id: Optional[str] = None,
        prefix: Optional[str] = None,
        code_length: int = 16
    ) -> List[RedeemCode]:
        """
        Create a batch of redeem codes.

        Args:
            db: Database session
            product_id: Product ID for the codes
            credits: Credits each code provides
            count: Number of codes to create
            expires_days: Days until codes expire (None = never expire)
            batch_id: Optional batch ID for tracking
            prefix: Optional code prefix
            code_length: Length of each code

        Returns:
            List[RedeemCode]: Created redeem codes

        Raises:
            ValueError: If codes already exist or generation fails
        """
        if not batch_id:
            batch_id = RedeemCodeGenerator.create_batch_id()

        # Set expiration date if specified
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)

        # Generate unique codes
        max_retries = 3
        for retry in range(max_retries):
            try:
                codes = RedeemCodeGenerator.generate_batch(count, code_length, prefix)

                # Check if any codes already exist in database
                existing_codes = db.query(RedeemCode.code).filter(
                    RedeemCode.code.in_(codes)
                ).all()

                if existing_codes:
                    if retry == max_retries - 1:
                        raise ValueError(f"Generated codes conflict with existing codes: {existing_codes}")
                    continue  # Retry generation

                # Create redeem code records
                redeem_codes = []
                for code in codes:
                    redeem_code = RedeemCode(
                        code=code,
                        product_id=product_id,
                        credits=credits,
                        status="active",
                        expires_at=expires_at,
                        batch_id=batch_id
                    )
                    redeem_codes.append(redeem_code)
                    db.add(redeem_code)

                db.commit()
                return redeem_codes

            except Exception as e:
                db.rollback()
                if retry == max_retries - 1:
                    raise e
                continue

        raise ValueError("Failed to create redeem codes after multiple retries")

    @staticmethod
    def validate_and_use_code(
        db: Session,
        code: str,
        user: User
    ) -> tuple[RedeemCode, bool]:
        """
        Validate and use a redeem code.

        Args:
            db: Database session
            code: Redeem code to validate
            user: User attempting to use the code

        Returns:
            tuple[RedeemCode, bool]: (redeem_code, was_used_successfully)

        Raises:
            ValueError: If code is invalid or cannot be used
        """
        # Find the redeem code
        redeem_code = db.query(RedeemCode).filter(
            RedeemCode.code == code.upper()
        ).first()

        if not redeem_code:
            raise ValueError("Invalid redeem code")

        # Check if code is already used
        if redeem_code.status == "used":
            raise ValueError("Redeem code has already been used")

        # Check if code is disabled
        if redeem_code.status == "disabled":
            raise ValueError("Redeem code is disabled")

        # Check if code has expired
        if redeem_code.expires_at and redeem_code.expires_at < datetime.utcnow():
            # Mark as expired
            redeem_code.status = "expired"
            db.commit()
            raise ValueError("Redeem code has expired")

        # Check daily usage limits per device
        daily_limit = getattr(settings, 'REDEEM_CODE_DAILY_LIMIT_PER_DEVICE', 5)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        today_usage = db.query(func.count(RedeemCode.id)).filter(
            RedeemCode.used_by == user.id,
            RedeemCode.used_at >= today_start,
            RedeemCode.status == "used"
        ).scalar()

        if today_usage >= daily_limit:
            raise ValueError(f"Daily redeem limit exceeded ({daily_limit} codes per day)")

        # Mark code as used
        redeem_code.status = "used"
        redeem_code.used_by = user.id
        redeem_code.used_at = datetime.utcnow()

        db.commit()
        return redeem_code, True

    @staticmethod
    def get_code_info(db: Session, code: str) -> Optional[RedeemCode]:
        """
        Get information about a redeem code without using it.

        Args:
            db: Database session
            code: Redeem code to check

        Returns:
            Optional[RedeemCode]: Redeem code information or None
        """
        return db.query(RedeemCode).filter(
            RedeemCode.code == code.upper()
        ).first()

    @staticmethod
    def get_batch_codes(
        db: Session,
        batch_id: str,
        status: Optional[str] = None
    ) -> List[RedeemCode]:
        """
        Get all codes in a batch.

        Args:
            db: Database session
            batch_id: Batch ID to filter by
            status: Optional status filter

        Returns:
            List[RedeemCode]: Codes in the batch
        """
        query = db.query(RedeemCode).filter(RedeemCode.batch_id == batch_id)

        if status:
            query = query.filter(RedeemCode.status == status)

        return query.order_by(RedeemCode.created_at).all()

    @staticmethod
    def get_batch_stats(db: Session, batch_id: str) -> dict:
        """
        Get statistics for a batch of redeem codes.

        Args:
            db: Database session
            batch_id: Batch ID

        Returns:
            dict: Batch statistics
        """
        total_codes = db.query(func.count(RedeemCode.id)).filter(
            RedeemCode.batch_id == batch_id
        ).scalar()

        used_codes = db.query(func.count(RedeemCode.id)).filter(
            RedeemCode.batch_id == batch_id,
            RedeemCode.status == "used"
        ).scalar()

        expired_codes = db.query(func.count(RedeemCode.id)).filter(
            RedeemCode.batch_id == batch_id,
            RedeemCode.status == "expired"
        ).scalar()

        disabled_codes = db.query(func.count(RedeemCode.id)).filter(
            RedeemCode.batch_id == batch_id,
            RedeemCode.status == "disabled"
        ).scalar()

        active_codes = total_codes - used_codes - expired_codes - disabled_codes

        return {
            "batch_id": batch_id,
            "total_codes": total_codes,
            "active_codes": active_codes,
            "used_codes": used_codes,
            "expired_codes": expired_codes,
            "disabled_codes": disabled_codes,
            "usage_rate": round(used_codes / total_codes * 100, 2) if total_codes > 0 else 0
        }

    @staticmethod
    def disable_codes(
        db: Session,
        code_ids: List[int],
        reason: Optional[str] = None
    ) -> int:
        """
        Disable multiple redeem codes.

        Args:
            db: Database session
            code_ids: List of code IDs to disable
            reason: Optional reason for disabling

        Returns:
            int: Number of codes disabled
        """
        updated = db.query(RedeemCode).filter(
            RedeemCode.id.in_(code_ids),
            RedeemCode.status.in_(["active", "expired"])
        ).update(
            {"status": "disabled"},
            synchronize_session=False
        )

        db.commit()
        return updated

    @staticmethod
    def cleanup_expired_codes(db: Session) -> int:
        """
        Mark expired codes as expired status.

        Args:
            db: Database session

        Returns:
            int: Number of codes marked as expired
        """
        now = datetime.utcnow()

        updated = db.query(RedeemCode).filter(
            RedeemCode.status == "active",
            RedeemCode.expires_at.isnot(None),
            RedeemCode.expires_at < now
        ).update(
            {"status": "expired"},
            synchronize_session=False
        )

        db.commit()
        return updated