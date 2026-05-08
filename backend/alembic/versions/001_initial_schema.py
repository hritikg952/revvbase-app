"""Initial schema — users, listings, listing_photos, vehicle_makes + PostGIS

Revision ID: 001
Revises:
Create Date: 2026-05-04
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography

# revision identifiers
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostGIS template pre-installs the extension; IF NOT EXISTS makes this idempotent.
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")  # for gen_random_uuid()

    # users (D-07)
    op.create_table(
        "users",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.String(length=15), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=100), nullable=True),
        sa.Column("phone_verified", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_users_phone", "users", ["phone"], unique=True)

    # listings (D-08, D-11, D-13, D-14)
    op.create_table(
        "listings",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("seller_id", sa.UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vehicle_type", sa.String(length=50), nullable=False),
        sa.Column("make", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("odometer_km", sa.Integer, nullable=True),
        sa.Column("price", sa.Integer, nullable=False),  # INR, no paise (D-11)
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("fuel_type", sa.String(length=50), nullable=True),
        sa.Column("owners", sa.Integer, nullable=False, server_default=sa.text("1")),
        sa.Column("insurance_date", sa.Date, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("attributes", sa.JSON, nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_listings_seller_id", "listings", ["seller_id"])
    op.create_index("idx_listings_status", "listings", ["status"])
    # Spatial GIST index — required for any future PostGIS radius query (T-01-04)
    op.execute("CREATE INDEX idx_listings_location ON listings USING GIST(location)")

    # listing_photos (D-09)
    op.create_table(
        "listing_photos",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("listing_id", sa.UUID, sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(length=255), nullable=False),  # NOT full URL
        sa.Column("sort_order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_listing_photos_listing_id", "listing_photos", ["listing_id"])

    # vehicle_makes (D-10)
    op.create_table(
        "vehicle_makes",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("make", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("vehicle_type", sa.String(length=50), nullable=False),
    )

    # Seed vehicle_makes — 29 rows covering top Indian brands + EV brands + Other fallback (D-10)
    op.execute("""
    INSERT INTO vehicle_makes (id, make, model, vehicle_type) VALUES
      (gen_random_uuid(), 'Honda', 'Activa 6G', 'scooter'),
      (gen_random_uuid(), 'Honda', 'Shine', 'motorcycle'),
      (gen_random_uuid(), 'Honda', 'CB Unicorn', 'motorcycle'),
      (gen_random_uuid(), 'Yamaha', 'FZ S-FI', 'motorcycle'),
      (gen_random_uuid(), 'Yamaha', 'Fascino 125', 'scooter'),
      (gen_random_uuid(), 'Yamaha', 'R15 V4', 'motorcycle'),
      (gen_random_uuid(), 'Royal Enfield', 'Classic 350', 'motorcycle'),
      (gen_random_uuid(), 'Royal Enfield', 'Meteor 350', 'motorcycle'),
      (gen_random_uuid(), 'Royal Enfield', 'Himalayan', 'motorcycle'),
      (gen_random_uuid(), 'Bajaj', 'Pulsar 150', 'motorcycle'),
      (gen_random_uuid(), 'Bajaj', 'Pulsar NS200', 'motorcycle'),
      (gen_random_uuid(), 'Bajaj', 'Chetak', 'ev'),
      (gen_random_uuid(), 'TVS', 'Apache RTR 160', 'motorcycle'),
      (gen_random_uuid(), 'TVS', 'Jupiter', 'scooter'),
      (gen_random_uuid(), 'TVS', 'iQube ST', 'ev'),
      (gen_random_uuid(), 'Hero', 'Splendor Plus', 'motorcycle'),
      (gen_random_uuid(), 'Hero', 'HF Deluxe', 'motorcycle'),
      (gen_random_uuid(), 'Suzuki', 'Access 125', 'scooter'),
      (gen_random_uuid(), 'Suzuki', 'Gixxer', 'motorcycle'),
      (gen_random_uuid(), 'KTM', 'Duke 200', 'motorcycle'),
      (gen_random_uuid(), 'KTM', 'Duke 390', 'motorcycle'),
      (gen_random_uuid(), 'Ola', 'S1 Pro', 'ev'),
      (gen_random_uuid(), 'Ola', 'S1 Air', 'ev'),
      (gen_random_uuid(), 'Ather', '450X', 'ev'),
      (gen_random_uuid(), 'Ather', '450S', 'ev'),
      (gen_random_uuid(), 'Other', 'Other', 'motorcycle'),
      (gen_random_uuid(), 'Other', 'Other', 'scooter'),
      (gen_random_uuid(), 'Other', 'Other', 'ev'),
      (gen_random_uuid(), 'Other', 'Other', 'bicycle')
    """)


def downgrade() -> None:
    op.drop_table("vehicle_makes")
    op.drop_index("idx_listing_photos_listing_id", table_name="listing_photos")
    op.drop_table("listing_photos")
    op.execute("DROP INDEX IF EXISTS idx_listings_location")
    op.drop_index("idx_listings_status", table_name="listings")
    op.drop_index("idx_listings_seller_id", table_name="listings")
    op.drop_table("listings")
    op.drop_index("idx_users_phone", table_name="users")
    op.drop_table("users")
    # Do NOT drop extensions — they may be shared across schemas
