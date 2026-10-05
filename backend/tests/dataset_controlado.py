"""
Dataset Controlado de Respuestas Abiertas
OE9: Validación del Sistema mediante Pruebas de Precisión Algorítmica

Estructura de cada entrada:
- id: identificador único
- perfil_esperado: Dominante | Hibrido | Sumiso
- texto: respuesta en español coloquial boliviano
- palabras_conductuales: lista de palabras que DEBEN ser detectadas por el NLP
- perfil_palabras: perfil esperado por cada palabra clave

Este dataset fue construido con vocabulario intencionalmente marcado
para maximizar la tasa de detección y permitir el cálculo de métricas
de precisión, recall y F1-score del motor NLP determinista.
"""

DATASET_CONTROLADO = [

    # ─── PERFIL DOMINANTE ────────────────────────────────────────────────────
    {
        "id": "D01",
        "perfil_esperado": "Dominante",
        "texto": (
            "Cuando éramos niños yo siempre decidía a qué jugábamos, los demás me seguían "
            "porque yo organizaba todo y nadie se quejaba, si alguien no quería acataba igual "
            "porque era lo mejor para el grupo."
        ),
        "palabras_conductuales": ["decidía", "organizaba", "acataba"],
        "perfiles_palabras": {
            "decidía":   "Dominante",
            "organizaba": "Hibrido",
            "acataba":   "Sumiso",
        }
    },
    {
        "id": "D02",
        "perfil_esperado": "Dominante",
        "texto": (
            "En mi último trabajo tuve que enfrentar a mi jefe directamente porque su decisión "
            "era incorrecta, lo confronté en la reunión, expuse mis argumentos y al final impuse "
            "mi criterio porque tenía razón."
        ),
        "palabras_conductuales": ["enfrentar", "confronté", "impuse"],
        "perfiles_palabras": {
            "enfrentar": "Dominante",
            "confronté": "Dominante",
            "impuse":    "Dominante",
        }
    },
    {
        "id": "D03",
        "perfil_esperado": "Dominante",
        "texto": (
            "Cuando hay un problema en casa yo tomo el control, dirijo la situación, exijo que "
            "todos participen y me encargo de que las cosas se resuelvan rápido sin perder tiempo "
            "en discusiones innecesarias."
        ),
        "palabras_conductuales": ["tomo", "dirijo", "exijo"],
        "perfiles_palabras": {
            "tomo":   "Dominante",
            "dirijo": "Dominante",
            "exijo":  "Dominante",
        }
    },
    {
        "id": "D04",
        "perfil_esperado": "Dominante",
        "texto": (
            "De niño era muy mandón, siempre quería ganar, competía con mis hermanos por todo "
            "y nunca me rendía, si perdía buscaba la forma de vencer la próxima vez."
        ),
        "palabras_conductuales": ["mandón", "ganar", "competía", "rendía", "vencer"],
        "perfiles_palabras": {
            "mandón":   "Dominante",
            "ganar":    "Dominante",
            "competía": "Dominante",
            "rendía":   "Sumiso",
            "vencer":   "Dominante",
        }
    },
    {
        "id": "D05",
        "perfil_esperado": "Dominante",
        "texto": (
            "Yo mismo corrijo los errores del equipo directamente, exijo resultados concretos "
            "y presiono hasta que las cosas se hagan bien, no tolero el trabajo mediocre."
        ),
        "palabras_conductuales": ["corrijo", "exijo", "presiono"],
        "perfiles_palabras": {
            "corrijo":  "Dominante",
            "exijo":    "Dominante",
            "presiono": "Dominante",
        }
    },

    # ─── PERFIL HÍBRIDO ──────────────────────────────────────────────────────
    {
        "id": "H01",
        "perfil_esperado": "Hibrido",
        "texto": (
            "Cuando hay un conflicto entre amigos prefiero escuchar a los dos lados, analizar "
            "la situación y proponer una solución que funcione para todos, me gusta que lleguemos "
            "a un acuerdo sin que nadie salga perdiendo."
        ),
        "palabras_conductuales": ["escuchar", "analizar", "proponer", "acuerdo"],
        "perfiles_palabras": {
            "escuchar": "Hibrido",
            "analizar": "Hibrido",
            "proponer": "Hibrido",
            "acuerdo":  "Hibrido",
        }
    },
    {
        "id": "H02",
        "perfil_esperado": "Hibrido",
        "texto": (
            "En el trabajo siempre consulto al equipo antes de decidir algo importante, me gusta "
            "colaborar, distribuir las tareas según las habilidades de cada uno y coordinar para "
            "que todo fluya bien."
        ),
        "palabras_conductuales": ["consulto", "colaborar", "distribuir", "coordinar"],
        "perfiles_palabras": {
            "consulto":   "Hibrido",
            "colaborar":  "Hibrido",
            "distribuir": "Hibrido",
            "coordinar":  "Hibrido",
        }
    },
    {
        "id": "H03",
        "perfil_esperado": "Hibrido",
        "texto": (
            "Con mi familia cuando hay desacuerdos prefiero dialogar, busco que todos se expresen, "
            "intento comprender cada postura y luego propongo algo que nos beneficie a todos "
            "sin imponer mi criterio."
        ),
        "palabras_conductuales": ["dialogar", "comprender", "propongo"],
        "perfiles_palabras": {
            "dialogar":   "Hibrido",
            "comprender": "Hibrido",
            "propongo":   "Hibrido",
        }
    },
    {
        "id": "H04",
        "perfil_esperado": "Hibrido",
        "texto": (
            "Soy una persona flexible, si el plan no funciona me adapto, evalúo las opciones "
            "disponibles, escucho sugerencias del equipo y ajusto la estrategia para alcanzar "
            "el objetivo de otra manera."
        ),
        "palabras_conductuales": ["flexible", "adapto", "evalúo", "escucho"],
        "perfiles_palabras": {
            "flexible": "Hibrido",
            "adapto":   "Hibrido",
            "evalúo":   "Hibrido",
            "escucho":  "Hibrido",
        }
    },
    {
        "id": "H05",
        "perfil_esperado": "Hibrido",
        "texto": (
            "Cuando organizo algo con amigos propongo ideas pero también escucho las de ellos, "
            "negociamos qué hacer, nos turnamos para decidir y al final todos participamos "
            "en la planificación."
        ),
        "palabras_conductuales": ["propongo", "escucho", "negociamos", "participamos"],
        "perfiles_palabras": {
            "propongo":     "Hibrido",
            "escucho":      "Hibrido",
            "negociamos":   "Hibrido",
            "participamos": "Hibrido",
        }
    },

    # ─── PERFIL SUMISO ───────────────────────────────────────────────────────
    {
        "id": "S01",
        "perfil_esperado": "Sumiso",
        "texto": (
            "De niño era muy obediente, siempre hacía caso a mis padres sin cuestionar, esperaba "
            "que me dijeran qué hacer y si me decían que no podía hacer algo simplemente me "
            "conformaba y me quedaba callado."
        ),
        "palabras_conductuales": ["obediente", "esperaba", "conformaba", "callado"],
        "perfiles_palabras": {
            "obediente":  "Sumiso",
            "esperaba":   "Sumiso",
            "conformaba": "Sumiso",
            "callado":    "Sumiso",
        }
    },
    {
        "id": "S02",
        "perfil_esperado": "Sumiso",
        "texto": (
            "En el trabajo prefiero acatar las instrucciones que me dan, no me gusta discutir "
            "con mis superiores, si me piden algo lo cumplo aunque no esté de acuerdo, evito "
            "los conflictos y aguanto."
        ),
        "palabras_conductuales": ["acatar", "cumplo", "evito", "aguanto"],
        "perfiles_palabras": {
            "acatar": "Sumiso",
            "cumplo": "Sumiso",
            "evito":  "Sumiso",
            "aguanto": "Sumiso",
        }
    },
    {
        "id": "S03",
        "perfil_esperado": "Sumiso",
        "texto": (
            "Cuando hay un problema prefiero evitarlo, me alejo de las discusiones y cedo "
            "ante los demás para mantener la armonía, me resigno aunque no me parezca justo."
        ),
        "palabras_conductuales": ["evitar", "cedo", "resigno"],
        "perfiles_palabras": {
            "evitar":  "Sumiso",
            "cedo":    "Sumiso",
            "resigno": "Sumiso",
        }
    },
    {
        "id": "S04",
        "perfil_esperado": "Sumiso",
        "texto": (
            "Soy una persona que depende mucho de la opinión de otros para tomar decisiones, "
            "siempre le pregunto a alguien antes de actuar, me cuesta decidir solo y temo "
            "equivocarme."
        ),
        "palabras_conductuales": ["depende", "pregunto", "temo"],
        "perfiles_palabras": {
            "depende":  "Sumiso",
            "pregunto": "Sumiso",
            "temo":     "Sumiso",
        }
    },
    {
        "id": "S05",
        "perfil_esperado": "Sumiso",
        "texto": (
            "Con mis amigos casi nunca opino, espero que los demás tomen la iniciativa, "
            "me conformo con cualquier plan que elijan y obedezco sin cuestionar nada."
        ),
        "palabras_conductuales": ["espero", "conformo", "obedezco"],
        "perfiles_palabras": {
            "espero":   "Sumiso",
            "conformo": "Sumiso",
            "obedezco": "Sumiso",
        }
    },
]