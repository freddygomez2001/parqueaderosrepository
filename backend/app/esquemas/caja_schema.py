# app/esquemas/caja_schema.py
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class CajaAperturaRequest(BaseModel):
    """Schema para abrir caja"""
    monto_inicial: float = Field(..., ge=0, description="Monto inicial en caja")
    operador: str = Field(..., min_length=1, description="Nombre del operador")
    notas: Optional[str] = Field(None, description="Notas de apertura")

class CajaCierreRequest(BaseModel):
    """Schema para cerrar caja"""
    monto_final: float = Field(..., ge=0, description="Monto final contado en caja")
    operador: Optional[str] = Field(None, description="Nombre del operador que cierra")
    notas: Optional[str] = Field(None, description="Notas de cierre")

class CajaResponse(BaseModel):
    """Schema para respuesta de caja"""
    id: int
    monto_inicial: float
    fecha_apertura: str
    operador_apertura: str
    monto_final: Optional[float]
    fecha_cierre: Optional[str]
    operador_cierre: Optional[str]
    total_parqueo: float
    total_servicios: float
    total_ingresos: float
    monto_esperado: Optional[float]
    diferencia: Optional[float]
    estado: str
    notas_apertura: Optional[str]
    notas_cierre: Optional[str]

    class Config:
        from_attributes = True

class CajaEstadoResponse(BaseModel):
    """Schema para estado actual de caja"""
    caja_abierta: bool
    caja_actual: Optional[CajaResponse]
    total_dia_parqueo: float
    total_dia_servicios: float
    total_dia_total: float
    monto_esperado: float

class ResumenCajaResponse(BaseModel):
    """Schema para resumen de caja"""
    monto_inicial: float
    ingresos_parqueo: float
    ingresos_servicios: float
    total_ingresos: float
    monto_esperado: float
    diferencia: Optional[float]
    monto_final: Optional[float]