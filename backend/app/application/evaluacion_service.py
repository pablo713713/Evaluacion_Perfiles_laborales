
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.infraestructure.security.config import settings
from app.infraestructure.db.models.evaluacion import Evaluacion
from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato
from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP

# Capa de dominio — lógica pura
from app.domain.nlp.procesador import analizar_texto
from app.domain.nlp.motor_cat import (
    construir_grafo, obtener_nodo_raiz,
    seleccionar_siguiente_nodo, calcular_probabilidades, verificar_umbral,
)

# Capa de infraestructura — acceso a datos
from app.infraestructure.repositories.evaluacion_repo import (
    obtener_evaluacion_por_id,
    guardar_evaluacion,
    guardar_respuesta,
    guardar_rastros,
    obtener_respuestas_validas,
    contar_respuestas_validas,
    commit,
)
from app.infraestructure.repositories.nodo_repo import obtener_primer_psicologo_activo


def crear_evaluacion(db: Session, id_candidato: int, id_psicologo: int) -> Evaluacion:
    """Crea una nueva sesión de evaluación y genera el token único."""
    token = str(uuid.uuid4())
    expiracion = datetime.utcnow() + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

    evaluacion = Evaluacion(
        id_usuario_candidato=id_candidato,
        id_usuario_psicologo=id_psicologo,
        estado="pendiente",
        umbral_configurado=settings.DEFAULT_UMBRAL_CONFIANZA,
        token_sesion=token,
        fecha_expiracion_token=expiracion,
    )
    return guardar_evaluacion(db, evaluacion)


def crear_evaluacion_automatica(db: Session, id_candidato: int) -> Evaluacion | None:
    """
    Crea evaluación automáticamente al login del candidato (Opción B).
    Asigna como supervisor al primer psicólogo activo del sistema.
    """
    psicologo = obtener_primer_psicologo_activo(db)
    if not psicologo:
        return None
    return crear_evaluacion(db, id_candidato, psicologo.id_usuario)


def obtener_primera_pregunta(db: Session) -> dict | None:
    """Retorna el nodo raíz del grafo para iniciar la evaluación."""
    grafo = construir_grafo(db)
    nodo_id = obtener_nodo_raiz(grafo)
    if not nodo_id:
        return None
    data = grafo.nodes[nodo_id]
    return {"id_nodo": nodo_id, "texto_pregunta": data["texto"]}


