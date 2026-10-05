# =============================================================
#  LEXICÓN NLP — MOTOR DE EVALUACIÓN DE PERFILES CONDUCTUALES
#  Sistema: Evaluación de Perfiles Laborales
#  Autor: Pablo La Torre
#
#  Base teórica:
#  - Modelo DISC (Marston, 1928) — Dominance / Steadiness
#  - Estilos de liderazgo de Lewin (1939) — autoritario / democrático / laissez-faire
#  - Teoría de Agencia vs. Comunión (Bakan, 1966) — iniciativa propia vs. cooperación
#
#  Estructura de cada entrada:
#  "lema": {"perfil": "Dominante|Hibrido|Sumiso", "peso": float, "categoria": str}
#
#  El peso va de 0.1 (señal débil) a 1.0 (señal muy fuerte).
#  spaCy entregará el lema de cada token; este diccionario lo mapea a un perfil.
# =============================================================


LEXICO_VERBAL = {

    # ----------------------------------------------------------
    # PERFIL DOMINANTE
    # Indicadores: agencia, control, autoridad, imposición,
    # iniciativa unilateral, competitividad, toma de decisiones
    # Base: dimensión D del DISC + estilo autoritario de Lewin
    #       + alta agencia (Bakan)
    # ----------------------------------------------------------

    # Control y autoridad directa
    "liderar":      {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},
    "dirigir":      {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},
    "mandar":       {"perfil": "Dominante", "peso": 0.95, "categoria": "control"},
    "ordenar":      {"perfil": "Dominante", "peso": 0.95, "categoria": "control"},
    "controlar":    {"perfil": "Dominante", "peso": 0.85, "categoria": "control"},
    "supervisar":   {"perfil": "Dominante", "peso": 0.75, "categoria": "control"},
    "comandar":     {"perfil": "Dominante", "peso": 0.95, "categoria": "control"},
    "gobernar":     {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},
    "imponer":      {"perfil": "Dominante", "peso": 1.0,  "categoria": "control"},
    "dominar":      {"perfil": "Dominante", "peso": 1.0,  "categoria": "control"},
    "exigir":       {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},

    # Toma de decisiones unilateral
    "decidir":      {"perfil": "Dominante", "peso": 0.8,  "categoria": "decision"},
    "resolver":     {"perfil": "Dominante", "peso": 0.75, "categoria": "decision"},
    "determinar":   {"perfil": "Dominante", "peso": 0.8,  "categoria": "decision"},
    "establecer":   {"perfil": "Dominante", "peso": 0.7,  "categoria": "decision"},
    "definir":      {"perfil": "Dominante", "peso": 0.7,  "categoria": "decision"},
    "fijar":        {"perfil": "Dominante", "peso": 0.75, "categoria": "decision"},
    "sentenciar":   {"perfil": "Dominante", "peso": 0.95, "categoria": "decision"},

    # Iniciativa y acción unilateral
    "iniciar":      {"perfil": "Dominante", "peso": 0.7,  "categoria": "iniciativa"},
    "emprender":    {"perfil": "Dominante", "peso": 0.75, "categoria": "iniciativa"},
    "tomar":        {"perfil": "Dominante", "peso": 0.6,  "categoria": "iniciativa"},
    "actuar":       {"perfil": "Dominante", "peso": 0.6,  "categoria": "iniciativa"},
    "ejecutar":     {"perfil": "Dominante", "peso": 0.65, "categoria": "iniciativa"},
    "implementar":  {"perfil": "Dominante", "peso": 0.65, "categoria": "iniciativa"},
    "impulsar":     {"perfil": "Dominante", "peso": 0.7,  "categoria": "iniciativa"},
    "provocar":     {"perfil": "Dominante", "peso": 0.7,  "categoria": "iniciativa"},
    "generar":      {"perfil": "Dominante", "peso": 0.6,  "categoria": "iniciativa"},

    # Competitividad y confrontación
    "competir":     {"perfil": "Dominante", "peso": 0.85, "categoria": "competitividad"},
    "ganar":        {"perfil": "Dominante", "peso": 0.8,  "categoria": "competitividad"},
    "vencer":       {"perfil": "Dominante", "peso": 0.9,  "categoria": "competitividad"},
    "superar":      {"perfil": "Dominante", "peso": 0.8,  "categoria": "competitividad"},
    "enfrentar":    {"perfil": "Dominante", "peso": 0.75, "categoria": "competitividad"},
    "confrontar":   {"perfil": "Dominante", "peso": 0.85, "categoria": "competitividad"},
    "rebatir":      {"perfil": "Dominante", "peso": 0.8,  "categoria": "competitividad"},
    "refutar":      {"perfil": "Dominante", "peso": 0.8,  "categoria": "competitividad"},
    "desafiar":     {"perfil": "Dominante", "peso": 0.9,  "categoria": "competitividad"},
    "reclamar":     {"perfil": "Dominante", "peso": 0.75, "categoria": "competitividad"},

    # Persuasión e influencia agresiva
    "convencer":    {"perfil": "Dominante", "peso": 0.7,  "categoria": "influencia"},
    "persuadir":    {"perfil": "Dominante", "peso": 0.75, "categoria": "influencia"},
    "presionar":    {"perfil": "Dominante", "peso": 0.9,  "categoria": "influencia"},
    "insistir":     {"perfil": "Dominante", "peso": 0.8,  "categoria": "influencia"},
    "obligar":      {"perfil": "Dominante", "peso": 0.95, "categoria": "influencia"},
    "forzar":       {"perfil": "Dominante", "peso": 1.0,  "categoria": "influencia"},


    # ----------------------------------------------------------
    # PERFIL HÍBRIDO
    # Indicadores: colaboración, negociación, adaptabilidad,
    # equilibrio entre iniciativa y escucha, orientación grupal
    # Base: dimensión S+I del DISC + estilo democrático de Lewin
    #       + equilibrio agencia/comunión (Bakan)
    # ----------------------------------------------------------

    # Colaboración y trabajo en equipo
    "colaborar":    {"perfil": "Hibrido", "peso": 0.9,  "categoria": "colaboracion"},
    "cooperar":     {"perfil": "Hibrido", "peso": 0.9,  "categoria": "colaboracion"},
    "apoyar":       {"perfil": "Hibrido", "peso": 0.75, "categoria": "colaboracion"},
    "ayudar":       {"perfil": "Hibrido", "peso": 0.7,  "categoria": "colaboracion"},
    "acompañar":    {"perfil": "Hibrido", "peso": 0.7,  "categoria": "colaboracion"},
    "contribuir":   {"perfil": "Hibrido", "peso": 0.8,  "categoria": "colaboracion"},
    "participar":   {"perfil": "Hibrido", "peso": 0.75, "categoria": "colaboracion"},
    "involucrarse": {"perfil": "Hibrido", "peso": 0.8,  "categoria": "colaboracion"},
    "integrarse":   {"perfil": "Hibrido", "peso": 0.75, "categoria": "colaboracion"},
    "unirse":       {"perfil": "Hibrido", "peso": 0.7,  "categoria": "colaboracion"},

    # Negociación y consenso
    "negociar":     {"perfil": "Hibrido", "peso": 0.9,  "categoria": "negociacion"},
    "mediar":       {"perfil": "Hibrido", "peso": 0.85, "categoria": "negociacion"},
    "acordar":      {"perfil": "Hibrido", "peso": 0.85, "categoria": "negociacion"},
    "consensuar":   {"perfil": "Hibrido", "peso": 0.9,  "categoria": "negociacion"},
    "conciliar":    {"perfil": "Hibrido", "peso": 0.85, "categoria": "negociacion"},
    "pactar":       {"perfil": "Hibrido", "peso": 0.8,  "categoria": "negociacion"},
    "proponer":     {"perfil": "Hibrido", "peso": 0.75, "categoria": "negociacion"},
    "sugerir":      {"perfil": "Hibrido", "peso": 0.7,  "categoria": "negociacion"},
    "plantear":     {"perfil": "Hibrido", "peso": 0.7,  "categoria": "negociacion"},

    # Escucha y comunicación bidireccional
    "escuchar":     {"perfil": "Hibrido", "peso": 0.8,  "categoria": "comunicacion"},
    "consultar":    {"perfil": "Hibrido", "peso": 0.75, "categoria": "comunicacion"},
    "preguntar":    {"perfil": "Hibrido", "peso": 0.65, "categoria": "comunicacion"},
    "dialogar":     {"perfil": "Hibrido", "peso": 0.85, "categoria": "comunicacion"},
    "debatir":      {"perfil": "Hibrido", "peso": 0.8,  "categoria": "comunicacion"},
    "discutir":     {"perfil": "Hibrido", "peso": 0.7,  "categoria": "comunicacion"},
    "conversar":    {"perfil": "Hibrido", "peso": 0.75, "categoria": "comunicacion"},
    "compartir":    {"perfil": "Hibrido", "peso": 0.7,  "categoria": "comunicacion"},
    "informar":     {"perfil": "Hibrido", "peso": 0.65, "categoria": "comunicacion"},

    # Adaptabilidad y flexibilidad
    "adaptarse":    {"perfil": "Hibrido", "peso": 0.85, "categoria": "adaptabilidad"},
    "ajustarse":    {"perfil": "Hibrido", "peso": 0.8,  "categoria": "adaptabilidad"},
    "flexibilizar": {"perfil": "Hibrido", "peso": 0.85, "categoria": "adaptabilidad"},
    "cambiar":      {"perfil": "Hibrido", "peso": 0.6,  "categoria": "adaptabilidad"},
    "reconsiderar": {"perfil": "Hibrido", "peso": 0.75, "categoria": "adaptabilidad"},
    "evaluar":      {"perfil": "Hibrido", "peso": 0.65, "categoria": "adaptabilidad"},
    "analizar":     {"perfil": "Hibrido", "peso": 0.65, "categoria": "adaptabilidad"},
    "reflexionar":  {"perfil": "Hibrido", "peso": 0.7,  "categoria": "adaptabilidad"},
    "considerar":   {"perfil": "Hibrido", "peso": 0.65, "categoria": "adaptabilidad"},

    # Delegación equilibrada
    "delegar":      {"perfil": "Hibrido", "peso": 0.8,  "categoria": "delegacion"},
    "asignar":      {"perfil": "Hibrido", "peso": 0.7,  "categoria": "delegacion"},
    "distribuir":   {"perfil": "Hibrido", "peso": 0.75, "categoria": "delegacion"},
    "coordinar":    {"perfil": "Hibrido", "peso": 0.85, "categoria": "delegacion"},
    "organizar":    {"perfil": "Hibrido", "peso": 0.75, "categoria": "delegacion"},
    "planificar":   {"perfil": "Hibrido", "peso": 0.75, "categoria": "delegacion"},


    # ----------------------------------------------------------
    # PERFIL SUMISO
    # Indicadores: obediencia, evitación, dependencia,
    # resignación, pasividad, búsqueda de aprobación
    # Base: dimensión C del DISC + estilo laissez-faire de Lewin
    #       + alta comunión sin agencia (Bakan)
    # ----------------------------------------------------------

    # Obediencia y subordinación
    "obedecer":     {"perfil": "Sumiso", "peso": 1.0,  "categoria": "obediencia"},
    "acatar":       {"perfil": "Sumiso", "peso": 0.95, "categoria": "obediencia"},
    "cumplir":      {"perfil": "Sumiso", "peso": 0.7,  "categoria": "obediencia"},
    "someterse":    {"perfil": "Sumiso", "peso": 1.0,  "categoria": "obediencia"},
    "subordinarse": {"perfil": "Sumiso", "peso": 0.95, "categoria": "obediencia"},
    "seguir":       {"perfil": "Sumiso", "peso": 0.65, "categoria": "obediencia"},
    "respetar":     {"perfil": "Sumiso", "peso": 0.55, "categoria": "obediencia"},

    # Evitación y retirada
    "evitar":       {"perfil": "Sumiso", "peso": 0.9,  "categoria": "evitacion"},
    "huir":         {"perfil": "Sumiso", "peso": 0.95, "categoria": "evitacion"},
    "retirarse":    {"perfil": "Sumiso", "peso": 0.85, "categoria": "evitacion"},
    "ceder":        {"perfil": "Sumiso", "peso": 0.85, "categoria": "evitacion"},
    "rendirse":     {"perfil": "Sumiso", "peso": 1.0,  "categoria": "evitacion"},
    "abandonar":    {"perfil": "Sumiso", "peso": 0.9,  "categoria": "evitacion"},
    "resignarse":   {"perfil": "Sumiso", "peso": 1.0,  "categoria": "evitacion"},
    "callar":       {"perfil": "Sumiso", "peso": 0.85, "categoria": "evitacion"},
    "aguantar":     {"perfil": "Sumiso", "peso": 0.8,  "categoria": "evitacion"},
    "tolerar":      {"perfil": "Sumiso", "peso": 0.7,  "categoria": "evitacion"},
    "soportar":     {"perfil": "Sumiso", "peso": 0.75, "categoria": "evitacion"},

    # Dependencia y búsqueda de aprobación
    "pedir":        {"perfil": "Sumiso", "peso": 0.6,  "categoria": "dependencia"},
    "solicitar":    {"perfil": "Sumiso", "peso": 0.55, "categoria": "dependencia"},
    "esperar":      {"perfil": "Sumiso", "peso": 0.65, "categoria": "dependencia"},
    "depender":     {"perfil": "Sumiso", "peso": 0.9,  "categoria": "dependencia"},
    "necesitar":    {"perfil": "Sumiso", "peso": 0.6,  "categoria": "dependencia"},
    "conformarse":  {"perfil": "Sumiso", "peso": 0.95, "categoria": "dependencia"},
    "aceptar":      {"perfil": "Sumiso", "peso": 0.65, "categoria": "dependencia"},

    # Pasividad e inacción
    "dudar":        {"perfil": "Sumiso", "peso": 0.8,  "categoria": "pasividad"},
    "temer":        {"perfil": "Sumiso", "peso": 0.85, "categoria": "pasividad"},
    "preocuparse":  {"perfil": "Sumiso", "peso": 0.7,  "categoria": "pasividad"},
    "vacilar":      {"perfil": "Sumiso", "peso": 0.85, "categoria": "pasividad"},
    "postergar":    {"perfil": "Sumiso", "peso": 0.8,  "categoria": "pasividad"},
    "procrastinar": {"perfil": "Sumiso", "peso": 0.9,  "categoria": "pasividad"},
    "dilatar":      {"perfil": "Sumiso", "peso": 0.8,  "categoria": "pasividad"},
    "inhibirse":    {"perfil": "Sumiso", "peso": 0.9,  "categoria": "pasividad"},


    # ----------------------------------------------------------
    # AMPLIACIÓN — VERBOS COLOQUIALES Y FAMILIARES
    # Necesarios para el banco de 45 preguntas de infancia,
    # familia y vida cotidiana, donde el registro lingüístico
    # es informal y rara vez usa vocabulario corporativo.
    # ----------------------------------------------------------

    # Dominante — coloquial
    "mangonear":    {"perfil": "Dominante", "peso": 0.85, "categoria": "control"},
    "regañar":      {"perfil": "Dominante", "peso": 0.75, "categoria": "control"},
    "castigar":     {"perfil": "Dominante", "peso": 0.85, "categoria": "control"},
    "prohibir":     {"perfil": "Dominante", "peso": 0.85, "categoria": "control"},
    "gritar":       {"perfil": "Dominante", "peso": 0.7,  "categoria": "influencia"},
    "pelear":       {"perfil": "Dominante", "peso": 0.7,  "categoria": "competitividad"},
    "reclamarle":   {"perfil": "Dominante", "peso": 0.75, "categoria": "competitividad"},
    "encargarse":   {"perfil": "Dominante", "peso": 0.65, "categoria": "iniciativa"},
    "armar":        {"perfil": "Dominante", "peso": 0.55, "categoria": "iniciativa"},  # "armé el plan"
    "proponer":     {"perfil": "Dominante", "peso": 0.5,  "categoria": "iniciativa"},  # ambiguo, también Híbrido
    "elegir":       {"perfil": "Dominante", "peso": 0.55, "categoria": "decision"},
    "escoger":      {"perfil": "Dominante", "peso": 0.55, "categoria": "decision"},
    "mandonear":    {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},
    "corregir":     {"perfil": "Dominante", "peso": 0.7,  "categoria": "control"},
    "hacerme_cargo":{"perfil": "Dominante", "peso": 0.7,  "categoria": "iniciativa"},

    # Híbrido — coloquial
    "compartir_con": {"perfil": "Hibrido", "peso": 0.7,  "categoria": "colaboracion"},
    "turnarse":      {"perfil": "Hibrido", "peso": 0.8,  "categoria": "colaboracion"},
    "perdonar":      {"perfil": "Hibrido", "peso": 0.7,  "categoria": "negociacion"},
    "reconciliarse": {"perfil": "Hibrido", "peso": 0.85, "categoria": "negociacion"},
    "platicar":      {"perfil": "Hibrido", "peso": 0.7,  "categoria": "comunicacion"},
    "charlar":       {"perfil": "Hibrido", "peso": 0.65, "categoria": "comunicacion"},
    "explicar":      {"perfil": "Hibrido", "peso": 0.6,  "categoria": "comunicacion"},
    "entender":      {"perfil": "Hibrido", "peso": 0.55, "categoria": "comunicacion"},
    "comprender":    {"perfil": "Hibrido", "peso": 0.55, "categoria": "comunicacion"},
    "acompañarlo":   {"perfil": "Hibrido", "peso": 0.65, "categoria": "colaboracion"},
    "invitar":       {"perfil": "Hibrido", "peso": 0.6,  "categoria": "colaboracion"},
    "juntarse":      {"perfil": "Hibrido", "peso": 0.65, "categoria": "colaboracion"},
    "acomodarse":    {"perfil": "Hibrido", "peso": 0.6,  "categoria": "adaptabilidad"},
    "intentar":      {"perfil": "Hibrido", "peso": 0.5,  "categoria": "adaptabilidad"},
    "buscar_solucion": {"perfil": "Hibrido", "peso": 0.7, "categoria": "negociacion"},

    # Sumiso — coloquial
    "obedecerle":   {"perfil": "Sumiso", "peso": 0.95, "categoria": "obediencia"},
    "hacer_caso":   {"perfil": "Sumiso", "peso": 0.85, "categoria": "obediencia"},
    "quedarse_callado": {"perfil": "Sumiso", "peso": 0.85, "categoria": "evitacion"},
    "agachar_la_cabeza": {"perfil": "Sumiso", "peso": 0.9, "categoria": "evitacion"},
    "llorar":       {"perfil": "Sumiso", "peso": 0.6,  "categoria": "pasividad"},
    "esconderse":   {"perfil": "Sumiso", "peso": 0.85, "categoria": "evitacion"},
    "alejarse":     {"perfil": "Sumiso", "peso": 0.7,  "categoria": "evitacion"},
    "disculparse":  {"perfil": "Sumiso", "peso": 0.6,  "categoria": "dependencia"},
    "preguntarle":  {"perfil": "Sumiso", "peso": 0.5,  "categoria": "dependencia"},  # "le pregunté qué hacer"
    "dejar_pasar":  {"perfil": "Sumiso", "peso": 0.75, "categoria": "evitacion"},
    "no_decir_nada":{"perfil": "Sumiso", "peso": 0.85, "categoria": "evitacion"},
    "quedarme_quieto": {"perfil": "Sumiso", "peso": 0.8, "categoria": "pasividad"},
    "avergonzarse": {"perfil": "Sumiso", "peso": 0.65, "categoria": "pasividad"},


    # ----------------------------------------------------------
    # AMPLIACIÓN — SUSTANTIVOS CONDUCTUALES
    # spaCy etiqueta estos tokens como NOUN; el procesador filtra
    # por lema igual que con los verbos, sin requerir que sean
    # verbos para activar puntaje.
    # ----------------------------------------------------------

    # Dominante — sustantivos
    "líder":        {"perfil": "Dominante", "peso": 0.85, "categoria": "control"},
    "jefe":         {"perfil": "Dominante", "peso": 0.6,  "categoria": "control"},  # contextual, peso moderado
    "autoridad":    {"perfil": "Dominante", "peso": 0.75, "categoria": "control"},
    "control":      {"perfil": "Dominante", "peso": 0.7,  "categoria": "control"},
    "decisión":     {"perfil": "Dominante", "peso": 0.6,  "categoria": "decision"},
    "iniciativa":   {"perfil": "Dominante", "peso": 0.7,  "categoria": "iniciativa"},
    "competencia":  {"perfil": "Dominante", "peso": 0.6,  "categoria": "competitividad"},
    "discusión":    {"perfil": "Dominante", "peso": 0.5,  "categoria": "competitividad"},

    # Híbrido — sustantivos
    "equipo":       {"perfil": "Hibrido", "peso": 0.55, "categoria": "colaboracion"},
    "acuerdo":      {"perfil": "Hibrido", "peso": 0.75, "categoria": "negociacion"},
    "consenso":     {"perfil": "Hibrido", "peso": 0.8,  "categoria": "negociacion"},
    "diálogo":      {"perfil": "Hibrido", "peso": 0.75, "categoria": "comunicacion"},
    "amistad":      {"perfil": "Hibrido", "peso": 0.5,  "categoria": "colaboracion"},
    "ayuda":        {"perfil": "Hibrido", "peso": 0.55, "categoria": "colaboracion"},
    "compromiso":   {"perfil": "Hibrido", "peso": 0.6,  "categoria": "negociacion"},

    # Sumiso — sustantivos
    "obediencia":   {"perfil": "Sumiso", "peso": 0.85, "categoria": "obediencia"},
    "miedo":        {"perfil": "Sumiso", "peso": 0.7,  "categoria": "pasividad"},
    "temor":        {"perfil": "Sumiso", "peso": 0.7,  "categoria": "pasividad"},
    "vergüenza":    {"perfil": "Sumiso", "peso": 0.6,  "categoria": "pasividad"},
    "paciencia":    {"perfil": "Sumiso", "peso": 0.55, "categoria": "evitacion"},
    "resignación":  {"perfil": "Sumiso", "peso": 0.9,  "categoria": "evitacion"},
    "dependencia":  {"perfil": "Sumiso", "peso": 0.8,  "categoria": "dependencia"},


    # ----------------------------------------------------------
    # AMPLIACIÓN — ADJETIVOS CONDUCTUALES
    # Frecuentes en descripciones de sí mismo o de terceros
    # ("yo era muy terco", "ella es muy obediente").
    # ----------------------------------------------------------

    # Dominante — adjetivos
    "terco":        {"perfil": "Dominante", "peso": 0.8,  "categoria": "control"},
    "mandón":       {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},
    "autoritario":  {"perfil": "Dominante", "peso": 0.9,  "categoria": "control"},
    "decidido":     {"perfil": "Dominante", "peso": 0.75, "categoria": "decision"},
    "competitivo":  {"perfil": "Dominante", "peso": 0.8,  "categoria": "competitividad"},
    "impulsivo":    {"perfil": "Dominante", "peso": 0.65, "categoria": "iniciativa"},
    "exigente":     {"perfil": "Dominante", "peso": 0.8,  "categoria": "control"},
    "directo":      {"perfil": "Dominante", "peso": 0.6,  "categoria": "influencia"},

    # Híbrido — adjetivos
    "colaborativo": {"perfil": "Hibrido", "peso": 0.85, "categoria": "colaboracion"},
    "flexible":     {"perfil": "Hibrido", "peso": 0.8,  "categoria": "adaptabilidad"},
    "comprensivo":  {"perfil": "Hibrido", "peso": 0.75, "categoria": "comunicacion"},
    "diplomático":  {"perfil": "Hibrido", "peso": 0.85, "categoria": "negociacion"},
    "sociable":     {"perfil": "Hibrido", "peso": 0.6,  "categoria": "colaboracion"},
    "paciente":     {"perfil": "Hibrido", "peso": 0.5,  "categoria": "adaptabilidad"},  # ambiguo, también Sumiso

    # Sumiso — adjetivos
    "obediente":    {"perfil": "Sumiso", "peso": 0.9,  "categoria": "obediencia"},
    "tímido":       {"perfil": "Sumiso", "peso": 0.75, "categoria": "pasividad"},
    "sumiso":       {"perfil": "Sumiso", "peso": 0.95, "categoria": "obediencia"},
    "callado":      {"perfil": "Sumiso", "peso": 0.7,  "categoria": "evitacion"},
    "dependiente":  {"perfil": "Sumiso", "peso": 0.85, "categoria": "dependencia"},
    "inseguro":     {"perfil": "Sumiso", "peso": 0.7,  "categoria": "pasividad"},
    "miedoso":      {"perfil": "Sumiso", "peso": 0.75, "categoria": "pasividad"},
    "pasivo":       {"perfil": "Sumiso", "peso": 0.85, "categoria": "pasividad"},
}


