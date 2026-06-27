"""Add email authentication fields and email verification table

Revision ID: dd7b8a90d632
Revises: 85aeabd0ec72
Create Date: 2025-09-27 15:25:28.691202

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd7b8a90d632'
down_revision: Union[str, Sequence[str], None] = '85aeabd0ec72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create email_verifications table
    op.create_table('email_verifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户ID'),
        sa.Column('email', sa.String(length=255), nullable=False, comment='验证的邮箱地址'),
        sa.Column('token', sa.String(length=255), nullable=False, comment='验证令牌'),
        sa.Column('token_type', sa.String(length=20), nullable=False, comment='令牌类型：verify_email, reset_password'),
        sa.Column('expires_at', sa.DateTime(), nullable=False, comment='令牌过期时间'),
        sa.Column('verified_at', sa.DateTime(), nullable=True, comment='验证完成时间'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='创建时间'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_verifications_email'), 'email_verifications', ['email'], unique=False)
    op.create_index(op.f('ix_email_verifications_id'), 'email_verifications', ['id'], unique=False)
    op.create_index(op.f('ix_email_verifications_token'), 'email_verifications', ['token'], unique=True)
    op.create_index(op.f('ix_email_verifications_user_id'), 'email_verifications', ['user_id'], unique=False)

    # Add email-related columns to users table
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True, comment='用户邮箱地址（可选）'))
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True, comment='密码哈希值（可选）'))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='0', comment='邮箱验证状态'))
    op.add_column('users', sa.Column('email_verified_at', sa.DateTime(), nullable=True, comment='邮箱验证时间'))
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove email-related columns from users table
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_column('users', 'email_verified_at')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'email')

    # Drop email_verifications table
    op.drop_index(op.f('ix_email_verifications_user_id'), table_name='email_verifications')
    op.drop_index(op.f('ix_email_verifications_token'), table_name='email_verifications')
    op.drop_index(op.f('ix_email_verifications_id'), table_name='email_verifications')
    op.drop_index(op.f('ix_email_verifications_email'), table_name='email_verifications')
    op.drop_table('email_verifications')