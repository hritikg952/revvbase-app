import uuid
from datetime import date, datetime
from typing import Optional

from geoalchemy2 import Geography
from sqlalchemy import Column, Integer, JSON, Text
from sqlmodel import Field, SQLModel


class Listing(SQLModel, table=True):
    __tablename__ = "listings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    seller_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    vehicle_type: str = Field(max_length=50)
    make: str = Field(max_length=100)
    model: str = Field(max_length=100)
    year: int
    odometer_km: Optional[int] = None
    price: int = Field(sa_column=Column(Integer, nullable=False))  # INR, no paise (D-11)
    city: str = Field(max_length=100)
    fuel_type: Optional[str] = Field(default=None, max_length=50)
    owners: int = Field(default=1)
    insurance_date: Optional[date] = None
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    status: str = Field(default="active", max_length=20, index=True)  # active|sold|deleted (D-13)
    attributes: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False, server_default="{}"))
    location: Optional[object] = Field(
        default=None,
        sa_column=Column(Geography(geometry_type="POINT", srid=4326), nullable=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ListingPhoto(SQLModel, table=True):
    __tablename__ = "listing_photos"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    listing_id: uuid.UUID = Field(foreign_key="listings.id", index=True)
    cloudinary_public_id: str = Field(max_length=255)  # NEVER full URL (D-09)
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VehicleMake(SQLModel, table=True):
    __tablename__ = "vehicle_makes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    make: str = Field(max_length=100)
    model: str = Field(max_length=100)
    vehicle_type: str = Field(max_length=50)
