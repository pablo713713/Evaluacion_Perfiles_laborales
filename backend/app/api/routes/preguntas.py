from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_psicologo
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta

router = APIRouter(prefix="/api/preguntas", tags=["Banco de Preguntas"])

class NodoBody(BaseModel):
    texto_pregunta: str
    es_raiz: bool = False
    peso_dominante: float = 0.33
    peso_hibrido: float = 0.34
    peso_sumiso: float = 0.33

@router.get("/")
def listar(db: Session = Depends(get_db), _=Depends(require_psicologo)):
    return db.query(NodoPregunta).filter(NodoPregunta.estado_activo == True).all()

@router.post("/")
def crear(body: NodoBody, db: Session = Depends(get_db), _=Depends(require_psicologo)):
    nodo = NodoPregunta(**body.dict())
    db.add(nodo)
    db.commit()
    db.refresh(nodo)
    return nodo

@router.put("/{id_nodo}")
def editar(id_nodo: int, body: NodoBody, db: Session = Depends(get_db), _=Depends(require_psicologo)):
    nodo = db.query(NodoPregunta).filter(NodoPregunta.id_nodo == id_nodo).first()
    if not nodo:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    for k, v in body.dict().items():
        setattr(nodo, k, v)
    db.commit()
    db.refresh(nodo)
    return nodo

@router.delete("/{id_nodo}")
def eliminar(id_nodo: int, db: Session = Depends(get_db), _=Depends(require_psicologo)):
    nodo = db.query(NodoPregunta).filter(NodoPregunta.id_nodo == id_nodo).first()
    if not nodo:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    nodo.estado_activo = False
    db.commit()
    return {"ok": True}