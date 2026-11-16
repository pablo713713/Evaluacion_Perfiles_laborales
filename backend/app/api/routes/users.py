"""
Gestión de Usuarios — Rutas
Módulo de Administración con RBAC (OE3)
"""
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.infraestructure.db.database import get_db
from app.infraestructure.security.config import settings
from app.infraestructure.security.dependencies import require_admin
from app.infraestructure.security.security import hash_password
from app.infraestructure.db.models.usuario import Usuario
from app.application.email_service import enviar_credenciales, diagnostico

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class UsuarioBody(BaseModel):
    nombres: str          # Primer nombre (y segundo si aplica)
    apellido_paterno: str
    apellido_materno: str
    correo: EmailStr
    id_rol: int
    estado_cuenta: str = "activo"


# ─── Utilidades ─────────────────────────────────────────────────────────────

def generar_password(nombres: str, apellido_paterno: str) -> str:
    """
    Genera la contraseña automática siguiendo la regla:
    primera_letra_nombre(minúscula) + apellido_paterno(minúscula) + 4 dígitos aleatorios
    Ejemplo: Andres Terrazas → aterrazas3712
    """
    primera_letra = nombres.strip()[0].lower()
    apellido = ''.join(c for c in apellido_paterno.strip().lower() if c.isalpha())
    digitos = ''.join(random.choices(string.digits, k=4))
    return f"{primera_letra}{apellido}{digitos}"


def _respuesta_credenciales(mensaje_base: str, password: str, resultado) -> dict:
    """
    Arma la respuesta informando el resultado real del envío.

    La contraseña en claro solo viaja cuando el correo NO salió, o fuera de
    producción. Si el envío falló, el administrador la necesita para
    entregarla por otro medio; si salió, no hay razón para exponerla.
    """
    cuerpo = {
        "ok": True,
        "mensaje": mensaje_base,
        "email_enviado": resultado.enviado,
        "email_detalle": resultado.detalle,
    }
    if not resultado.enviado or not settings.es_produccion:
        cuerpo["password_temporal"] = password
    return cuerpo


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/roles")
def listar_roles(db: Session = Depends(get_db), _=Depends(require_admin)):
    from app.infraestructure.db.models.rol import Rol
    return db.query(Rol).all()


@router.get("/diagnostico-correo")
def diagnostico_correo(_=Depends(require_admin)):
    """
    Muestra qué configuración de correo tiene cargada el servidor.

    Sirve para verificar, desde el servidor desplegado, si las variables de
    entorno llegaron bien, sin tener que crear un usuario de prueba. Nunca
    devuelve la contraseña, solo si está configurada o no.
    """
    return diagnostico()


@router.get("/")
def listar(db: Session = Depends(get_db), _=Depends(require_admin)):
    usuarios = db.query(Usuario).all()
    return [
        {
            "id_usuario":      u.id_usuario,
            "nombre_completo": u.nombre_completo,
            "correo":          u.correo,
            "estado_cuenta":   u.estado_cuenta,
            "rol": {"id_rol": u.rol.id_rol, "nombre_rol": u.rol.nombre_rol} if u.rol else None
        }
        for u in usuarios
    ]


@router.post("/")
def crear(
    body: UsuarioBody,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    correo = body.correo.strip()

    # Verificar correo duplicado
    existente = db.query(Usuario).filter(Usuario.correo == correo).first()
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado en el sistema.")

    # Construir nombre completo unificado
    nombre_completo = f"{body.nombres.strip()} {body.apellido_paterno.strip()} {body.apellido_materno.strip()}"

    # Generar contraseña automática
    password_generada = generar_password(body.nombres, body.apellido_paterno)

    # Crear usuario
    usuario = Usuario(
        nombre_completo=nombre_completo,
        correo=correo,
        password_hash=hash_password(password_generada),
        id_rol=body.id_rol,
        estado_cuenta=body.estado_cuenta,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    # El envío es sincrónico para poder informar si salió o no. El usuario
    # ya quedó creado: si el correo falla, el alta sigue siendo válida y el
    # administrador entrega la contraseña por otro medio.
    resultado = enviar_credenciales(correo, body.nombres.strip(), password_generada)

    respuesta = _respuesta_credenciales(
        f"Usuario creado. {resultado.detalle}", password_generada, resultado
    )
    respuesta["id_usuario"] = usuario.id_usuario
    respuesta["nombre_completo"] = nombre_completo
    return respuesta


@router.delete("/{id_usuario}")
def eliminar(id_usuario: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.estado_cuenta = "inactivo"
    db.commit()
    return {"ok": True}


@router.post("/{id_usuario}/reenviar-credenciales")
def reenviar_credenciales(
    id_usuario: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Generar nueva contraseña
    partes = usuario.nombre_completo.split()
    nombres = partes[0] if partes else "usuario"
    apellido = partes[1] if len(partes) > 1 else "user"
    nueva_password = generar_password(nombres, apellido)

    # Actualizar hash en BD
    usuario.password_hash = hash_password(nueva_password)
    db.commit()

    resultado = enviar_credenciales(usuario.correo, nombres, nueva_password)
    return _respuesta_credenciales(
        f"Contraseña restablecida. {resultado.detalle}", nueva_password, resultado
    )