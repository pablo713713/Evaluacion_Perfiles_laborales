"""
Gestión de Usuarios — Rutas
Módulo de Administración con RBAC (OE3)
"""
import random
import string
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv
load_dotenv(override=True)
from app.infraestructure.db.database import get_db
from app.infraestructure.security.dependencies import require_admin
from app.infraestructure.security.security import hash_password
from app.infraestructure.db.models.usuario import Usuario

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class UsuarioBody(BaseModel):
    nombres: str          # Primer nombre (y segundo si aplica)
    apellido_paterno: str
    apellido_materno: str
    correo: str
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


def enviar_credenciales_email(
    correo: str,
    nombre: str,
    password: str,
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    remitente: str
):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    if not smtp_user or not smtp_password:
        print(f"[EMAIL SIMULADO] Para: {correo} | Contraseña: {password}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Tus credenciales de acceso — Sistema de Evaluación"
        msg["From"]    = remitente
        msg["To"]      = correo

        cuerpo_html = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: auto;">
          <h2 style="color: #1a1a1a;">Bienvenido/a al Sistema de Evaluación de Perfiles Laborales</h2>
          <p>Hola <strong>{nombre}</strong>,</p>
          <p>Tu cuenta ha sido creada. Tus credenciales de acceso son:</p>
          <div style="background: #f4f4f4; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Correo:</strong> {correo}</p>
            <p style="margin: 4px 0;"><strong>Contraseña temporal:</strong>
              <span style="font-family: monospace; font-size: 16px; color: #2563eb;">{password}</span>
            </p>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Este mensaje fue generado automáticamente por el sistema.
          </p>
        </body></html>
        """
        msg.attach(MIMEText(cuerpo_html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(remitente, correo, msg.as_string())

        print(f"[EMAIL ENVIADO] Credenciales enviadas a {correo}")

    except Exception as e:
        print(f"[EMAIL ERROR] No se pudo enviar a {correo}: {e}")

# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/roles")
def listar_roles(db: Session = Depends(get_db), _=Depends(require_admin)):
    from app.infraestructure.db.models.rol import Rol
    return db.query(Rol).all()


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    # Verificar correo duplicado
    existente = db.query(Usuario).filter(Usuario.correo == body.correo.strip()).first()
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado en el sistema.")

    # Construir nombre completo unificado
    nombre_completo = f"{body.nombres.strip()} {body.apellido_paterno.strip()} {body.apellido_materno.strip()}"

    # Generar contraseña automática
    password_generada = generar_password(body.nombres, body.apellido_paterno)

    # Crear usuario
    usuario = Usuario(
        nombre_completo=nombre_completo,
        correo=body.correo.strip(),
        password_hash=hash_password(password_generada),
        id_rol=body.id_rol,
        estado_cuenta=body.estado_cuenta,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    # Enviar credenciales por correo en segundo plano
        # Leer variables SMTP en el hilo principal donde sí están disponibles
    smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_user     = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    remitente     = os.getenv("SMTP_FROM", smtp_user)

    background_tasks.add_task(
        enviar_credenciales_email,
        correo=body.correo.strip(),
        nombre=body.nombres.strip(),
        password=password_generada,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        remitente=remitente,
    )

    return {
        "ok": True,
        "id_usuario": usuario.id_usuario,
        "nombre_completo": nombre_completo,
        "mensaje": f"Usuario creado. Credenciales enviadas a {body.correo.strip()}.",
        # Solo para desarrollo — remover en producción
        "_dev_password": password_generada,
    }


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Generar nueva contraseña
    nombres = usuario.nombre_completo.split()[0]
    apellido = usuario.nombre_completo.split()[1] if len(usuario.nombre_completo.split()) > 1 else "user"
    nueva_password = generar_password(nombres, apellido)

    # Actualizar hash en BD
    usuario.password_hash = hash_password(nueva_password)
    db.commit()

       # Leer variables SMTP en el hilo principal donde sí están disponibles
    smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_user     = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    remitente     = os.getenv("SMTP_FROM", smtp_user)

    background_tasks.add_task(
        enviar_credenciales_email,
        correo=usuario.correo,
        nombre=nombres,
        password=nueva_password,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_user=smtp_user,
        smtp_password=smtp_password,
        remitente=remitente,
    )

    return {
        "ok": True,
        "mensaje": f"Nueva contraseña enviada a {usuario.correo}.",
        "_dev_password": nueva_password,
    }