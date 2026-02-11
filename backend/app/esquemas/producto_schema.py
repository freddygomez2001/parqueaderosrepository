# app/esquemas/producto_schema.py
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime


class ProductoBase(BaseModel):
    """Schema base para productos"""
    nombre: str = Field(..., min_length=1, max_length=100)
    precio: float = Field(..., ge=0)
    stock: int = Field(..., ge=0)
    categoria: Literal["bebidas", "snacks", "otros"]  # 👈 AGREGAR "otros"

    @validator('nombre')
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()

class ProductoCreate(ProductoBase):
    """Schema para crear producto"""
    pass

class ProductoUpdate(BaseModel):
    """Schema para actualizar producto"""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    precio: Optional[float] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    categoria: Optional[Literal["bebidas", "snacks", "otros"]] = None  # 👈 AGREGAR "otros"
    activo: Optional[bool] = None

class ProductoResponse(BaseModel):
    """Schema para respuesta de producto"""
    id: int
    nombre: str
    precio: float
    stock: int
    categoria: str
    activo: bool
    creado_en: Optional[str]
    actualizado_en: Optional[str]

    class Config:
        from_attributes = True