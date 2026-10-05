from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.infraestructure.db.database import Base
 
class Evaluacion(Base):
    __tablename__ = "evaluacion"
    id_evaluacion          = Column(Integer, primary_key=True, index=True)
    id_usuario_candidato   = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_usuario_psicologo   = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    fecha_inicio           = Column(DateTime, server_default=func.now())
    fecha_fin              = Column(DateTime, nullable=True)
    estado                 = Column(String(30), default="pendiente")
    perfil_predominante    = Column(String(20), nullable=True)
    porcentaje_confianza   = Column(Float, nullable=True)
    umbral_configurado     = Column(Float, default=0.85)
    token_sesion           = Column(String(255), unique=True, nullable=True)
    fecha_expiracion_token = Column(DateTime, nullable=True)
    conclusion_clinica     = Column(Text, nullable=True)
    fecha_diagnostico      = Column(DateTime, nullable=True)
    texto_diagnostico      = Column(Text, nullable=True)
    espectro_confirmado    = Column(String(20), nullable=True)
    candidato   = relationship("Usuario", foreign_keys=[id_usuario_candidato], back_populates="evaluaciones_como_candidato")
    psicologo   = relationship("Usuario", foreign_keys=[id_usuario_psicologo], back_populates="evaluaciones_como_psicologo")
    respuestas  = relationship("RespuestaCandicato", back_populates="evaluacion", cascade="all, delete-orphan")
 