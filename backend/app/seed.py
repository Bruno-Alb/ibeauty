from datetime import time

from sqlmodel import Session, select

from app.db import engine
from app.models import ProviderProfile, Service, User, UserRole
from app.security import hash_password


SEED_PASSWORD = "ibeauty123"


SEED_PROVIDERS = [
    {
        "user": {"email": "ana.manicure@ibeauty.dev", "full_name": "Ana Souza"},
        "profile": {
            "business_name": "Ana Nail Studio",
            "bio": "Manicure e pedicure com atendimento cuidadoso. Esmaltação em gel.",
            "category": "manicure",
            "address": "Rua Augusta, 1200",
            "city": "São Paulo",
            "state": "SP",
            "latitude": -23.5558,
            "longitude": -46.6625,
            "working_hours_start": time(9, 0),
            "working_hours_end": time(19, 0),
            "slot_minutes": 30,
        },
        "services": [
            {"name": "Manicure simples", "description": "Corte, cutícula e esmalte.", "price_cents": 3500, "duration_minutes": 45},
            {"name": "Pedicure", "description": "Spa dos pés + esmalte.", "price_cents": 5000, "duration_minutes": 60},
            {"name": "Esmaltação em gel", "description": "Durabilidade de 3 semanas.", "price_cents": 9000, "duration_minutes": 90},
        ],
    },
    {
        "user": {"email": "bia.cabelo@ibeauty.dev", "full_name": "Beatriz Lima"},
        "profile": {
            "business_name": "Bia Hair",
            "bio": "Cortes femininos, escova e coloração.",
            "category": "cabelo",
            "address": "Av. Paulista, 900",
            "city": "São Paulo",
            "state": "SP",
            "latitude": -23.5629,
            "longitude": -46.6544,
            "working_hours_start": time(10, 0),
            "working_hours_end": time(20, 0),
            "slot_minutes": 30,
        },
        "services": [
            {"name": "Corte feminino", "description": "Lavagem, corte e finalização.", "price_cents": 8000, "duration_minutes": 60},
            {"name": "Escova", "description": "Escova modeladora.", "price_cents": 6000, "duration_minutes": 45},
            {"name": "Coloração", "description": "Coloração completa.", "price_cents": 18000, "duration_minutes": 120},
        ],
    },
    {
        "user": {"email": "camila.sobrancelha@ibeauty.dev", "full_name": "Camila Ribeiro"},
        "profile": {
            "business_name": "Camila Brows",
            "bio": "Design de sobrancelhas, henna e brow lamination.",
            "category": "sobrancelha",
            "address": "Rua Oscar Freire, 500",
            "city": "São Paulo",
            "state": "SP",
            "latitude": -23.5620,
            "longitude": -46.6700,
            "working_hours_start": time(9, 30),
            "working_hours_end": time(18, 30),
            "slot_minutes": 30,
        },
        "services": [
            {"name": "Design de sobrancelha", "description": "Design com pinça e linha.", "price_cents": 4500, "duration_minutes": 30},
            {"name": "Design + henna", "description": "Design com aplicação de henna.", "price_cents": 6500, "duration_minutes": 45},
            {"name": "Brow lamination", "description": "Alinhamento dos fios.", "price_cents": 12000, "duration_minutes": 60},
        ],
    },
    {
        "user": {"email": "daniela.estetica@ibeauty.dev", "full_name": "Daniela Oliveira"},
        "profile": {
            "business_name": "Dani Estética",
            "bio": "Limpeza de pele, massagem e drenagem linfática.",
            "category": "estetica",
            "address": "Rua dos Pinheiros, 300",
            "city": "São Paulo",
            "state": "SP",
            "latitude": -23.5675,
            "longitude": -46.6820,
            "working_hours_start": time(8, 0),
            "working_hours_end": time(18, 0),
            "slot_minutes": 60,
        },
        "services": [
            {"name": "Limpeza de pele", "description": "Limpeza profunda com extração.", "price_cents": 15000, "duration_minutes": 90},
            {"name": "Massagem relaxante", "description": "60 minutos de massagem.", "price_cents": 12000, "duration_minutes": 60},
            {"name": "Drenagem linfática", "description": "Drenagem corporal.", "price_cents": 14000, "duration_minutes": 60},
        ],
    },
    {
        "user": {"email": "elaine.manicure@ibeauty.dev", "full_name": "Elaine Torres"},
        "profile": {
            "business_name": "Elaine Nails Vila Mariana",
            "bio": "Atendimento em domicílio na zona sul.",
            "category": "manicure",
            "address": "Rua Domingos de Morais, 1500",
            "city": "São Paulo",
            "state": "SP",
            "latitude": -23.5886,
            "longitude": -46.6346,
            "working_hours_start": time(9, 0),
            "working_hours_end": time(18, 0),
            "slot_minutes": 30,
        },
        "services": [
            {"name": "Manicure simples", "description": "Manicure com esmalte comum.", "price_cents": 3000, "duration_minutes": 40},
            {"name": "Manicure + pedicure", "description": "Combo mãos e pés.", "price_cents": 6500, "duration_minutes": 90},
        ],
    },
]


def seed_if_empty() -> None:
    with Session(engine) as session:
        existing = session.exec(select(ProviderProfile)).first()
        if existing:
            return
        for entry in SEED_PROVIDERS:
            user = User(
                email=entry["user"]["email"],
                full_name=entry["user"]["full_name"],
                hashed_password=hash_password(SEED_PASSWORD),
                role=UserRole.PROVIDER,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            profile = ProviderProfile(user_id=user.id, **entry["profile"])  # type: ignore[arg-type]
            session.add(profile)
            session.commit()
            session.refresh(profile)

            for svc in entry["services"]:
                session.add(Service(provider_id=profile.id, **svc))  # type: ignore[arg-type]
            session.commit()

        demo_client = User(
            email="cliente@ibeauty.dev",
            full_name="Cliente Demo",
            hashed_password=hash_password(SEED_PASSWORD),
            role=UserRole.CLIENT,
        )
        session.add(demo_client)
        session.commit()
