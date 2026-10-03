from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MedBridge"
    app_env: str = "development"
    database_url: str = (
        "postgresql+psycopg://medbridge:medbridge@localhost:5432/medbridge"
    )
    jwt_secret_key: str
    account_mail_mode: str = "disabled"
    account_mailbox_dir: str | None = None
    public_app_url: str = "http://localhost:5173"
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
