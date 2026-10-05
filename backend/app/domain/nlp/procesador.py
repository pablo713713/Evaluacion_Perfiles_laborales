"""
Módulo de Procesamiento de Lenguaje Natural Determinista
Pipeline: tokenización → lematización → POS tagging → dependencias → auditoría
"""
import spacy
from app.domain.nlp.lexico_nlp import LEXICO_VERBAL, FACTOR_NEGACION, MIN_PALABRAS, LEMAS_AMBIGUOS

nlp = spacy.load("es_core_news_md")

# Adverbios de negación que spaCy no siempre etiqueta como dep_=="neg"
# pero semánticamente niegan el verbo principal de la oración
ADVERBIOS_NEGACION = {"nunca", "jamás", "tampoco", "ni"}


def validar_longitud(texto: str) -> bool:
    """Verifica que la respuesta tenga al menos MIN_PALABRAS palabras (RN-01)."""
    palabras = [t for t in texto.strip().split() if t]
    return len(palabras) >= MIN_PALABRAS


def detectar_evasion(doc, rastros: list) -> bool:
    """
    Detecta si el texto es evasivo (RN-04).
    Un texto es evasivo cuando:
    - No tiene tokens con verbos (sin estructura narrativa)
    - O tiene verbos pero ninguno produce rastro léxico conductual
    """
    tokens_validos = [t for t in doc if not t.is_punct and not t.is_space]
    if not tokens_validos:
        return True
    verbos = [t for t in doc if t.pos_ == "VERB"]
    # Sin verbos y sin estructura = evasión
    if not verbos and len(tokens_validos) < 5:
        return True
    # Con verbos pero sin ningún rastro conductual = evasión
    if verbos and len(rastros) == 0:
        return True
    return False


def tiene_negacion_contextual(token, doc) -> bool:
    """
    Detecta negación sobre un token considerando:
    1. Dependencia sintáctica 'neg' directa (hijos del token)
    2. Adverbios de negación en la misma oración como modificadores
    """
    # Negación sintáctica directa (dep_ == "neg" en hijos)
    if any(child.dep_ == "neg" for child in token.children):
        return True

    # Negación por adverbios en la misma oración (ej: "nunca propongo")
    sent_tokens = list(token.sent)
    for t in sent_tokens:
        if t.lemma_.lower() in ADVERBIOS_NEGACION and t.head == token:
            return True

    return False


def analizar_texto(texto: str) -> dict:
    """
    Procesa el texto libre del candidato con spaCy.
    Retorna un dict con:
      - es_valida: bool (pasa el mínimo de palabras RN-01)
      - es_evasiva: bool (sin rastro conductual RN-04)
      - conteo_palabras: int
      - rastros: lista de tokens que puntuaron en el lexicón
      - puntajes: {"Dominante": float, "Hibrido": float, "Sumiso": float}
    """
    conteo = len([t for t in texto.strip().split() if t])

    if not validar_longitud(texto):
        return {
            "es_valida":       False,
            "es_evasiva":      False,
            "conteo_palabras": conteo,
            "rastros":         [],
            "puntajes":        {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0},
        }

    doc = nlp(texto)
    puntajes = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
    rastros = []

    for token in doc:
        lema = token.lemma_.lower()
        entrada = LEXICO_VERBAL.get(lema)

        if not entrada:
            continue

        # Filtro de lemas ambiguos: solo puntúan cuando el candidato es el agente
        if lema in LEMAS_AMBIGUOS and token.dep_ not in ("nsubj", "attr", "ROOT"):
            continue

        negacion = tiene_negacion_contextual(token, doc)
        peso_base  = entrada["peso"]
        peso_final = peso_base * FACTOR_NEGACION if negacion else peso_base
        perfil     = entrada["perfil"]

        puntajes[perfil] = round(puntajes[perfil] + peso_final, 4)

        rastros.append({
            "palabra_o_frase_extraida": token.text,
            "verbo_lematizado":         lema,
            "dependencia_sintactica":   token.dep_,
            "pos_tag":                  token.pos_,
            "perfil_asignado":          perfil,
            "puntos_sumados":           round(peso_final, 4),
            "negacion_detectada":       negacion,   # nombre unificado con BD
            "tiene_negacion":           negacion,   # alias para compatibilidad
        })

    # Normalizar puntajes negativos a 0
    puntajes = {k: max(0.0, v) for k, v in puntajes.items()}

    es_evasiva = detectar_evasion(doc, rastros)

    return {
        "es_valida":       True,
        "es_evasiva":      es_evasiva,
        "conteo_palabras": conteo,
        "rastros":         rastros,
        "puntajes":        puntajes,
    }