"""tarif lembur per jam yang bisa diubah admin

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-29 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tarif yang selama ini tertulis di frontend (src/pages/user/Lembur.tsx).
TARIF_AWAL = 20000


def upgrade() -> None:
    op.create_table(
        'pengaturan',
        sa.Column('kunci', sa.String(length=60), primary_key=True),
        sa.Column('nilai', sa.String(length=200), nullable=False),
        sa.Column('diubah_oleh', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('diubah_pada', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute(f"INSERT INTO pengaturan (kunci, nilai) VALUES ('tarif_lembur_per_jam', '{TARIF_AWAL}')")

    op.add_column('lembur', sa.Column('tarif_per_jam', sa.Integer(), nullable=True))
    # Penugasan yang sudah terkirim dihitung dengan tarif lama.
    op.execute(f"UPDATE lembur SET tarif_per_jam = {TARIF_AWAL} WHERE status <> 'Draf'")


def downgrade() -> None:
    op.drop_column('lembur', 'tarif_per_jam')
    op.drop_table('pengaturan')
