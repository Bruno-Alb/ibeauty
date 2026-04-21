from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:////data/app.db" if __import__("os").path.isdir("/data") else "sqlite:///./ibeauty.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "*"
    google_oauth_client_id: str = (
        "724429137037-9p7qmppmv5q6cbep01ui6go9v5fg3orv.apps.googleusercontent.com"
    )
    google_oauth_client_secret: str = ""  # não é necessário p/ verificar id_token
    seed_on_startup: bool = True
    admin_token: str = "change-me-admin"
    pix_key: str = "+5511981650278"
    pix_key_type: str = "phone"  # cpf | email | phone | random
    pix_receiver_name: str = "BRUNO ALB FERREIRA"
    pix_receiver_city: str = "SAO PAULO"
    pro_price_cents: int = 3900
    admin_whatsapp: str = "5511981650278"  # E.164 sem '+'


settings = Settings()
