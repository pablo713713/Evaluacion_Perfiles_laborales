from sqlalchemy.orm import Session
from app.infraestructure.db.models.usuario import Usuario
from app.infraestructure.security.security import verify_password, create_access_token
 
def autenticar_usuario(db: Session, correo: str, password: str) -> dict | None:
    user = db.query(Usuario).filter(Usuario.correo == correo).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    token = create_access_token({"sub": str(user.id_usuario), "rol": user.rol.nombre_rol})
    return {"access_token": token, "token_type": "bearer", "rol": user.rol.nombre_rol}
 