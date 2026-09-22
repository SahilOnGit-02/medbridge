from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "MedBridge"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://medbridge:medbridge@localhost:5432/medbridge"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
