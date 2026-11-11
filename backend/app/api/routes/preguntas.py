from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_psicologo, require_lider, require_psicologo_o_lider
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta
from app.infraestructure.db.models.transicion_grafo import TransicionGrafo
from app.application.grafo_service import sincronizar_grafo


router = APIRouter(prefix="/api/preguntas", tags=["Banco de Preguntas"])


class NodoBody(BaseModel):
    texto_pregunta: str
    es_raiz: bool = False
    es_cierre: bool = False
    peso_dominante: float = Field(0.33, ge=0.0, le=1.0)
    peso_hibrido: float = Field(0.34, ge=0.0, le=1.0)
    peso_sumiso: float = Field(0.33, ge=0.0, le=1.0)


def _validar_pesos(body: NodoBody) -> None:
    """Los pesos son una distribución: deben sumar 1."""
    total = body.peso_dominante + body.peso_hibrido + body.peso_sumiso
    if abs(total - 1.0) > 0.01:
        raise HTTPException(
            status_code=422,
            detail=f"Los tres pesos deben sumar 1.0 (suman {round(total, 4)})",
        )


def _validar_unicidad(db: Session, body: NodoBody, id_actual: int | None = None) -> None:
    """
    El motor asume una sola raíz y una sola pregunta de cierre:
    obtener_nodo_raiz devuelve la primera que encuentra al iterar el grafo y
    procesar_respuesta inyecta la primera con es_cierre, ambos sin orden
    garantizado. Dos de cualquiera de las dos hace el recorrido impredecible.
    """
    for campo, etiqueta in (("es_raiz", "raíz"), ("es_cierre", "de cierre")):
        if not getattr(body, campo):
            continue
        query = db.query(NodoPregunta).filter(
            getattr(NodoPregunta, campo) == True,  # noqa: E712
            NodoPregunta.estado_activo == True,    # noqa: E712
        )
        if id_actual is not None:
            query = query.filter(NodoPregunta.id_nodo != id_actual)
        existente = query.first()
        if existente:
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe una pregunta {etiqueta} activa (nodo {existente.id_nodo})",
            )


@router.get("/")
def listar(db: Session = Depends(get_db), _=Depends(require_psicologo_o_lider)):
    return db.query(NodoPregunta).filter(NodoPregunta.estado_activo == True).all()


@router.post("/")
def crear(body: NodoBody, db: Session = Depends(get_db), _=Depends(require_lider)):
    """
    Crea la pregunta y la conecta al grafo en la misma transacción.

    Antes este endpoint solo insertaba el nodo, que quedaba activo pero sin
    ninguna transición: aparecía en el listado como si estuviera en uso y
    ningún candidato podía recibirla nunca, porque el motor solo devuelve
    nodos que sean sucesores del nodo actual.
    """
    _validar_pesos(body)
    _validar_unicidad(db, body)

    nodo = NodoPregunta(**body.dict())
    db.add(nodo)
    db.flush()                 # asigna id_nodo sin cerrar la transacción
    sincronizar_grafo(db)      # la conecta con todo el banco segun la regla
    db.commit()
    db.refresh(nodo)
    return nodo


@router.put("/{id_nodo}")
def editar(id_nodo: int, body: NodoBody, db: Session = Depends(get_db), _=Depends(require_lider)):
    """
    Edita la pregunta y rearma el grafo.

    La sincronización es necesaria porque cambiar los pesos puede cambiar el
    perfil de mayor peso del nodo, y con él la condición de todas las aristas
    que entran a él. Es diferencial, así que si no cambió nada no escribe.
    """
    _validar_pesos(body)
    _validar_unicidad(db, body, id_actual=id_nodo)

    nodo = db.query(NodoPregunta).filter(NodoPregunta.id_nodo == id_nodo).first()
    if not nodo:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    for k, v in body.dict().items():
        setattr(nodo, k, v)
    db.flush()
    sincronizar_grafo(db)
    db.commit()
    db.refresh(nodo)
    return nodo


@router.delete("/{id_nodo}")
def eliminar(id_nodo: int, db: Session = Depends(get_db), _=Depends(require_lider)):
    """
    Baja lógica de la pregunta y limpieza de sus aristas.

    construir_grafo ya ignora las transiciones de nodos inactivos, pero sin
    borrarlas quedarían filas muertas que reaparecerían si la pregunta se
    reactivara con otros pesos. La sincronización posterior las quita igual.
    """
    nodo = db.query(NodoPregunta).filter(NodoPregunta.id_nodo == id_nodo).first()
    if not nodo:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")

    nodo.estado_activo = False  # soft delete
    db.query(TransicionGrafo).filter(
        (TransicionGrafo.id_nodo_origen == id_nodo)
        | (TransicionGrafo.id_nodo_destino == id_nodo)
    ).delete(synchronize_session=False)
    db.flush()
    sincronizar_grafo(db)
    db.commit()
    return {"ok": True}


@router.post("/sincronizar-grafo")
def sincronizar(db: Session = Depends(get_db), _=Depends(require_lider)):
    """
    Deja el grafo igual a lo que dicta la regla de conexión.

    Es idempotente y diferencial: sobre un grafo ya correcto devuelve todos
    los contadores en 0 sin tocar una fila. Sirve para verificar el estado
    del grafo y para arreglarlo si alguien insertó preguntas con SQL directo,
    salteándose la API.
    """
    resumen = sincronizar_grafo(db)
    db.commit()
    return resumen