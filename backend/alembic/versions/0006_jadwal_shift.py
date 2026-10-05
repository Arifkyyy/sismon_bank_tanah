"""jadwal shift: jenis shift, jadwal per petugas, dan tukar shift

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-05 15:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BERJALAN = "status IN ('Menunggu Rekan', 'Menunggu Admin')"


def upgrade() -> None:
    op.create_table(
        'shift',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nama', sa.String(40), nullable=False),
        sa.Column('kode', sa.String(2), nullable=False),
        sa.Column('jam_mulai', sa.Time(), nullable=True),
        sa.Column('jam_selesai', sa.Time(), nullable=True),
        sa.Column('warna', sa.String(20), nullable=False),
        sa.Column('aktif', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sistem', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('dibuat_oleh', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('dibuat_pada', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "warna IN ('hijau', 'hijau-tua', 'emas', 'tanah', 'ink', 'abu')", name='ck_shift_warna'
        ),
        sa.CheckConstraint("sistem OR (jam_mulai IS NOT NULL AND jam_selesai IS NOT NULL)", name='ck_shift_jam'),
    )

    op.create_table(
        'shift_jabatan',
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shift.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('jabatan', sa.String(20), primary_key=True),
        sa.CheckConstraint("jabatan IN ('Security', 'OB', 'CS', 'Messenger')", name='ck_shift_jabatan'),
    )

    op.create_table(
        'tukar_shift',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('pemohon_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tanggal_pemohon', sa.Date(), nullable=False),
        sa.Column('shift_pemohon_id', sa.Integer(), sa.ForeignKey('shift.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('rekan_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tanggal_rekan', sa.Date(), nullable=False),
        sa.Column('shift_rekan_id', sa.Integer(), sa.ForeignKey('shift.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('alasan', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='Menunggu Rekan'),
        sa.Column('dijawab_rekan_pada', sa.DateTime(timezone=True), nullable=True),
        sa.Column('diputus_oleh', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('diputus_pada', sa.DateTime(timezone=True), nullable=True),
        sa.Column('alasan_tolak', sa.Text(), nullable=True),
        sa.Column('catatan_batal', sa.String(200), nullable=True),
        sa.Column('dibuat_pada', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('diperbarui_pada', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('Menunggu Rekan', 'Menunggu Admin', 'Disetujui', 'Ditolak', 'Dibatalkan')",
            name='ck_tukar_status',
        ),
        sa.CheckConstraint('pemohon_id <> rekan_id', name='ck_tukar_beda_orang'),
    )
    op.create_index('ix_tukar_shift_pemohon_id', 'tukar_shift', ['pemohon_id'])
    op.create_index('ix_tukar_shift_rekan_id', 'tukar_shift', ['rekan_id'])
    op.create_index('ix_tukar_status', 'tukar_shift', ['status'])
    # Satu kotak hanya boleh ikut satu permintaan yang masih berjalan.
    op.create_index(
        'uq_tukar_pemohon_berjalan', 'tukar_shift', ['pemohon_id', 'tanggal_pemohon'],
        unique=True, postgresql_where=sa.text(BERJALAN),
    )
    op.create_index(
        'uq_tukar_rekan_berjalan', 'tukar_shift', ['rekan_id', 'tanggal_rekan'],
        unique=True, postgresql_where=sa.text(BERJALAN),
    )

    op.create_table(
        'jadwal_shift',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tanggal', sa.Date(), nullable=False),
        sa.Column('shift_id', sa.Integer(), sa.ForeignKey('shift.id', ondelete='RESTRICT'), nullable=False),
        sa.Column(
            'dari_tukar_id', sa.Integer(), sa.ForeignKey('tukar_shift.id', ondelete='SET NULL'), nullable=True
        ),
        sa.Column('diatur_oleh', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('diubah_pada', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'tanggal', name='uq_jadwal_petugas_tanggal'),
    )
    op.create_index('ix_jadwal_tanggal', 'jadwal_shift', ['tanggal'])
    op.create_index('ix_jadwal_shift_shift_id', 'jadwal_shift', ['shift_id'])

    # Satu-satunya shift bawaan. Shift lain disusun admin karena jadwal aslinya belum diketahui.
    op.execute(
        "INSERT INTO shift (nama, kode, jam_mulai, jam_selesai, warna, aktif, sistem) "
        "VALUES ('Libur', 'L', NULL, NULL, 'abu', true, true)"
    )


def downgrade() -> None:
    op.drop_table('jadwal_shift')
    op.drop_table('tukar_shift')
    op.drop_table('shift_jabatan')
    op.drop_table('shift')
