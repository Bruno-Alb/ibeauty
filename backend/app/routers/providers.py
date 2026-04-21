import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import ProviderProfile, Service, User, UserRole
from app.schemas import (
    ProviderProfileCreate,
    ProviderProfileRead,
    ServiceCreate,
    ServiceRead,
)
from app.security import get_current_user

router = APIRouter(prefix="/api/providers", tags=["providers"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _to_read(p: ProviderProfile, distance_km: float | None = None) -> ProviderProfileRead:
    data = p.model_dump()
    data["full_name"] = p.user.full_name if p.user else ""
    data["services"] = [ServiceRead.model_validate(s.model_dump()) for s in p.services]
    data["distance_km"] = distance_km
    return ProviderProfileRead.model_validate(data)


@router.get("", response_model=list[ProviderProfileRead])
def list_providers(
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius_km: float = Query(50.0, ge=0.1, le=500),
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

    results.sort(key=lambda x: (x[1] is None, x[1] or 0))
    return [_to_read(p, d) for p, d in results]


@router.get("/{provider_id}", response_model=ProviderProfileRead)
def get_provider(provider_id: int, session: Session = Depends(get_session)) -> ProviderProfileRead:
    provider = session.get(ProviderProfile, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    return _to_read(provider)


@router.post("/me", response_model=ProviderProfileRead, status_code=status.HTTP_201_CREATED)
def create_or_update_me(
    payload: ProviderProfileCreate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProviderProfileRead:
    if current.role != UserRole.PROVIDER:
        current.role = UserRole.PROVIDER
        session.add(current)

    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == current.id)
    ).first()
    if profile:
        for k, v in payload.model_dump().items():
            setattr(profile, k, v)
    else:
        profile = ProviderProfile(user_id=current.id, **payload.model_dump())  # type: ignore[arg-type]
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_read(profile)


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
    return _to_read(profile)


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
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    service = session.get(Service, service_id)
    if not service or service.provider_id != profile.id:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    session.delete(service)
    session.commit()
