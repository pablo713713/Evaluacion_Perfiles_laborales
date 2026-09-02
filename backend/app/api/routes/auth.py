from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.auth_service import autenticar_usuario
 
router = APIRouter(prefix="/api/auth", tags=["Autenticación"])
 
@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    resultado = autenticar_usuario(db, form.username, form.password)
    if not resultado:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    return resultado
 