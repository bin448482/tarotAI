"""Add payment system tables only

Revision ID: 85aeabd0ec72
Revises:
Create Date: 2025-09-26 09:49:06.463746

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85aeabd0ec72'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('installation_id', sa.String(length=255), nullable=False, comment='设备唯一标识符'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='创建时间'),
        sa.Column('last_active_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='最后活跃时间'),
        sa.Column('total_credits_purchased', sa.Integer(), nullable=False, comment='累计购买积分数'),
        sa.Column('total_credits_consumed', sa.Integer(), nullable=False, comment='累计消费积分数'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_installation_id'), 'users', ['installation_id'], unique=True)

    # Create user_balance table
    op.create_table('user_balance',
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户ID'),
        sa.Column('credits', sa.Integer(), nullable=False, comment='当前积分余额'),
        sa.Column('version', sa.Integer(), nullable=False, comment='乐观锁版本号'),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='更新时间'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_user_balance_user_id'), 'user_balance', ['user_id'], unique=False)

    # Create redeem_codes table
    op.create_table('redeem_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=32), nullable=False, comment='兑换码'),
        sa.Column('product_id', sa.Integer(), nullable=False, comment='商品ID（暂时使用整型，未来可扩展）'),
        sa.Column('credits', sa.Integer(), nullable=False, comment='兑换积分数量'),
        sa.Column('status', sa.String(length=20), nullable=False, comment='状态: active, used, expired, disabled'),
        sa.Column('used_by', sa.Integer(), nullable=True, comment='使用用户ID'),
        sa.Column('used_at', sa.DateTime(), nullable=True, comment='使用时间'),
        sa.Column('expires_at', sa.DateTime(), nullable=True, comment='过期时间'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='创建时间'),
        sa.Column('batch_id', sa.String(length=50), nullable=True, comment='批次ID'),
        sa.ForeignKeyConstraint(['used_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_redeem_codes_batch_id'), 'redeem_codes', ['batch_id'], unique=False)
    op.create_index(op.f('ix_redeem_codes_code'), 'redeem_codes', ['code'], unique=True)
    op.create_index(op.f('ix_redeem_codes_id'), 'redeem_codes', ['id'], unique=False)
    op.create_index(op.f('ix_redeem_codes_status'), 'redeem_codes', ['status'], unique=False)

    # Create purchases table
    op.create_table('purchases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.String(length=100), nullable=False, comment='订单ID'),
        sa.Column('platform', sa.String(length=50), nullable=False, comment='平台: redeem_code, google_play, app_store'),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户ID'),
        sa.Column('product_id', sa.Integer(), nullable=False, comment='商品ID'),
        sa.Column('credits', sa.Integer(), nullable=False, comment='购买积分数量'),
        sa.Column('amount_cents', sa.Integer(), nullable=True, comment='支付金额（分）'),
        sa.Column('currency', sa.String(length=3), nullable=True, comment='货币代码'),
        sa.Column('status', sa.String(length=20), nullable=False, comment='状态: pending, completed, failed, refunded'),
        sa.Column('purchase_token', sa.Text(), nullable=True, comment='Google Play/App Store购买凭证'),
        sa.Column('redeem_code', sa.String(length=32), nullable=True, comment='使用的兑换码'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='创建时间'),
        sa.Column('completed_at', sa.DateTime(), nullable=True, comment='完成时间'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchases_id'), 'purchases', ['id'], unique=False)
    op.create_index(op.f('ix_purchases_order_id'), 'purchases', ['order_id'], unique=True)
    op.create_index(op.f('ix_purchases_platform'), 'purchases', ['platform'], unique=False)
    op.create_index(op.f('ix_purchases_status'), 'purchases', ['status'], unique=False)
    op.create_index(op.f('ix_purchases_user_id'), 'purchases', ['user_id'], unique=False)

    # Create credit_transactions table
    op.create_table('credit_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户ID'),
        sa.Column('type', sa.String(length=20), nullable=False, comment='交易类型: earn, consume, refund, admin_adjust'),
        sa.Column('credits', sa.Integer(), nullable=False, comment='积分变化量（正数表示增加，负数表示扣减）'),
        sa.Column('balance_after', sa.Integer(), nullable=False, comment='交易后余额'),
        sa.Column('reference_type', sa.String(length=50), nullable=True, comment='关联类型: purchase, reading, refund, admin'),
        sa.Column('reference_id', sa.Integer(), nullable=True, comment='关联记录ID'),
        sa.Column('description', sa.Text(), nullable=True, comment='交易描述'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False, comment='创建时间'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_credit_transactions_created_at'), 'credit_transactions', ['created_at'], unique=False)
    op.create_index(op.f('ix_credit_transactions_id'), 'credit_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_type'), 'credit_transactions', ['type'], unique=False)
    op.create_index(op.f('ix_credit_transactions_user_id'), 'credit_transactions', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order to handle foreign key dependencies
    op.drop_index(op.f('ix_credit_transactions_user_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_type'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_created_at'), table_name='credit_transactions')
    op.drop_table('credit_transactions')

    op.drop_index(op.f('ix_purchases_user_id'), table_name='purchases')
    op.drop_index(op.f('ix_purchases_status'), table_name='purchases')
    op.drop_index(op.f('ix_purchases_platform'), table_name='purchases')
    op.drop_index(op.f('ix_purchases_order_id'), table_name='purchases')
    op.drop_index(op.f('ix_purchases_id'), table_name='purchases')
    op.drop_table('purchases')

    op.drop_index(op.f('ix_redeem_codes_status'), table_name='redeem_codes')
    op.drop_index(op.f('ix_redeem_codes_id'), table_name='redeem_codes')
    op.drop_index(op.f('ix_redeem_codes_code'), table_name='redeem_codes')
    op.drop_index(op.f('ix_redeem_codes_batch_id'), table_name='redeem_codes')
    op.drop_table('redeem_codes')

    op.drop_index(op.f('ix_user_balance_user_id'), table_name='user_balance')
    op.drop_table('user_balance')

    op.drop_index(op.f('ix_users_installation_id'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
