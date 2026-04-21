import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import ProviderPlan, ProviderProfile, Review, Service, User, UserRole
from app.schemas import (
    ProviderProfileCreate,
    ProviderProfileRead,
    ServiceCreate,
    ServiceRead,
)
from app.security import get_current_user
from app.slugs import unique_slug

router = APIRouter(prefix="/api/providers", tags=["providers"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _gallery_to_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [u.strip() for u in raw.split("|") if u.strip()]


def _gallery_to_str(items: list[str]) -> str:
    return "|".join(u.strip() for u in items if u.strip())


def _rating_summary(provider_id: int, session: Session) -> tuple[float | None, int]:
    reviews = session.exec(select(Review).where(Review.provider_id == provider_id)).all()
    if not reviews:
        return None, 0
    total = sum(r.rating for r in reviews)
    return round(total / len(reviews), 2), len(reviews)


def _to_read(
    p: ProviderProfile,
    distance_km: float | None = None,
    *,
    session: Session,
) -> ProviderProfileRead:
    data = p.model_dump()
    data["full_name"] = p.user.full_name if p.user else ""
    data["services"] = [ServiceRead.model_validate(s.model_dump()) for s in p.services]
    data["distance_km"] = distance_km
    data["slug"] = p.slug or ""
    data["gallery"] = _gallery_to_list(p.gallery)
    data["plan"] = p.plan
    data["pro_expires_at"] = p.pro_expires_at
    avg, count = _rating_summary(p.id, session) if p.id else (None, 0)
    data["rating_avg"] = avg
    data["rating_count"] = count
    return ProviderProfileRead.model_validate(data)


def _ensure_slug(profile: ProviderProfile, session: Session) -> None:
    if not profile.slug:
        profile.slug = unique_slug(session, profile.business_name, exclude_id=profile.id)


@router.get("", response_model=list[ProviderProfileRead])
def list_providers(
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_km: float = Query(50.0, ge=0.1, le=20037),
    category: str | None = None,
    q: str | None = None,
    session: Session = Depends(get_session),
) -> list[ProviderProfileRead]:
    stmt = select(ProviderProfile)
    if category:
        stmt = stmt.where(ProviderProfile.category == category)
    providers = session.exec(stmt).all()

    results: list[tuple[ProviderProfile, float | None]] = []
    for p in providers:
        dist: float | None = None
        if lat is not None and lng is not None:
            dist = _haversine_km(lat, lng, p.latitude, p.longitude)
            if dist > radius_km:
                continue
        if q:
            needle = q.lower()
            haystack = " ".join(
                [p.business_name, p.bio, p.city, p.category] + [s.name for s in p.services]
            ).lower()
            if needle not in haystack:
                continue
        results.append((p, dist))

    # Pro providers float first; within same plan tier, by distance (unknown last).
    def sort_key(item: tuple[ProviderProfile, float | None]) -> tuple[int, int, float]:
        prov, d = item
        pro_rank = 0 if prov.plan == ProviderPlan.PRO else 1
        return (pro_rank, 1 if d is None else 0, d if d is not None else 0.0)

    results.sort(key=sort_key)
    return [_to_read(p, d, session=session) for p, d in results]


@router.get("/slug/{slug}", response_model=ProviderProfileRead)
def get_by_slug(slug: str, session: Session = Depends(get_session)) -> ProviderProfileRead:
    provider = session.exec(select(ProviderProfile).where(ProviderProfile.slug == slug)).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    return _to_read(provider, session=session)


@router.get("/{provider_id}", response_model=ProviderProfileRead)
def get_provider(provider_id: int, session: Session = Depends(get_session)) -> ProviderProfileRead:
    provider = session.get(ProviderProfile, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    return _to_read(provider, session=session)


@router.post("/me", response_model=ProviderProfileRead, status_code=status.HTTP_201_CREATED)
def create_or_update_me(
    payload: ProviderProfileCreate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProviderProfileRead:
    if current.role != UserRole.PROVIDER:
        current.role = UserRole.PROVIDER
        session.add(current)

    data = payload.model_dump()
    gallery_list = data.pop("gallery", [])
    data["gallery"] = _gallery_to_str(gallery_list)

    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == current.id)
    ).first()
    if profile:
        prev_name = profile.business_name
        for k, v in data.items():
            setattr(profile, k, v)
        if not profile.slug or prev_name != profile.business_name:
            profile.slug = unique_slug(session, profile.business_name, exclude_id=profile.id)
    else:
        profile = ProviderProfile(user_id=current.id, **data)  # type: ignore[arg-type]
        session.add(profile)
        session.flush()
        profile.slug = unique_slug(session, profile.business_name, exclude_id=profile.id)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_read(profile, session=session)


@router.get("/me/profile", response_model=ProviderProfileRead)
def get_my_profile(
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProviderProfileRead:
    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == current.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Você ainda não cadastrou um perfil de prestador")
    _ensure_slug(profile, session)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_read(profile, session=session)


@router.post("/me/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def add_service(
    payload: ServiceCreate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ServiceRead:
    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == current.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Cadastre primeiro seu perfil de prestador")
    service = Service(provider_id=profile.id, **payload.model_dump())  # type: ignore[arg-type]
    session.add(service)
    session.commit()
    session.refresh(service)
    return ServiceRead.model_validate(service.model_dump())


@router.delete("/me/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == current.id)
    ).first()
    service = session.get(Service, service_id)
    if not profile or not service or service.provider_id != profile.id:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    session.delete(service)
    session.commit()