def procesar_respuesta(
    db: Session,
    id_evaluacion: int,
    id_nodo: int,
    texto: str,
    tiempo: int
) -> dict:
    """
    Ciclo principal del sistema:
    1. Valida longitud mínima (RN-01)
    2. Procesa con motor NLP determinista
    3. Persiste respuesta y rastro de auditoría
    4. Recalcula probabilidades acumuladas desde la BD (evitando duplicación)
    5. Verifica umbral de certeza (solo si hay mínimo de evidencia)
    6. Selecciona siguiente nodo o cierra la evaluación
    """
    evaluacion = obtener_evaluacion_por_id(db, id_evaluacion)

    # RN-03: verificar expiración de sesión
    # (desactivado en entorno de pruebas — comentar/descomentar según necesidad)
    # if evaluacion.fecha_expiracion_token and datetime.utcnow() > evaluacion.fecha_expiracion_token:
    #     evaluacion.estado = "invalida"
    #     commit(db)
    #     return {"estado": "sesion_expirada"}

    # Procesar texto con motor NLP
    resultado_nlp = analizar_texto(texto)

    # RN-01: respuesta muy corta
    if not resultado_nlp["es_valida"]:
        return {
            "estado": "respuesta_corta",
            "min_palabras": settings.MIN_PALABRAS_RESPUESTA
        }

    # Persistir respuesta
    respuesta = RespuestaCandicato(
        id_evaluacion=id_evaluacion,
        id_nodo=id_nodo,
        texto_libre=texto,
        tiempo_demorado=tiempo,
        conteo_palabras=resultado_nlp["conteo_palabras"],
        es_valida=resultado_nlp["es_valida"],
    )
    respuesta = guardar_respuesta(db, respuesta)

    # Persistir rastro de auditoría algorítmica
    rastros = [
        RastroAuditoriaNLP(id_respuesta=respuesta.id_respuesta, **r)
        for r in resultado_nlp["rastros"]
    ]
    guardar_rastros(db, rastros)

    # RN-04: detectar evasión sistemática
    if resultado_nlp["es_evasiva"]:
        _verificar_evasion_sistematica(db, evaluacion)

    # Recalcular puntajes acumulados desde la BD (tu ajuste — sin pasar nuevos como parámetro)
    puntajes_acumulados = _calcular_puntajes_acumulados(db, id_evaluacion)
    probabilidades = calcular_probabilidades(puntajes_acumulados)

    # RN-02: verificar umbral solo si hay suficiente evidencia
    cantidad_validas = contar_respuestas_validas(db, id_evaluacion)
    perfil_ganador = None
    if cantidad_validas >= settings.MIN_NODOS_REQUERIDOS:
        perfil_ganador = verificar_umbral(probabilidades, evaluacion.umbral_configurado)

    if perfil_ganador:
        return _cerrar_evaluacion(db, evaluacion, perfil_ganador, probabilidades)

    # Seleccionar siguiente nodo adaptativo
    grafo = construir_grafo(db)
    nodos_visitados = [r.id_nodo for r in evaluacion.respuestas]
    siguiente = seleccionar_siguiente_nodo(
        grafo, id_nodo, puntajes_acumulados, nodos_visitados
    )

    if not siguiente:
        perfil_max = max(probabilidades, key=probabilidades.get)
        return _cerrar_evaluacion(db, evaluacion, perfil_max, probabilidades)

    evaluacion.estado = "en_curso"
    commit(db)

    # Métricas de auditoría para el panel de pruebas del frontend (tu ajuste)
    espectro_lider = max(probabilidades, key=probabilidades.get) if probabilidades else "Indefinido"
    puntaje_lider = probabilidades.get(espectro_lider, 0.0)
    tokens_detectados = [
        rastro.get("palabra_clave") or rastro.get("token") or rastro.get("palabra") or str(rastro)
        for rastro in resultado_nlp.get("rastros", [])
    ]
    metricas_auditoria = {
        "espectro_dominante": espectro_lider,
        "puntaje_acumulado": float(puntaje_lider),
        "umbral_corte": float(evaluacion.umbral_configurado or 1.0),
        "palabras_clave_detectadas": tokens_detectados,
    }

    siguiente_data = grafo.nodes[siguiente]
    return {
        "estado": "continuar",
        "probabilidades": probabilidades,
        "siguiente_nodo": {"id_nodo": siguiente, "texto_pregunta": siguiente_data["texto"]},
        "metricas_auditoria": metricas_auditoria,
    }


# ------------------------------------------------------------------
# Funciones privadas de soporte
# ------------------------------------------------------------------

def _cerrar_evaluacion(
    db: Session,
    evaluacion: Evaluacion,
    perfil: str,
    probabilidades: dict
) -> dict:
    """Marca la evaluación como completada y persiste el resultado."""
    evaluacion.estado = "completada"
    evaluacion.perfil_predominante = perfil
    evaluacion.porcentaje_confianza = probabilidades[perfil]
    evaluacion.fecha_fin = datetime.utcnow()
    commit(db)
    return {
        "estado": "completada",
        "perfil": perfil,
        "confianza": probabilidades[perfil],
        "probabilidades": probabilidades,
    }


def _calcular_puntajes_acumulados(db: Session, id_evaluacion: int) -> dict:
    """
    Suma los puntajes de toda la evaluación desde la BD.
    Lee directamente de la BD incluyendo la respuesta recién guardada,
    evitando duplicación al no mezclar puntajes en memoria con los persistidos.
    """
    acumulado = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
    respuestas = obtener_respuestas_validas(db, id_evaluacion)
    for r in respuestas:
        for rastro in r.rastros:
            acumulado[rastro.perfil_asignado] = round(
                acumulado[rastro.perfil_asignado] + rastro.puntos_sumados, 4
            )
    return acumulado


def _verificar_evasion_sistematica(db: Session, evaluacion: Evaluacion):
    """Marca como inconclusa si más del 60% de respuestas válidas son evasivas."""
    respuestas = obtener_respuestas_validas(db, evaluacion.id_evaluacion)
    sin_rastro = [r for r in respuestas if not r.rastros]
    if len(respuestas) >= 3 and len(sin_rastro) / len(respuestas) > 0.6:
        evaluacion.estado = "inconclusa_evasion"
        evaluacion.fecha_fin = datetime.utcnow()
        commit(db)