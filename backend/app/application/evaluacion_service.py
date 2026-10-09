"""
Servicio de Evaluación — Capa de Aplicación
Responsabilidad: orquestar el ciclo de evaluación.
NO conoce SQLAlchemy directamente — delega al repositorio.
NO conoce FastAPI — opera con Python puro.
"""
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
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta

# Umbral para activar la pregunta de cierre reflexiva (punto 1)
UMBRAL_PREGUNTA_CIERRE = 0.70
# Porcentaje mínimo del espectro líder para cerrar la evaluación (punto 5)
PORCENTAJE_MINIMO_ESPECTRO = 0.60
 
 
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
    4. Recalcula probabilidades acumuladas desde la BD
    5. Verifica umbral de certeza (solo si hay mínimo de evidencia)
    6. Selecciona siguiente nodo o cierra la evaluación
    """
    evaluacion = db.query(Evaluacion).filter(
        Evaluacion.id_evaluacion == id_evaluacion
    ).first()
 
    # RN-03: verificar expiración de sesión
    if evaluacion.fecha_expiracion_token and datetime.utcnow() > evaluacion.fecha_expiracion_token:
        evaluacion.estado = "invalida"
        db.commit()
        return {"estado": "sesion_expirada"}
 
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
    db.add(respuesta)
    db.flush()
 
    # Persistir rastro de auditoría algorítmica
    for rastro in resultado_nlp["rastros"]:
        registro = RastroAuditoriaNLP(
            id_respuesta=respuesta.id_respuesta,
            **rastro,
        )
        db.add(registro)
 
    # RN-04: detectar evasión sistemática
    if resultado_nlp["es_evasiva"]:
        _verificar_evasion_sistematica(db, evaluacion)
 
    # Recalcular puntajes acumulados desde la BD (incluyendo la respuesta recién guardada)
    puntajes_acumulados = _calcular_puntajes_acumulados(db, id_evaluacion)
    probabilidades = calcular_probabilidades(puntajes_acumulados)
 
    # RN-02: verificar umbral solo si hay suficiente evidencia
    cantidad_validas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).count()
 
    perfil_ganador = None
 
    if cantidad_validas >= settings.MIN_NODOS_REQUERIDOS:
        perfil_candidato = verificar_umbral(probabilidades, evaluacion.umbral_configurado)
 
        # Punto 5 — doble condicional: certeza suficiente Y espectro líder ≥ 60%
        if perfil_candidato:
            porcentaje_lider = probabilidades.get(perfil_candidato, 0.0)
            if porcentaje_lider >= PORCENTAJE_MINIMO_ESPECTRO:
                perfil_ganador = perfil_candidato
            # Si la certeza llegó pero el espectro líder < 60%, continuamos
            # recabando evidencia — no cerramos todavía
 
    if perfil_ganador:
        return _cerrar_evaluacion(db, evaluacion, perfil_ganador, probabilidades)
 
    # Seleccionar siguiente nodo adaptativo
    grafo = construir_grafo(db)
    nodos_visitados = [r.id_nodo for r in evaluacion.respuestas]
 
    # Punto 1 — inyectar pregunta cierre cuando certeza supera 0.70
    # Se inyecta UNA sola vez, como penúltima pregunta antes del cierre definitivo
    certeza_actual = max(probabilidades.values()) if probabilidades else 0.0
    if certeza_actual >= UMBRAL_PREGUNTA_CIERRE:
        nodo_cierre = db.query(NodoPregunta).filter(
            NodoPregunta.es_cierre == True,
            NodoPregunta.estado_activo == True,
        ).first()
        if nodo_cierre and nodo_cierre.id_nodo not in nodos_visitados:
            evaluacion.estado = "en_curso"
            db.commit()
            return {
                "estado": "continuar",
                "probabilidades": probabilidades,
                "siguiente_nodo": {
                    "id_nodo": nodo_cierre.id_nodo,
                    "texto_pregunta": nodo_cierre.texto_pregunta,
                },
                "metricas_auditoria": _build_metricas(evaluacion, probabilidades, resultado_nlp),
            }
 
    siguiente = seleccionar_siguiente_nodo(
        grafo, id_nodo, puntajes_acumulados, nodos_visitados
    )
 
    if not siguiente:
        perfil_max = max(probabilidades, key=probabilidades.get)
        return _cerrar_evaluacion(db, evaluacion, perfil_max, probabilidades)
 
    evaluacion.estado = "en_curso"
    db.commit()
 
    siguiente_data = grafo.nodes[siguiente]
    return {
        "estado": "continuar",
        "probabilidades": probabilidades,
        "siguiente_nodo": {"id_nodo": siguiente, "texto_pregunta": siguiente_data["texto"]},
        "metricas_auditoria": _build_metricas(evaluacion, probabilidades, resultado_nlp),
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
    """
    Marca la evaluación como completada y persiste el resultado.
 
    Punto 7 — Redefinición del Híbrido:
    Si tanto Dominante como Sumiso superan el 30%, el perfil final es Híbrido,
    independientemente de cuál haya disparado el umbral.
    En ese caso se incluye 'distribucion_hibrida' con la proporción D/S relativa
    (sin contar Híbrido) para el gráfico secundario del frontend.
    """
    d = probabilidades.get("Dominante", 0.0)
    s = probabilidades.get("Sumiso", 0.0)
 
    # Condición híbrida: ambos espectros polares superan el 30%
    es_hibrido = d >= 0.30 and s >= 0.30
    perfil_final = "Hibrido" if es_hibrido else perfil
 
    evaluacion.estado = "completada"
    evaluacion.perfil_predominante = perfil_final
    evaluacion.porcentaje_confianza = probabilidades.get(perfil_final, max(d, s))
    evaluacion.fecha_fin = datetime.utcnow()
    db.commit()
 
    respuesta = {
        "estado": "completada",
        "perfil": perfil_final,
        "confianza": probabilidades.get(perfil_final, max(d, s)),
        "probabilidades": probabilidades,
    }
 
    # Agregar distribución secundaria D vs S para el gráfico del reporte híbrido
    if es_hibrido:
        total_polar = d + s
        respuesta["distribucion_hibrida"] = {
            "Dominante": round(d / total_polar, 4) if total_polar > 0 else 0.5,
            "Sumiso":    round(s / total_polar, 4) if total_polar > 0 else 0.5,
        }
 
    return respuesta
 
 
def _calcular_puntajes_acumulados(db: Session, id_evaluacion: int) -> dict:
    """
    Suma los puntajes de toda la evaluación desde la BD.
    Lee directamente de la BD incluyendo la respuesta recién guardada,
    evitando duplicación al no mezclar puntajes en memoria con los persistidos.
    """
    acumulado = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
    respuestas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).all()
    for r in respuestas:
        for rastro in r.rastros:
            acumulado[rastro.perfil_asignado] = round(
                acumulado[rastro.perfil_asignado] + rastro.puntos_sumados, 4
            )
    return acumulado
 
 
def _build_metricas(evaluacion, probabilidades: dict, resultado_nlp: dict) -> dict:
    """Construye el bloque de métricas de auditoría para el frontend."""
    espectro_lider = max(probabilidades, key=probabilidades.get) if probabilidades else "Indefinido"
    puntaje_lider = probabilidades.get(espectro_lider, 0.0)
    tokens_detectados = [
        rastro.get("palabra_clave") or rastro.get("token") or rastro.get("palabra") or str(rastro)
        for rastro in resultado_nlp.get("rastros", [])
    ]
    return {
        "espectro_dominante": espectro_lider,
        "puntaje_acumulado": float(puntaje_lider),
        "umbral_corte": float(evaluacion.umbral_configurado or 1.0),
        "palabras_clave_detectadas": tokens_detectados,
    }
 
 
def _verificar_evasion_sistematica(db: Session, evaluacion: Evaluacion):
    """Marca como inconclusa si más del 60% de respuestas válidas son evasivas."""
    respuestas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == evaluacion.id_evaluacion,
        RespuestaCandicato.es_valida == True,
    ).all()
    sin_rastro = [r for r in respuestas if not r.rastros]
    if len(respuestas) >= 3 and len(sin_rastro) / len(respuestas) > 0.6:
        evaluacion.estado = "inconclusa_evasion"
        evaluacion.fecha_fin = datetime.utcnow()
        db.commit()
 