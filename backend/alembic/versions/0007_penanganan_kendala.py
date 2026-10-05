"""penanganan kendala oleh petugas dan foto sesudah

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-05 20:00:00

- kendala.ditangani_oleh berganti arti dan nama menjadi penangan_id: petugas
  yang bertugas memperbaiki. Kendala lama: penangan = pelapor. Siapa admin yang
  dulu mengubah statusnya tetap tercatat di log_audit.
- Kolom waktu penanganan dan keterangan penyelesaian.
- foto.tahap: 'sebelum' (bukti laporan) / 'sesudah' (bukti selesai, khusus kendala).

Catatan downgrade: isi lama ditangani_oleh tidak bisa dipulihkan, dan foto
sesudah tetap ada sebagai foto kendala biasa.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('kendala', 'ditangani_oleh', new_column_name='penangan_id')
    op.execute('UPDATE kendala SET penangan_id = petugas_id')
    op.add_column('kendala', sa.Column('ditugaskan_pada', sa.DateTime(timezone=True), nullable=True))
    op.add_column('kendala', sa.Column('mulai_pada', sa.DateTime(timezone=True), nullable=True))
    op.add_column('kendala', sa.Column('selesai_pada', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'kendala',
        sa.Column('diselesaikan_oleh', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.add_column('kendala', sa.Column('keterangan_selesai', sa.Text(), nullable=True))
    op.add_column('kendala', sa.Column('dibuka_lagi_pada', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_kendala_penangan_id', 'kendala', ['penangan_id'])
    # Perkiraan terbaik untuk data lama: perubahan status terakhir.
    op.execute("UPDATE kendala SET selesai_pada = diperbarui_pada WHERE status = 'Selesai'")
    op.execute("UPDATE kendala SET mulai_pada = diperbarui_pada WHERE status = 'Diproses'")

    op.add_column('foto', sa.Column('tahap', sa.String(10), nullable=False, server_default='sebelum'))
    op.create_check_constraint('ck_foto_tahap', 'foto', "tahap IN ('sebelum', 'sesudah')")
    op.create_check_constraint('ck_foto_sesudah_kendala', 'foto', "tahap = 'sebelum' OR kendala_id IS NOT NULL")


def downgrade() -> None:
    op.drop_constraint('ck_foto_sesudah_kendala', 'foto', type_='check')
    op.drop_constraint('ck_foto_tahap', 'foto', type_='check')
    op.drop_column('foto', 'tahap')

    op.drop_index('ix_kendala_penangan_id', table_name='kendala')
    op.drop_column('kendala', 'dibuka_lagi_pada')
    op.drop_column('kendala', 'keterangan_selesai')
    op.drop_column('kendala', 'diselesaikan_oleh')
    op.drop_column('kendala', 'selesai_pada')
    op.drop_column('kendala', 'mulai_pada')
    op.drop_column('kendala', 'ditugaskan_pada')
    op.alter_column('kendala', 'penangan_id', new_column_name='ditangani_oleh')
