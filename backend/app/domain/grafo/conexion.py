"""
Conexión automática del grafo de preguntas — Capa de Dominio

Lógica pura: recibe vectores de pesos y devuelve qué nodos deben conectarse.
No conoce SQLAlchemy ni FastAPI.

Criterio: cada nodo se conecta con los k nodos MÁS DISÍMILES del banco.

Por qué disimilitud y no similitud: el motor CAT elige, entre los vecinos
del nodo actual, el que maximiza abs(peso_top - peso_segundo), o sea el más
discriminante entre los dos perfiles que van compitiendo. Si los vecinos se
parecen entre sí, sus puntajes discriminativos son casi iguales y el jitter
de +-0.05 termina decidiendo: la selección adaptativa degenera en azar.
Conectando por disimilitud, cada vecindario ofrece contraste real y el
selector vuelve a tener algo que decidir.

Por qué top-k y no un umbral fijo: los pesos del banco están concentrados
en el centro del simplex (similitud media 0.80, mediana 0.82), así que un
corte fijo deja el grado a merced de la distribución — con sim <= 0.60 la
mitad de los nodos queda sin vecinos, y con sim <= 0.75 el grado va de 12 a
63. Con top-k el grado está garantizado por construcción, sea cual sea el
reparto de pesos que elija el psicólogo.
"""

# Vector de pesos de un nodo: (dominante, hibrido, sumiso)
Pesos = tuple[float, float, float]


def similitud(a: Pesos, b: Pesos) -> float:
    """
    Similitud entre dos nodos en [0, 1]: 1 - distancia de variación total.

    Los pesos de un nodo suman 1, así que son una distribución de
    probabilidad y la distancia natural entre ellas es la TV (mitad de la
    distancia L1). Devuelve 1.0 para vectores idénticos y 0.0 para dos
    distribuciones sin solapamiento.

    No se usa similitud coseno: al ser todos los pesos positivos y sumar 1,
    el coseno aplasta los valores contra 1.0 y pierde poder de distinción
    (dos vértices opuestos del simplex dan 0.0, pero el par (0.40,0.30,0.30)
    vs (0.45,0.35,0.20) da 0.979 por coseno contra 0.900 por 1-TV).
    """
    return 1.0 - sum(abs(x - y) for x, y in zip(a, b)) / 2.0


def vecinos_mas_disimiles(
    pesos_objetivo: Pesos,
    candidatos: list[tuple[int, Pesos]],
    k: int,
) -> list[tuple[int, float]]:
    """
    Devuelve los k candidatos menos parecidos al nodo objetivo.

    candidatos: [(id_nodo, pesos), ...] sin incluir al objetivo.
    Retorna [(id_nodo, similitud), ...] ordenado de más disímil a menos.

    Si hay menos de k candidatos devuelve todos: esto cubre el caso del
    banco recién inicializado y garantiza que ningún nodo quede aislado,
    que es el fallback de "conectar a la más cercana si ninguna pasa".
    """
    puntuados = [
        (id_nodo, similitud(pesos_objetivo, pesos))
        for id_nodo, pesos in candidatos
    ]
    # Orden estable por (similitud, id) para que el grafo sea reproducible:
    # dos nodos con pesos idénticos no pueden alternar entre recálculos.
    puntuados.sort(key=lambda par: (par[1], par[0]))
    return puntuados[:k]