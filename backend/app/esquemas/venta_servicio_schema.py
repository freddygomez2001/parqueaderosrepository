# app/esquemas/venta_servicio_schema.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ItemVentaCreate(BaseModel):
    """Schema para crear item de venta"""
    producto_id: int
    cantidad: int = Field(..., ge=1)

class ItemVentaResponse(BaseModel):
    """Schema para respuesta de item de venta"""
    id: int
    producto_id: int
    nombre: str
    cantidad: int
    precio_unit: float
    subtotal: float

    class Config:
        from_attributes = True

class VentaServicioCreate(BaseModel):
    """Schema para crear venta de servicio"""
    items: List[ItemVentaCreate] = Field(..., min_items=1)

class VentaServicioResponse(BaseModel):
    """Schema para respuesta de venta"""
    id: int
    total: float
    fecha: str
    items: List[ItemVentaResponse]

    class Config:
        from_attributes = True

class ReporteVentasResponse(BaseModel):
    """Schema para reporte de ventas"""
    total_ventas: float
    cantidad_tickets: int
    total_productos_vendidos: int
    ventas_por_categoria: dict