"""Add app releases table for APK management

Revision ID: 4c8c31a3e2a1
Revises: dd7b8a90d632
Create Date: 2025-10-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4c8c31a3e2a1"
down_revision: Union[str, Sequence[str], None] = "dd7b8a90d632"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create app_releases table."""
    op.create_table(
        "app_releases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False, comment="语义化版本号"),
        sa.Column("build_number", sa.String(length=50), nullable=True, comment="构建号"),
        sa.Column("release_notes", sa.Text(), nullable=True, comment="发布备注"),
        sa.Column("notes_url", sa.String(length=255), nullable=True, comment="更新日志链接"),
        sa.Column("file_name", sa.String(length=255), nullable=False, comment="存储的文件名"),
        sa.Column("file_size", sa.Integer(), nullable=False, comment="文件大小（字节）"),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False, comment="SHA256 校验值"),
        sa.Column("download_url", sa.String(length=255), nullable=False, comment="下载链接"),
        sa.Column("uploaded_by", sa.String(length=50), nullable=True, comment="上传管理员"),
        sa.Column(
            "uploaded_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            comment="上传时间",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
            comment="是否为当前上线版本",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_app_releases_id"), "app_releases", ["id"], unique=False)
    op.create_index(op.f("ix_app_releases_version"), "app_releases", ["version"], unique=False)
    op.create_index(op.f("ix_app_releases_build_number"), "app_releases", ["build_number"], unique=False)
    op.create_index(op.f("ix_app_releases_is_active"), "app_releases", ["is_active"], unique=False)


def downgrade() -> None:
    """Drop app_releases table."""
    op.drop_index(op.f("ix_app_releases_is_active"), table_name="app_releases")
    op.drop_index(op.f("ix_app_releases_build_number"), table_name="app_releases")
    op.drop_index(op.f("ix_app_releases_version"), table_name="app_releases")
    op.drop_index(op.f("ix_app_releases_id"), table_name="app_releases")
    op.drop_table("app_releases")
