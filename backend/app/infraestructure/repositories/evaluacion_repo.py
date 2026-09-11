"""
Repositorio de Evaluaciones — Capa de Infraestructura
Responsabilidad única: acceso a datos de evaluaciones.
La capa de aplicación (evaluacion_service) llama estas
funciones sin conocer SQLAlchemy directamente.
"""
from sqlalchemy.orm import Session
from app.infraestructure.db.models.evaluacion import Evaluacion
from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato
from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP


def obtener_evaluacion_por_id(db: Session, id_evaluacion: int) -> Evaluacion | None:
    return db.query(Evaluacion).filter(
        Evaluacion.id_evaluacion == id_evaluacion
    ).first()


def obtener_evaluacion_activa_candidato(db: Session, id_candidato: int) -> Evaluacion | None:
    """Retorna la evaluación más reciente del candidato sin importar su estado."""
    return (
        db.query(Evaluacion)
        .filter(Evaluacion.id_usuario_candidato == id_candidato)
        .order_by(Evaluacion.fecha_inicio.desc())
        .first()
    )


def guardar_evaluacion(db: Session, evaluacion: Evaluacion) -> Evaluacion:
    db.add(evaluacion)
    db.commit()
    db.refresh(evaluacion)
    return evaluacion


def guardar_respuesta(db: Session, respuesta: RespuestaCandicato) -> RespuestaCandicato:
    db.add(respuesta)
    db.flush()
    return respuesta


def guardar_rastros(db: Session, rastros: list[RastroAuditoriaNLP]):
    for rastro in rastros:
        db.add(rastro)


def obtener_respuestas_validas(db: Session, id_evaluacion: int) -> list[RespuestaCandicato]:
    return db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).all()


def contar_respuestas_validas(db: Session, id_evaluacion: int) -> int:
    return db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).count()


def commit(db: Session):
    db.commit()