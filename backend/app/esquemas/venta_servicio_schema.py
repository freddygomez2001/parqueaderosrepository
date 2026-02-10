# app/esquemas/venta_servicio_schema.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from datetime import datetime


class ItemVentaCreate(BaseModel):
    # --- Producto del catálogo ---
    producto_id: Optional[int] = None

    # ✅ Estos deben ir ANTES de tipo_especial para estar disponibles en el validator
    personas: Optional[int] = Field(None, ge=1)
    habitacion: Optional[str] = Field(None, max_length=50)
    monto_hotel: Optional[float] = Field(None, gt=0)
    cantidad: int = Field(1, ge=1)

    # --- Servicios especiales (validator lo lee DESPUÉS de los campos de arriba) ---
    tipo_especial: Optional[Literal["bano", "hotel"]] = None

    @validator("tipo_especial", always=True)
    def validar_datos_especiales(cls, v, values):
        if v == "bano":
            personas = values.get("personas")
            if personas is None or personas < 1:
                raise ValueError("Se requiere 'personas' >= 1 para el servicio de baño")
        elif v == "hotel":
            if not values.get("habitacion"):
                raise ValueError("Se requiere 'habitacion' para el servicio de hotel")
            if not values.get("monto_hotel"):
                raise ValueError("Se requiere 'monto_hotel' para el servicio de hotel")
        elif v is None:
            if not values.get("producto_id"):
                raise ValueError("Se requiere 'producto_id' o 'tipo_especial'")
        return v

class ItemVentaResponse(BaseModel):
    """Schema para respuesta de item de venta"""
    id: int
    producto_id: Optional[int]
    nombre: str
    cantidad: int
    precio_unit: float
    subtotal: float

    class Config:
        from_attributes = True


class VentaServicioCreate(BaseModel):
    """Schema para crear venta de servicio"""
    items: List[ItemVentaCreate] = Field(..., min_items=1)

    # Método de pago (efectivo no suma a caja en tarjeta)
    metodo_pago: Literal["efectivo", "tarjeta"] = "efectivo"


class VentaServicioResponse(BaseModel):
    """Schema para respuesta de venta"""
    id: int
    total: float
    fecha: str
    metodo_pago: str
    items: List[ItemVentaResponse]

    class Config:
        from_attributes = True


class ReporteVentasResponse(BaseModel):
    """Schema para reporte de ventas"""
    total_ventas: float
    total_efectivo: float
    total_tarjeta: float
    cantidad_tickets: int
    total_productos_vendidos: int
    ventas_por_categoria: dict