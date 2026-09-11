from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.infraestructure.db.database import Base
 
class TransicionGrafo(Base):
    __tablename__ = "transicion_grafo"
    id_transicion         = Column(Integer, primary_key=True, index=True)
    id_nodo_origen        = Column(Integer, ForeignKey("nodo_pregunta.id_nodo"), nullable=False)
    id_nodo_destino       = Column(Integer, ForeignKey("nodo_pregunta.id_nodo"), nullable=False)
    perfil_condicion      = Column(String(20), nullable=False)
    peso_minimo_requerido = Column(Float, nullable=False)
    nodo_origen           = relationship("NodoPregunta", foreign_keys=[id_nodo_origen],  back_populates="transiciones_origen")
    nodo_destino          = relationship("NodoPregunta", foreign_keys=[id_nodo_destino], back_populates="transiciones_destino")
 