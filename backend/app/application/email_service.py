"""
Servicio de Correo — Capa de Aplicación
Responsabilidad: enviar las credenciales de acceso y decir con claridad si
el envío salió o no.

Diferencias con la versión anterior, y por qué:

1. El envío es SINCRÓNICO y devuelve su resultado. Antes corría en
   BackgroundTasks, o sea después de que la respuesta HTTP ya había salido:
   el endpoint contestaba "Credenciales enviadas" aunque el envío fallara,
   y el administrador no tenía forma de saber que debía pasar la contraseña
   por otro medio.

2. La configuración viene de Settings (variables de entorno del servidor),
   no de un load_dotenv() suelto dentro de la ruta.

3. Hay timeout explícito. Sin timeout, un puerto bloqueado por la red deja
   la conexión colgada hasta que el sistema operativo la corta.

4. Se puede enviar SIN autenticar, dejando SMTP_USER vacío: los relays
   institucionales suelen autorizar por IP de origen en lugar de usuario y
   contraseña.

5. Cada error de SMTP se traduce a un mensaje que dice qué revisar, en vez
   de descartarse con un print.
"""
import smtplib
import socket
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import NamedTuple

from app.infraestructure.security.config import settings


class ResultadoEnvio(NamedTuple):
    enviado: bool
    detalle: str


ASUNTO = "Tus credenciales de acceso — Sistema de Evaluación de Perfiles Laborales"


def _cuerpo_html(nombre: str, correo: str, password: str) -> str:
    return f"""
    <html><body style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: auto;">
      <h2 style="color: #1a1a1a;">Sistema de Evaluación de Perfiles Laborales</h2>
      <p>Hola <strong>{nombre}</strong>,</p>
      <p>Tu cuenta ha sido creada. Tus credenciales de acceso son:</p>
      <div style="background: #f4f4f4; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Correo:</strong> {correo}</p>
        <p style="margin: 4px 0;"><strong>Contraseña temporal:</strong>
          <span style="font-family: monospace; font-size: 16px; color: #2563eb;">{password}</span>
        </p>
      </div>
      <p>Te recomendamos cambiarla después de ingresar por primera vez.</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        Este mensaje fue generado automáticamente. No respondas a esta dirección.
      </p>
    </body></html>
    """


def _cuerpo_texto(nombre: str, correo: str, password: str) -> str:
    """Alternativa en texto plano: algunos clientes y filtros la exigen."""
    return (
        f"Hola {nombre},\n\n"
        f"Tu cuenta en el Sistema de Evaluación de Perfiles Laborales ha sido creada.\n\n"
        f"Correo: {correo}\n"
        f"Contraseña temporal: {password}\n\n"
        f"Te recomendamos cambiarla después de ingresar por primera vez.\n\n"
        f"Este mensaje fue generado automáticamente. No respondas a esta dirección.\n"
    )


def _abrir_conexion() -> smtplib.SMTP:
    """
    Abre la conexión según SMTP_MODO.

    ssl      -> conexión cifrada desde el saludo inicial (puerto 465)
    starttls -> conexión en claro que se cifra con STARTTLS (puerto 587)
    ninguno  -> sin cifrado (puerto 25, solo en redes internas)
    """
    modo = settings.SMTP_MODO.strip().lower()

    if modo == "ssl":
        contexto = ssl.create_default_context()
        return smtplib.SMTP_SSL(
            settings.SMTP_HOST, settings.SMTP_PORT,
            timeout=settings.SMTP_TIMEOUT, context=contexto,
        )

    servidor = smtplib.SMTP(
        settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT
    )
    servidor.ehlo()
    if modo == "starttls":
        servidor.starttls(context=ssl.create_default_context())
        servidor.ehlo()
    return servidor


