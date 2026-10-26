# =============================================================
#  PARÁMETROS DEL MOTOR NLP — EVALUACIÓN DE PERFILES CONDUCTUALES
#  Sistema: Evaluación de Perfiles Laborales
#  Autor: Pablo La Torre
#
#  El lexicón conductual (lema → perfil, peso, categoría) ya NO vive
#  en este archivo: está en la tabla `lexico_conductual` de la base de
#  datos y lo administra el Psicólogo Líder desde el panel.
#  La capa de aplicación lo carga y se lo entrega al procesador, de modo
#  que el dominio sigue sin acceder a la base de datos.
#
#  Base teórica del lexicón:
#  - Modelo DISC (Marston, 1928) — Dominance / Steadiness
#  - Estilos de liderazgo de Lewin (1939) — autoritario / democrático / laissez-faire
#  - Teoría de Agencia vs. Comunión (Bakan, 1966) — iniciativa propia vs. cooperación
#
#  Aquí solo quedan las reglas fijas del algoritmo.
# =============================================================


# =============================================================
#  MODIFICADOR DE NEGACIÓN
#  Cuando un lema del lexicón está negado, su peso se multiplica
#  por este factor.
#  - "Lideré el equipo"  → Dominante +0.9
#  - "No lideré nada"    → Dominante +0.9 × (-0.8) = -0.72
# =============================================================

FACTOR_NEGACION = -0.8


# =============================================================
#  UMBRAL DE VALIDACIÓN (RN-01)
# =============================================================

MIN_PALABRAS = 10
