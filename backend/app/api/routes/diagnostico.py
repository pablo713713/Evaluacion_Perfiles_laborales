from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.dependencies import require_psicologo
from app.services.diagnostico_service import guardar_conclusion, generar_pdf
 
router = APIRouter(prefix="/api/diagnostico", tags=["Diagnóstico"])
 
class ConclusionBody(BaseModel):
    conclusion: str
 
@router.post("/{id_evaluacion}/conclusion")
def guardar(id_evaluacion: int, body: ConclusionBody,
            db: Session = Depends(get_db), _=Depends(require_psicologo)):
    ev = guardar_conclusion(db, id_evaluacion, body.conclusion)
    return {"ok": True, "fecha_diagnostico": ev.fecha_diagnostico}
 
@router.get("/{id_evaluacion}/pdf")
def exportar_pdf(id_evaluacion: int, db: Session = Depends(get_db), _=Depends(require_psicologo)):
    pdf_bytes = generar_pdf(db, id_evaluacion)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=diagnostico_{id_evaluacion}.pdf"})
 