from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    SESSION_EXPIRE_MINUTES: int = 120
    DEFAULT_UMBRAL_CONFIANZA: float = 0.97
    MIN_NODOS_REQUERIDOS: int = 5
    MIN_PALABRAS_RESPUESTA: int = 10
    ENV: str = "development"

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"

settings = Settings()