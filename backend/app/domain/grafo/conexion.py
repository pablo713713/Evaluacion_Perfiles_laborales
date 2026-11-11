"""
Conexión automática del grafo de preguntas — Capa de Dominio

Lógica pura: recibe los nodos y devuelve qué aristas debe tener el grafo.
No conoce SQLAlchemy ni FastAPI.

La regla que implementa acá NO es nueva: es la que se usó para construir el
grafo a mano, deducida de los datos y verificada contra ellos. Sobre el banco
de 66 preguntas reproduce las 4.225 transiciones existentes exactamente, con
el mismo reparto por condición (Dominante 2.795, Hibrido 1.040, Sumiso 390).

    Existe una arista para cada par ordenado de nodos activos, y su
    perfil_condicion es el perfil de mayor peso del nodo DESTINO, con
    empates resueltos en orden Dominante > Hibrido > Sumiso.
    La raíz no recibe aristas entrantes: el recorrido nunca vuelve a ella.

Así, cada arista entrante a un nodo declara bajo qué tendencia de respuesta
ese nodo tiene sentido como siguiente pregunta.
"""

# Orden significativo: define también el desempate cuando dos pesos empatan.
PERFILES = ("Dominante", "Hibrido", "Sumiso")

# Vector de pesos de un nodo: (dominante, hibrido, sumiso)
Pesos = tuple[float, float, float]

# Un nodo, como lo necesita el dominio: (id_nodo, pesos, es_raiz)
NodoGrafo = tuple[int, Pesos, bool]


def condicion_de_destino(pesos: Pesos) -> str:
    """
    Condición que llevan todas las aristas que entran a un nodo con estos pesos.

    Es el perfil de mayor peso. Los empates caen en el primero según el orden
    de PERFILES, que es el desempate que usa el grafo actual: un nodo que
    empata Dominante con Hibrido queda en Dominante, y uno que empata Hibrido
    con Sumiso queda en Hibrido.
    """
    return PERFILES[pesos.index(max(pesos))]


def aristas_del_grafo(nodos: list[NodoGrafo]) -> dict[tuple[int, int], str]:
    """
    Grafo completo que corresponde a este conjunto de nodos.

    Retorna {(id_origen, id_destino): perfil_condicion}.

    Se omiten las aristas que entran a la raíz. Quien llama es responsable de
    pasar solo los nodos que participan del recorrido: los activos y sin la
    pregunta de cierre, que procesar_respuesta inyecta aparte.
    """
    aristas: dict[tuple[int, int], str] = {}
    for id_destino, pesos_destino, destino_es_raiz in nodos:
        if destino_es_raiz:
            continue
        condicion = condicion_de_destino(pesos_destino)
        for id_origen, _, _ in nodos:
            if id_origen != id_destino:
                aristas[(id_origen, id_destino)] = condicion
    return aristas