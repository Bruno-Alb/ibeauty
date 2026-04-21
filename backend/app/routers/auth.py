import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.config import settings
from app.db import get_session
from app.models import User, UserRole
from app.schemas import (
    GoogleLoginRequest,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, session: Session = Depends(get_session)) -> TokenResponse:
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(user.id)  # type: ignore[arg-type]
    return TokenResponse(access_token=token, user=UserRead.model_validate(user.model_dump()))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> TokenResponse:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    token = create_access_token(user.id)  # type: ignore[arg-type]
    return TokenResponse(access_token=token, user=UserRead.model_validate(user.model_dump()))


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    session: Session = Depends(get_session),
) -> TokenResponse:
    client_id = settings.google_oauth_client_id
    if not client_id:
        raise HTTPException(status_code=503, detail="Login com Google não configurado")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            client_id,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Token Google inválido") from exc

    email = (info.get("email") or "").lower().strip()
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Email do Google não verificado")

    full_name = (info.get("name") or email.split("@")[0]).strip()

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        random_password = secrets.token_urlsafe(32)
        user = User(
            email=email,
            hashed_password=hash_password(random_password),
            full_name=full_name,
            role=payload.role or UserRole.CLIENT,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    token = create_access_token(user.id)  # type: ignore[arg-type]
    return TokenResponse(access_token=token, user=UserRead.model_validate(user.model_dump()))


@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current.model_dump())


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserRead:
    if payload.full_name is not None:
        current.full_name = payload.full_name
    if payload.phone is not None:
        current.phone = payload.phone.strip() or None
    session.add(current)
    session.commit()
    session.refresh(current)
    return UserRead.model_validate(current.model_dump())
