"""
Tests for application release API and service.
"""
from __future__ import annotations

from tempfile import SpooledTemporaryFile
from typing import Generator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from starlette.datastructures import UploadFile

from app.database import Base, get_db
from app.main import app
from app.models.app_release import AppRelease
from app.services.app_release_service import AppReleaseService, app_release_service
from app.utils.admin_auth import require_admin


# --------------------------------------------------------------------------- #
# Test fixtures
# --------------------------------------------------------------------------- #


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide FastAPI test client with dependency overrides."""

    def override_get_db() -> Generator[Session, None, None]:
        db = MagicMock(spec=Session)
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_admin] = lambda: "test-admin"

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(require_admin, None)


@pytest.fixture
def temp_service(tmp_path) -> AppReleaseService:
    """Return a release service instance configured for temp storage."""
    service = AppReleaseService()
    service.storage_dir = tmp_path
    service.allowed_extensions = {".apk"}
    service.allowed_mime_types = {
        "application/vnd.android.package-archive",
        "application/octet-stream",
    }
    service.max_size_bytes = 5 * 1024 * 1024
    return service


@pytest.fixture
def memory_session() -> Generator[Session, None, None]:
    """Provide an in-memory SQLite session for service tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _make_upload_file(content: bytes, filename: str = "test.apk") -> UploadFile:
    """Create a Starlette UploadFile with provided binary content."""
    file = SpooledTemporaryFile()
    file.write(content)
    file.seek(0)
    return UploadFile(
        filename=filename,
        file=file,
        content_type="application/vnd.android.package-archive",
    )


# --------------------------------------------------------------------------- #
# API tests
# --------------------------------------------------------------------------- #


def test_public_latest_release_returns_null(client, monkeypatch):
    """Public latest release endpoint should return null when no data."""
    monkeypatch.setattr(app_release_service, "get_latest_release", lambda db: None)

    response = client.get("/api/v1/app-release/latest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["release"] is None
    assert payload["data"] is None


def test_public_latest_release_returns_payload(client, monkeypatch):
    """Public endpoint should serialize release metadata correctly."""
    release = AppRelease(
        id=1,
        version="1.2.3",
        build_number="10203",
        release_notes="New features",
        notes_url="https://example.com/notes",
        file_name="20250101_app.apk",
        file_size=2048,
        checksum_sha256="abc123",
        download_url="/static/app-releases/20250101_app.apk",
        uploaded_by="admin",
        is_active=True,
    )
    monkeypatch.setattr(app_release_service, "get_latest_release", lambda db: release)

    response = client.get("/api/v1/app-release/latest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["release"]["version"] == "1.2.3"
    assert payload["release"]["checksum"] == "abc123"
    assert "checksum_sha256" not in payload["release"]


def test_admin_upload_invokes_service(client, monkeypatch):
    """Admin upload endpoint should delegate to service and return response."""
    fake_release = AppRelease(
        id=2,
        version="1.3.0",
        build_number="10300",
        release_notes="Improvements",
        notes_url=None,
        file_name="file.apk",
        file_size=1024,
        checksum_sha256="deadbeef",
        download_url="/static/app-releases/file.apk",
        uploaded_by="test-admin",
        is_active=True,
    )

    captured_args = {}

    def fake_create_release(**kwargs):
        captured_args.update(kwargs)
        return fake_release

    monkeypatch.setattr(app_release_service, "create_release", fake_create_release)

    response = client.post(
        "/api/v1/admin/app-release",
        files={"apk_file": ("build.apk", b"fake binary", "application/vnd.android.package-archive")},
        data={
            "version": "1.3.0",
            "build_number": "10300",
            "release_notes": "Improvements",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["release"]["version"] == "1.3.0"
    assert captured_args["version"] == "1.3.0"
    assert captured_args["admin_username"] == "test-admin"
    assert captured_args["release_notes"] == "Improvements"


def test_admin_upload_rejects_invalid_version(client):
    """Version must match validation pattern."""
    response = client.post(
        "/api/v1/admin/app-release",
        files={"apk_file": ("build.apk", b"fake binary", "application/vnd.android.package-archive")},
        data={
            "version": "1.3.0!!",
        },
    )

    assert response.status_code == 400
    assert "版本号格式不正确" in response.text


# --------------------------------------------------------------------------- #
# Service tests
# --------------------------------------------------------------------------- #


def test_service_create_release_persists_file_and_metadata(temp_service, memory_session):
    """Service should store file, create record, and mark active."""
    upload = _make_upload_file(b"x" * 1024)

    release = temp_service.create_release(
        db=memory_session,
        upload_file=upload,
        version="1.0.0",
        build_number="100",
        release_notes="Initial release",
        notes_url="https://example.com",
        admin_username="tester",
    )

    assert release.version == "1.0.0"
    assert release.is_active is True
    assert release.file_size == 1024
    assert release.download_url.endswith(".apk")
    stored_path = temp_service.storage_dir / release.file_name
    assert stored_path.exists()
    assert stored_path.stat().st_size == 1024


def test_service_create_release_deactivates_previous(temp_service, memory_session):
    """Uploading a new release should deactivate older ones."""
    upload1 = _make_upload_file(b"a" * 512, filename="first.apk")
    first = temp_service.create_release(
        db=memory_session,
        upload_file=upload1,
        version="1.0.0",
        build_number="100",
        release_notes=None,
        notes_url=None,
        admin_username="tester",
    )

    upload2 = _make_upload_file(b"b" * 512, filename="second.apk")
    second = temp_service.create_release(
        db=memory_session,
        upload_file=upload2,
        version="1.1.0",
        build_number="101",
        release_notes=None,
        notes_url=None,
        admin_username="tester",
    )

    memory_session.refresh(first)
    memory_session.refresh(second)
    assert first.is_active is False
    assert second.is_active is True
