from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py -> security -> infraestructure -> app -> backend (4 .parent)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 150
    SESSION_EXPIRE_MINUTES: int = 120
    # Se sigue guardando en evaluacion.umbral_configurado (la columna exige
    # un valor entre 0.5 y 1.0), pero ya no decide el cierre del test.
    DEFAULT_UMBRAL_CONFIANZA: float = 0.85
    # Criterio de cierre: ventaja mínima del perfil líder sobre el segundo
    MARGEN_MINIMO_CIERRE: float = 0.25
    MIN_NODOS_REQUERIDOS: int = 15
    MIN_PALABRAS_RESPUESTA: int = 10
    ENV: str = "development"

    # Configuración moderna de Pydantic V2
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()