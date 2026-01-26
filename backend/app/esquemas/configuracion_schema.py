# app/esquemas/configuracion_schema.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal

class RangoPersonalizado(BaseModel):
    """Schema para rangos personalizados"""
    min_minutos: int = Field(..., ge=0, description="Mínimo de minutos")
    max_minutos: int = Field(..., ge=0, description="Máximo de minutos")
    precio: Decimal = Field(..., ge=0, description="Precio para este rango")
    descripcion: Optional[str] = Field(None, description="Descripción del rango")

class ConfiguracionBase(BaseModel):
    """Schema base para configuración con rangos específicos"""
    # Precios por rangos fijos
    precio_0_5_min: Optional[Decimal] = Field(None, ge=0, description="Precio 0-5 minutos")
    precio_6_30_min: Optional[Decimal] = Field(None, ge=0, description="Precio 6-30 minutos")
    precio_31_60_min: Optional[Decimal] = Field(None, ge=0, description="Precio 31-60 minutos")
    precio_hora_adicional: Optional[Decimal] = Field(None, ge=0, description="Precio por hora adicional")
    
    # Precio nocturno
    precio_nocturno: Optional[Decimal] = Field(None, ge=0, description="Precio nocturno (12 horas)")
    
    # Horarios
    hora_inicio_nocturno: Optional[str] = Field(None, description="Hora inicio nocturno (HH:MM)")
    hora_fin_nocturno: Optional[str] = Field(None, description="Hora fin nocturno (HH:MM)")
    
    # Rangos personalizados (JSON string)
    rangos_personalizados: Optional[str] = Field(None, description="Rangos personalizados en JSON")

    @validator('hora_inicio_nocturno', 'hora_fin_nocturno')
    def validar_formato_hora(cls, v):
        if v is not None:
            try:
                # Validar formato HH:MM
                parts = v.split(':')
                if len(parts) != 2:
                    raise ValueError('Formato debe ser HH:MM')
                hora, minuto = int(parts[0]), int(parts[1])
                if not (0 <= hora < 24 and 0 <= minuto < 60):
                    raise ValueError('Hora o minuto inválido')
                # Asegurar formato de 2 dígitos
                return f"{hora:02d}:{minuto:02d}"
            except:
                raise ValueError('Formato de hora inválido, use HH:MM')
        return v

class ConfiguracionUpdate(ConfiguracionBase):
    """Schema para actualizar configuración"""
    pass

class ConfiguracionResponse(BaseModel):
    """Schema para respuesta de configuración"""
    id: int
    precio_0_5_min: float
    precio_6_30_min: float
    precio_31_60_min: float
    precio_hora_adicional: float
    precio_nocturno: float
    hora_inicio_nocturno: str
    hora_fin_nocturno: str
    rangos_personalizados: Optional[List[Dict[str, Any]]] = None
    actualizado_en: Optional[str]

    class Config:
        from_attributes = True