
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, evaluaciones, preguntas, diagnostico
from app.db import base 

app = FastAPI(
    title="Sistema de Evaluación de Perfiles Laborales",
    description="Motor NLP determinista + CAT adaptativo para evaluación psicológica",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # puerto de Vite en desarrollo
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
 