from datetime import datetime, time
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel


class UserRole(str, Enum):
    CLIENT = "client"
    PROVIDER = "provider"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class ProviderPlan(str, Enum):
    FREE = "free"
    PRO_PENDING = "pro_pending"
    PRO = "pro"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: str
    phone: str | None = None
    role: UserRole = Field(default=UserRole.CLIENT)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    provider_profile: "ProviderProfile" = Relationship(
        back_populates="user", sa_relationship_kwargs={"uselist": False}
    )


class ProviderProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    business_name: str
    slug: str = Field(default="", index=True)
    bio: str = ""
    category: str = "manicure"
    address: str
    city: str
    state: str
    latitude: float
    longitude: float
    photo_url: str | None = None
    gallery: str = ""  # '|'-separated image URLs
    working_hours_start: time = Field(default=time(9, 0))
    working_hours_end: time = Field(default=time(18, 0))
    slot_minutes: int = 30
    plan: ProviderPlan = Field(default=ProviderPlan.FREE)
    pro_requested_at: datetime | None = None
    pro_approved_at: datetime | None = None
    pro_expires_at: datetime | None = None

    user: User = Relationship(back_populates="provider_profile")
    services: list["Service"] = Relationship(
        back_populates="provider", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    bookings: list["Booking"] = Relationship(
        back_populates="provider", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Service(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    provider_id: int = Field(foreign_key="providerprofile.id")
    name: str
    description: str = ""
    price_cents: int
    duration_minutes: int

    provider: ProviderProfile = Relationship(back_populates="services")
    bookings: list["Booking"] = Relationship(back_populates="service")


class Booking(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="user.id")
    provider_id: int = Field(foreign_key="providerprofile.id")
    service_id: int = Field(foreign_key="service.id")
    start_at: datetime
    end_at: datetime
    status: BookingStatus = Field(default=BookingStatus.PENDING)
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    provider: ProviderProfile = Relationship(back_populates="bookings")
    service: Service = Relationship(back_populates="bookings")


class Review(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", unique=True)
    client_id: int = Field(foreign_key="user.id")
    provider_id: int = Field(foreign_key="providerprofile.id", index=True)
    rating: int
    comment: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
