from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select

from app.config import settings
from app.db import get_session
from app.models import ProviderPlan, ProviderProfile, User, UserRole
from app.pix import build_static_pix
from app.schemas import (
    AdminApproveRequest,
    AdminProRequest,
    PlanInfo,
    ProviderProfileRead,
)
from app.security import get_current_user

router = APIRouter(prefix="/api", tags=["plans"])


def _provider_for(user: User, session: Session) -> ProviderProfile:
    if user.role != UserRole.PROVIDER:
        raise HTTPException(status_code=403, detail="Apenas prestadores")
    profile = session.exec(
        select(ProviderProfile).where(ProviderProfile.user_id == user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Cadastre primeiro seu perfil de prestador")
    return profile


def _plan_info(profile: ProviderProfile) -> PlanInfo:
    payload: str | None = None
    if settings.pix_key:
        payload = build_static_pix(
            pix_key=settings.pix_key,
            amount_cents=settings.pro_price_cents,
            receiver_name=settings.pix_receiver_name,
            receiver_city=settings.pix_receiver_city,
            txid=f"IBPRO{profile.id:06d}",
            description=f"Ibeauty Pro {profile.business_name[:20]}",
        )
    return PlanInfo(
        plan=profile.plan,
        pro_requested_at=profile.pro_requested_at,
        pro_approved_at=profile.pro_approved_at,
        pro_expires_at=profile.pro_expires_at,
        price_cents=settings.pro_price_cents,
        pix_key=settings.pix_key,
        pix_key_type=settings.pix_key_type,
        pix_receiver_name=settings.pix_receiver_name,
        pix_payload=payload,
    )


@router.get("/plans/me", response_model=PlanInfo)
def my_plan(
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlanInfo:
    profile = _provider_for(current, session)
    return _plan_info(profile)


@router.post("/plans/me/request-pro", response_model=PlanInfo)
def request_pro(
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlanInfo:
    profile = _provider_for(current, session)
    if profile.plan == ProviderPlan.FREE:
        profile.plan = ProviderPlan.PRO_PENDING
    if profile.plan == ProviderPlan.PRO_PENDING:
        profile.pro_requested_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _plan_info(profile)


@router.post("/plans/me/cancel", response_model=PlanInfo)
def cancel_pro_request(
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlanInfo:
    profile = _provider_for(current, session)
    if profile.plan == ProviderPlan.PRO_PENDING:
        profile.plan = ProviderPlan.FREE
        profile.pro_requested_at = None
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return _plan_info(profile)


def _require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Token admin inválido")


@router.get("/admin/pro-requests", response_model=list[AdminProRequest])
def list_pro_requests(
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
) -> list[AdminProRequest]:
    profiles = session.exec(
        select(ProviderProfile).where(ProviderProfile.plan == ProviderPlan.PRO_PENDING)
    ).all()
    out: list[AdminProRequest] = []
    for p in profiles:
        user = session.get(User, p.user_id)
        out.append(
            AdminProRequest(
                provider_id=p.id,  # type: ignore[arg-type]
                business_name=p.business_name,
                user_email=user.email if user else "",
                requested_at=p.pro_requested_at or p.pro_approved_at or datetime.utcnow(),
            )
        )
    return out


@router.post("/admin/approve-pro", response_model=ProviderProfileRead)
def approve_pro(
    payload: AdminApproveRequest,
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
) -> ProviderProfileRead:
    from app.routers.providers import _to_read

    profile = session.get(ProviderProfile, payload.provider_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    now = datetime.utcnow()
    profile.plan = ProviderPlan.PRO
    profile.pro_approved_at = now
    base = profile.pro_expires_at if profile.pro_expires_at and profile.pro_expires_at > now else now
    profile.pro_expires_at = base + timedelta(days=30 * max(1, payload.months))
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_read(profile, session=session)


@router.post("/admin/revoke-pro", response_model=ProviderProfileRead, status_code=status.HTTP_200_OK)
def revoke_pro(
    payload: AdminApproveRequest,
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
) -> ProviderProfileRead:
    from app.routers.providers import _to_read

    profile = session.get(ProviderProfile, payload.provider_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    profile.plan = ProviderPlan.FREE
    profile.pro_approved_at = None
    profile.pro_expires_at = None
    profile.pro_requested_at = None
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_read(profile, session=session)