def enviar_credenciales(correo: str, nombre: str, password: str) -> ResultadoEnvio:
    """
    Envía las credenciales y devuelve si salió, con un detalle legible.

    Nunca lanza excepción: el alta del usuario no debe fallar porque el
    correo no se pudo enviar. El endpoint informa el resultado y el
    administrador decide qué hacer.
    """
    if not settings.EMAIL_HABILITADO:
        return ResultadoEnvio(False, "El envío de correos está desactivado (EMAIL_HABILITADO=false).")

    if not settings.SMTP_HOST:
        return ResultadoEnvio(False, "Falta configurar SMTP_HOST en el servidor.")

    if not settings.remitente:
        return ResultadoEnvio(False, "Falta configurar SMTP_FROM (o SMTP_USER) en el servidor.")

    mensaje = MIMEMultipart("alternative")
    mensaje["Subject"] = ASUNTO
    mensaje["From"] = formataddr((settings.SMTP_FROM_NOMBRE, settings.remitente))
    mensaje["To"] = correo
    mensaje.attach(MIMEText(_cuerpo_texto(nombre, correo, password), "plain", "utf-8"))
    mensaje.attach(MIMEText(_cuerpo_html(nombre, correo, password), "html", "utf-8"))

    try:
        with _abrir_conexion() as servidor:
            # Sin usuario se envía sin autenticar: relay autorizado por IP.
            if settings.SMTP_USER:
                servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.sendmail(settings.remitente, [correo], mensaje.as_string())
        return ResultadoEnvio(True, f"Credenciales enviadas a {correo}.")

    except (socket.timeout, TimeoutError):
        return ResultadoEnvio(False, (
            f"Tiempo de espera agotado conectando a {settings.SMTP_HOST}:{settings.SMTP_PORT}. "
            "Suele ser la red del servidor bloqueando el puerto de salida, o un host inalcanzable."
        ))
    except socket.gaierror:
        return ResultadoEnvio(False, f"No se pudo resolver el host SMTP '{settings.SMTP_HOST}'. Revisá el nombre.")
    except smtplib.SMTPAuthenticationError as e:
        return ResultadoEnvio(False, (
            f"El servidor rechazó las credenciales SMTP ({e.smtp_code}). "
            "Revisá usuario y contraseña, y que la cuenta tenga habilitada la autenticación SMTP."
        ))
    except smtplib.SMTPSenderRefused:
        return ResultadoEnvio(False, (
            f"El servidor no permite enviar desde '{settings.remitente}'. "
            "Normalmente el remitente debe coincidir con la cuenta autenticada o estar autorizado como alias."
        ))
    except smtplib.SMTPRecipientsRefused:
        return ResultadoEnvio(False, f"El servidor rechazó la dirección de destino '{correo}'.")
    except smtplib.SMTPNotSupportedError as e:
        return ResultadoEnvio(False, (
            f"El servidor no soporta la operación solicitada: {e}. "
            "Si pasa con STARTTLS, probá SMTP_MODO=ssl con el puerto 465."
        ))
    except ssl.SSLError as e:
        return ResultadoEnvio(False, (
            f"Error de cifrado: {e}. Suele ser SMTP_MODO mal combinado con el puerto "
            "(587 va con starttls, 465 con ssl)."
        ))
    except (smtplib.SMTPException, OSError) as e:
        return ResultadoEnvio(False, f"No se pudo enviar el correo: {type(e).__name__}: {e}")


def diagnostico() -> dict:
    """
    Estado de la configuración de correo, sin exponer la contraseña.
    Sirve para verificar desde el servidor qué variables llegaron.
    """
    return {
        "email_habilitado": settings.EMAIL_HABILITADO,
        "smtp_host": settings.SMTP_HOST or "(sin configurar)",
        "smtp_port": settings.SMTP_PORT,
        "smtp_modo": settings.SMTP_MODO,
        "autenticacion": "sí" if settings.SMTP_USER else "no (relay por IP)",
        "smtp_user": settings.SMTP_USER or "(vacío)",
        "password_configurada": bool(settings.SMTP_PASSWORD),
        "remitente": settings.remitente or "(sin configurar)",
        "remitente_nombre": settings.SMTP_FROM_NOMBRE,
        "timeout_segundos": settings.SMTP_TIMEOUT,
        "entorno": settings.ENV,
    }