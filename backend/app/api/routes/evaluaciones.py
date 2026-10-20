from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_psicologo, require_candidato
from app.application.evaluacion_service import (
    crear_evaluacion, obtener_primera_pregunta, procesar_respuesta,
    obtener_pregunta_pendiente,
)
from app.infraestructure.db.models.evaluacion import Evaluacion
from app.domain.nlp.motor_cat import construir_grafo, obtener_nodo_raiz

router = APIRouter(prefix="/api/evaluaciones", tags=["Evaluaciones"])


class IniciarEvaluacionBody(BaseModel):
    id_candidato: int


class RespuestaBody(BaseModel):
    id_nodo: int
    texto: str
    tiempo_segundos: int = 0


@router.post("/iniciar")
def iniciar(body: IniciarEvaluacionBody, db: Session = Depends(get_db),
            psicologo=Depends(require_psicologo)):
    ev = crear_evaluacion(db, body.id_candidato, psicologo.id_usuario)
    primera = obtener_primera_pregunta(db)
    return {"id_evaluacion": ev.id_evaluacion, "token": ev.token_sesion, "primera_pregunta": primera}


@router.get("/mi-evaluacion")
def mi_evaluacion_pendiente(db: Session = Depends(get_db), candidato=Depends(require_candidato)):
    """
    Retorna el estado actual de la evaluación del candidato.
    - completada / inconclusa → estado: "completada"
    - pendiente / en_curso    → estado: "continuar" con la pregunta pendiente
    - sin evaluación          → crea una nueva automáticamente
    """
    ev = (
        db.query(Evaluacion)
        .filter(Evaluacion.id_usuario_candidato == candidato.id_usuario)
        .order_by(Evaluacion.fecha_inicio.desc())
        .first()
    )

    # Completada o inconclusa
    if ev and ev.estado in ("completada", "inconclusa_evasion"):
        return {"id_evaluacion": ev.id_evaluacion, "estado": "completada"}

    if ev and ev.estado == "invalida":
        return {"id_evaluacion": ev.id_evaluacion, "estado": "sesion_expirada"}

    # Sin evaluación o en estado inesperado → crear nueva
    if not ev or ev.estado not in ("pendiente", "en_curso"):
        from app.infraestructure.db.models.usuario import Usuario
        from app.infraestructure.db.models.rol import Rol

        # Cualquier rol de psicólogo puede quedar asignado a la evaluación
        ROLES_PSICOLOGO = ("Psicologo", "PsicologoLider")

        psicologo_default = (
            db.query(Usuario)
            .join(Rol)
            .filter(
                Rol.nombre_rol.in_(ROLES_PSICOLOGO),
                Usuario.estado_cuenta == "activo",
            )
            .first()
        )
        if not psicologo_default:
            raise HTTPException(
                status_code=409,
                detail="No hay ningún psicólogo activo en el sistema",
            )
        ev = crear_evaluacion(db, candidato.id_usuario, psicologo_default.id_usuario)

    # Pregunta pendiente (id_nodo_actual, raíz o recalculada por el motor CAT)
    pregunta = obtener_pregunta_pendiente(db, ev)
    if not pregunta:
        raise HTTPException(status_code=409, detail="No hay preguntas disponibles para esta evaluación")

    return {
        "id_evaluacion": ev.id_evaluacion,
        "estado": "continuar",
        "pregunta_actual": pregunta,
    }

@router.post("/{id_evaluacion}/responder")
def responder(id_evaluacion: int, body: RespuestaBody,
              db: Session = Depends(get_db), candidato=Depends(require_candidato)):
    ev = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if ev.id_usuario_candidato != candidato.id_usuario:
        raise HTTPException(status_code=403, detail="Esta evaluación no le pertenece")
    return procesar_respuesta(db, id_evaluacion, body.id_nodo, body.texto, body.tiempo_segundos)


@router.get("/{id_evaluacion}")
def obtener_evaluacion(id_evaluacion: int, db: Session = Depends(get_db),
                       _=Depends(require_psicologo)):
    ev = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return ev