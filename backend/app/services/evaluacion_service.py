"""
Servicio de evaluación — orquesta el ciclo NLP + CAT por cada respuesta.
"""
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.evaluacion import Evaluacion
from app.models.respuesta_candidato import RespuestaCandicato
from app.models.rastro_auditoria import RastroAuditoriaNLP
from app.nlp.procesador import analizar_texto
from app.nlp.motor_cat import (
    construir_grafo, obtener_nodo_raiz,
    seleccionar_siguiente_nodo, calcular_probabilidades, verificar_umbral,
)


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
    db.add(evaluacion)
    db.commit()
    db.refresh(evaluacion)
    return evaluacion


def obtener_primera_pregunta(db: Session) -> dict | None:
    """Retorna el nodo raíz del grafo para iniciar la evaluación."""
    grafo = construir_grafo(db)
    nodo_id = obtener_nodo_raiz(grafo)
    if not nodo_id:
        return None
    data = grafo.nodes[nodo_id]
    return {"id_nodo": nodo_id, "texto_pregunta": data["texto"]}


def procesar_respuesta(db: Session, id_evaluacion: int, id_nodo: int, texto: str, tiempo: int) -> dict:
    """
    Ciclo principal del sistema:
    1. Valida longitud (RN-01)
    2. Procesa con NLP
    3. Guarda respuesta y rastro de auditoría
    4. Recalcula probabilidades acumuladas desde la BD (evitando duplicación)
    5. Verifica umbral o selecciona siguiente nodo
    """
    evaluacion = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()

    if evaluacion.fecha_expiracion_token and datetime.utcnow() > evaluacion.fecha_expiracion_token:
        evaluacion.estado = "invalida"
        db.commit()
        return {"estado": "sesion_expirada"}

    resultado_nlp = analizar_texto(texto)

    if not resultado_nlp["es_valida"]:
        return {"estado": "respuesta_corta", "min_palabras": settings.MIN_PALABRAS_RESPUESTA}

    respuesta = RespuestaCandicato(
        id_evaluacion=id_evaluacion,
        id_nodo=id_nodo,
        texto_libre=texto,
        tiempo_demorado=tiempo,
        conteo_palabras=resultado_nlp["conteo_palabras"],
        es_valida=resultado_nlp["es_valida"],
    )
    db.add(respuesta)
    db.flush()  

    # Guardar rastro de auditoría NLP
    for rastro in resultado_nlp["rastros"]:
        registro = RastroAuditoriaNLP(
            id_respuesta=respuesta.id_respuesta,
            **rastro,
        )
        db.add(registro)

    # Detectar evasión (RN-04)
    if resultado_nlp["es_evasiva"]:
        _incrementar_contador_evasion(db, evaluacion)

    # Recalcular puntajes acumulados considerando la respuesta recién agregada a la sesión
    puntajes_acumulados = _calcular_puntajes_acumulados(db, id_evaluacion)
    probabilidades = calcular_probabilidades(puntajes_acumulados)

    cantidad_respuestas_validas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).count()

    # Verificar si se alcanzó el umbral tras cumplir el mínimo de nodos (RN-02)
    perfil_ganador = None
    if cantidad_respuestas_validas >= settings.MIN_NODOS_REQUERIDOS:
        perfil_ganador = verificar_umbral(probabilidades, evaluacion.umbral_configurado)

    if perfil_ganador:
        evaluacion.estado = "completada"
        evaluacion.perfil_predominante = perfil_ganador
        evaluacion.porcentaje_confianza = probabilidades[perfil_ganador]
        evaluacion.fecha_fin = datetime.utcnow()
        db.commit()
        return {
            "estado": "completada",
            "perfil": perfil_ganador,
            "confianza": probabilidades[perfil_ganador],
            "probabilidades": probabilidades,
        }

    # Seleccionar siguiente nodo adaptativo
    grafo = construir_grafo(db)
    nodos_visitados = [r.id_nodo for r in evaluacion.respuestas]
    siguiente = seleccionar_siguiente_nodo(grafo, id_nodo, puntajes_acumulados, nodos_visitados)

    if not siguiente:
        perfil_max = max(probabilidades, key=probabilidades.get)
        evaluacion.estado = "completada"
        evaluacion.perfil_predominante = perfil_max
        evaluacion.porcentaje_confianza = probabilidades[perfil_max]
        evaluacion.fecha_fin = datetime.utcnow()
        db.commit()
        return {
            "estado": "completada",
            "perfil": perfil_max,
            "confianza": probabilidades[perfil_max],
            "probabilidades": probabilidades,
        }

    evaluacion.estado = "en_curso"
    db.commit()

    # =========================================================
    # EXTRACTO DE MÉTRICAS PARA EL PANEL DE PRUEBAS EN FRONTEND
    # =========================================================
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


def _calcular_puntajes_acumulados(db: Session, id_evaluacion: int) -> dict:
    """Suma los puntajes de toda la evaluación (incluyendo la respuesta actual) desde la BD."""
    acumulado = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
    respuestas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion,
        RespuestaCandicato.es_valida == True
    ).all()
    
    for r in respuestas:
        for rastro in r.rastros:
            acumulado[rastro.perfil_asignado] = round(
                acumulado[rastro.perfil_asignado] + rastro.puntos_sumados, 4
            )
    return acumulado

def _incrementar_contador_evasion(db: Session, evaluacion: Evaluacion):
    """Marca evaluación como inconclusa si hay evasión sistemática (RN-04)."""
    respuestas_evasivas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == evaluacion.id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).all()
    sin_rastro = [r for r in respuestas_evasivas if not r.rastros]
    if len(respuestas_evasivas) >= 3 and len(sin_rastro) / len(respuestas_evasivas) > 0.6:
        evaluacion.estado = "inconclusa_evasion"
        evaluacion.fecha_fin = datetime.utcnow()
        db.commit()
