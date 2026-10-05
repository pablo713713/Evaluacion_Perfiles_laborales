"""
Bloque 3 — Pruebas de Precisión Léxica con Dataset Controlado
OE9: Validación del Sistema mediante Pruebas de Precisión Algorítmica

Métricas calculadas:
  - Precisión: tokens detectados correctamente / total tokens detectados
  - Recall: tokens detectados correctamente / total tokens esperados
  - F1-score: media armónica entre precisión y recall
  - Tasa de convergencia: evaluaciones que convergen al perfil esperado

Ejecutar:
  cd backend
  pytest tests/test_precision_lexica.py -v --tb=short
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.domain.nlp.procesador import analizar_texto
from app.domain.nlp.motor_cat import calcular_probabilidades
from tests.dataset_controlado import DATASET_CONTROLADO


# ═══════════════════════════════════════════════════════════════════════════
# UTILIDADES DE MÉTRICAS
# ═══════════════════════════════════════════════════════════════════════════

def calcular_metricas(verdaderos_positivos, falsos_positivos, falsos_negativos):
    """Calcula precisión, recall y F1-score."""
    precision = (
        verdaderos_positivos / (verdaderos_positivos + falsos_positivos)
        if (verdaderos_positivos + falsos_positivos) > 0 else 0.0
    )
    recall = (
        verdaderos_positivos / (verdaderos_positivos + falsos_negativos)
        if (verdaderos_positivos + falsos_negativos) > 0 else 0.0
    )
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0 else 0.0
    )
    return precision, recall, f1


def procesar_entrada(entrada):
    """Procesa una entrada del dataset y retorna el resultado del NLP."""
    return analizar_texto(entrada["texto"])


# ═══════════════════════════════════════════════════════════════════════════
# 3.1 — CONVERGENCIA AL PERFIL ESPERADO
# ═══════════════════════════════════════════════════════════════════════════

class TestConvergenciaPerfil:

    @pytest.mark.parametrize("entrada", DATASET_CONTROLADO, ids=[e["id"] for e in DATASET_CONTROLADO])
    def test_perfil_predominante_correcto(self, entrada):
        """
        El perfil con mayor puntaje acumulado debe coincidir con el perfil esperado
        para cada respuesta del dataset controlado.
        """
        resultado = procesar_entrada(entrada)
        puntajes = resultado["puntajes"]
        total = sum(puntajes.values())

        if total == 0:
            pytest.skip(f"[{entrada['id']}] Sin puntajes acumulados — respuesta sin lemas detectados")

        perfil_detectado = max(puntajes, key=puntajes.get)
        assert perfil_detectado == entrada["perfil_esperado"], (
            f"[{entrada['id']}] Perfil esperado: {entrada['perfil_esperado']} | "
            f"Perfil detectado: {perfil_detectado} | "
            f"Puntajes: D={puntajes['Dominante']:.3f} H={puntajes['Hibrido']:.3f} S={puntajes['Sumiso']:.3f}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 3.2 — MÉTRICAS DE PRECISIÓN GLOBAL DEL DATASET
# ═══════════════════════════════════════════════════════════════════════════

class TestMetricasPrecision:

    def test_precision_global_minima(self):
        """
        La precisión global del motor NLP sobre el dataset controlado
        debe superar el umbral mínimo aceptable del 70%.
        """
        vp = fp = fn = 0

        for entrada in DATASET_CONTROLADO:
            resultado = procesar_entrada(entrada)
            palabras_detectadas = {
                r["palabra_o_frase_extraida"].lower()
                for r in resultado["rastros"]
            }
            palabras_esperadas = {p.lower() for p in entrada["palabras_conductuales"]}
            perfiles_palabras = {
                k.lower(): v for k, v in entrada["perfiles_palabras"].items()
            }

            for rastro in resultado["rastros"]:
                palabra = rastro["palabra_o_frase_extraida"].lower()
                lema    = rastro["verbo_lematizado"].lower()
                perfil  = rastro["perfil_asignado"]

                # Buscar si esta palabra o su lema estaban esperados
                clave = None
                if palabra in perfiles_palabras:
                    clave = palabra
                elif lema in perfiles_palabras:
                    clave = lema

                if clave and perfiles_palabras[clave] == perfil:
                    vp += 1
                elif clave:
                    fp += 1
                else:
                    fp += 1

            for palabra in palabras_esperadas:
                encontrada = any(
                    r["palabra_o_frase_extraida"].lower() == palabra or
                    r["verbo_lematizado"].lower() == palabra
                    for r in resultado["rastros"]
                )
                if not encontrada:
                    fn += 1

        precision, recall, f1 = calcular_metricas(vp, fp, fn)

        print(f"\n{'='*50}")
        print(f"MÉTRICAS DE PRECISIÓN LÉXICA — DATASET CONTROLADO")
        print(f"{'='*50}")
        print(f"Verdaderos positivos : {vp}")
        print(f"Falsos positivos     : {fp}")
        print(f"Falsos negativos     : {fn}")
        print(f"Precisión            : {precision:.1%}")
        print(f"Recall               : {recall:.1%}")
        print(f"F1-score             : {f1:.1%}")
        print(f"{'='*50}")

        assert precision >= 0.70, (
            f"La precisión del motor NLP ({precision:.1%}) no alcanza el umbral mínimo del 70%"
        )

    def test_recall_global_minimo(self):
        """
        El recall global debe superar el umbral mínimo del 60%,
        indicando que el motor detecta la mayoría de los indicadores esperados.
        """
        vp = fp = fn = 0

        for entrada in DATASET_CONTROLADO:
            resultado = procesar_entrada(entrada)
            palabras_esperadas = {p.lower() for p in entrada["palabras_conductuales"]}
            perfiles_palabras  = {k.lower(): v for k, v in entrada["perfiles_palabras"].items()}

            for rastro in resultado["rastros"]:
                palabra = rastro["palabra_o_frase_extraida"].lower()
                lema    = rastro["verbo_lematizado"].lower()
                perfil  = rastro["perfil_asignado"]
                clave   = palabra if palabra in perfiles_palabras else (
                    lema if lema in perfiles_palabras else None
                )
                if clave and perfiles_palabras[clave] == perfil:
                    vp += 1
                else:
                    fp += 1

            for palabra in palabras_esperadas:
                encontrada = any(
                    r["palabra_o_frase_extraida"].lower() == palabra or
                    r["verbo_lematizado"].lower() == palabra
                    for r in resultado["rastros"]
                )
                if not encontrada:
                    fn += 1

        _, recall, _ = calcular_metricas(vp, fp, fn)

        assert recall >= 0.60, (
            f"El recall del motor NLP ({recall:.1%}) no alcanza el umbral mínimo del 60%"
        )

    def test_tasa_convergencia_perfil(self):
        """
        Al menos el 80% de las respuestas del dataset deben converger
        al perfil esperado como perfil predominante.
        """
        correctas = 0
        total     = 0

        for entrada in DATASET_CONTROLADO:
            resultado = procesar_entrada(entrada)
            puntajes  = resultado["puntajes"]
            total_pts = sum(puntajes.values())

            if total_pts == 0:
                continue

            perfil_detectado = max(puntajes, key=puntajes.get)
            if perfil_detectado == entrada["perfil_esperado"]:
                correctas += 1
            total += 1

        tasa = correctas / total if total > 0 else 0.0

        print(f"\nTasa de convergencia: {correctas}/{total} = {tasa:.1%}")

        assert tasa >= 0.80, (
            f"La tasa de convergencia ({tasa:.1%}) no alcanza el umbral mínimo del 80% "
            f"({correctas} de {total} respuestas correctas)"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 3.3 — PRECISIÓN POR PERFIL
# ═══════════════════════════════════════════════════════════════════════════

class TestPrecisionPorPerfil:

    @pytest.mark.parametrize("perfil", ["Dominante", "Hibrido", "Sumiso"])
    def test_convergencia_por_perfil(self, perfil):
        """
        Cada perfil individual debe tener una tasa de convergencia
        de al menos el 60% en sus respuestas específicas.
        """
        entradas_perfil = [e for e in DATASET_CONTROLADO if e["perfil_esperado"] == perfil]
        correctas = 0

        for entrada in entradas_perfil:
            resultado = procesar_entrada(entrada)
            puntajes  = resultado["puntajes"]
            total_pts = sum(puntajes.values())

            if total_pts == 0:
                continue

            perfil_detectado = max(puntajes, key=puntajes.get)
            if perfil_detectado == perfil:
                correctas += 1

        total = len(entradas_perfil)
        tasa  = correctas / total if total > 0 else 0.0

        assert tasa >= 0.60, (
            f"La tasa de convergencia para '{perfil}' ({tasa:.1%}) "
            f"no alcanza el umbral mínimo del 60% ({correctas}/{total})"
        )