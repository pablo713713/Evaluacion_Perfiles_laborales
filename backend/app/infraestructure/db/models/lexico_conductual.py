"""
Modelo ORM del lexicón conductual.
Cada fila es un lema que el módulo NLP reconoce y el perfil al que suma puntos.
Lo administra el Psicólogo Líder desde el panel.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func
from app.infraestructure.db.database import Base


class LexicoConductual(Base):
    __tablename__ = "lexico_conductual"

    id_lema                 = Column(Integer, primary_key=True, index=True)
    lema                    = Column(String(60), nullable=False, unique=True)
    perfil                  = Column(String(20), nullable=False)      # Dominante | Hibrido | Sumiso
    peso                    = Column(Float, nullable=False)           # 0.1 – 1.0
    categoria               = Column(String(40), nullable=False)
    es_ambiguo              = Column(Boolean, nullable=False, default=False)
    estado_activo           = Column(Boolean, nullable=False, default=True)
    fecha_modificacion      = Column(DateTime, nullable=False, server_default=func.now())
    id_usuario_modificacion = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=True)
