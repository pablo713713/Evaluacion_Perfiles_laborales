"""
Servicio de Grafo — Capa de Aplicación
Responsabilidad: mantener transicion_grafo sincronizada con la regla de
conexión del dominio, para que el Psicólogo Líder no tenga que conectar
preguntas a mano en la base de datos.

La sincronización es diferencial e idempotente: compara el grafo que debería
existir contra el que existe, inserta lo que falta y borra lo que sobra. Como
la regla del dominio reproduce el grafo construido a mano, la primera
ejecución sobre el banco actual no toca ninguna de las 4.225 filas.
"""
from sqlalchemy.orm import Session

from app.infraestructure.db.models.nodo_pregunta import NodoPregunta
from app.infraestructure.db.models.transicion_grafo import TransicionGrafo

# Capa de dominio — lógica pura
from app.domain.grafo.conexion import aristas_del_grafo

# El motor no lee este campo. Se deja en 0.0 como en el grafo existente.
PESO_MINIMO_POR_DEFECTO = 0.0


def _nodos_del_recorrido(db: Session) -> list[tuple[int, tuple[float, float, float], bool]]:
    """
    Nodos que participan del grafo, en la forma que espera el dominio.

    Se excluye la pregunta de cierre: procesar_respuesta la inyecta aparte
    consultando es_cierre directamente, así que no debe ofrecerse además
    como candidata normal del recorrido.
    """
    filas = (
        db.query(NodoPregunta)
        .filter(
            NodoPregunta.estado_activo == True,  # noqa: E712
            NodoPregunta.es_cierre == False,     # noqa: E712
        )
        .order_by(NodoPregunta.id_nodo)
        .all()
    )
    return [
        (n.id_nodo, (n.peso_dominante, n.peso_hibrido, n.peso_sumiso), bool(n.es_raiz))
        for n in filas
    ]


def sincronizar_grafo(db: Session) -> dict:
    """
    Deja transicion_grafo igual al grafo que define la regla del dominio.

    No hace commit: lo hace quien llama, para que el alta de la pregunta y
    sus aristas queden en la misma transacción.

    Devuelve el detalle de lo que cambió. Si todo estaba en orden, los
    contadores de insertadas y borradas vienen en 0.
    """
    objetivo = aristas_del_grafo(_nodos_del_recorrido(db))

    existentes = {
        (t.id_nodo_origen, t.id_nodo_destino): (t.id_transicion, t.perfil_condicion)
        for t in db.query(
            TransicionGrafo.id_transicion,
            TransicionGrafo.id_nodo_origen,
            TransicionGrafo.id_nodo_destino,
            TransicionGrafo.perfil_condicion,
        ).all()
    }

    faltantes = [par for par in objetivo if par not in existentes]
    sobrantes = [datos[0] for par, datos in existentes.items() if par not in objetivo]
    # Aristas que existen pero con otra condición: pasa cuando el psicólogo
    # le cambia los pesos a una pregunta y su perfil de mayor peso cambia.
    desactualizadas = [
        (datos[0], objetivo[par])
        for par, datos in existentes.items()
        if par in objetivo and datos[1] != objetivo[par]
    ]

    if sobrantes:
        db.query(TransicionGrafo).filter(
            TransicionGrafo.id_transicion.in_(sobrantes)
        ).delete(synchronize_session=False)

    for id_transicion, condicion in desactualizadas:
        db.query(TransicionGrafo).filter(
            TransicionGrafo.id_transicion == id_transicion
        ).update({"perfil_condicion": condicion}, synchronize_session=False)

    if faltantes:
        db.bulk_save_objects([
            TransicionGrafo(
                id_nodo_origen=origen,
                id_nodo_destino=destino,
                perfil_condicion=objetivo[(origen, destino)],
                peso_minimo_requerido=PESO_MINIMO_POR_DEFECTO,
            )
            for origen, destino in sorted(faltantes)
        ])

    db.flush()
    return {
        "nodos_en_recorrido": len(_nodos_del_recorrido(db)),
        "aristas_esperadas": len(objetivo),
        "insertadas": len(faltantes),
        "borradas": len(sobrantes),
        "condicion_corregida": len(desactualizadas),
    }