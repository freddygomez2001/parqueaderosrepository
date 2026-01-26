# app/utils/validators.py
import re

def validar_formato_hora(hora_str: str) -> bool:
    """Validar formato HH:MM"""
    if not hora_str:
        return False
    
    # Patrón para HH:MM (24 horas)
    patron = r'^([01]?[0-9]|2[0-3]):([0-5][0-9])$'
    
    # Verificar con regex
    if not re.match(patron, hora_str):
        return False
    
    # Verificar valores específicos
    try:
        hora, minuto = map(int, hora_str.split(':'))
        return 0 <= hora < 24 and 0 <= minuto < 60
    except ValueError:
        return False

def validar_precio(precio) -> bool:
    """Validar que el precio sea un número válido y no negativo"""
    try:
        if precio is None:
            return False
        
        # Convertir a float si es string
        if isinstance(precio, str):
            precio = float(precio.replace(',', '.'))
        else:
            precio = float(precio)
        
        return precio >= 0 and not (precio.is_infinite() or precio.is_nan())
    except (ValueError, TypeError):
        return False

def validar_rango_minutos(min_minutos: int, max_minutos: int) -> bool:
    """Validar rango de minutos"""
    if min_minutos is None or max_minutos is None:
        return False
    
    if min_minutos < 0 or max_minutos < 0:
        return False
    
    if min_minutos >= max_minutos:
        return False
    
    return True