"""
Panel Analítico del Psicólogo — Rutas
OE8: Implementación del panel analítico exclusivo para el psicólogo
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.domain.nlp.motor_cat import calcular_probabilidades as _calc_probs

from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_psicologo
from app.infraestructure.db.models.evaluacion import Evaluacion
from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato
from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP
from app.infraestructure.db.models.usuario import Usuario
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta

router = APIRouter(prefix="/api/diagnostico", tags=["Panel Analítico"])
 
 
# ─── Schemas ────────────────────────────────────────────────────────────────
 
class DiagnosticoBody(BaseModel):
    texto_diagnostico: str
    espectro_confirmado: str  # Dominante | Hibrido | Sumiso
 
 
# ─── Endpoints ──────────────────────────────────────────────────────────────
 
@router.get("/evaluaciones")
def listar_evaluaciones_completadas(
    db: Session = Depends(get_db),
    _=Depends(require_psicologo)
):
    """
    Lista todas las evaluaciones completadas con datos del candidato
    y el resultado del sistema.
    """
    evaluaciones = (
        db.query(Evaluacion)
        .filter(Evaluacion.estado == "completada")
        .order_by(Evaluacion.fecha_fin.desc())
        .all()
    )
 
    resultado = []
    for ev in evaluaciones:
        candidato = db.query(Usuario).filter(
            Usuario.id_usuario == ev.id_usuario_candidato
        ).first()
 
        duracion_min = None
        if ev.fecha_inicio and ev.fecha_fin:
            delta = ev.fecha_fin - ev.fecha_inicio
            duracion_min = round(delta.total_seconds() / 60, 1)
 
        resultado.append({
            "id_evaluacion": ev.id_evaluacion,
            "candidato": {
                "id": candidato.id_usuario if candidato else None,
                "nombre": candidato.nombre_completo if candidato else "Desconocido",
                "correo": candidato.correo if candidato else "",
            },
            "fecha_inicio": ev.fecha_inicio.isoformat() if ev.fecha_inicio else None,
            "fecha_fin": ev.fecha_fin.isoformat() if ev.fecha_fin else None,
            "duracion_minutos": duracion_min,
            "perfil_sistema": ev.perfil_predominante,
            "confianza": round(ev.porcentaje_confianza * 100, 1) if ev.porcentaje_confianza else None,
            "espectro_confirmado": ev.espectro_confirmado if hasattr(ev, 'espectro_confirmado') else None,
            "tiene_diagnostico": bool(ev.texto_diagnostico) if hasattr(ev, 'texto_diagnostico') else False,
        })
 
    return resultado
 
 
@router.get("/evaluaciones/{id_evaluacion}/detalle")
def detalle_evaluacion(
    id_evaluacion: int,
    db: Session = Depends(get_db),
    _=Depends(require_psicologo)
):
    """
    Retorna el detalle completo de una evaluación:
    - Datos del candidato y resultado del sistema
    - Historial de preguntas/respuestas con rastro léxico por respuesta
    - Distribución de probabilidad acumulada tras cada respuesta
    """
    ev = db.query(Evaluacion).filter(
        Evaluacion.id_evaluacion == id_evaluacion
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
 
    candidato = db.query(Usuario).filter(
        Usuario.id_usuario == ev.id_usuario_candidato
    ).first()
    psicologo = db.query(Usuario).filter(
        Usuario.id_usuario == ev.id_usuario_psicologo
    ).first()
 
    # Respuestas en orden cronológico
    respuestas = (
        db.query(RespuestaCandicato)
        .filter(RespuestaCandicato.id_evaluacion == id_evaluacion)
        .order_by(RespuestaCandicato.fecha_hora)
        .all()
    )
 
    historial = []
    acum_d = 0.0
    acum_h = 0.0
    acum_s = 0.0
 
    for resp in respuestas:
        nodo = db.query(NodoPregunta).filter(
            NodoPregunta.id_nodo == resp.id_nodo
        ).first()
 
        rastros = (
            db.query(RastroAuditoriaNLP)
            .filter(RastroAuditoriaNLP.id_respuesta == resp.id_respuesta)
            .all()
        )
 
        # Acumular puntajes hasta esta respuesta
        for r in rastros:
            if r.perfil_asignado == "Dominante":
                acum_d = round(acum_d + r.puntos_sumados, 4)
            elif r.perfil_asignado == "Hibrido":
                acum_h = round(acum_h + r.puntos_sumados, 4)
            elif r.perfil_asignado == "Sumiso":
                acum_s = round(acum_s + r.puntos_sumados, 4)
 
        from app.domain.nlp.motor_cat import calcular_probabilidades as _cp
        probs_paso = _cp({"Dominante": acum_d, "Hibrido": acum_h, "Sumiso": acum_s})
        prob_d = round(probs_paso["Dominante"] * 100, 1)
        prob_h = round(probs_paso["Hibrido"]   * 100, 1)
        prob_s = round(probs_paso["Sumiso"]    * 100, 1)
 
        historial.append({
            "id_respuesta": resp.id_respuesta,
            "pregunta": nodo.texto_pregunta if nodo else "Pregunta no encontrada",
            "texto_respuesta": resp.texto_libre,
            "fecha_hora": resp.fecha_hora.isoformat() if resp.fecha_hora else None,
            "es_valida": resp.es_valida,
            "rastro_lexico": [
                {
                    "id_rastro": r.id_rastro,
                    "palabra":   r.palabra_o_frase_extraida,
                    "lema":      r.verbo_lematizado,
                    "perfil":    r.perfil_asignado,
                    "puntos":    round(r.puntos_sumados, 3),
                    "negacion":  r.tiene_negacion if hasattr(r, 'tiene_negacion') else False,
                    "dependencia": r.dependencia_sintactica,
                    "origen":    r.origen if hasattr(r, 'origen') else "automatico",
                    "editado":   r.editado_por_psicologo if hasattr(r, 'editado_por_psicologo') else False,
                }
                for r in rastros
            ],
            "distribucion_tras_respuesta": {
                "Dominante": prob_d,
                "Hibrido": prob_h,
                "Sumiso": prob_s,
            }
        })
 
    # Distribución final
    confianza = ev.porcentaje_confianza or 0.0
    perfil = ev.perfil_predominante
 
    return {
        "id_evaluacion": ev.id_evaluacion,
        "candidato": {
            "nombre": candidato.nombre_completo if candidato else "Desconocido",
            "correo": candidato.correo if candidato else "",
        },
        "psicologo": {
            "nombre": psicologo.nombre_completo if psicologo else "Desconocido",
        },
        "fecha_inicio": ev.fecha_inicio.isoformat() if ev.fecha_inicio else None,
        "fecha_fin": ev.fecha_fin.isoformat() if ev.fecha_fin else None,
        "perfil_sistema": perfil,
        "confianza_sistema": round(confianza * 100, 1),
        "espectro_confirmado": ev.espectro_confirmado if hasattr(ev, 'espectro_confirmado') else None,
        "texto_diagnostico": ev.texto_diagnostico if hasattr(ev, 'texto_diagnostico') else None,
        "historial": historial,
    }
 
 
@router.get("/evaluaciones/{id_evaluacion}/diagnostico")
def obtener_diagnostico(
    id_evaluacion: int,
    db: Session = Depends(get_db),
    _=Depends(require_psicologo)
):
    """Retorna el diagnóstico guardado para una evaluación."""
    ev = db.query(Evaluacion).filter(
        Evaluacion.id_evaluacion == id_evaluacion
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
 
    candidato = db.query(Usuario).filter(
        Usuario.id_usuario == ev.id_usuario_candidato
    ).first()
    psicologo = db.query(Usuario).filter(
        Usuario.id_usuario == ev.id_usuario_psicologo
    ).first()
 
    return {
        "id_evaluacion": ev.id_evaluacion,
        "candidato_nombre": candidato.nombre_completo if candidato else "Desconocido",
        "psicologo_nombre": psicologo.nombre_completo if psicologo else "Desconocido",
        "perfil_sistema": ev.perfil_predominante,
        "espectro_confirmado": ev.espectro_confirmado if hasattr(ev, 'espectro_confirmado') else ev.perfil_predominante,
        "texto_diagnostico": ev.texto_diagnostico if hasattr(ev, 'texto_diagnostico') else "",
        "fecha_diagnostico": ev.fecha_diagnostico.isoformat() if hasattr(ev, 'fecha_diagnostico') and ev.fecha_diagnostico else None,
    }
 
 
@router.post("/evaluaciones/{id_evaluacion}/diagnostico")
def guardar_diagnostico(
    id_evaluacion: int,
    body: DiagnosticoBody,
    db: Session = Depends(get_db),
    psicologo=Depends(require_psicologo)
):
    """Guarda o actualiza el diagnóstico clínico del psicólogo."""
    ev = db.query(Evaluacion).filter(
        Evaluacion.id_evaluacion == id_evaluacion
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
 
    ev.texto_diagnostico = body.texto_diagnostico
    ev.espectro_confirmado = body.espectro_confirmado
    ev.fecha_diagnostico = datetime.utcnow()
    db.commit()
 
    return {"ok": True, "mensaje": "Diagnóstico guardado correctamente"}
 
 
# ─── Utilidad interna: recalcular distribución ──────────────────────────────
 
def _recalcular_distribucion(db, id_evaluacion: int):
    """
    Recalcula perfil_predominante y porcentaje_confianza de una evaluación
    sumando todos los rastros actuales (automáticos y manuales, incluyendo ediciones).
    """
    from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato
    from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP
    from app.domain.nlp.motor_cat import calcular_probabilidades
 
    respuestas = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_evaluacion == id_evaluacion
    ).all()
 
    acum = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
    for resp in respuestas:
        for rastro in resp.rastros:
            if rastro.perfil_asignado in acum:
                acum[rastro.perfil_asignado] += rastro.puntos_sumados
 
    probs = calcular_probabilidades(acum)
    perfil = max(probs, key=probs.get)
    confianza = probs[perfil]
 
    ev = db.query(Evaluacion).filter(
        Evaluacion.id_evaluacion == id_evaluacion
    ).first()
    if ev:
        ev.perfil_predominante  = perfil
        ev.porcentaje_confianza = confianza
        db.commit()
 
    return probs
 
 
# ─── Endpoint 1: Obtener distribución recalculada ────────────────────────────
 
@router.get("/evaluaciones/{id_evaluacion}/distribucion")
def obtener_distribucion(
    id_evaluacion: int,
    db: Session = Depends(get_db),
    _=Depends(require_psicologo)
):
    """Retorna la distribución de probabilidad recalculada desde los rastros actuales."""
    probs = _recalcular_distribucion(db, id_evaluacion)
    return {
        "id_evaluacion": id_evaluacion,
        "distribucion": {
            "Dominante": round(probs["Dominante"] * 100, 1),
            "Hibrido":   round(probs["Hibrido"]   * 100, 1),
            "Sumiso":    round(probs["Sumiso"]     * 100, 1),
        }
    }
 
 
# ─── Endpoint 2: Editar rastro existente ─────────────────────────────────────
 
class EditarRastroBody(BaseModel):
    perfil_asignado: str
    puntos_sumados: float
 
 
@router.patch("/rastros/{id_rastro}")
def editar_rastro(
    id_rastro: int,
    body: EditarRastroBody,
    db: Session = Depends(get_db),
    _=Depends(require_psicologo)
):
    """
    Edita el perfil y peso de un rastro existente.
    Solo modifica ese registro específico — no afecta el lexicón global
    ni otros rastros de otras evaluaciones.
    """
    from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP
    from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato
 
    rastro = db.query(RastroAuditoriaNLP).filter(
        RastroAuditoriaNLP.id_rastro == id_rastro
    ).first()
    if not rastro:
        raise HTTPException(status_code=404, detail="Rastro no encontrado")
 
    if body.perfil_asignado not in ("Dominante", "Hibrido", "Sumiso"):
        raise HTTPException(status_code=400, detail="Perfil inválido")
 
    rastro.perfil_asignado       = body.perfil_asignado
    rastro.puntos_sumados        = body.puntos_sumados
    rastro.editado_por_psicologo = True
    db.commit()
 
    # Obtener id_evaluacion desde la respuesta
    respuesta = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_respuesta == rastro.id_respuesta
    ).first()
    id_evaluacion = respuesta.id_evaluacion if respuesta else None
 
    probs = _recalcular_distribucion(db, id_evaluacion) if id_evaluacion else {}
 
    return {
        "ok": True,
        "id_rastro": id_rastro,
        "distribucion": {
            "Dominante": round(probs.get("Dominante", 0) * 100, 1),
            "Hibrido":   round(probs.get("Hibrido",   0) * 100, 1),
            "Sumiso":    round(probs.get("Sumiso",     0) * 100, 1),
        }
    }
 
 
# ─── Endpoint 3: Crear rastro manual desde selección libre ───────────────────
 
class RastroManualBody(BaseModel):
    id_respuesta: int
    texto_seleccionado: str
    perfil_asignado: str
    puntos_sumados: float
 
 
@router.post("/rastros-manuales")
def crear_rastro_manual(
    body: RastroManualBody,
    db: Session = Depends(get_db),
    _=Depends(require_psicologo)
):
    """
    Crea un rastro manual desde una selección libre de texto del psicólogo.
    Se asocia a una respuesta específica de una evaluación específica.
    No toca el lexicón global ni afecta otras evaluaciones.
    """
    from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP
    from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato
 
    if body.perfil_asignado not in ("Dominante", "Hibrido", "Sumiso"):
        raise HTTPException(status_code=400, detail="Perfil inválido")
 
    respuesta = db.query(RespuestaCandicato).filter(
        RespuestaCandicato.id_respuesta == body.id_respuesta
    ).first()
    if not respuesta:
        raise HTTPException(status_code=404, detail="Respuesta no encontrada")
 
    nuevo_rastro = RastroAuditoriaNLP(
        id_respuesta             = body.id_respuesta,
        palabra_o_frase_extraida = body.texto_seleccionado,
        verbo_lematizado         = body.texto_seleccionado.lower(),
        dependencia_sintactica   = "manual",
        pos_tag                  = "MANUAL",
        perfil_asignado          = body.perfil_asignado,
        puntos_sumados           = body.puntos_sumados,
        tiene_negacion           = False,
        origen                   = "manual",
        editado_por_psicologo    = True,
    )
    db.add(nuevo_rastro)
    db.commit()
    db.refresh(nuevo_rastro)
 
    probs = _recalcular_distribucion(db, respuesta.id_evaluacion)
 
    return {
        "ok": True,
        "id_rastro": nuevo_rastro.id_rastro,
        "distribucion": {
            "Dominante": round(probs["Dominante"] * 100, 1),
            "Hibrido":   round(probs["Hibrido"]   * 100, 1),
            "Sumiso":    round(probs["Sumiso"]     * 100, 1),
        }
    }
 