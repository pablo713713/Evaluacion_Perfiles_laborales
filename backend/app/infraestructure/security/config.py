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

    # ── Correo saliente ──────────────────────────────────────────────────
    # Todo se configura por variables de entorno del servidor, nunca en el
    # código ni en un archivo del repositorio.
    EMAIL_HABILITADO: bool = True
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    # starttls -> puerto 587 (lo habitual) | ssl -> puerto 465 | ninguno -> 25
    SMTP_MODO: str = "starttls"
    # Si SMTP_USER queda vacío se envía sin autenticar: es el caso de los
    # relays institucionales que autorizan por IP de origen.
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # Dirección que verá el destinatario. Si queda vacía se usa SMTP_USER.
    SMTP_FROM: str = ""
    SMTP_FROM_NOMBRE: str = "Sistema de Evaluación de Perfiles Laborales"
    SMTP_TIMEOUT: int = 20

    @property
    def remitente(self) -> str:
        """Dirección efectiva del remitente."""
        return (self.SMTP_FROM or self.SMTP_USER).strip()

    @property
    def es_produccion(self) -> bool:
        return self.ENV.strip().lower() in ("production", "produccion", "prod")

    # Configuración moderna de Pydantic V2
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()