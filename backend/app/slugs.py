import re
import unicodedata

from sqlmodel import Session, select

from app.models import ProviderProfile


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "prestador"


def unique_slug(session: Session, base: str, *, exclude_id: int | None = None) -> str:
    root = slugify(base)
    candidate = root
    suffix = 2
    while True:
        stmt = select(ProviderProfile).where(ProviderProfile.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(ProviderProfile.id != exclude_id)
        if not session.exec(stmt).first():
            return candidate
        candidate = f"{root}-{suffix}"
        suffix += 1
