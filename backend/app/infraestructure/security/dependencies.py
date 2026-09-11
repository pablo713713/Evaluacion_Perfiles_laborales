from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.infraestructure.db.database import get_db
from app.infraestructure.security.security import decode_token
from app.infraestructure.db.models.usuario import Usuario
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
 
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")
    user = db.query(Usuario).filter(Usuario.id_usuario == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user
 
def require_rol(rol_nombre: str):
    def checker(current_user: Usuario = Depends(get_current_user)):
        if current_user.rol.nombre_rol != rol_nombre:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
        return current_user
    return checker
 
require_admin    = require_rol("Administrador")
require_psicologo = require_rol("Psicologo")
require_candidato = require_rol("Candidato")
 