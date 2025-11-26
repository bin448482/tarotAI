"""
Pydantic schemas for application release API.
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, computed_field


class AppReleaseResponse(BaseModel):
    """Release metadata shared across responses."""

    id: int
    version: str
    build_number: Optional[str] = None
    release_notes: Optional[str] = None
    notes_url: Optional[str] = None
    download_url: str
    file_size: int
    checksum_sha256: str = Field(exclude=True)
    uploaded_by: Optional[str] = None
    uploaded_at: datetime
    is_active: bool = True
    file_name: Optional[str] = None

    @computed_field(alias="checksum")
    def checksum(self) -> str:
        """Expose SHA256 checksum under the key expected by front-end."""
        return self.checksum_sha256

    class Config:
        from_attributes = True
        populate_by_name = True


class AppReleaseLatestResponse(BaseModel):
    """Response envelope for latest release endpoints."""

    success: bool = True
    release: Optional[AppReleaseResponse] = None
    data: Optional[AppReleaseResponse] = None


class AppReleaseUploadResponse(BaseModel):
    """Response after uploading a new release."""

    success: bool = True
    message: str = "上传成功"
    release: AppReleaseResponse
    data: AppReleaseResponse


class AppReleaseHistoryResponse(BaseModel):
    """Paginated release history for admin."""

    success: bool = True
    items: List[AppReleaseResponse]
    total: int
    page: int
    size: int
