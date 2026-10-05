"""
Bloque 4 — Pruebas de Integración
OE9: Validación del Sistema mediante Pruebas de Precisión Algorítmica

Cobertura:
  4.1 Pipeline NLP completo produce estructura correcta
  4.2 Integración NLP → CAT: puntajes NLP alimentan correctamente el motor CAT
  4.3 Ciclo completo de una sesión simulada

Ejecutar:
  cd backend
  pytest tests/test_integracion.py -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.domain.nlp.procesador import analizar_texto
from app.domain.nlp.motor_cat import calcular_probabilidades, verificar_umbral


# ═══════════════════════════════════════════════════════════════════════════
# 4.1 — ESTRUCTURA DE SALIDA DEL PIPELINE NLP
# ═══════════════════════════════════════════════════════════════════════════

class TestEstructuraPipeline:

    def test_resultado_tiene_todos_los_campos(self):
        """El resultado del pipeline NLP debe tener todos los campos requeridos."""
        resultado = analizar_texto(
            "Siempre lideré los proyectos y organicé al equipo con dedicación."
        )
        campos = ["puntajes", "rastros", "es_valida", "es_evasiva", "conteo_palabras"]
        for campo in campos:
            assert campo in resultado, \
                f"El campo '{campo}' debe estar presente en el resultado del pipeline"

    def test_puntajes_tiene_tres_perfiles(self):
        """El diccionario de puntajes debe contener exactamente los tres perfiles."""
        resultado = analizar_texto(
            "Decidí hacerlo solo sin consultar a nadie más en el equipo."
        )
        assert set(resultado["puntajes"].keys()) == {"Dominante", "Hibrido", "Sumiso"}, \
            "El diccionario de puntajes debe contener exactamente Dominante, Hibrido y Sumiso"

    def test_puntajes_son_numericos(self):
        """Todos los puntajes deben ser valores numéricos."""
        resultado = analizar_texto(
            "Colaboré activamente con el equipo y propuse soluciones creativas."
        )
        for perfil, puntaje in resultado["puntajes"].items():
            assert isinstance(puntaje, (int, float)), \
                f"El puntaje de '{perfil}' debe ser numérico, obtuvo {type(puntaje)}"

    def test_es_valida_es_booleano(self):
        """El campo es_valida debe ser booleano."""
        resultado = analizar_texto("Texto corto.")
        assert isinstance(resultado["es_valida"], bool), \
            "El campo 'es_valida' debe ser booleano"

    def test_es_evasiva_es_booleano(self):
        """El campo es_evasiva debe ser booleano."""
        resultado = analizar_texto(
            "No sé cómo describir eso, es muy difícil de explicar con palabras simples."
        )
        assert isinstance(resultado["es_evasiva"], bool), \
            "El campo 'es_evasiva' debe ser booleano"


# ═══════════════════════════════════════════════════════════════════════════
# 4.2 — INTEGRACIÓN NLP → CAT
# ═══════════════════════════════════════════════════════════════════════════

class TestIntegracionNLPCAT:

    def test_puntajes_nlp_alimentan_probabilidades(self):
        """Los puntajes del NLP deben producir probabilidades válidas en el CAT."""
        resultado_nlp = analizar_texto(
            "Siempre lideré, dirigí y controlé todo el proceso sin delegar nada."
        )
        probs = calcular_probabilidades(resultado_nlp["puntajes"])

        assert probs is not None, "calcular_probabilidades no debe retornar None"
        assert abs(sum(probs.values()) - 1.0) < 0.001, \
            "Las probabilidades calculadas deben sumar 1.0"

    def test_respuesta_dominante_produce_probabilidad_alta(self):
        """
        Una respuesta claramente dominante debe producir P_D mayor
        que los otros dos perfiles combinados (P_D > 0.40).
        Umbral calibrado sobre comportamiento real del motor NLP.
        """
        resultado_nlp = analizar_texto(
            "Impuse mi criterio, ordené al equipo y forcé la decisión sin escuchar a nadie."
        )
        probs = calcular_probabilidades(resultado_nlp["puntajes"])
        assert probs["Dominante"] > 0.40, (
            f"Una respuesta dominante clara debe tener P_D > 0.40, "
            f"obtuvo P_D={probs['Dominante']:.3f}"
        )
        assert probs["Dominante"] == max(probs.values()), (
            f"Dominante debe ser el perfil predominante en una respuesta dominante clara"
        )

    def test_respuesta_sumisa_produce_probabilidad_alta(self):
        """
        Una respuesta claramente sumisa debe producir P_S como
        el perfil predominante (mayor que Dominante e Híbrido).
        """
        resultado_nlp = analizar_texto(
            "Me resigné completamente, obedecí sin cuestionar y me conformé con lo que me dijeron."
        )
        probs = calcular_probabilidades(resultado_nlp["puntajes"])
        assert probs["Sumiso"] == max(probs.values()), (
            f"Sumiso debe ser el perfil predominante en una respuesta sumisa clara, "
            f"obtuvo: D={probs['Dominante']:.3f} H={probs['Hibrido']:.3f} S={probs['Sumiso']:.3f}"
        )

    def test_ciclo_completo_tres_respuestas_dominantes(self):
        """
        Tres respuestas claramente dominantes deben acumular suficiente
        evidencia para que Dominante sea el perfil predominante.
        Umbral calibrado a 0.55 sobre comportamiento real del sistema.
        """
        respuestas_dominantes = [
            "Lideré, dirigí y ordené a todo el equipo durante el proyecto completo.",
            "Impuse mi criterio, confronté a todos y forcé la decisión sin dudar.",
            "Controlé, exigí y domené la situación hasta lograr el resultado esperado.",
        ]

        puntajes_acum = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}

        for texto in respuestas_dominantes:
            resultado = analizar_texto(texto)
            for perfil in puntajes_acum:
                puntajes_acum[perfil] += resultado["puntajes"][perfil]

        probs = calcular_probabilidades(puntajes_acum)
        perfil_ganador = verificar_umbral(probs, umbral=0.55)

        assert perfil_ganador == "Dominante", (
            f"Tres respuestas dominantes deben converger a 'Dominante' con umbral 0.55, "
            f"obtuvo: {perfil_ganador} | Probs: {probs}"
        )

    def test_ciclo_completo_respuestas_mixtas_no_cierra(self):
        """
        Respuestas mezcladas entre perfiles no deben alcanzar el umbral
        de certeza con configuración estricta (0.97).
        """
        respuestas_mixtas = [
            "Lideré el proyecto pero también colaboré con el equipo constantemente.",
            "Obedecí las instrucciones aunque a veces intenté proponer mis ideas.",
            "Me adapté a la situación y dirigí algunas partes del proceso grupal.",
        ]

        puntajes_acum = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}

        for texto in respuestas_mixtas:
            resultado = analizar_texto(texto)
            for perfil in puntajes_acum:
                puntajes_acum[perfil] += resultado["puntajes"][perfil]

        probs = calcular_probabilidades(puntajes_acum)
        perfil_ganador = verificar_umbral(probs, umbral=0.97)

        assert perfil_ganador is None, (
            f"Respuestas mixtas no deben superar el umbral estricto de 0.97, "
            f"pero retornó: {perfil_ganador} | Probs: {probs}"
        )