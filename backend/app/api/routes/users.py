from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_admin
from app.infraestructure.security.security import hash_password
from app.infraestructure.db.models.usuario import Usuario
 
router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])
 
class UsuarioBody(BaseModel):
    nombre_completo: str
    correo: str
    password: str
    id_rol: int
    estado_cuenta: str = "activo"
 
@router.get("/")
def listar(db: Session = Depends(get_db), _=Depends(require_admin)):
    usuarios = db.query(Usuario).all()
    resultado = []
    for u in usuarios:
        resultado.append({
            "id_usuario": u.id_usuario,
            "nombre_completo": u.nombre_completo,
            "correo": u.correo,
            "estado_cuenta": u.estado_cuenta,
            "rol": {"id_rol": u.rol.id_rol, "nombre_rol": u.rol.nombre_rol} if u.rol else None
        })
    return resultado
 
@router.post("/")
def crear(body: UsuarioBody, db: Session = Depends(get_db), _=Depends(require_admin)):
    existente = db.query(Usuario).filter(Usuario.correo == body.correo).first()
    if existente:
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    usuario = Usuario(
        nombre_completo=body.nombre_completo,
        correo=body.correo,
        password_hash=hash_password(body.password),
        id_rol=body.id_rol,
        estado_cuenta=body.estado_cuenta,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario
 
@router.delete("/{id_usuario}")
def eliminar(id_usuario: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.estado_cuenta = "inactivo"
    db.commit()
    return {"ok": True}

@router.get("/roles")
def listar_roles(db: Session = Depends(get_db), _=Depends(require_admin)):
    from app.infraestructure.db.models.rol import Rol
    return db.query(Rol).all()