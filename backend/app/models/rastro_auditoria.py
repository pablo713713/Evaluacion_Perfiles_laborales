from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
 
class RastroAuditoriaNLP(Base):
    __tablename__ = "rastro_auditoria_nlp"
    id_rastro                = Column(Integer, primary_key=True, index=True)
    id_respuesta             = Column(Integer, ForeignKey("respuesta_candidato.id_respuesta", ondelete="CASCADE"), nullable=False)
    palabra_o_frase_extraida = Column(String(200), nullable=False)
    verbo_lematizado         = Column(String(100), nullable=True)
    dependencia_sintactica   = Column(String(50),  nullable=True)
    pos_tag                  = Column(String(20),  nullable=True)
    perfil_asignado          = Column(String(20),  nullable=False)
    puntos_sumados           = Column(Float, default=0.0)
    tiene_negacion           = Column(Boolean, default=False)
    respuesta                = relationship("RespuestaCandicato", back_populates="rastros")
 