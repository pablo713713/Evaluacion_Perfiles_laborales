"""
Bloque 2 — Pruebas Unitarias del Motor CAT
OE9: Validación del Sistema mediante Pruebas de Precisión Algorítmica

Cobertura:
  2.1 Normalización de probabilidades
  2.2 Verificación del umbral de certeza
  2.3 Comportamiento con distribución uniforme

Ejecutar:
  cd backend
  pytest tests/test_cat.py -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.domain.nlp.motor_cat import calcular_probabilidades, verificar_umbral


# ═══════════════════════════════════════════════════════════════════════════
# 2.1 — NORMALIZACIÓN DE PROBABILIDADES
# ═══════════════════════════════════════════════════════════════════════════

class TestNormalizacion:

    def test_suma_probabilidades_es_uno(self):
        """La suma de las tres probabilidades debe ser exactamente 1.0."""
        puntajes = {"Dominante": 3.5, "Hibrido": 1.2, "Sumiso": 0.8}
        probs = calcular_probabilidades(puntajes)
        total = sum(probs.values())
        assert abs(total - 1.0) < 0.001, \
            f"La suma de probabilidades debe ser 1.0, obtuvo {total}"

    def test_perfil_mayor_puntaje_tiene_mayor_probabilidad(self):
        """El perfil con mayor puntaje debe tener la mayor probabilidad."""
        puntajes = {"Dominante": 5.0, "Hibrido": 2.0, "Sumiso": 1.0}
        probs = calcular_probabilidades(puntajes)
        assert probs["Dominante"] > probs["Hibrido"], \
            "Dominante debe tener mayor probabilidad que Híbrido"
        assert probs["Dominante"] > probs["Sumiso"], \
            "Dominante debe tener mayor probabilidad que Sumiso"

    def test_distribucion_uniforme_con_puntajes_iguales(self):
        """Con puntajes iguales la distribución debe ser uniforme (33.3% cada uno)."""
        puntajes = {"Dominante": 1.0, "Hibrido": 1.0, "Sumiso": 1.0}
        probs = calcular_probabilidades(puntajes)
        for perfil, prob in probs.items():
            assert abs(prob - 1/3) < 0.001, \
                f"Con puntajes iguales, {perfil} debe tener probabilidad ~0.333"

    def test_distribucion_uniforme_con_puntajes_cero(self):
        """Con todos los puntajes en cero debe retornar distribución uniforme."""
        puntajes = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
        probs = calcular_probabilidades(puntajes)
        assert probs is not None, \
            "No debe fallar con puntajes en cero"
        total = sum(probs.values())
        assert abs(total - 1.0) < 0.001, \
            "La suma debe ser 1.0 incluso con puntajes en cero"

    def test_probabilidades_entre_cero_y_uno(self):
        """Todas las probabilidades deben estar en el rango [0, 1]."""
        puntajes = {"Dominante": 4.2, "Hibrido": 0.5, "Sumiso": 1.8}
        probs = calcular_probabilidades(puntajes)
        for perfil, prob in probs.items():
            assert 0.0 <= prob <= 1.0, \
                f"La probabilidad de {perfil} ({prob}) debe estar en [0, 1]"


# ═══════════════════════════════════════════════════════════════════════════
# 2.2 — VERIFICACIÓN DEL UMBRAL DE CERTEZA
# ═══════════════════════════════════════════════════════════════════════════

class TestUmbral:

    def test_umbral_superado_retorna_perfil(self):
        """Cuando la probabilidad supera el umbral debe retornar el perfil ganador."""
        probs = {"Dominante": 0.97, "Hibrido": 0.02, "Sumiso": 0.01}
        resultado = verificar_umbral(probs, umbral=0.85)
        assert resultado == "Dominante", \
            "Con probabilidad 0.97 y umbral 0.85 debe retornar 'Dominante'"

    def test_umbral_no_superado_retorna_none(self):
        """Cuando ninguna probabilidad supera el umbral debe retornar None."""
        probs = {"Dominante": 0.80, "Hibrido": 0.12, "Sumiso": 0.08}
        resultado = verificar_umbral(probs, umbral=0.85)
        assert resultado is None, \
            "Con probabilidad 0.80 y umbral 0.85 debe retornar None"

    def test_umbral_exactamente_igual_retorna_perfil(self):
        """Cuando la probabilidad es exactamente igual al umbral debe retornar el perfil."""
        probs = {"Dominante": 0.85, "Hibrido": 0.10, "Sumiso": 0.05}
        resultado = verificar_umbral(probs, umbral=0.85)
        assert resultado == "Dominante", \
            "Con probabilidad exactamente igual al umbral debe retornar el perfil"

    def test_umbral_hibrido_detectado(self):
        """El umbral debe funcionar correctamente para el perfil Híbrido."""
        probs = {"Dominante": 0.03, "Hibrido": 0.95, "Sumiso": 0.02}
        resultado = verificar_umbral(probs, umbral=0.90)
        assert resultado == "Hibrido", \
            "Con Híbrido en 0.95 y umbral 0.90 debe retornar 'Hibrido'"

    def test_umbral_sumiso_detectado(self):
        """El umbral debe funcionar correctamente para el perfil Sumiso."""
        probs = {"Dominante": 0.02, "Hibrido": 0.05, "Sumiso": 0.93}
        resultado = verificar_umbral(probs, umbral=0.90)
        assert resultado == "Sumiso", \
            "Con Sumiso en 0.93 y umbral 0.90 debe retornar 'Sumiso'"

    def test_umbral_97_requiere_alta_certeza(self):
        """Con umbral 0.97 solo probabilidades muy altas deben cerrar el test."""
        probs_insuficiente = {"Dominante": 0.95, "Hibrido": 0.03, "Sumiso": 0.02}
        probs_suficiente   = {"Dominante": 0.98, "Hibrido": 0.01, "Sumiso": 0.01}
        assert verificar_umbral(probs_insuficiente, 0.97) is None, \
            "0.95 no debe superar el umbral de 0.97"
        assert verificar_umbral(probs_suficiente, 0.97) == "Dominante", \
            "0.98 debe superar el umbral de 0.97"