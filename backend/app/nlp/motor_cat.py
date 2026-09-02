"""
Motor CAT (Computerized Adaptive Testing)
Usa NetworkX para construir el grafo de preguntas en memoria
y seleccionar dinámicamente el nodo más informativo siguiente.
"""
import networkx as nx
from sqlalchemy.orm import Session
from app.models.nodo_pregunta import NodoPregunta
from app.models.transicion_grafo import TransicionGrafo
 
 
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
 
    Lógica:
    1. Obtiene los vecinos del nodo actual en el grafo.
    2. Filtra los ya visitados.
    3. De los candidatos, elige el que mayor diferencia aportaría
       para discriminar entre los dos perfiles con mayor probabilidad.
    4. Si no hay vecinos disponibles, retorna None (test terminado).
    """
    if nodo_actual_id not in grafo:
        return None
 
    vecinos = list(grafo.successors(nodo_actual_id))
    candidatos = [n for n in vecinos if n not in nodos_visitados]
 
    if not candidatos:
        return None
 
    perfiles_ordenados = sorted(puntajes_acumulados.items(), key=lambda x: x[1], reverse=True)
    perfil_top = perfiles_ordenados[0][0] if perfiles_ordenados else "Dominante"
 
    def puntaje_informativo(node_id: int) -> float:
        data = grafo.nodes[node_id]
        pesos = {
            "Dominante": data.get("peso_dominante", 0.33),
            "Hibrido":   data.get("peso_hibrido",   0.34),
            "Sumiso":    data.get("peso_sumiso",     0.33),
        }
        perfil_incierto = perfiles_ordenados[-1][0] if len(perfiles_ordenados) > 1 else "Hibrido"
        return pesos.get(perfil_incierto, 0.0)
 
    mejor_nodo = max(candidatos, key=puntaje_informativo)
    return mejor_nodo
 
 
def calcular_probabilidades(puntajes: dict) -> dict:
    """
    Normaliza los puntajes acumulados a probabilidades (suman 1.0).
    Retorna: {"Dominante": 0.x, "Hibrido": 0.x, "Sumiso": 0.x}
    """
    total = sum(puntajes.values())
    if total == 0:
        return {"Dominante": 0.33, "Hibrido": 0.34, "Sumiso": 0.33}
    return {perfil: round(pts / total, 4) for perfil, pts in puntajes.items()}
 
 
def verificar_umbral(probabilidades: dict, umbral: float) -> str | None:
    """
    Verifica si algún perfil superó el umbral de confianza.
    Retorna el nombre del perfil si lo superó, None si no.
    """
    for perfil, prob in probabilidades.items():
        if prob >= umbral:
            return perfil
    return None