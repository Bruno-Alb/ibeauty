from datetime import datetime, time

from pydantic import BaseModel, EmailStr

from app.models import BookingStatus, ProviderPlan, UserRole


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


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None


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
    gallery: list[str] = []
    working_hours_start: time = time(9, 0)
    working_hours_end: time = time(18, 0)
    slot_minutes: int = 30


class ProviderProfileRead(ProviderProfileCreate):
    id: int
    user_id: int
    slug: str
    full_name: str
    services: list[ServiceRead] = []
    distance_km: float | None = None
    plan: ProviderPlan = ProviderPlan.FREE
    pro_expires_at: datetime | None = None
    rating_avg: float | None = None
    rating_count: int = 0


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
    provider_phone: str | None = None
    client_name: str
    client_phone: str | None = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class AvailableSlot(BaseModel):
    start_at: datetime
    end_at: datetime


class ReviewCreate(BaseModel):
    rating: int
    comment: str = ""


class ReviewRead(BaseModel):
    id: int
    booking_id: int
    provider_id: int
    client_id: int
    client_name: str
    rating: int
    comment: str
    created_at: datetime


class PlanInfo(BaseModel):
    plan: ProviderPlan
    pro_requested_at: datetime | None = None
    pro_approved_at: datetime | None = None
    pro_expires_at: datetime | None = None
    price_cents: int
    pix_key: str
    pix_key_type: str
    pix_receiver_name: str
    pix_payload: str | None = None  # BR Code (EMV) string for QR
    admin_whatsapp_url: str | None = None  # wa.me link pro prestador avisar o admin


class AdminProRequest(BaseModel):
    provider_id: int
    business_name: str
    user_email: str
    requested_at: datetime


class AdminApproveRequest(BaseModel):
    provider_id: int
    months: int = 1
