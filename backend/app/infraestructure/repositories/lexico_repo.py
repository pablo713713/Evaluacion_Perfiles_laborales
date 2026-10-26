"""
Repositorio del Lexicón Conductual — Capa de Infraestructura
Responsabilidad única: acceso a datos de la tabla lexico_conductual.
"""
from sqlalchemy.orm import Session
from app.infraestructure.db.models.lexico_conductual import LexicoConductual


def obtener_lexico_activo(db: Session) -> tuple[dict, set]:
    """
    Devuelve el lexicón activo en el formato que consume el módulo NLP:
      - lexico:    {"lema": {"perfil": str, "peso": float, "categoria": str}}
      - ambiguos:  {"lema", ...}  (lemas que solo puntúan si el candidato es el agente)
    """
    filas = db.query(LexicoConductual).filter(LexicoConductual.estado_activo == True).all()
    lexico = {
        f.lema: {"perfil": f.perfil, "peso": f.peso, "categoria": f.categoria}
        for f in filas
    }
    ambiguos = {f.lema for f in filas if f.es_ambiguo}
    return lexico, ambiguos


def listar_todos(db: Session) -> list[LexicoConductual]:
    return db.query(LexicoConductual).order_by(LexicoConductual.perfil, LexicoConductual.lema).all()


def obtener_por_id(db: Session, id_lema: int) -> LexicoConductual | None:
    return db.query(LexicoConductual).filter(LexicoConductual.id_lema == id_lema).first()


def obtener_por_lema(db: Session, lema: str) -> LexicoConductual | None:
    return db.query(LexicoConductual).filter(LexicoConductual.lema == lema).first()


def listar_categorias(db: Session) -> list[str]:
    filas = db.query(LexicoConductual.categoria).distinct().order_by(LexicoConductual.categoria).all()
    return [f[0] for f in filas]


def guardar(db: Session, entrada: LexicoConductual) -> LexicoConductual:
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    return entrada
