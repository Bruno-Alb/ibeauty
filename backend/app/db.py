from collections.abc import Generator

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


# SQLite-only lightweight migrations: add columns if missing.
# Keeps us off Alembic for a small app; prod uses SQLite on Fly volume.
_PROFILE_COLUMNS_TO_ADD: dict[str, str] = {
    "slug": "VARCHAR DEFAULT ''",
    "gallery": "VARCHAR DEFAULT ''",
    "plan": "VARCHAR DEFAULT 'free'",
    "pro_requested_at": "DATETIME",
    "pro_approved_at": "DATETIME",
    "pro_expires_at": "DATETIME",
}


def _ensure_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    with engine.begin() as conn:
        existing = {
            row[1] for row in conn.execute(text("PRAGMA table_info(providerprofile)")).fetchall()
        }
        for name, ddl in _PROFILE_COLUMNS_TO_ADD.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE providerprofile ADD COLUMN {name} {ddl}"))


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_columns()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
