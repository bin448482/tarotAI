"""
Application release management service.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models.app_release import AppRelease
from app.utils.logger import admin_logger


@dataclass(slots=True)
class StoredFileInfo:
    """Metadata captured after persisting an uploaded APK."""

    file_name: str
    file_path: Path
    file_size: int
    checksum: str


class AppReleaseService:
    """Handle APK uploads, metadata persistence, and retrieval."""

    def __init__(self) -> None:
        self.storage_dir = Path(settings.APP_RELEASE_STORAGE_DIR)
        self.base_url = settings.APP_RELEASE_BASE_URL.rstrip("/")
        self.allowed_extensions = {ext.lower() for ext in settings.APP_RELEASE_ALLOWED_EXTENSIONS}
        self.allowed_mime_types = {mime.lower() for mime in settings.APP_RELEASE_ALLOWED_MIME_TYPES}
        self.max_size_bytes = int(settings.APP_RELEASE_MAX_SIZE_MB) * 1024 * 1024

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #
    def create_release(
        self,
        db: Session,
        upload_file: UploadFile,
        version: str,
        build_number: Optional[str],
        release_notes: Optional[str],
        notes_url: Optional[str],
        admin_username: str,
    ) -> AppRelease:
        """
        Persist new release metadata and replace the active build.

        Args:
            db: SQLAlchemy session.
            upload_file: Uploaded APK file.
            version: Semantic version string.
            build_number: Optional build identifier.
            release_notes: Optional changelog text.
            notes_url: Optional external changelog URL.
            admin_username: Username executing the upload.

        Returns:
            Newly created active `AppRelease`.
        """
        if upload_file is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="APK 文件不能为空",
            )

        version = version.strip()
        if not version:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="版本号不能为空",
            )

        release_notes = (release_notes or "").strip() or None
        notes_url = (notes_url or "").strip() or None
        build_number = (build_number or "").strip() or None

        self._validate_upload(upload_file)

        stored_file: Optional[StoredFileInfo] = None

        try:
            stored_file = self._store_file(upload_file, version, build_number)

            # Deactivate previous releases
            db.query(AppRelease).filter(AppRelease.is_active.is_(True)).update(
                {AppRelease.is_active: False},
                synchronize_session=False,
            )

            new_release = AppRelease(
                version=version,
                build_number=build_number,
                release_notes=release_notes,
                notes_url=notes_url,
                file_name=stored_file.file_name,
                file_size=stored_file.file_size,
                checksum_sha256=stored_file.checksum,
                download_url=self._build_download_url(stored_file.file_name),
                uploaded_by=admin_username,
                uploaded_at=datetime.utcnow(),
                is_active=True,
            )

            db.add(new_release)
            db.commit()
            db.refresh(new_release)

            admin_logger.info(
                "App release uploaded successfully",
                extra_data={
                    "admin": admin_username,
                    "version": version,
                    "build_number": build_number,
                    "file": stored_file.file_name,
                    "size": stored_file.file_size,
                    "checksum": stored_file.checksum,
                },
            )

            return new_release
        except HTTPException:
            # Bubble up HTTP errors to FastAPI handling.
            db.rollback()
            if stored_file:
                self._cleanup_file(stored_file.file_path)
            raise
        except Exception as exc:
            db.rollback()
            if stored_file:
                self._cleanup_file(stored_file.file_path)
            admin_logger.error(
                "Failed to create app release",
                error=exc,
                extra_data={"version": version, "build_number": build_number},
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="上传应用版本失败，请稍后重试",
            ) from exc
        finally:
            if upload_file and upload_file.file:
                upload_file.file.close()

    def get_latest_release(self, db: Session, include_inactive: bool = False) -> Optional[AppRelease]:
        """Return the most recent release, optionally including inactive ones."""
        query = db.query(AppRelease)
        if not include_inactive:
            query = query.filter(AppRelease.is_active.is_(True))
        return query.order_by(AppRelease.uploaded_at.desc(), AppRelease.id.desc()).first()

    def list_releases(self, db: Session, page: int, size: int) -> tuple[list[AppRelease], int]:
        """Return paginated release history."""
        page = max(page, 1)
        size = max(1, min(size, 100))
        query = db.query(AppRelease).order_by(AppRelease.uploaded_at.desc(), AppRelease.id.desc())

        total = query.count()
        items = query.offset((page - 1) * size).limit(size).all()
        return items, total

    # --------------------------------------------------------------------- #
    # Internal helpers
    # --------------------------------------------------------------------- #
    def _validate_upload(self, upload_file: UploadFile) -> None:
        """Validate filename, extension, MIME type, and size constraints."""
        filename = (upload_file.filename or "").strip()
        if not filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件名不能为空",
            )

        extension = Path(filename).suffix.lower()
        if extension not in self.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="仅支持上传 APK 文件",
            )

        content_type = (upload_file.content_type or "").lower()
        if content_type and content_type not in self.allowed_mime_types:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="文件类型不受支持",
            )

    def _store_file(self, upload_file: UploadFile, version: str, build_number: Optional[str]) -> StoredFileInfo:
        """Persist the uploaded file, returning metadata."""
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        original_extension = Path(upload_file.filename or "").suffix.lower()
        safe_version = self._sanitize_for_filename(version)
        safe_build = self._sanitize_for_filename(build_number) if build_number else ""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")

        base_name = f"{timestamp}_{safe_version}"
        if safe_build:
            base_name = f"{base_name}_{safe_build}"

        target_name = f"{base_name}{original_extension}"
        target_path = self.storage_dir / target_name

        # Ensure uniqueness if a file already exists with that name.
        counter = 1
        while target_path.exists():
            target_name = f"{base_name}_{counter}{original_extension}"
            target_path = self.storage_dir / target_name
            counter += 1

        upload_file.file.seek(0)
        hasher = hashlib.sha256()
        total_bytes = 0

        try:
            with open(target_path, "wb") as destination:
                for chunk in iter(lambda: upload_file.file.read(1024 * 1024), b""):
                    total_bytes += len(chunk)
                    if total_bytes > self.max_size_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"文件大小超过限制（最大 {settings.APP_RELEASE_MAX_SIZE_MB} MB）",
                        )
                    hasher.update(chunk)
                    destination.write(chunk)
        finally:
            upload_file.file.seek(0)

        if total_bytes == 0:
            # Remove empty file
            self._cleanup_file(target_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件内容为空",
            )

        checksum = hasher.hexdigest()

        return StoredFileInfo(
            file_name=target_name,
            file_path=target_path,
            file_size=total_bytes,
            checksum=checksum,
        )

    def _build_download_url(self, file_name: str) -> str:
        """Return public download URL for stored file."""
        if not self.base_url:
            return f"/{file_name}"
        return f"{self.base_url}/{file_name}"

    @staticmethod
    def _sanitize_for_filename(value: Optional[str]) -> str:
        """Replace unsafe filename characters with underscore."""
        if not value:
            return ""
        sanitized = re.sub(r"[^0-9A-Za-z._-]", "_", value)
        return sanitized.strip("_") or "release"

    @staticmethod
    def _cleanup_file(path: Path) -> None:
        """Remove a file if it exists."""
        try:
            if path.exists():
                path.unlink()
        except OSError:
            # Ignore cleanup failures; logging is handled by caller.
            pass


# Singleton-like service instance to reuse configuration.
app_release_service = AppReleaseService()
