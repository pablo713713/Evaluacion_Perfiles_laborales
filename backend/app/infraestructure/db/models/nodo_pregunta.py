from sqlalchemy import Column, Integer, String, Boolean, Float
from sqlalchemy.orm import relationship
from app.infraestructure.db.database import Base

class NodoPregunta(Base):
    __tablename__ = "nodo_pregunta"
    id_nodo         = Column(Integer, primary_key=True, index=True)
    texto_pregunta  = Column(String(500), nullable=False)
    es_raiz         = Column(Boolean, default=False)
    es_cierre       = Column(Boolean, default=False)
    estado_activo   = Column(Boolean, default=True)
    peso_dominante  = Column(Float, default=0.33)
    peso_hibrido    = Column(Float, default=0.34)
    peso_sumiso     = Column(Float, default=0.33)
    transiciones_origen  = relationship("TransicionGrafo", foreign_keys="TransicionGrafo.id_nodo_origen",  back_populates="nodo_origen")
    transiciones_destino = relationship("TransicionGrafo", foreign_keys="TransicionGrafo.id_nodo_destino", back_populates="nodo_destino")
    respuestas      = relationship("RespuestaCandicato", back_populates="nodo")