# =============================================================
#  MODIFICADORES DE NEGACIÓN
#  Cuando spaCy detecta dependencia sintáctica 'neg' sobre
#  un verbo del lexicón, el peso se multiplica por este factor.
#
#  Lógica:
#  - "Lideré el equipo"  → Dominante +0.9
#  - "No lideré nada"    → Dominante +0.9 × (-0.8) = -0.72
# =============================================================

FACTOR_NEGACION = -0.8


# =============================================================
#  LEMAS AMBIGUOS — requieren verificación sintáctica adicional
#  Estas palabras solo deben puntuar si el token funciona como
#  sujeto (nsubj) o atributo del sujeto (attr) de la oración,
#  es decir, cuando describen al propio candidato y no a un
#  tercero mencionado de forma incidental.
#  Ej: "mi jefe me regañó" (NO puntúa "jefe")
#      "yo era el jefe del grupo" (SÍ puntúa "jefe", es attr de "yo")
# =============================================================

LEMAS_AMBIGUOS = {
    "jefe", "paciente", "decisión", "discusión", "ayuda",
    # Verbos que solo puntúan cuando el candidato es el agente activo
    "acatar",    # "acataba" en "los demás acataban" NO debe puntuar
    "tomar",     # "tomar decisiones" como objeto NO debe puntuar como Dominante
    "seguir",    # "prefiero seguir al grupo" vs "los demás me seguían"
    "pedir",     # "me pidieron" vs "pedí yo"
    "solicitar", # mismo caso que pedir
}


# =============================================================
#  UMBRAL DE VALIDACIÓN (RN-01)
# =============================================================

MIN_PALABRAS = 10


# =============================================================
#  FUNCIONES DE CONSULTA
# =============================================================

def consultar_lema(lema: str) -> dict | None:
    """
    Busca un lema en el lexicón.
    Retorna el dict con perfil, peso y categoría, o None si no existe.
    """
    return LEXICO_VERBAL.get(lema.lower(), None)


def listar_por_perfil(perfil: str) -> dict:
    """
    Retorna todos los lemas asociados a un perfil específico.
    perfil: 'Dominante', 'Hibrido' o 'Sumiso'
    """
    return {
        lema: datos
        for lema, datos in LEXICO_VERBAL.items()
        if datos["perfil"] == perfil
    }


def listar_por_categoria(categoria: str) -> dict:
    """
    Retorna todos los lemas de una categoría conductual específica.
    Ej: 'control', 'evitacion', 'negociacion'
    """
    return {
        lema: datos
        for lema, datos in LEXICO_VERBAL.items()
        if datos["categoria"] == categoria
    }