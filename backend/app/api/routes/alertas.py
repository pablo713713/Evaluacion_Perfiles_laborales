"""
Alertas clínicas — Rutas
Permite al psicólogo editar o eliminar una alerta (rastro con origen = 'alerta')
que marcó en el panel analítico. La creación sigue en diagnostico.py
(POST /api/diagnostico/rastros-alerta).

Formato de una alerta en rastro_auditoria_nlp:
  palabra_o_frase_extraida = texto marcado
  verbo_lematizado         = etiqueta de la alerta (ej. "impulsividad")
  dependencia_sintactica   = "alerta:<peso>"
  puntos_sumados           = 0  (no afecta la distribución D/H/S)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_psicologo_o_lider
from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP

router = APIRouter(prefix="/api/diagnostico", tags=["Panel Analítico"])


class EditarAlertaBody(BaseModel):
    etiqueta_alerta: str = Field(min_length=1, max_length=100)
    peso: float = Field(ge=0.1, le=1.0)


def _obtener_alerta(db: Session, id_rastro: int) -> RastroAuditoriaNLP:
    rastro = db.query(RastroAuditoriaNLP).filter(RastroAuditoriaNLP.id_rastro == id_rastro).first()
    if not rastro:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    if rastro.origen != "alerta":
        raise HTTPException(status_code=400, detail="El rastro indicado no es una alerta")
    return rastro


@router.patch("/rastros-alerta/{id_rastro}")
def editar_alerta(id_rastro: int, body: EditarAlertaBody,
                  db: Session = Depends(get_db), _=Depends(require_psicologo_o_lider)):
    rastro = _obtener_alerta(db, id_rastro)
    rastro.verbo_lematizado = body.etiqueta_alerta.strip()
    rastro.dependencia_sintactica = f"alerta:{round(body.peso, 2)}"
    rastro.editado_por_psicologo = True
    db.commit()
    return {"ok": True, "id_rastro": id_rastro, "etiqueta": rastro.verbo_lematizado, "peso": round(body.peso, 2)}


@router.delete("/rastros-alerta/{id_rastro}")
def eliminar_alerta(id_rastro: int, db: Session = Depends(get_db), _=Depends(require_psicologo_o_lider)):
    rastro = _obtener_alerta(db, id_rastro)
    db.delete(rastro)
    db.commit()
    return {"ok": True, "id_rastro": id_rastro}
