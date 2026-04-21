from datetime import datetime, time

from pydantic import BaseModel, EmailStr

from app.models import BookingStatus, UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: UserRole = UserRole.CLIENT


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str | None = None
    role: UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ServiceCreate(BaseModel):
    name: str
    description: str = ""
    price_cents: int
    duration_minutes: int


class ServiceRead(ServiceCreate):
    id: int
    provider_id: int


class ProviderProfileCreate(BaseModel):
    business_name: str
    bio: str = ""
    category: str = "manicure"
    address: str
    city: str
    state: str
    latitude: float
    longitude: float
    photo_url: str | None = None
    working_hours_start: time = time(9, 0)
    working_hours_end: time = time(18, 0)
    slot_minutes: int = 30


class ProviderProfileRead(ProviderProfileCreate):
    id: int
    user_id: int
    full_name: str
    services: list[ServiceRead] = []
    distance_km: float | None = None


class BookingCreate(BaseModel):
    provider_id: int
    service_id: int
    start_at: datetime
    notes: str = ""


class BookingRead(BaseModel):
    id: int
    client_id: int
    provider_id: int
    service_id: int
    start_at: datetime
    end_at: datetime
    status: BookingStatus
    notes: str
    created_at: datetime
    service_name: str
    provider_business_name: str
    client_name: str


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class AvailableSlot(BaseModel):
    start_at: datetime
    end_at: datetime
