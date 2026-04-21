from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import Booking, BookingStatus, ProviderProfile, Service, User, UserRole
from app.schemas import (
    AvailableSlot,
    BookingCreate,
    BookingRead,
    BookingStatusUpdate,
)
from app.security import get_current_user

router = APIRouter(prefix="/api", tags=["bookings"])


def _to_read(b: Booking, session: Session) -> BookingRead:
    service = session.get(Service, b.service_id)
    provider = session.get(ProviderProfile, b.provider_id)
    client = session.get(User, b.client_id)
    return BookingRead(
        id=b.id,  # type: ignore[arg-type]
        client_id=b.client_id,
        provider_id=b.provider_id,
        service_id=b.service_id,
        start_at=b.start_at,
        end_at=b.end_at,
        status=b.status,
        notes=b.notes,
        created_at=b.created_at,
        service_name=service.name if service else "",
        provider_business_name=provider.business_name if provider else "",
        client_name=client.full_name if client else "",
    )


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


@router.get("/providers/{provider_id}/availability", response_model=list[AvailableSlot])
def availability(
    provider_id: int,
    service_id: int = Query(...),
    day: date = Query(...),
    session: Session = Depends(get_session),
) -> list[AvailableSlot]:
    provider = session.get(ProviderProfile, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    service = session.get(Service, service_id)
    if not service or service.provider_id != provider_id:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    start_dt = datetime.combine(day, provider.working_hours_start)
    end_dt = datetime.combine(day, provider.working_hours_end)
    step = timedelta(minutes=provider.slot_minutes)
    duration = timedelta(minutes=service.duration_minutes)

    existing = session.exec(
        select(Booking).where(
            Booking.provider_id == provider_id,
            Booking.status != BookingStatus.CANCELLED,
            Booking.start_at >= datetime.combine(day, time(0, 0)),
            Booking.start_at < datetime.combine(day + timedelta(days=1), time(0, 0)),
        )
    ).all()

    now = datetime.utcnow()
    slots: list[AvailableSlot] = []
    cursor = start_dt
    while cursor + duration <= end_dt:
        slot_end = cursor + duration
        if cursor < now:
            cursor += step
            continue
        conflict = any(_overlaps(cursor, slot_end, b.start_at, b.end_at) for b in existing)
        if not conflict:
            slots.append(AvailableSlot(start_at=cursor, end_at=slot_end))
        cursor += step
    return slots


@router.post("/bookings", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BookingRead:
    provider = session.get(ProviderProfile, payload.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    service = session.get(Service, payload.service_id)
    if not service or service.provider_id != payload.provider_id:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    start_at = payload.start_at
    end_at = start_at + timedelta(minutes=service.duration_minutes)

    if start_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Não é possível agendar no passado")

    conflict = session.exec(
        select(Booking).where(
            Booking.provider_id == provider.id,
            Booking.status != BookingStatus.CANCELLED,
        )
    ).all()
    if any(_overlaps(start_at, end_at, b.start_at, b.end_at) for b in conflict):
        raise HTTPException(status_code=409, detail="Esse horário não está mais disponível")

    booking = Booking(
        client_id=current.id,  # type: ignore[arg-type]
        provider_id=provider.id,  # type: ignore[arg-type]
        service_id=service.id,  # type: ignore[arg-type]
        start_at=start_at,
        end_at=end_at,
        status=BookingStatus.CONFIRMED,
        notes=payload.notes,
    )
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return _to_read(booking, session)


@router.get("/bookings/me", response_model=list[BookingRead])
def my_bookings(
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[BookingRead]:
    bookings = session.exec(
        select(Booking).where(Booking.client_id == current.id).order_by(Booking.start_at.desc())  # type: ignore[attr-defined]
    ).all()
    return [_to_read(b, session) for b in bookings]


@router.get("/bookings/provider", response_model=list[BookingRead])
def provider_bookings(
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[BookingRead]:
    if current.role != UserRole.PROVIDER:
        raise HTTPException(status_code=403, detail="Apenas prestadores")
    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == current.id)
    ).first()
    if not profile:
        return []
    bookings = session.exec(
        select(Booking).where(Booking.provider_id == profile.id).order_by(Booking.start_at.desc())  # type: ignore[attr-defined]
    ).all()
    return [_to_read(b, session) for b in bookings]


@router.patch("/bookings/{booking_id}/status", response_model=BookingRead)
def update_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BookingRead:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    is_client = booking.client_id == current.id
    provider = session.get(ProviderProfile, booking.provider_id)
    is_provider_owner = provider is not None and provider.user_id == current.id
    if not (is_client or is_provider_owner):
        raise HTTPException(status_code=403, detail="Sem permissão")

    if is_client and payload.status != BookingStatus.CANCELLED:
        raise HTTPException(status_code=403, detail="Cliente só pode cancelar")

    booking.status = payload.status
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return _to_read(booking, session)
