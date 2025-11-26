"""
App release SQLAlchemy model.
"""
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    func,
)

from ..database import Base


class AppRelease(Base):
    """App release metadata for Android packages."""

    __tablename__ = "app_releases"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Semantic version, e.g. 1.2.3",
    )
    build_number = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Build identifier, e.g. 10203",
    )
    release_notes = Column(
        Text,
        nullable=True,
        comment="Release notes or changelog summary",
    )
    notes_url = Column(
        String(255),
        nullable=True,
        comment="External URL for detailed release notes",
    )
    file_name = Column(
        String(255),
        nullable=False,
        comment="Stored file name on server",
    )
    file_size = Column(
        Integer,
        nullable=False,
        comment="File size in bytes",
    )
    checksum_sha256 = Column(
        String(64),
        nullable=False,
        comment="SHA256 checksum of the APK file",
    )
    download_url = Column(
        String(255),
        nullable=False,
        comment="Public download URL for the APK",
    )
    uploaded_by = Column(
        String(50),
        nullable=True,
        comment="Admin username who uploaded the release",
    )
    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when the file was uploaded",
    )
    is_active = Column(
        Boolean,
        default=False,
        index=True,
        nullable=False,
        comment="Whether this release is the currently published version",
    )

    def __repr__(self) -> str:
        return f"<AppRelease(version='{self.version}', build_number='{self.build_number}', active={self.is_active})>"
