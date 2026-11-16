"""
Prueba de correo saliente — se corre EN el servidor, antes de tocar la app.

Sirve para separar dos cosas que se confunden: si el problema es la red y
las credenciales, o si es el código de la aplicación. Este script no importa
nada del proyecto, así que si acá el correo sale, el problema está en la app;
y si acá no sale, el problema está en la red, el host o las credenciales.

Uso, desde la carpeta backend/ del servidor:

    python probar_smtp.py destino@ejemplo.com

Lee las mismas variables de entorno que usa la aplicación:

    SMTP_HOST, SMTP_PORT, SMTP_MODO (starttls|ssl|ninguno),
    SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TIMEOUT

Si están en un archivo .env, cargalo antes:  set -a; . ./.env; set +a
"""
import os
import smtplib
import socket
import ssl
import sys
from email.mime.text import MIMEText

HOST    = os.getenv("SMTP_HOST", "")
PORT    = int(os.getenv("SMTP_PORT", "587"))
MODO    = os.getenv("SMTP_MODO", "starttls").strip().lower()
USER    = os.getenv("SMTP_USER", "")
PASSWD  = os.getenv("SMTP_PASSWORD", "")
FROM    = os.getenv("SMTP_FROM", "") or USER
TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "20"))


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: python probar_smtp.py destino@ejemplo.com")
        return 2
    destino = sys.argv[1]

    print("Configuración leída del entorno:")
    print(f"  SMTP_HOST     = {HOST or '(vacío)'}")
    print(f"  SMTP_PORT     = {PORT}")
    print(f"  SMTP_MODO     = {MODO}")
    print(f"  SMTP_USER     = {USER or '(vacío -> se enviará sin autenticar)'}")
    print(f"  SMTP_PASSWORD = {'(configurada)' if PASSWD else '(vacía)'}")
    print(f"  SMTP_FROM     = {FROM or '(vacío)'}")
    print(f"  destino       = {destino}")
    print()

    if not HOST:
        print("FALLA: falta SMTP_HOST.")
        return 1
    if not FROM:
        print("FALLA: falta SMTP_FROM (o SMTP_USER).")
        return 1

    # Paso 1: ¿el puerto está alcanzable? Esto distingue un bloqueo de red
    # de un problema de credenciales, antes de intentar hablar SMTP.
    print(f"[1/4] Probando TCP contra {HOST}:{PORT} ...")
    try:
        with socket.create_connection((HOST, PORT), timeout=TIMEOUT):
            pass
        print("      conexión TCP establecida.")
    except socket.gaierror:
        print(f"      FALLA: el nombre '{HOST}' no se resuelve. Revisá el host o el DNS del servidor.")
        return 1
    except (socket.timeout, TimeoutError):
        print("      FALLA: tiempo de espera agotado.")
        print("      Casi siempre es la red del servidor bloqueando el puerto de salida.")
        print("      Pedí a los administradores que habiliten la salida a ese host y puerto.")
        return 1
    except OSError as e:
        print(f"      FALLA: {type(e).__name__}: {e}")
        return 1

    mensaje = MIMEText(
        "Prueba de correo saliente del Sistema de Evaluación de Perfiles Laborales.\n"
        "Si recibís este mensaje, el servidor puede enviar correo correctamente.\n",
        "plain", "utf-8",
    )
    mensaje["Subject"] = "Prueba de correo saliente"
    mensaje["From"] = FROM
    mensaje["To"] = destino

    try:
        print(f"[2/4] Abriendo sesión SMTP (modo {MODO}) ...")
        if MODO == "ssl":
            servidor = smtplib.SMTP_SSL(HOST, PORT, timeout=TIMEOUT,
                                        context=ssl.create_default_context())
        else:
            servidor = smtplib.SMTP(HOST, PORT, timeout=TIMEOUT)
            servidor.ehlo()
            if MODO == "starttls":
                servidor.starttls(context=ssl.create_default_context())
                servidor.ehlo()
        print("      sesión abierta.")

        with servidor:
            if USER:
                print("[3/4] Autenticando ...")
                servidor.login(USER, PASSWD)
                print("      autenticación aceptada.")
            else:
                print("[3/4] Sin autenticación (relay por IP).")

            print(f"[4/4] Enviando a {destino} ...")
            servidor.sendmail(FROM, [destino], mensaje.as_string())
            print("      aceptado por el servidor.")

        print("\nRESULTADO: envío exitoso. Revisá la bandeja de entrada y el correo no deseado.")
        return 0

    except smtplib.SMTPAuthenticationError as e:
        print(f"      FALLA: credenciales rechazadas ({e.smtp_code}).")
        print("      Revisá usuario y contraseña, y que la cuenta tenga autenticación SMTP habilitada.")
        print("      En Microsoft 365 suele venir desactivada por política y hay que pedir que la activen.")
    except smtplib.SMTPSenderRefused:
        print(f"      FALLA: el servidor no acepta '{FROM}' como remitente.")
        print("      Debe coincidir con la cuenta autenticada o estar autorizado como alias.")
    except smtplib.SMTPRecipientsRefused:
        print(f"      FALLA: el servidor rechazó el destino '{destino}'.")
        print("      Algunos relays internos solo permiten enviar a direcciones del propio dominio.")
    except smtplib.SMTPNotSupportedError as e:
        print(f"      FALLA: operación no soportada: {e}")
        print("      Si ocurre con STARTTLS, probá SMTP_MODO=ssl con el puerto 465.")
    except ssl.SSLError as e:
        print(f"      FALLA de cifrado: {e}")
        print("      Combinación incorrecta: 587 va con starttls, 465 con ssl.")
    except (smtplib.SMTPException, OSError) as e:
        print(f"      FALLA: {type(e).__name__}: {e}")
    return 1


if __name__ == "__main__":
    sys.exit(main())