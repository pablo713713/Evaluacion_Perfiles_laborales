"""
Punto de entrada principal — FastAPI
Arquitectura: Capas con Separación Estricta de Responsabilidades
  api/          → Capa de Interfaz HTTP
  application/  → Capa de Aplicación (casos de uso)
  domain/       → Capa de Dominio (lógica pura)
  infrastructure/ → Capa de Infraestructura (DB, seguridad)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, evaluaciones, preguntas, diagnostico
from app.infraestructure.db import base  # registra todos los modelos SQLAlchemy

app = FastAPI(
    title="Sistema de Evaluación de Perfiles Laborales",
    description="Motor NLP determinista + CAT adaptativo para evaluación psicológica",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(evaluaciones.router)
app.include_router(preguntas.router)
app.include_router(diagnostico.router)

@app.get("/")
def health_check():
    return {"status": "ok", "sistema": "Evaluación NLP v1.0"}