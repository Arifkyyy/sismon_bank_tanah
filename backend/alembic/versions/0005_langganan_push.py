"""tabel langganan web push per perangkat

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-05 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Satu baris = satu browser/perangkat yang mengizinkan notifikasi.
    op.create_table(
        'langganan_push',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('p256dh', sa.String(200), nullable=False),
        sa.Column('auth', sa.String(100), nullable=False),
        sa.Column('perangkat', sa.String(200), nullable=False, server_default=''),
        sa.Column('dibuat_pada', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('terakhir_dipakai', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('endpoint', name='uq_langganan_push_endpoint'),
    )
    op.create_index('ix_langganan_push_user_id', 'langganan_push', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_langganan_push_user_id', table_name='langganan_push')
    op.drop_table('langganan_push')
