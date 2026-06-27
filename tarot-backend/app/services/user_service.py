"""
User service for registration, authentication, and balance management.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from ..models import User, UserBalance, CreditTransaction
from ..database import get_db
from ..utils.auth import create_access_token, verify_token
from ..config import settings


class UserService:
    """User management service."""

    @staticmethod
    def get_or_create_user(db: Session, installation_id: str, email: Optional[str] = None) -> User:
        """
        Get an existing user by installation_id or create a new one.
        Optionally bind/update email if provided (best-effort, non-blocking).

        Args:
            db: Database session
            installation_id: Device identifier used as the primary anonymous id
            email: Optional email to bind to the user

        Returns:
            User: The existing or newly created user
        """
        user = db.query(User).filter(
            User.installation_id == installation_id
        ).first()

        if user:
            # Keep last active fresh
            user.last_active_at = datetime.utcnow()
            # Bind/update email if provided and changed; ignore conflicts gracefully
            if email and email != user.email:
                try:
                    # Only set if the email is not already used by another user
                    existing_email_user = db.query(User).filter(User.email == email).first()
                    if not existing_email_user:
                        user.email = email
                    # else: another user already holds this email; skip binding
                    db.commit()
                except Exception:
                    db.rollback()
            else:
                db.commit()
            return user

        # Not found -> register a new one (will also create initial balance and optional bonus)
        user = UserService.register_user(db, installation_id)
        if email:
            try:
                # Set email if not taken
                existing_email_user = db.query(User).filter(User.email == email).first()
                if not existing_email_user:
                    user.email = email
                db.commit()
            except Exception:
                db.rollback()
        return user

    @staticmethod
    def register_user(db: Session, installation_id: str) -> User:
        """
        Register a new anonymous user with installation_id.

        Args:
            db: Database session
            installation_id: Unique device identifier

        Returns:
            User: Created user instance

        Raises:
            ValueError: If installation_id already exists
        """
        # Check if user already exists
        existing_user = db.query(User).filter(
            User.installation_id == installation_id
        ).first()

        if existing_user:
            # Update last active time and return existing user
            existing_user.last_active_at = datetime.utcnow()
            db.commit()
            return existing_user

        try:
            # Create new user
            user = User(
                installation_id=installation_id,
                total_credits_purchased=0,
                total_credits_consumed=0
            )
            db.add(user)
            db.flush()  # Get the user ID

            # Create initial balance record
            balance = UserBalance(
                user_id=user.id,
                credits=0,
                version=1
            )
            db.add(balance)
            db.flush()

            initial_credits = max(0, settings.DEFAULT_INITIAL_CREDITS)

            if initial_credits > 0:
                # Grant initial credits and record transaction
                balance, _ = UserService.update_user_balance(
                    db=db,
                    user_id=user.id,
                    credit_change=initial_credits,
                    transaction_type="earn",
                    reference_type="system",
                    reference_id=None,
                    description="Initial signup bonus"
                )
            else:
                db.commit()

            db.refresh(user)
            return user

        except IntegrityError:
            db.rollback()
            raise ValueError(f"User with installation_id {installation_id} already exists")
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def authenticate_user(db: Session, installation_id: str) -> Tuple[User, str]:
        """
        Authenticate user and return user with access token.

        Args:
            db: Database session
            installation_id: Device identifier

        Returns:
            Tuple[User, str]: User instance and JWT token

        Raises:
            ValueError: If user not found
        """
        user = db.query(User).filter(
            User.installation_id == installation_id
        ).first()

        if not user:
            raise ValueError(f"User with installation_id {installation_id} not found")

        # Update last active time
        user.last_active_at = datetime.utcnow()
        db.commit()

        # Generate JWT token
        token = create_access_token({"user_id": user.id, "installation_id": installation_id})

        return user, token

    @staticmethod
    def get_user_balance(db: Session, user_id: int) -> Optional[UserBalance]:
        """
        Get user's current balance.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            UserBalance: User balance record or None
        """
        return db.query(UserBalance).filter(
            UserBalance.user_id == user_id
        ).first()

    @staticmethod
    def update_user_balance(
        db: Session,
        user_id: int,
        credit_change: int,
        transaction_type: str,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> Tuple[UserBalance, CreditTransaction]:
        """
        Update user balance with optimistic locking and create transaction record.

        Args:
            db: Database session
            user_id: User ID
            credit_change: Credit amount to add/subtract
            transaction_type: Type of transaction (earn, consume, refund, admin_adjust)
            reference_type: Related entity type (purchase, reading, etc.)
            reference_id: Related entity ID
            description: Transaction description

        Returns:
            Tuple[UserBalance, CreditTransaction]: Updated balance and transaction record

        Raises:
            ValueError: If insufficient balance or concurrent update conflict
        """
        max_retries = 3

        for attempt in range(max_retries):
            # Get current balance with version
            balance = db.query(UserBalance).filter(
                UserBalance.user_id == user_id
            ).first()

            if not balance:
                raise ValueError(f"Balance record not found for user {user_id}")

            # Calculate new balance
            new_credits = balance.credits + credit_change

            # Check for sufficient balance on deduction
            if credit_change < 0 and new_credits < 0:
                raise ValueError(f"Insufficient balance. Current: {balance.credits}, Required: {abs(credit_change)}")

            # Update balance with optimistic locking
            current_version = balance.version
            new_version = current_version + 1

            updated_rows = db.query(UserBalance).filter(
                UserBalance.user_id == user_id,
                UserBalance.version == current_version
            ).update({
                UserBalance.credits: new_credits,
                UserBalance.version: new_version,
                UserBalance.updated_at: datetime.utcnow()
            })

            if updated_rows == 0:
                # Concurrent update detected, retry
                db.rollback()
                if attempt == max_retries - 1:
                    raise ValueError("Failed to update balance due to concurrent modifications")
                continue

            # Create transaction record
            transaction = CreditTransaction(
                user_id=user_id,
                type=transaction_type,
                credits=credit_change,
                balance_after=new_credits,
                reference_type=reference_type,
                reference_id=reference_id,
                description=description
            )
            db.add(transaction)

            # Update user totals
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                if credit_change > 0:
                    user.total_credits_purchased += credit_change
                elif credit_change < 0:
                    user.total_credits_consumed += abs(credit_change)

            db.commit()

            # Refresh balance to get updated values
            db.refresh(balance)
            return balance, transaction

        raise ValueError("Max retries exceeded for balance update")

    @staticmethod
    def get_user_transactions(
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> list[CreditTransaction]:
        """
        Get user's transaction history.

        Args:
            db: Database session
            user_id: User ID
            limit: Number of transactions to return
            offset: Offset for pagination

        Returns:
            list[CreditTransaction]: List of transactions
        """
        return db.query(CreditTransaction).filter(
            CreditTransaction.user_id == user_id
        ).order_by(
            CreditTransaction.created_at.desc()
        ).limit(limit).offset(offset).all()

    @staticmethod
    def get_user_stats(db: Session, user_id: int) -> dict:
        """
        Get user statistics summary.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            dict: User statistics
        """
        user = db.query(User).filter(User.id == user_id).first()
        balance = db.query(UserBalance).filter(UserBalance.user_id == user_id).first()

        if not user:
            raise ValueError(f"User {user_id} not found")

        transaction_count = db.query(func.count(CreditTransaction.id)).filter(
            CreditTransaction.user_id == user_id
        ).scalar()

        return {
            "user_id": user.id,
            "installation_id": user.installation_id,
            "created_at": user.created_at,
            "last_active_at": user.last_active_at,
            "current_balance": balance.credits if balance else 0,
            "total_purchased": user.total_credits_purchased,
            "total_consumed": user.total_credits_consumed,
            "transaction_count": transaction_count
        }

    @staticmethod
    def admin_adjust_balance(
        db: Session,
        user_id: int,
        credit_change: int,
        description: str,
        admin_id: Optional[int] = None
    ) -> Tuple[UserBalance, CreditTransaction]:
        """
        Admin function to adjust user balance.

        Args:
            db: Database session
            user_id: User ID
            credit_change: Credit amount to add/subtract
            description: Reason for adjustment
            admin_id: Admin user ID who made the change

        Returns:
            Tuple[UserBalance, CreditTransaction]: Updated balance and transaction
        """
        admin_desc = f"Admin adjustment: {description}"
        if admin_id:
            admin_desc += f" (by admin ID: {admin_id})"

        return UserService.update_user_balance(
            db=db,
            user_id=user_id,
            credit_change=credit_change,
            transaction_type="admin_adjust",
            reference_type="admin",
            reference_id=admin_id,
            description=admin_desc
        )
