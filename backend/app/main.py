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
from app.api.routes import auth, users, evaluaciones, preguntas, diagnostico, lexico
from app.infraestructure.db import base  # registra todos los modelos SQLAlchemy
import os

app = FastAPI(
    title="Sistema de Evaluación de Perfiles Laborales",
    description="Motor NLP determinista + CAT adaptativo para evaluación psicológica",
    version="1.0.0",
)

_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    # Vercel genera una URL distinta en cada deploy; aceptamos todas las del proyecto
    allow_origin_regex=r"https://evaluacion-perfiles-laborales[a-z0-9\-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(evaluaciones.router)
app.include_router(preguntas.router)
app.include_router(diagnostico.router)
app.include_router(lexico.router)

@app.get("/")
def health_check():
    return {"status": "ok", "sistema": "Evaluación NLP v1.0"}