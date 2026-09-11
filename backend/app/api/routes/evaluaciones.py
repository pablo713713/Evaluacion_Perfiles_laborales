from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_psicologo, require_candidato, get_current_user
from app.application.evaluacion_service import (
    crear_evaluacion, obtener_primera_pregunta, procesar_respuesta
)
from app.infraestructure.db.models.evaluacion import Evaluacion
from app.domain.nlp.motor_cat import construir_grafo

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
    Devuelve la evaluación pendiente o en curso del candidato autenticado.
    Si el candidato no tiene ninguna evaluación activa, se le crea una
    automáticamente apuntando al nodo raíz del grafo (Opción B: alta
    automática, sin intervención manual del psicólogo).
    """
    ev = (
        db.query(Evaluacion)
        .filter(Evaluacion.id_usuario_candidato == candidato.id_usuario)
        .order_by(Evaluacion.fecha_inicio.desc())
        .first()
    )

    # Si ya tiene una evaluación completada o inconclusa, no se generan más
    if ev and ev.estado in ("completada", "inconclusa_evasion"):
        return {"id_evaluacion": ev.id_evaluacion, "estado": "completada"}

    if ev and ev.estado == "invalida":
        return {"id_evaluacion": ev.id_evaluacion, "estado": "sesion_expirada"}

    # Sin evaluación activa: crear una nueva automáticamente
    if not ev or ev.estado not in ("pendiente", "en_curso"):
        # Asignamos como supervisor al primer Psicólogo activo del sistema
        from app.infraestructure.db.models.usuario import Usuario
        from app.infraestructure.db.models.rol import Rol
        psicologo_default = (
            db.query(Usuario)
            .join(Rol)
            .filter(Rol.nombre_rol == "Psicologo", Usuario.estado_cuenta == "activo")
            .first()
        )
        if not psicologo_default:
            raise HTTPException(status_code=500, detail="No hay ningún psicólogo activo en el sistema")

        ev = crear_evaluacion(db, candidato.id_usuario, psicologo_default.id_usuario)

    # Determinar la pregunta actual a mostrar
    grafo = construir_grafo(db)

    if not ev.respuestas:
        from app.domain.nlp.motor_cat import obtener_nodo_raiz
        nodo_id = obtener_nodo_raiz(grafo)
        if not nodo_id:
            raise HTTPException(status_code=500, detail="No hay pregunta raíz configurada")
    else:
        # Retoma desde el último nodo que respondió (por si recargó la página)
        ultima_respuesta = max(ev.respuestas, key=lambda r: r.fecha_hora)
        nodo_id = ultima_respuesta.id_nodo
        if nodo_id not in grafo.nodes:
            raise HTTPException(status_code=500, detail="Nodo de evaluación inconsistente")

    data = grafo.nodes[nodo_id]
    pregunta = {"id_nodo": nodo_id, "texto_pregunta": data["texto"]}

    return {
        "id_evaluacion": ev.id_evaluacion,
        "estado": "continuar",
        "pregunta_actual": pregunta,
    }

@router.post("/{id_evaluacion}/responder")
def responder(id_evaluacion: int, body: RespuestaBody,
              db: Session = Depends(get_db), candidato=Depends(require_candidato)):
    # Verificar que la evaluación pertenece al candidato autenticado
    ev = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if ev.id_usuario_candidato != candidato.id_usuario:
        raise HTTPException(status_code=403, detail="Esta evaluación no le pertenece")

    resultado = procesar_respuesta(db, id_evaluacion, body.id_nodo, body.texto, body.tiempo_segundos)
    return resultado

@router.get("/{id_evaluacion}")
def obtener_evaluacion(id_evaluacion: int, db: Session = Depends(get_db),
                       _=Depends(require_psicologo)):
    ev = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return ev
