"""foto profil pengguna

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-25 10:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('foto_profil', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'foto_profil')
