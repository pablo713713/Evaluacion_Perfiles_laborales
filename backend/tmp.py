import sys
sys.path.insert(0, '.')

from app.domain.nlp.motor_cat import calcular_probabilidades

resultado = calcular_probabilidades({'Dominante': -5.0, 'Hibrido': 0.0, 'Sumiso': 3.0})
print("Test negativos:", resultado)

resultado2 = calcular_probabilidades({'Dominante': 0.8, 'Hibrido': 0.0, 'Sumiso': -0.6})
print("Test mixto:", resultado2)