import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    phone: str = Field(max_length=15, unique=True, index=True)
    display_name: Optional[str] = Field(default=None, max_length=100)
    phone_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
