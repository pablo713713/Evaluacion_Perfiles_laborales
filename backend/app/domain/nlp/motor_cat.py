"""
Motor CAT (Computerized Adaptive Testing)
Usa NetworkX para construir el grafo de preguntas en memoria
y seleccionar dinámicamente el nodo más informativo siguiente.
"""
import networkx as nx
from sqlalchemy.orm import Session
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta
from app.infraestructure.db.models.transicion_grafo import TransicionGrafo


def construir_grafo(db: Session) -> nx.DiGraph:
    """
    Carga todos los nodos y transiciones activas desde PostgreSQL
    y construye un grafo dirigido en memoria con NetworkX.
    Se llama una vez al iniciar la app y cuando el psicólogo
    modifica el banco de preguntas.
    """
    G = nx.DiGraph()

    nodos = db.query(NodoPregunta).filter(NodoPregunta.estado_activo == True).all()
    for nodo in nodos:
        G.add_node(
            nodo.id_nodo,
            texto=nodo.texto_pregunta,
            es_raiz=nodo.es_raiz,
            peso_dominante=nodo.peso_dominante,
            peso_hibrido=nodo.peso_hibrido,
            peso_sumiso=nodo.peso_sumiso,
        )

    transiciones = db.query(TransicionGrafo).all()
    for t in transiciones:
        G.add_edge(
            t.id_nodo_origen,
            t.id_nodo_destino,
            perfil_condicion=t.perfil_condicion,
            peso_minimo=t.peso_minimo_requerido,
        )

    return G


def obtener_nodo_raiz(grafo: nx.DiGraph) -> int | None:
    """Retorna el id del nodo raíz (punto de entrada del test)."""
    for node_id, data in grafo.nodes(data=True):
        if data.get("es_raiz"):
            return node_id
    return None


def seleccionar_siguiente_nodo(
    grafo: nx.DiGraph,
    nodo_actual_id: int,
    puntajes_acumulados: dict,
    nodos_visitados: list[int],
) -> int | None:
    """
    Algoritmo de selección del nodo más informativo.

    Lógica corregida:
    1. Obtiene los vecinos del nodo actual no visitados.
    2. Identifica los DOS perfiles más competidos (mayor incertidumbre).
    3. Selecciona el nodo cuyo peso maximiza la discriminación entre
       esos dos perfiles — el que más diferencia aportaría entre el
       perfil predominante y su competidor más cercano.
    4. Aplica un jitter aleatorio controlado (±5%) para romper empates
       y generar variedad natural entre evaluaciones similares.
    5. Si no hay vecinos disponibles retorna None (test terminado).
    """
    import random

    if nodo_actual_id not in grafo:
        return None

    vecinos = list(grafo.successors(nodo_actual_id))
    candidatos = [n for n in vecinos if n not in nodos_visitados]

    if not candidatos:
        return None

    # Ordenar perfiles por puntaje acumulado descendente
    perfiles_ordenados = sorted(
        puntajes_acumulados.items(), key=lambda x: x[1], reverse=True
    )

    # Perfil predominante actual
    perfil_top = perfiles_ordenados[0][0] if perfiles_ordenados else "Dominante"
    # Perfil competidor más cercano (segundo lugar)
    perfil_segundo = perfiles_ordenados[1][0] if len(perfiles_ordenados) > 1 else "Hibrido"

    MAPA_PESOS = {
        "Dominante": "peso_dominante",
        "Hibrido":   "peso_hibrido",
        "Sumiso":    "peso_sumiso",
    }

    def puntaje_discriminativo(node_id: int) -> float:
        """
        Calcula cuánto discrimina este nodo entre el perfil top y su competidor.
        Un nodo discrimina bien cuando tiene alta diferencia de peso entre
        el perfil predominante y el segundo perfil más competido.
        El jitter rompe empates y genera variedad natural entre sesiones.
        """
        data = grafo.nodes[node_id]
        peso_top     = data.get(MAPA_PESOS[perfil_top],     0.33)
        peso_segundo = data.get(MAPA_PESOS[perfil_segundo], 0.33)
        discriminacion = abs(peso_top - peso_segundo)
        jitter = random.uniform(-0.05, 0.05)
        return discriminacion + jitter

    mejor_nodo = max(candidatos, key=puntaje_discriminativo)
    return mejor_nodo


def calcular_probabilidades(puntajes: dict) -> dict:
    """
    Normaliza los puntajes acumulados a probabilidades (suman 1.0).
    Antes de normalizar, lleva todos los puntajes al rango [0, ∞)
    sumando el valor absoluto del mínimo si hay negativos.
    Retorna: {"Dominante": 0.x, "Hibrido": 0.x, "Sumiso": 0.x}
    """
    valores = list(puntajes.values())
    minimo = min(valores)

    # Si hay puntajes negativos, desplazar todos para que el mínimo sea 0
    if minimo < 0:
        puntajes_ajustados = {k: v - minimo for k, v in puntajes.items()}
    else:
        puntajes_ajustados = puntajes

    total = sum(puntajes_ajustados.values())
    if total == 0:
        return {"Dominante": 0.33, "Hibrido": 0.34, "Sumiso": 0.33}

    return {
        perfil: round(pts / total, 4)
        for perfil, pts in puntajes_ajustados.items()
    }


def verificar_umbral(probabilidades: dict, umbral: float) -> str | None:
    """
    Verifica si algún perfil superó el umbral de confianza.
    Retorna el nombre del perfil si lo superó, None si no.
    """
    for perfil, prob in probabilidades.items():
        if prob >= umbral:
            return perfil
    return None