# app/esquemas/caja_schema.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# =========================================
# Modelos para Denominaciones
# =========================================

class DenominacionItem(BaseModel):
    denominacion: float = Field(..., description="Valor del billete/moneda")
    cantidad: int = Field(..., ge=0, description="Cantidad")
    subtotal: float = Field(..., description="Denominación * Cantidad")

class DenominacionesRequest(BaseModel):
    items: List[DenominacionItem]
    total: float = Field(..., description="Total calculado de las denominaciones")

# =========================================
# Modelos para Egresos
# =========================================

class EgresoRequest(BaseModel):
    monto: float = Field(..., gt=0, description="Monto a retirar")
    descripcion: str = Field(..., min_length=3, description="Motivo del retiro")
    operador: str = Field(..., min_length=1)

class EgresoResponse(BaseModel):
    id: str
    tipo: str = "egreso"
    descripcion: str
    monto: float
    operador: str
    fecha: str
    caja_id: int
    
    class Config:
        from_attributes = True

# =========================================
# Modelos para Caja
# =========================================

class CajaAperturaRequest(BaseModel):
    monto_inicial: float = Field(..., ge=0)
    operador: str = Field(..., min_length=1)
    notas: Optional[str] = None
    denominaciones: Optional[DenominacionesRequest] = None

class CajaCierreRequest(BaseModel):
    monto_final: float = Field(..., ge=0)
    operador: Optional[str] = None
    notas: Optional[str] = None
    denominaciones: Optional[DenominacionesRequest] = None

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

# app/esquemas/caja_schema.py

class CajaEstadoResponse(BaseModel):
    caja_abierta: bool
    caja_actual: Optional[CajaResponse]
    
    # 💰 INGRESOS REALES - SOLO EFECTIVO (SUMAN A CAJA)
    total_dia_parqueo: float
    total_dia_servicios: float
    total_dia_manuales: float = 0.0
    total_dia_total: float
    monto_esperado: float
    
    # 📊 ESTADÍSTICAS - TARJETA (NO SUMAN A CAJA)
    total_dia_parqueo_tarjeta: float = 0.0
    total_dia_servicios_tarjeta: float = 0.0
    total_dia_parqueo_total: float = 0.0
    total_dia_servicios_total: float = 0.0
    
    # 💰 EGRESOS Y SALDO NETO
    total_dia_egresos: float = 0.0
    saldo_neto: float = 0.0
    saldo_actual: float = 0.0  # ✅ NUEVO: Saldo real en caja (inicial + ingresos - egresos)
    
    # 💵 DENOMINACIONES DE APERTURA
    denominaciones_apertura: List[DenominacionItem] = []
    total_denominaciones_apertura: float = 0.0

    class Config:
        from_attributes = True

# =========================================
# Otros modelos
# =========================================

class ResumenCajaResponse(BaseModel):
    monto_inicial: float
    ingresos_parqueo: float
    ingresos_servicios: float
    total_ingresos: float
    total_egresos: float = 0.0
    saldo_neto: float = 0.0
    monto_esperado: float
    diferencia: Optional[float]
    monto_final: Optional[float]
    operador: Optional[str] = None
    fecha_apertura: Optional[str] = None

class MovimientoCajaItem(BaseModel):
    id: str
    tipo: str  # "parqueo" | "servicio" | "efectivo_manual" | "egreso"
    descripcion: str
    monto: float
    metodo_pago: Optional[str] = None
    fecha: str
    suma_a_caja: Optional[bool] = None

class MovimientosCajaResponse(BaseModel):
    movimientos: List[MovimientoCajaItem]
    total_efectivo: float
    total_tarjeta: float
    total_egresos: float = 0.0
    saldo_neto: float = 0.0
    total_movimientos: int

class AgregarEfectivoRequest(BaseModel):
    monto: float = Field(..., gt=0)
    descripcion: str = Field(default="Efectivo agregado")
    operador: Optional[str] = None