# app/esquemas/__init__.py
from .configuracion_schema import (
    ConfiguracionBase,
    ConfiguracionUpdate,
    ConfiguracionResponse,
    RangoPersonalizado
)

__all__ = [
    'ConfiguracionBase',
    'ConfiguracionUpdate',
    'ConfiguracionResponse',
    'RangoPersonalizado'
]