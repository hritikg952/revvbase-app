"""Alembic env.py — GeoAlchemy2-aware (PATTERNS Pattern 5).

Without alembic_helpers, autogenerate touches PostGIS system tables
(spatial_ref_sys, geometry_columns, geography_columns) and corrupts state.
"""
from logging.config import fileConfig

from alembic import context
from geoalchemy2 import alembic_helpers
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

# Import all model modules so SQLModel.metadata is populated.
from app.auth.models import User  # noqa: F401
from app.config import get_settings
from app.listings.models import Listing, ListingPhoto, VehicleMake  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL from settings into Alembic's config so alembic.ini stays empty.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=alembic_helpers.include_object,
        render_item=alembic_helpers.render_item,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=alembic_helpers.include_object,
            render_item=alembic_helpers.render_item,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
