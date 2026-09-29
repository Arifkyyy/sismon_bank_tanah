"""status pembayaran lembur dan jam lembur aktual

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-29 14:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Kosong = belum dibayar.
    op.add_column('lembur', sa.Column('dibayar_pada', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'lembur',
        sa.Column('dibayar_oleh', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    # Kosong = dikerjakan sesuai rencana (jam_mulai/jam_selesai).
    op.add_column('lembur', sa.Column('jam_mulai_aktual', sa.Time(), nullable=True))
    op.add_column('lembur', sa.Column('jam_selesai_aktual', sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column('lembur', 'jam_selesai_aktual')
    op.drop_column('lembur', 'jam_mulai_aktual')
    op.drop_column('lembur', 'dibayar_oleh')
    op.drop_column('lembur', 'dibayar_pada')
