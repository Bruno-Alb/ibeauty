from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import Booking, BookingStatus, ProviderProfile, Review, User
from app.schemas import ReviewCreate, ReviewRead
from app.security import get_current_user

router = APIRouter(prefix="/api", tags=["reviews"])


def _to_read(review: Review, session: Session) -> ReviewRead:
    client = session.get(User, review.client_id)
    return ReviewRead(
        id=review.id,  # type: ignore[arg-type]
        booking_id=review.booking_id,
        provider_id=review.provider_id,
        client_id=review.client_id,
        client_name=client.full_name if client else "",
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


@router.get("/providers/{provider_id}/reviews", response_model=list[ReviewRead])
def list_reviews(provider_id: int, session: Session = Depends(get_session)) -> list[ReviewRead]:
    reviews = session.exec(
        select(Review)
        .where(Review.provider_id == provider_id)
        .order_by(Review.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    return [_to_read(r, session) for r in reviews]


@router.post("/bookings/{booking_id}/review", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def submit_review(
    booking_id: int,
    payload: ReviewCreate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ReviewRead:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    if booking.client_id != current.id:
        raise HTTPException(status_code=403, detail="Só o cliente da reserva pode avaliar")
    if booking.status not in (BookingStatus.CONFIRMED, BookingStatus.COMPLETED):
        raise HTTPException(status_code=400, detail="Só dá pra avaliar agendamentos confirmados ou concluídos")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Nota precisa estar entre 1 e 5")

    provider = session.get(ProviderProfile, booking.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")

    existing = session.exec(select(Review).where(Review.booking_id == booking_id)).first()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment.strip()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return _to_read(existing, session)

    review = Review(
        booking_id=booking_id,
        client_id=current.id,  # type: ignore[arg-type]
        provider_id=booking.provider_id,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return _to_read(review, session)
