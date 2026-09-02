from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.database import Base
 
class RespuestaCandicato(Base):
    __tablename__ = "respuesta_candidato"
    id_respuesta    = Column(Integer, primary_key=True, index=True)
    id_evaluacion   = Column(Integer, ForeignKey("evaluacion.id_evaluacion", ondelete="CASCADE"), nullable=False)
    id_nodo         = Column(Integer, ForeignKey("nodo_pregunta.id_nodo"), nullable=False)
    texto_libre     = Column(Text, nullable=False)
    fecha_hora      = Column(DateTime, server_default=func.now())
    tiempo_demorado = Column(Integer, nullable=True)
    conteo_palabras = Column(Integer, default=0)
    es_valida       = Column(Boolean, default=True)
    evaluacion      = relationship("Evaluacion", back_populates="respuestas")
    nodo            = relationship("NodoPregunta", back_populates="respuestas")
    rastros         = relationship("RastroAuditoriaNLP", back_populates="respuesta", cascade="all, delete-orphan")
 