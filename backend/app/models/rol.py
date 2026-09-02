from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base
 
class Rol(Base):
    __tablename__ = "rol"
    id_rol      = Column(Integer, primary_key=True, index=True)
    nombre_rol  = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(255))
    usuarios    = relationship("Usuario", back_populates="rol")
 