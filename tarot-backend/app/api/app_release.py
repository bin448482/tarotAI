"""
API routes for managing application releases.
"""
import re
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.app_release import (
    AppReleaseHistoryResponse,
    AppReleaseLatestResponse,
    AppReleaseUploadResponse,
)
from app.services.app_release_service import app_release_service
from app.utils.admin_auth import require_admin

public_router = APIRouter(prefix="/app-release", tags=["app-release"])
admin_router = APIRouter(prefix="/admin/app-release", tags=["admin-app-release"])

VERSION_PATTERN = re.compile(r"^[0-9A-Za-z._-]{1,50}$")
BUILD_PATTERN = re.compile(r"^[0-9A-Za-z._-]{1,50}$")


@public_router.get("/latest", response_model=AppReleaseLatestResponse)
def get_public_latest_release(db: Session = Depends(get_db)) -> AppReleaseLatestResponse:
    """Return the latest active release for public consumption."""
    release = app_release_service.get_latest_release(db)
    return AppReleaseLatestResponse(
        release=release,
        data=release,
    )


@admin_router.get("/latest", response_model=AppReleaseLatestResponse)
def get_admin_latest_release(
    db: Session = Depends(get_db),
    current_admin: str = Depends(require_admin),
) -> AppReleaseLatestResponse:
    """Return the latest active release for admin dashboard."""
    release = app_release_service.get_latest_release(db)
    return AppReleaseLatestResponse(
        release=release,
        data=release,
    )


@admin_router.get("/history", response_model=AppReleaseHistoryResponse)
def list_release_history(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_admin: str = Depends(require_admin),
) -> AppReleaseHistoryResponse:
    """Return paginated release history for admin."""
    items, total = app_release_service.list_releases(db, page, size)
    return AppReleaseHistoryResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@admin_router.post("", response_model=AppReleaseUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_app_release(
    version: str = Form(..., description="语义化版本号，例如 1.0.0"),
    build_number: Optional[str] = Form(None, description="可选的构建号"),
    release_notes: Optional[str] = Form(None, description="发布说明"),
    description: Optional[str] = Form(None, description="兼容字段，与 release_notes 等效"),
    notes_url: Optional[str] = Form(None, description="外部更新日志链接"),
    apk_file: Optional[UploadFile] = File(
        None,
        description="上传的 APK 文件",
    ),
    file: Optional[UploadFile] = File(
        None,
        description="兼容字段，等同于 apk_file",
    ),
    db: Session = Depends(get_db),
    current_admin: str = Depends(require_admin),
) -> AppReleaseUploadResponse:
    """Handle APK upload and publish new release metadata."""
    upload = apk_file or file
    if apk_file and file and apk_file is not file:
        # Both fields provided but not identical; prefer explicit apk_file.
        upload = apk_file
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请上传 APK 文件",
        )

    normalized_version = _validate_version(version)
    normalized_build = _validate_build_number(build_number)
    combined_notes = _validate_release_notes(release_notes, description)
    normalized_notes_url = _validate_notes_url(notes_url)

    release = app_release_service.create_release(
        db=db,
        upload_file=upload,
        version=normalized_version,
        build_number=normalized_build,
        release_notes=combined_notes,
        notes_url=normalized_notes_url,
        admin_username=current_admin,
    )

    return AppReleaseUploadResponse(
        message="上传成功",
        release=release,
        data=release,
    )


def _validate_version(version: str) -> str:
    candidate = (version or "").strip()
    if not candidate or not VERSION_PATTERN.match(candidate):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="版本号格式不正确，应为 1~50 位的数字、字母、点、下划线或破折号",
        )
    return candidate


def _validate_build_number(build_number: Optional[str]) -> Optional[str]:
    if build_number is None:
        return None
    candidate = build_number.strip()
    if not candidate:
        return None
    if not BUILD_PATTERN.match(candidate):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="构建号格式不正确，应为 1~50 位的数字、字母、点、下划线或破折号",
        )
    return candidate


def _validate_release_notes(primary: Optional[str], fallback: Optional[str]) -> Optional[str]:
    candidate = (primary or fallback or "").strip()
    if not candidate:
        return None
    if len(candidate) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="发布说明长度不能超过 1000 字符",
        )
    return candidate


def _validate_notes_url(notes_url: Optional[str]) -> Optional[str]:
    if notes_url is None:
        return None
    candidate = notes_url.strip()
    if not candidate:
        return None
    if len(candidate) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="更新日志链接长度不能超过 255 字符",
        )
    # 简单校验 URL，允许 http/https 及相对路径
    if not (candidate.startswith("http://") or candidate.startswith("https://") or candidate.startswith("/")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="更新日志链接必须是以 http(s):// 或 / 开头的有效地址",
        )
    return candidate
