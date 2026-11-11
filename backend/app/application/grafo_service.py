from sqlalchemy.orm import Session

from app.infraestructure.security.config import settings
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta
from app.infraestructure.db.models.transicion_grafo import TransicionGrafo

# Capa de dominio — lógica pura
from app.domain.grafo.conexion import vecinos_mas_disimiles

# Marca de las aristas generadas automáticamente. Las aristas con cualquier
# otro valor se consideran puestas a mano y quedan intactas.
CONDICION_DERIVADA = "derivada"


def _pesos(nodo: NodoPregunta) -> tuple[float, float, float]:
    return (nodo.peso_dominante, nodo.peso_hibrido, nodo.peso_sumiso)


def _nodos_conectables(db: Session) -> list[NodoPregunta]:
    """
    Nodos que participan del grafo derivado.

    Se excluye la pregunta de cierre: procesar_respuesta la inyecta aparte,
    consultando es_cierre directamente, así que no debe ofrecerse además
    como candidata normal del recorrido.
    """
    return (
        db.query(NodoPregunta)
        .filter(
            NodoPregunta.estado_activo == True,  # noqa: E712
            NodoPregunta.es_cierre == False,     # noqa: E712
        )
        .order_by(NodoPregunta.id_nodo)
        .all()
    )


def calcular_aristas(db: Session, k: int | None = None) -> dict[tuple[int, int], float]:
    """
    Calcula el grafo derivado completo sin tocar la base de datos.

    Retorna {(id_origen, id_destino): similitud}. Cada par se agrega en
    ambos sentidos: con solo aristas salientes, los nodos del centro del
    simplex no son los "más disímiles" de nadie y quedarían con grado de
    entrada 0, o sea inalcanzables para el motor.
    """
    k = k if k is not None else settings.K_VECINOS_GRAFO
    nodos = _nodos_conectables(db)

    aristas: dict[tuple[int, int], float] = {}
    for nodo in nodos:
        candidatos = [
            (otro.id_nodo, _pesos(otro))
            for otro in nodos
            if otro.id_nodo != nodo.id_nodo
        ]
        for id_vecino, sim in vecinos_mas_disimiles(_pesos(nodo), candidatos, k):
            aristas[(nodo.id_nodo, id_vecino)] = sim
            aristas[(id_vecino, nodo.id_nodo)] = sim
    return aristas


def recalcular_grafo(db: Session, k: int | None = None) -> dict:
    """
    Regenera todas las aristas derivadas a partir de los pesos actuales.

    Es O(n^2) en cantidad de nodos: con 66 preguntas son ~4.300 comparaciones
    de tres floats, despreciable. Se llama en cada alta, edición o baja de
    pregunta porque cambiar los pesos de UN nodo puede cambiar el top-k de
    los demás, y recalcular todo es la única forma de quedar siempre
    consistente sin razonar sobre casos parciales.

    No hace commit: lo hace quien lo llama, para que el alta de la pregunta
    y su conexión queden en la misma transacción.
    """
    aristas = calcular_aristas(db, k)

    db.query(TransicionGrafo).filter(
        TransicionGrafo.perfil_condicion == CONDICION_DERIVADA
    ).delete(synchronize_session=False)

    # Un par que ya existe cargado a mano no se duplica: esa arista ya
    # habilita el mismo recorrido y se respeta como la puso el especialista.
    manuales = {
        (t.id_nodo_origen, t.id_nodo_destino)
        for t in db.query(
            TransicionGrafo.id_nodo_origen, TransicionGrafo.id_nodo_destino
        ).all()
    }

    nuevas = [
        TransicionGrafo(
            id_nodo_origen=origen,
            id_nodo_destino=destino,
            perfil_condicion=CONDICION_DERIVADA,
            # El campo no lo lee el motor; se guarda acá la similitud del par
            # para poder auditar por qué existe cada arista derivada.
            peso_minimo_requerido=round(sim, 4),
        )
        for (origen, destino), sim in sorted(aristas.items())
        if (origen, destino) not in manuales
    ]
    db.bulk_save_objects(nuevas)
    db.flush()

    return {
        "k": k if k is not None else settings.K_VECINOS_GRAFO,
        "nodos": len({o for o, _ in aristas}),
        "aristas_derivadas": len(nuevas),
        "aristas_manuales_preservadas": len(manuales),
    }