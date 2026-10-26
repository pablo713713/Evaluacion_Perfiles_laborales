"""
Servicio de Gestión del Lexicón — Capa de Aplicación
Casos de uso del Psicólogo Líder sobre el lexicón conductual:
crear, editar, desactivar y reactivar lemas.
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.infraestructure.db.models.lexico_conductual import LexicoConductual
from app.infraestructure.repositories import lexico_repo


class LexicoError(Exception):
    """Error de negocio al gestionar el lexicón (se traduce a HTTP 400/404 en la ruta)."""
    def __init__(self, mensaje: str, codigo: int = 400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


def a_dict(e: LexicoConductual) -> dict:
    return {
        "id_lema": e.id_lema,
        "lema": e.lema,
        "perfil": e.perfil,
        "peso": e.peso,
        "categoria": e.categoria,
        "es_ambiguo": e.es_ambiguo,
        "estado_activo": e.estado_activo,
        "fecha_modificacion": e.fecha_modificacion.isoformat() if e.fecha_modificacion else None,
    }


def listar(db: Session) -> list[dict]:
    return [a_dict(e) for e in lexico_repo.listar_todos(db)]


def crear(db: Session, datos: dict, id_usuario: int) -> dict:
    existente = lexico_repo.obtener_por_lema(db, datos["lema"])
    if existente:
        if existente.estado_activo:
            raise LexicoError(f"El lema «{datos['lema']}» ya existe en el lexicón.")
        raise LexicoError(f"El lema «{datos['lema']}» existe pero está desactivado. Edítelo para reactivarlo.")

    entrada = LexicoConductual(
        lema=datos["lema"],
        perfil=datos["perfil"],
        peso=datos["peso"],
        categoria=datos["categoria"],
        es_ambiguo=datos.get("es_ambiguo", False),
        estado_activo=True,
        fecha_modificacion=datetime.utcnow(),
        id_usuario_modificacion=id_usuario,
    )
    return a_dict(lexico_repo.guardar(db, entrada))


def editar(db: Session, id_lema: int, datos: dict, id_usuario: int) -> dict:
    entrada = lexico_repo.obtener_por_id(db, id_lema)
    if not entrada:
        raise LexicoError("Lema no encontrado.", 404)

    if datos["lema"] != entrada.lema:
        otro = lexico_repo.obtener_por_lema(db, datos["lema"])
        if otro:
            raise LexicoError(f"Ya existe otra entrada con el lema «{datos['lema']}».")

    entrada.lema = datos["lema"]
    entrada.perfil = datos["perfil"]
    entrada.peso = datos["peso"]
    entrada.categoria = datos["categoria"]
    entrada.es_ambiguo = datos.get("es_ambiguo", entrada.es_ambiguo)
    entrada.estado_activo = datos.get("estado_activo", entrada.estado_activo)
    entrada.fecha_modificacion = datetime.utcnow()
    entrada.id_usuario_modificacion = id_usuario
    return a_dict(lexico_repo.guardar(db, entrada))


def desactivar(db: Session, id_lema: int, id_usuario: int) -> dict:
    """Baja lógica: el lema deja de puntuar, pero se conserva para trazabilidad."""
    entrada = lexico_repo.obtener_por_id(db, id_lema)
    if not entrada:
        raise LexicoError("Lema no encontrado.", 404)
    entrada.estado_activo = False
    entrada.fecha_modificacion = datetime.utcnow()
    entrada.id_usuario_modificacion = id_usuario
    return a_dict(lexico_repo.guardar(db, entrada))
