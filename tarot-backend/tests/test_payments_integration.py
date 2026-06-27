"""
Integration-style tests for Google Play verify flow against a real SQLite DB.
These tests mock Google Play API calls but exercise our DB models and services.
"""
import os
from typing import Generator
import pytest
from sqlalchemy.orm import Session

# Ensure we use a dedicated test database BEFORE importing app modules
TEST_DB_URL = "sqlite:///./test_backend_tarot.db"
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.database import create_tables, drop_tables, SessionLocal  # noqa: E402
from app.services.google_play import GooglePlayService  # noqa: E402
from app.schemas.payment import GooglePlayPurchaseRequest  # noqa: E402
from app.models import User, UserBalance, Purchase, CreditTransaction  # noqa: E402
from app.config import settings  # noqa: E402


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    Provide a fresh DB for each test function.
    """
    # Reset tables (create only required ones)
    try:
        drop_tables()
    except Exception:
        # In case tables do not exist yet
        pass
    create_tables()

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Cleanup tables after each test
        try:
            drop_tables()
        except Exception:
            pass


def make_service_for_test() -> GooglePlayService:
    """
    Create a GooglePlayService instance that thinks it's available
    without contacting Google (we set a dummy .service object).
    """
    settings.GOOGLE_PLAY_ENABLED = True  # Ensure availability check passes
    service = GooglePlayService()
    service.service = object()  # Non-None so verify_purchase proceeds
    return service


@pytest.mark.asyncio
async def test_verify_purchase_success_and_balance_update(db_session: Session):
    service = make_service_for_test()

    # Mock the token verification to return a valid purchase
    async def fake_verify_token(product_id: str, token: str):
        return {
            "orderId": "GPA.1234-5678-9012-34567",
            "purchaseState": 0,
            "consumptionState": 0,
            # price fields are optional; logic handles their absence safely
        }

    service._verify_purchase_token = fake_verify_token  # type: ignore[attr-defined]

    req = GooglePlayPurchaseRequest(
        installation_id="install_abc",
        product_id="com.mysixth.tarot.credits_10",
        purchase_token="tok_success_1",
        email="bind@example.com",
    )
    resp = await service.verify_purchase(db_session, req)

    assert resp.success is True
    assert resp.credits_awarded == 10
    assert resp.order_id is not None
    assert resp.new_balance == 10

    # DB assertions
    user = db_session.query(User).filter(User.installation_id == "install_abc").first()
    assert user is not None
    assert user.email == "bind@example.com"

    balance = db_session.query(UserBalance).filter(UserBalance.user_id == user.id).first()
    assert balance is not None and balance.credits == 10

    purchases = db_session.query(Purchase).all()
    assert len(purchases) == 1
    # product_id should store credits value in v1
    assert purchases[0].product_id == 10
    assert purchases[0].credits == 10

    transactions = db_session.query(CreditTransaction).all()
    assert len(transactions) == 1
    assert transactions[0].credits == 10
    assert transactions[0].balance_after == 10


@pytest.mark.asyncio
async def test_verify_purchase_idempotent(db_session: Session):
    service = make_service_for_test()

    async def fake_verify_token(product_id: str, token: str):
        return {
            "orderId": "GPA.2222-3333-4444-55555",
            "purchaseState": 0,
            "consumptionState": 0,
        }

    service._verify_purchase_token = fake_verify_token  # type: ignore[attr-defined]

    req = GooglePlayPurchaseRequest(
        installation_id="install_xyz",
        product_id="com.mysixth.tarot.credits_5",
        purchase_token="tok_idem_1",
    )
    first = await service.verify_purchase(db_session, req)
    assert first.success is True
    assert first.credits_awarded == 5
    assert first.new_balance == 5

    # Second call with same token should not add credits again
    second = await service.verify_purchase(db_session, req)
    assert second.success is True
    assert "already processed" in (second.message or "").lower()
    assert second.credits_awarded == 5

    # DB: still one purchase and one transaction, balance unchanged
    purchases = db_session.query(Purchase).all()
    assert len(purchases) == 1

    transactions = db_session.query(CreditTransaction).all()
    assert len(transactions) == 1

    user = db_session.query(User).filter(User.installation_id == "install_xyz").first()
    balance = db_session.query(UserBalance).filter(UserBalance.user_id == user.id).first()
    assert balance.credits == 5


@pytest.mark.asyncio
async def test_verify_purchase_unknown_product_defaults_to_one_credit(db_session: Session):
    service = make_service_for_test()

    async def fake_verify_token(product_id: str, token: str):
        return {
            "orderId": "GPA.9999-0000-1111-22222",
            "purchaseState": 0,
            "consumptionState": 0,
        }

    service._verify_purchase_token = fake_verify_token  # type: ignore[attr-defined]

    req = GooglePlayPurchaseRequest(
        installation_id="install_def",
        product_id="com.mysixth.tarot.credits_666",  # not in mapping
        purchase_token="tok_unknown_prod",
    )
    resp = await service.verify_purchase(db_session, req)
    assert resp.success is True
    assert resp.credits_awarded == 1
    assert resp.new_balance == 1

    purchase = db_session.query(Purchase).first()
    assert purchase.product_id == 1
    assert purchase.credits == 1


@pytest.mark.asyncio
async def test_verify_purchase_order_id_fallback(db_session: Session):
    service = make_service_for_test()

    async def fake_verify_token(product_id: str, token: str):
        # Intentionally omit orderId to trigger fallback
        return {
            "purchaseState": 0,
            "consumptionState": 0,
        }

    service._verify_purchase_token = fake_verify_token  # type: ignore[attr-defined]

    req = GooglePlayPurchaseRequest(
        installation_id="install_fallback",
        product_id="com.mysixth.tarot.credits_5",
        purchase_token="tok_no_order",
    )
    resp = await service.verify_purchase(db_session, req)
    assert resp.success is True
    assert resp.order_id is not None
    assert resp.order_id.startswith("gp_")
