import spacy
from app.nlp.lexico_nlp import LEXICO_VERBAL, FACTOR_NEGACION, MIN_PALABRAS, LEMAS_AMBIGUOS

nlp = spacy.load("es_core_news_md")


def validar_longitud(texto: str) -> bool:
    """Verifica que la respuesta tenga al menos MIN_PALABRAS palabras (RN-01)."""
    palabras = [t for t in texto.strip().split() if t]
    return len(palabras) >= MIN_PALABRAS


def detectar_evasion(doc) -> bool:
    """
    Detecta si el texto es evasivo o sin sentido (RN-04).
    Criterios: mayoría de tokens no reconocidos, sin verbos, texto repetitivo.
    """
    tokens_validos = [t for t in doc if not t.is_punct and not t.is_space]
    if not tokens_validos:
        return True
    verbos = [t for t in doc if t.pos_ == "VERB"]
    # Sin verbos y menos de 5 tokens reconocidos = evasión probable
    if not verbos and len(tokens_validos) < 5:
        return True
    return False


def analizar_texto(texto: str) -> dict:
    """
    Procesa el texto libre del candidato con spaCy.
    Retorna un dict con:
      - es_valida: bool (pasa el mínimo de palabras)
      - es_evasiva: bool
      - conteo_palabras: int
      - rastros: lista de tokens que puntuaron en el lexicón
      - puntajes: {"Dominante": float, "Hibrido": float, "Sumiso": float}
    """
    conteo = len([t for t in texto.strip().split() if t])
    
    if not validar_longitud(texto):
        return {
            "es_valida": False,
            "es_evasiva": False,
            "conteo_palabras": conteo,
            "rastros": [],
            "puntajes": {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0},
        }

    doc = nlp(texto)

    if detectar_evasion(doc):
        return {
            "es_valida": True,
            "es_evasiva": True,
            "conteo_palabras": conteo,
            "rastros": [],
            "puntajes": {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0},
        }

    puntajes = {"Dominante": 0.0, "Hibrido": 0.0, "Sumiso": 0.0}
    rastros = []

    for token in doc:
        lema = token.lemma_.lower()
        entrada = LEXICO_VERBAL.get(lema)

        if not entrada:
            continue
        if lema in LEMAS_AMBIGUOS and token.dep_ not in ("nsubj", "attr", "ROOT"):
            continue

        tiene_negacion = any(
            child.dep_ == "neg" for child in token.children
        )

        peso_base = entrada["peso"]
        peso_final = peso_base * FACTOR_NEGACION if tiene_negacion else peso_base
        perfil = entrada["perfil"]

        puntajes[perfil] = round(puntajes[perfil] + peso_final, 4)

        rastros.append({
            "palabra_o_frase_extraida": token.text,
            "verbo_lematizado": lema,
            "dependencia_sintactica": token.dep_,
            "pos_tag": token.pos_,
            "perfil_asignado": perfil,
            "puntos_sumados": round(peso_final, 4),
            "tiene_negacion": tiene_negacion,
        })

    # Normalizar puntajes negativos a 0 (no pueden ser negativos en el acumulado)
    puntajes = {k: max(0.0, v) for k, v in puntajes.items()}

    return {
        "es_valida": True,
        "es_evasiva": False,
        "conteo_palabras": conteo,
        "rastros": rastros,
        "puntajes": puntajes,
    }
