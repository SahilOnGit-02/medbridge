from typing import Literal

from pydantic import EmailStr, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MedBridge"
    app_env: str = "development"
    database_url: str = (
        "postgresql+psycopg://medbridge:medbridge@localhost:5432/medbridge"
    )
    jwt_secret_key: str
    account_mail_mode: Literal["disabled", "capture", "smtp"] = "disabled"
    account_mailbox_dir: str | None = None
    public_app_url: str = "http://localhost:5173"
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_security: Literal["starttls", "ssl"] = "starttls"
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_timeout_seconds: int = Field(default=10, ge=1, le=30)
    account_mail_from: EmailStr | None = None
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://medbridge-theta-five.vercel.app",
    ]
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
