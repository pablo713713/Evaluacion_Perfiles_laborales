"""
Lexicón Conductual — Rutas
Lectura: Psicólogo y Psicólogo Líder.
Creación, edición y desactivación: solo Psicólogo Líder.
"""
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_lider, require_psicologo_o_lider
from app.infraestructure.repositories import lexico_repo
from app.application import lexico_service
from app.application.lexico_service import LexicoError

router = APIRouter(prefix="/api/lexico", tags=["Lexicón Conductual"])

# Una sola palabra, en minúsculas, admite tildes y ñ (spaCy entrega lemas de una palabra)
PATRON_LEMA = re.compile(r"^[a-záéíóúüñ]+$")


class LemaBody(BaseModel):
    lema: str
    perfil: Literal["Dominante", "Hibrido", "Sumiso"]
    peso: float = Field(ge=0.1, le=1.0)
    categoria: str = Field(min_length=2, max_length=40)
    es_ambiguo: bool = False
    estado_activo: bool = True

    @field_validator("lema")
    @classmethod
    def validar_lema(cls, v: str) -> str:
        v = v.strip().lower()
        if not PATRON_LEMA.match(v):
            raise ValueError("El lema debe ser una sola palabra en minúsculas, sin espacios ni símbolos "
                             "(use la forma base: «rendir», no «rendirse» ni «me rendí»).")
        return v

    @field_validator("categoria")
    @classmethod
    def normalizar_categoria(cls, v: str) -> str:
        return v.strip().lower()


def _http(e: LexicoError):
    raise HTTPException(status_code=e.codigo, detail=e.mensaje)


@router.get("/")
def listar(db: Session = Depends(get_db), _=Depends(require_psicologo_o_lider)):
    return lexico_service.listar(db)


@router.get("/categorias")
def categorias(db: Session = Depends(get_db), _=Depends(require_psicologo_o_lider)):
    return lexico_repo.listar_categorias(db)


@router.post("/")
def crear(body: LemaBody, db: Session = Depends(get_db), lider=Depends(require_lider)):
    try:
        return lexico_service.crear(db, body.model_dump(), lider.id_usuario)
    except LexicoError as e:
        _http(e)


@router.put("/{id_lema}")
def editar(id_lema: int, body: LemaBody, db: Session = Depends(get_db), lider=Depends(require_lider)):
    try:
        return lexico_service.editar(db, id_lema, body.model_dump(), lider.id_usuario)
    except LexicoError as e:
        _http(e)


@router.delete("/{id_lema}")
def desactivar(id_lema: int, db: Session = Depends(get_db), lider=Depends(require_lider)):
    try:
        return lexico_service.desactivar(db, id_lema, lider.id_usuario)
    except LexicoError as e:
        _http(e)
