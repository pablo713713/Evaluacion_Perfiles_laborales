from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.infraestructure.db.database import Base

class Usuario(Base):
    __tablename__ = "usuario"
    id_usuario      = Column(Integer, primary_key=True, index=True)
    id_rol          = Column(Integer, ForeignKey("rol.id_rol"), nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    correo          = Column(String(150), unique=True, nullable=False)
    password_hash   = Column(String(255), nullable=False)
    fecha_registro  = Column(DateTime, server_default=func.now())
    estado_cuenta   = Column(String(20), default="activo")
    rol             = relationship("Rol", back_populates="usuarios")
    evaluaciones_como_candidato  = relationship("Evaluacion", foreign_keys="Evaluacion.id_usuario_candidato", back_populates="candidato")
    evaluaciones_como_psicologo  = relationship("Evaluacion", foreign_keys="Evaluacion.id_usuario_psicologo", back_populates="psicologo")
 