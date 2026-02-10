# app/esquemas/caja_schema.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CajaAperturaRequest(BaseModel):
    monto_inicial: float = Field(..., ge=0)
    operador: str = Field(..., min_length=1)
    notas: Optional[str] = None

class CajaCierreRequest(BaseModel):
    monto_final: float = Field(..., ge=0)
    operador: Optional[str] = None
    notas: Optional[str] = None

class CajaResponse(BaseModel):
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
    caja_abierta: bool
    caja_actual: Optional[CajaResponse]
    total_dia_parqueo: float
    total_dia_servicios: float
    # ✅ Campos nuevos — opcionales para no romper clientes viejos
    total_dia_servicios_tarjeta: float = 0.0
    total_dia_manuales: float = 0.0
    total_dia_total: float
    monto_esperado: float

class ResumenCajaResponse(BaseModel):
    monto_inicial: float
    ingresos_parqueo: float
    ingresos_servicios: float
    total_ingresos: float
    monto_esperado: float
    diferencia: Optional[float]
    monto_final: Optional[float]

class MovimientoCajaItem(BaseModel):
    id: str
    tipo: str  # "parqueo" | "servicio" | "efectivo_manual"
    descripcion: str
    monto: float
    metodo_pago: Optional[str] = None
    fecha: str

class MovimientosCajaResponse(BaseModel):
    movimientos: List[MovimientoCajaItem]
    total_efectivo: float
    total_tarjeta: float
    total_movimientos: int

class AgregarEfectivoRequest(BaseModel):
    monto: float = Field(..., gt=0)
    descripcion: str = Field(default="Efectivo agregado")
    operador: Optional[str] = None