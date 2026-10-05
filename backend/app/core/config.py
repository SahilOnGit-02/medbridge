from typing import Literal

from pydantic import AliasChoices, EmailStr, Field, SecretStr
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
    smtp_host: str | None = "smtpout.secureserver.net"
    smtp_port: int = Field(default=465, ge=1, le=65535)
    smtp_security: Literal["starttls", "ssl"] | None = None
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_timeout_seconds: int = Field(default=10, ge=1, le=30)
    account_mail_from: EmailStr | None = Field(
        default=None,
        validation_alias=AliasChoices("ACCOUNT_MAIL_FROM", "SMTP_FROM_EMAIL"),
    )
    smtp_from_name: str = Field(
        default="MedBridge System", max_length=80, pattern=r"^[^\r\n]*$"
    )
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://medbridge-theta-five.vercel.app",
        "https://med-bridge.in",
        "https://www.med-bridge.in",
    ]
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", populate_by_name=True
    )


settings = Settings()