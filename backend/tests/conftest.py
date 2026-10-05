"""
Configuración global de pytest para el proyecto.
Carga las variables de entorno antes de ejecutar cualquier test.
"""
import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Asegurar que el directorio backend esté en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))