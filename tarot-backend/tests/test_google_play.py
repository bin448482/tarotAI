"""
Tests for Google Play Developer API integration.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.services.google_play import GooglePlayService
from app.schemas.payment import GooglePlayPurchaseRequest
from app.models.user import User
from app.models.payment import Purchase


class TestGooglePlayService:
    """Test Google Play service functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = GooglePlayService()

    def test_product_credits_mapping(self):
        """Test product ID to credits mapping."""
        test_cases = [
            ('com.mysixth.tarot.credits_5', 5),
            ('com.mysixth.tarot.credits_10', 10),
            ('com.mysixth.tarot.credits_20', 20),
            ('com.mysixth.tarot.credits_50', 50),
            ('com.mysixth.tarot.credits_100', 100),
            ('unknown_product', 1),  # Default fallback
        ]

        for product_id, expected_credits in test_cases:
            assert self.service._get_credits_for_product(product_id) == expected_credits

    def test_service_availability_when_disabled(self):
        """Test service availability when Google Play is disabled."""
        with patch('app.services.google_play.settings.GOOGLE_PLAY_ENABLED', False):
            service = GooglePlayService()
            assert not service.is_available()

    def test_service_initialization_failure(self):
        """Test service initialization handles missing credentials gracefully."""
        with patch('app.services.google_play.service_account.Credentials.from_service_account_file') as mock_credentials:
            mock_credentials.side_effect = FileNotFoundError("Service account file not found")

            service = GooglePlayService()
            assert not service.is_available()

    @patch('app.services.google_play.settings.GOOGLE_PLAY_ENABLED', True)
    @patch('app.services.google_play.settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'test_service_account.json')
    @pytest.mark.asyncio
    async def test_verify_purchase_service_unavailable(self):
        """Test purchase verification when service is unavailable."""
        service = GooglePlayService()
        service.service = None  # Simulate service unavailable

        mock_db = Mock()
        request = GooglePlayPurchaseRequest(
            installation_id="test_install_123",
            product_id="com.mysixth.tarot.credits_5",
            purchase_token="test_token_123"
        )

        result = await service.verify_purchase(mock_db, request)

        assert not result.success
        assert "Google Play API not available" in result.error

    @patch('app.services.google_play.settings.GOOGLE_PLAY_ENABLED', True)
    @pytest.mark.asyncio
    async def test_verify_purchase_invalid_token(self):
        """Test purchase verification with invalid token."""
        # Mock the service to be available
        mock_service = Mock()
        service = GooglePlayService()
        service.service = mock_service

        # Mock the purchase verification to return None (invalid)
        service._verify_purchase_token = AsyncMock(return_value=None)

        mock_db = Mock()
        request = GooglePlayPurchaseRequest(
            installation_id="test_install_123",
            product_id="com.mysixth.tarot.credits_5",
            purchase_token="invalid_token"
        )

        result = await service.verify_purchase(mock_db, request)

        assert not result.success
        assert "Invalid purchase token" in result.error

    @patch('app.services.google_play.settings.GOOGLE_PLAY_ENABLED', True)
    @pytest.mark.asyncio
    async def test_verify_purchase_already_processed(self):
        """Test purchase verification for already processed purchase."""
        # Mock the service to be available
        mock_service = Mock()
        service = GooglePlayService()
        service.service = mock_service

        # Mock existing purchase record
        existing_purchase = Purchase(
            id=1,
            order_id="test_order_123",
            platform="google_play",
            user_id=1,
            product_id=5,
            credits=5,
            status="completed",
            purchase_token="test_token_123"
        )

        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = existing_purchase

        request = GooglePlayPurchaseRequest(
            installation_id="test_install_123",
            product_id="com.mysixth.tarot.credits_5",
            purchase_token="test_token_123"
        )

        # Mock the _verify_purchase_token method to skip Google Play API call
        service._verify_purchase_token = AsyncMock(return_value={"orderId": "test_order_123"})

        result = await service.verify_purchase(mock_db, request)

        assert result.success
        assert "Purchase already processed" in result.message
        assert result.order_id == "test_order_123"
        assert result.credits_awarded == 5

    @pytest.mark.asyncio
    async def test_verify_purchase_token_invalid_state(self):
        """Test purchase token verification with invalid purchase state."""
        service = GooglePlayService()
        service.service = Mock()

        # Mock Google Play API response with invalid state
        service.service.purchases().products().get.return_value.execute.return_value = {
            'purchaseState': 1,  # Canceled
            'consumptionState': 0
        }

        result = await service._verify_purchase_token("com.mysixth.tarot.credits_5", "test_token")

        assert result is None

    @pytest.mark.asyncio
    async def test_verify_purchase_token_already_consumed(self):
        """Test purchase token verification with already consumed purchase."""
        service = GooglePlayService()
        service.service = Mock()

        # Mock Google Play API response with consumed purchase
        service.service.purchases().products().get.return_value.execute.return_value = {
            'purchaseState': 0,  # Purchased
            'consumptionState': 1  # Already consumed
        }

        result = await service._verify_purchase_token("com.mysixth.tarot.credits_5", "test_token")

        assert result is None

    @pytest.mark.asyncio
    async def test_acknowledge_purchase_success(self):
        """Test successful purchase acknowledgment."""
        service = GooglePlayService()
        service.service = Mock()

        # Mock successful acknowledgment
        service.service.purchases().products().acknowledge.return_value.execute.return_value = {}

        result = await service.acknowledge_purchase("com.mysixth.tarot.credits_5", "test_token")

        assert result is True

    @pytest.mark.asyncio
    async def test_acknowledge_purchase_service_unavailable(self):
        """Test purchase acknowledgment when service is unavailable."""
        service = GooglePlayService()
        service.service = None

        result = await service.acknowledge_purchase("com.mysixth.tarot.credits_5", "test_token")

        assert result is False

    @pytest.mark.asyncio
    async def test_consume_purchase_success(self):
        """Test successful purchase consumption."""
        service = GooglePlayService()
        service.service = Mock()

        # Mock database
        mock_db = Mock()
        mock_purchase = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_purchase

        # Mock successful consumption
        service.service.purchases().products().consume.return_value.execute.return_value = {}

        result = await service.consume_purchase(mock_db, "com.mysixth.tarot.credits_5", "test_token")

        assert result is True
        assert mock_purchase.status == 'consumed'
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_subscription_info_service_unavailable(self):
        """Test subscription info retrieval when service is unavailable."""
        service = GooglePlayService()
        service.service = None

        result = await service.get_subscription_info("subscription_id", "token")

        assert result is None

    def test_initialization_with_missing_service_account_path(self):
        """Test initialization with missing service account path."""
        with patch('app.services.google_play.settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', None):
            service = GooglePlayService()
            assert not service.is_available()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])