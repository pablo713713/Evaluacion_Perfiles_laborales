"""
Repositorio de Nodos y Usuarios — Capa de Infraestructura
"""
from sqlalchemy.orm import Session
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta
from app.infraestructure.db.models.usuario import Usuario
from app.infraestructure.db.models.rol import Rol


def obtener_primer_psicologo_activo(db: Session) -> Usuario | None:
    return (
        db.query(Usuario)
        .join(Rol)
        .filter(Rol.nombre_rol == "Psicologo", Usuario.estado_cuenta == "activo")
        .first()
    )


def obtener_nodos_activos(db: Session) -> list[NodoPregunta]:
    return db.query(NodoPregunta).filter(NodoPregunta.estado_activo == True).all()


def obtener_nodo_por_id(db: Session, id_nodo: int) -> NodoPregunta | None:
    return db.query(NodoPregunta).filter(NodoPregunta.id_nodo == id_nodo).first()